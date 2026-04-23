pub mod error;
pub mod models;
pub mod handlers;

use axum::{
    routing::{delete, get, patch, post},
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

/// Build the Axum router. Extracted so both `main()` and tests can use it.
pub fn create_app(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route(
            "/api/assignments",
            get(handlers::assignments::list_assignments)
                .post(handlers::assignments::create_assignment),
        )
        .route(
            "/api/assignments/:id",
            get(handlers::assignments::get_assignment)
                .delete(handlers::assignments::delete_assignment),
        )
        .route(
            "/api/assignments/:id/progress",
            patch(handlers::assignments::update_progress),
        )
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive()),
        )
        .with_state(state)
}
