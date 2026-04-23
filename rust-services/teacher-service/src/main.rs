mod auth;
mod db;
mod error;
mod handlers;
mod models;

use axum::{
    routing::{get, post, delete, patch},
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
                .unwrap_or_else(|_| "teacher_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Configuration — Cloud Run sets PORT automatically
    let addr = if let Ok(port) = std::env::var("PORT") {
        format!("0.0.0.0:{}", port)
    } else {
        std::env::var("TEACHER_SERVICE_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:8106".to_string())
    };
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Initialize database pool
    let pool = db::init_pool(&database_url).await;

    let state = AppState { db: pool };

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr: SocketAddr = addr.parse().expect("Invalid address");
    tracing::info!("Teacher service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))

        // Teacher stats
        .route("/api/teacher/stats", get(handlers::stats::get_stats))

        // Students
        .route("/api/teacher/students", get(handlers::students::list_students))
        .route("/api/teacher/students/:student_id", get(handlers::students::get_student))

        // Exams
        .route("/api/teacher/exams", get(handlers::exams::list_exams))
        .route("/api/teacher/exams/:id", get(handlers::exams::get_exam))
        .route("/api/teacher/exams/:id", delete(handlers::exams::delete_exam))
        .route("/api/teacher/exams/:id/duplicate", post(handlers::exams::duplicate_exam))

        .with_state(state)
}
