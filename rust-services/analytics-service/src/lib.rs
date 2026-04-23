pub mod error;
pub mod handlers;
pub mod models;

use axum::{
    routing::get,
    Router,
};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
}

/// Build the Axum router.
pub fn create_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/analytics/dashboard", get(handlers::get_dashboard))
        .route("/api/analytics/activity", get(handlers::get_activity))
        .route("/api/analytics/courses", get(handlers::get_courses))
        .route("/api/analytics/students", get(handlers::get_students))
        .with_state(state)
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)),
        )
}
