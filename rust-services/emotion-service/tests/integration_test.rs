//! Integration tests for emotion-service.
//!
//! - /health → 200
//! - POST /api/emotion with no token → 401
//! - GET /api/emotion/stats with no token → 401
//! - GET /api/emotion/records with no token → 401
//! - Valid JWT passes auth layer

use emotion_service::{create_app, AppState};
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

const TEST_SECRET: &str = "test-secret-key-for-emotion-tests-1";

fn build_test_app() -> axum::Router {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://test:test@localhost:5432/test_db")
        .expect("failed to create lazy pool");
    create_app(AppState {
        db: pool,
        jwt_secret: TEST_SECRET.to_string(),
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
            sub: "u_student".to_string(),
            email: "student@aeroedu.vn".to_string(),
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
async fn test_health_response_body() {
    let res = build_test_app()
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let body = axum::body::to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "healthy");
    assert!(json["service"].as_str().unwrap().contains("emotion"));
}

// ─── 401 without token ───────────────────────────────────────────

#[tokio::test]
async fn test_log_emotion_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/emotion")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"emotion":"focused","intensity":8}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_stats_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/emotion/stats")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_records_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/emotion/records")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── 401 with bad/wrong token ─────────────────────────────────────

#[tokio::test]
async fn test_log_emotion_bad_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/emotion")
                .header("Authorization", "Bearer garbage.token.here")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"emotion":"happy","intensity":7}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_wrong_secret_401() {
    let bad_token = make_jwt("wrong-secret-xyz-abc");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/emotion/stats")
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
async fn test_valid_jwt_passes_auth_for_log() {
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/emotion")
                .header("Authorization", format!("Bearer {}", token))
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"emotion":"focused","intensity":8}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    // Auth passed; DB will error with lazy pool but status ≠ 401
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_valid_jwt_passes_auth_for_stats() {
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/emotion/stats")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── Validation layer (auth passes, then handler validates input) ─

#[tokio::test]
async fn test_missing_auth_header_prefix_401() {
    // "Token xyz" instead of "Bearer xyz" should also fail
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/emotion/stats")
                .header("Authorization", format!("Token {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}
