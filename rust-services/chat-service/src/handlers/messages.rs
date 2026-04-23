use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::ChatError,
    models::{ChatMessage, ChatRoom, JwtClaims, RoomMember, SendMessageRequest},
    ws::WsMessage,
    AppState,
};

pub async fn get_messages(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    claims: JwtClaims,
) -> Result<Json<Vec<ChatMessage>>, ChatError> {
    // Verify room exists
    let _room = sqlx::query_as::<_, ChatRoom>("SELECT * FROM chat_rooms WHERE id = $1")
        .bind(&room_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(ChatError::RoomNotFound)?;

    let messages = sqlx::query_as::<_, ChatMessage>(
        "SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    // Reverse to get chronological order (oldest first)
    let mut messages = messages;
    messages.reverse();

    Ok(Json(messages))
}

pub async fn send_message(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    claims: JwtClaims,
    Json(payload): Json<SendMessageRequest>,
) -> Result<(StatusCode, Json<ChatMessage>), ChatError> {
    let user_id = &claims.sub;

    // Verify room exists
    let mut room = sqlx::query_as::<_, ChatRoom>("SELECT * FROM chat_rooms WHERE id = $1")
        .bind(&room_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(ChatError::RoomNotFound)?;

    // Ensure user is member of room, add if not
    let existing = sqlx::query("SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2")
        .bind(&room_id)
        .bind(user_id)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_none() {
        let member_id = format!("member-{}", Uuid::new_v4());
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO room_members (id, room_id, user_id, user_name, role, joined_at)
             VALUES ($1, $2, $3, $4, 'member', $5)",
        )
        .bind(&member_id)
        .bind(&room_id)
        .bind(user_id)
        .bind(&claims.email)
        .bind(now)
        .execute(&state.db)
        .await?;

        // Update member count
        sqlx::query("UPDATE chat_rooms SET member_count = member_count + 1 WHERE id = $1")
            .bind(&room_id)
            .execute(&state.db)
            .await?;

        room.member_count += 1;
    }

    let message_id = format!("msg-{}", Uuid::new_v4());
    let now = Utc::now();

    let message = sqlx::query_as::<_, ChatMessage>(
        "INSERT INTO chat_messages (id, room_id, user_id, user_name, content, message_type, created_at)
         VALUES ($1, $2, $3, $4, $5, 'text', $6)
         RETURNING *",
    )
    .bind(&message_id)
    .bind(&room_id)
    .bind(user_id)
    .bind(&claims.email)
    .bind(&payload.content)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    // Update room's last_message and last_message_at
    sqlx::query(
        "UPDATE chat_rooms SET last_message = $1, last_message_at = $2, updated_at = $2 WHERE id = $3",
    )
    .bind(&payload.content)
    .bind(now)
    .bind(&room_id)
    .execute(&state.db)
    .await?;

    // Broadcast to WebSocket channel
    let ws_msg = WsMessage {
        room_id: room_id.clone(),
        user_id: user_id.clone(),
        user_name: Some(claims.email.clone()),
        content: payload.content,
        message_type: "text".to_string(),
        timestamp: now.to_rfc3339(),
    };

    let tx = crate::ws::get_or_create_channel(&state.channels, &room_id).await;
    let _ = tx.send(ws_msg);

    Ok((StatusCode::CREATED, Json(message)))
}
