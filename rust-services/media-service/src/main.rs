mod error;
mod handlers;
mod models;
mod db;
mod services;

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
use crate::services::MediaService;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub media: MediaService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "media_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("MEDIA_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8098".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());
    let gcs_bucket = std::env::var("GCS_BUCKET").unwrap_or_default();

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize service
    let media_service = MediaService::new(jwt_secret, gcs_bucket);

    // Create app state
    let state = AppState {
        db: pool,
        media: media_service,
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
    tracing::info!("📁 Media service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Documents
        .route("/api/documents", get(handlers::list_documents))
        .route("/api/documents", post(handlers::create_document))
        .route("/api/documents/:id", get(handlers::get_document))
        .route("/api/documents/:id", put(handlers::update_document))
        .route("/api/documents/:id", delete(handlers::delete_document))
        .route("/api/documents/:id/process", post(handlers::process_document))
        .route("/api/documents/upload", post(handlers::upload_document))
        // Question Bank (Consolidated)
        .route("/api/question-bank", get(handlers::list_questions))
        // Exam matrices
        .route("/api/exam-matrices", get(handlers::list_exam_matrices))
        .route("/api/exam-matrices", post(handlers::create_exam_matrix))
        .route("/api/exam-matrices/:id", get(handlers::get_exam_matrix))
        .route("/api/exam-matrices/:id/process", post(handlers::process_exam_matrix))
        // Exams
        .route("/api/exams/generate-from-matrix", post(handlers::generate_exam))
        // Upload
        .route("/api/upload/presigned-url", post(handlers::get_presigned_url))
        .route("/api/upload/gcs-presigned-url", post(handlers::get_gcs_presigned_url))
        .with_state(state)
}
