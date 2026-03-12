mod error;
mod handlers;
mod models;
mod db;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::db::DbPool;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "admin_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("ADMIN_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8094".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Create app state
    let state = AppState {
        db: pool,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = create_router(state).layer(cors).layer(TraceLayer::new_for_http());

    // Start server
    let addr: SocketAddr = addr.parse().expect("Invalid address");
    tracing::info!("🔧 Admin service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Dashboard
        .route("/api/admin/overview", get(handlers::get_overview))
        .route("/api/admin/stats", get(handlers::get_stats))
        // Users
        .route("/api/admin/users", get(handlers::list_users))
        .route("/api/admin/users/:id", get(handlers::get_user))
        .route("/api/admin/users/:id", put(handlers::update_user))
        .route("/api/admin/users/:id", delete(handlers::delete_user))
        // Students
        .route("/api/admin/students", get(handlers::list_students))
        .route("/api/admin/students/:id", get(handlers::get_student))
        .route("/api/admin/students/:id", put(handlers::update_student))
        .route("/api/admin/students/:id", delete(handlers::delete_student))
        // STEM
        .route("/api/admin/stem", get(handlers::get_stem))
        .route("/api/admin/stem/sync", post(handlers::sync_stem))
        // System
        .route("/api/admin/alerts", get(handlers::get_alerts))
        .route("/api/admin/auth-logs", get(handlers::get_auth_logs))
        .route("/api/admin/unlock-account", post(handlers::unlock_account))
        // Webhooks (Consolidated)
        .route("/api/webhook", post(handlers::handle_webhook))
        .with_state(state)
}
