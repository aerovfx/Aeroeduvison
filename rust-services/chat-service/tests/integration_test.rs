//! Integration tests for chat-service.
//!
//! - /health → 200
//! - REST chat routes → 401 without token
//! - Wrong JWT → 401
//! - Valid JWT → passes auth layer

use chat_service::{create_app, ws, AppState};
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

const TEST_SECRET: &str = "test-secret-key-for-chat-service-1";

fn build_test_app() -> axum::Router {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://test:test@localhost:5432/test_db")
        .expect("failed to create lazy pool");
    create_app(AppState {
        db: pool,
        jwt_secret: TEST_SECRET.to_string(),
        channels: ws::new_room_channels(),
    })
}

fn make_jwt(secret: &str) -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize)]
    struct Claims {
        sub: String,
        email: String,
        role: String,
        exp: usize,
        iat: usize,
    }

    encode(
        &Header::default(),
        &Claims {
            sub: "u_chat_test".to_string(),
            email: "chat@aeroedu.vn".to_string(),
            role: "STUDENT".to_string(),
            exp: 9_999_999_999,
            iat: 1_000_000_000,
        },
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap()
}

// ─── Health ──────────────────────────────────────────────────────

#[tokio::test]
async fn test_health_200() {
    let res = build_test_app()
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_health_body() {
    let res = build_test_app()
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let body = axum::body::to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
    assert!(json["service"].as_str().unwrap().contains("chat"));
}

// ─── 401 without token ───────────────────────────────────────────

#[tokio::test]
async fn test_list_rooms_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_create_room_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/chat/rooms")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    r#"{"name":"Study Hall","room_type":"public"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_messages_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms/room-1/messages")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_send_message_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/chat/rooms/room-1/messages")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"content":"Hello!"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_members_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms/room-1/members")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── 401 with bad token ───────────────────────────────────────────

#[tokio::test]
async fn test_malformed_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms")
                .header("Authorization", "Bearer not.valid.jwt")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_wrong_secret_401() {
    let bad_token = make_jwt("wrong-secret-abc");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms")
                .header("Authorization", format!("Bearer {}", bad_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── Valid JWT passes auth layer ──────────────────────────────────

#[tokio::test]
async fn test_valid_jwt_passes_auth_list_rooms() {
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    // Auth passed; lazy DB will error, but status ≠ 401
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_valid_jwt_passes_auth_get_messages() {
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/chat/rooms/room-xyz/messages")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}
