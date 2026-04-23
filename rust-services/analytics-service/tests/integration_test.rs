//! Integration tests for analytics-service.
//!
//! - /health → 200 (no auth, no DB)
//! - Authenticated routes → 401 without token
//! - Wrong JWT → 401
//! - Valid JWT → passes auth (may 500 on lazy DB, not 401)

use analytics_service::{create_app, AppState};
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

const TEST_SECRET: &str = "test-secret-key-for-analytics-1234";

fn build_test_app() -> axum::Router {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://test:test@localhost:5432/test_db")
        .expect("failed to create lazy pool");
    create_app(AppState {
        db: pool,
        jwt_secret: TEST_SECRET.to_string(),
    })
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

    encode(
        &Header::default(),
        &Claims {
            sub: "u_test".to_string(),
            email: "user@aeroedu.vn".to_string(),
            role: role.to_string(),
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
    assert!(json["service"].as_str().unwrap().contains("analytics"));
}

// ─── 401 on all authenticated routes ─────────────────────────────

#[tokio::test]
async fn test_dashboard_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/dashboard")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_activity_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/activity")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_courses_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/courses")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_students_no_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/students")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── 401 with bad token ───────────────────────────────────────────

#[tokio::test]
async fn test_malformed_bearer_token_401() {
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/dashboard")
                .header("Authorization", "Bearer this.is.garbage")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_wrong_secret_401() {
    let bad = make_jwt("different-secret-entirely-xyz-abc", "STUDENT");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/dashboard")
                .header("Authorization", format!("Bearer {}", bad))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ─── Valid JWT passes auth layer ──────────────────────────────────

#[tokio::test]
async fn test_student_jwt_passes_auth() {
    let token = make_jwt(TEST_SECRET, "STUDENT");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/dashboard")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    // Auth passed — DB fails with lazy pool; we just confirm it's not 401
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_teacher_jwt_passes_auth_for_students_endpoint() {
    let token = make_jwt(TEST_SECRET, "TEACHER");
    let res = build_test_app()
        .oneshot(
            Request::builder()
                .uri("/api/analytics/students")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_ne!(res.status(), StatusCode::UNAUTHORIZED);
}
