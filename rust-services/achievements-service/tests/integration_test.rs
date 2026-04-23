//! Integration tests for achievements-service.
//!
//! - /health → 200 (no auth, no DB)
//! - All authenticated routes → 401 without token
//! - Wrong JWT secret → 401
//! - Valid JWT → passes auth layer (may 500 on DB, but not 401)

use achievements_service::{create_app, AppState};
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower::ServiceExt;

const TEST_SECRET: &str = "test-secret-key-for-achievements-123";

fn build_test_app() -> axum::Router {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://test:test@localhost:5432/test_db")
        .expect("failed to create lazy pool");
    let state = Arc::new(AppState {
        db: pool,
        jwt_secret: TEST_SECRET.to_string(),
    });
    create_app(state)
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
            sub: "u_test".to_string(),
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
async fn test_health_body_service_name() {
    let res = build_test_app()
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let body = axum::body::to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["service"].as_str().unwrap().contains("achievements"));
}

// ─── 401 without token ───────────────────────────────────────────

#[tokio::test]
async fn test_list_achievements_no_token_401() {
    let res = build_test_app()
        .oneshot(Request::builder().uri("/api/achievements").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_achievement_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/achievements/ach_1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_unlock_achievement_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/achievements/ach_1/unlock")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_leaderboard_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/achievements/leaderboard")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── 401 with wrong secret ────────────────────────────────────────

#[tokio::test]
async fn test_wrong_jwt_secret_401() {
    let bad_token = make_jwt("wrong-secret-totally-different-xyz");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/achievements")
                .header("Authorization", format!("Bearer {}", bad_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── Valid JWT passes auth ────────────────────────────────────────

#[tokio::test]
async fn test_valid_jwt_passes_auth() {
    let token = make_jwt(TEST_SECRET);
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/achievements")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}
