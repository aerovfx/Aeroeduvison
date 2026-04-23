use chat_service::{create_app, ws, AppState};

use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use chrono::Utc;
use dotenvy::dotenv;
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use std::net::SocketAddr;
use uuid::Uuid;

use chat_service::error::ChatError;
use chat_service::models::JwtClaims;
use ws::WsMessage;

#[derive(Debug, Deserialize)]
struct WsQuery {
    room_id: String,
    token: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/aeroedu".to_string());
    let chat_addr = std::env::var("CHAT_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8101".to_string());
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string());

    let pool = PgPool::connect(&database_url).await?;
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|_| "Failed to connect to database")?;

    tracing::info!("Connected to database");

    // Tables managed by Prisma — no sqlx migrations needed

    let app_state = AppState {
        db: pool,
        jwt_secret,
        channels: ws::new_room_channels(),
    };

    // Build the REST app from lib, then merge the WebSocket route
    let ws_app = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(app_state.clone());
    let app = create_app(app_state).merge(ws_app);

    let addr: SocketAddr = chat_addr.parse()?;
    tracing::info!("Chat service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> Result<impl IntoResponse, ChatError> {
    let claims = validate_jwt(&query.token, &state.jwt_secret)?;
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, query.room_id, claims)))
}

fn validate_jwt(token: &str, secret: &str) -> Result<JwtClaims, ChatError> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    decode::<JwtClaims>(token, &key, &Validation::default())
        .map(|data| data.claims)
        .map_err(|e| ChatError::JwtError(e.to_string()))
}

async fn handle_socket(socket: WebSocket, state: AppState, room_id: String, claims: JwtClaims) {
    let (mut sender, mut receiver) = socket.split();

    let tx = ws::get_or_create_channel(&state.channels, &room_id).await;
    let mut rx = tx.subscribe();

    let user_id = claims.sub.clone();
    let user_name = claims.email.clone();

    if let Err(e) = ensure_room_membership(&state.db, &room_id, &user_id, &user_name).await {
        tracing::error!("Failed to add user to room: {}", e);
        let _ = sender
            .send(Message::Text(json!({"error": "Failed to join room"}).to_string()))
            .await;
        return;
    }

    tracing::info!("User {} joined room {}", user_id, room_id);

    let state1 = state.clone();
    let room_id1 = room_id.clone();
    let user_id1 = user_id.clone();
    let user_name1 = user_name.clone();

    let forward_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(content) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(content_str) = content.get("content").and_then(|v| v.as_str()) {
                        let message_id = format!("msg-{}", Uuid::new_v4());
                        let now = Utc::now();

                        if let Err(e) = sqlx::query(
                            "INSERT INTO chat_messages (id, room_id, user_id, user_name, content, message_type, created_at)
                             VALUES ($1, $2, $3, $4, $5, 'text', $6)",
                        )
                        .bind(&message_id)
                        .bind(&room_id1)
                        .bind(&user_id1)
                        .bind(&user_name1)
                        .bind(content_str)
                        .bind(now)
                        .execute(&state1.db)
                        .await
                        {
                            tracing::error!("Failed to save message: {}", e);
                            continue;
                        }

                        let _ = sqlx::query(
                            "UPDATE chat_rooms SET last_message = $1, last_message_at = $2, updated_at = $2 WHERE id = $3",
                        )
                        .bind(content_str)
                        .bind(now)
                        .bind(&room_id1)
                        .execute(&state1.db)
                        .await;

                        let ws_msg = WsMessage {
                            room_id: room_id1.clone(),
                            user_id: user_id1.clone(),
                            user_name: Some(user_name1.clone()),
                            content: content_str.to_string(),
                            message_type: "text".to_string(),
                            timestamp: now.to_rfc3339(),
                        };
                        let tx = ws::get_or_create_channel(&state1.channels, &room_id1).await;
                        let _ = tx.send(ws_msg);
                    }
                }
            } else if let Message::Close(_) = msg {
                tracing::info!("User {} left room {}", user_id1, room_id1);
                break;
            }
        }
    });

    let forward_broadcast = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let json = serde_json::to_string(&msg).unwrap_or_default();
            if sender.send(Message::Text(json)).await.is_err() {
                break;
            }
        }
    });

    tokio::select! {
        _ = forward_task => {}
        _ = forward_broadcast => {}
    }

    tracing::info!("User {} disconnected from room {}", user_id, room_id);
}

async fn ensure_room_membership(
    db: &PgPool,
    room_id: &str,
    user_id: &str,
    user_name: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let existing = sqlx::query("SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2")
        .bind(room_id)
        .bind(user_id)
        .fetch_optional(db)
        .await?;

    if existing.is_none() {
        let member_id = format!("member-{}", Uuid::new_v4());
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO room_members (id, room_id, user_id, user_name, role, joined_at)
             VALUES ($1, $2, $3, $4, 'member', $5)",
        )
        .bind(&member_id)
        .bind(room_id)
        .bind(user_id)
        .bind(user_name)
        .bind(now)
        .execute(db)
        .await?;

        sqlx::query("UPDATE chat_rooms SET member_count = member_count + 1 WHERE id = $1")
            .bind(room_id)
            .execute(db)
            .await?;
    }

    Ok(())
}
