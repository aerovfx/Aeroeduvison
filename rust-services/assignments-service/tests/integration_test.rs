//! Integration tests for assignments-service.
//!
//! Uses a lazy pool (no real DB connection required).
//! Tests that:
//!   - /health returns 200
//!   - All authenticated routes return 401 when no token is provided
//!   - An expired / tampered JWT also returns 401
//!   - Valid JWT returns something other than 401 (may fail on DB, but auth passed)
//!
//! Tests marked #[ignore] require a real database:
//!   TEST_DATABASE_URL=postgres://... cargo test -- --ignored

use assignments_service::{create_app, AppState};
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower::ServiceExt;

// ────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────

const TEST_SECRET: &str = "test-secret-key-for-unit-tests-123";

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

fn make_jwt(secret: &str, role: &str) -> String {
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

    let claims = Claims {
        sub: "user_test_123".to_string(),
        email: "test@aeroedu.vn".to_string(),
        role: role.to_string(),
        exp: 9_999_999_999,
        iat: 1_000_000_000,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .expect("JWT encode failed")
}

// ────────────────────────────────────────────────────────────────
// Health endpoint (no auth, no DB)
// ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_health_returns_200() {
    let app = build_test_app();
    let res = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_health_body_contains_service_name() {
    let app = build_test_app();
    let res = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let body = axum::body::to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
    assert!(json["service"].as_str().unwrap().contains("assignments"));
}

// ────────────────────────────────────────────────────────────────
// 401 on every authenticated route — no token
// ────────────────────────────────────────────────────────────────

async fn assert_401(uri: &str, method: &str, body: Option<serde_json::Value>) {
    let app = build_test_app();
    let mut req = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json");
    let body_bytes = match body {
        Some(ref v) => serde_json::to_vec(v).unwrap(),
        None => vec![],
    };
    let res = app
        .oneshot(req.body(Body::from(body_bytes)).unwrap())
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::UNAUTHORIZED,
        "Expected 401 for {} {}",
        method,
        uri
    );
}

#[tokio::test]
async fn test_list_assignments_no_token_401() {
    assert_401("/api/assignments", "GET", None).await;
}

#[tokio::test]
async fn test_create_assignment_no_token_401() {
    assert_401(
        "/api/assignments",
        "POST",
        Some(json!({"title":"x","subject":"Math"})),
    )
    .await;
}

#[tokio::test]
async fn test_get_assignment_no_token_401() {
    assert_401("/api/assignments/asgn_1", "GET", None).await;
}

#[tokio::test]
async fn test_delete_assignment_no_token_401() {
    assert_401("/api/assignments/asgn_1", "DELETE", None).await;
}

#[tokio::test]
async fn test_update_progress_no_token_401() {
    assert_401(
        "/api/assignments/asgn_1/progress",
        "PATCH",
        Some(json!({"progress": 50})),
    )
    .await;
}

// ────────────────────────────────────────────────────────────────
// 401 with invalid / expired JWT
// ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_list_assignments_bad_token_401() {
    let app = build_test_app();
    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/assignments")
                .header("Authorization", "Bearer not.a.valid.jwt")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_list_assignments_wrong_secret_401() {
    let app = build_test_app();
    // JWT signed with a DIFFERENT secret — should fail validation
    let bad_token = make_jwt("completely-different-secret-xyz", "STUDENT");
    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/assignments")
                .header("Authorization", format!("Bearer {}", bad_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ────────────────────────────────────────────────────────────────
// Valid JWT passes auth layer (will hit DB and fail — not 401)
// ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_valid_jwt_passes_auth_layer() {
    let app = build_test_app();
    let token = make_jwt(TEST_SECRET, "STUDENT");
    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/assignments")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    // Auth passed — now it tries the DB (lazy pool → error)
    // We just confirm it is NOT a 401
    assert_ne!(
        res.status(),
        StatusCode::UNAUTHORIZED,
        "A valid JWT should pass the auth layer"
    );
}

// ────────────────────────────────────────────────────────────────
// 404 for unknown routes
// ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_unknown_route_404() {
    let app = build_test_app();
    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/nonexistent")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}
