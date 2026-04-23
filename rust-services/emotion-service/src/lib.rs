pub mod error;
pub mod handlers;
pub mod models;

use axum::{
    routing::{get, post},
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
        .route("/api/emotion/stats", get(handlers::get_emotion_stats))
        .route("/api/emotion", post(handlers::log_emotion))
        .route("/api/emotion/records", get(handlers::get_emotion_records))
        .with_state(state)
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)),
        )
}
