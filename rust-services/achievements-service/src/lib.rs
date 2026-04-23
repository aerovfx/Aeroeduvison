pub mod error;
pub mod models;
pub mod handlers;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
}

/// Build the Axum router.
pub fn create_app(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route(
            "/api/achievements",
            get(handlers::achievements::list_achievements),
        )
        .route(
            "/api/achievements/leaderboard",
            get(handlers::achievements::get_leaderboard),
        )
        .route(
            "/api/achievements/:id",
            get(handlers::achievements::get_achievement),
        )
        .route(
            "/api/achievements/:id/unlock",
            post(handlers::achievements::unlock_achievement),
        )
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive()),
        )
        .with_state(state)
}
