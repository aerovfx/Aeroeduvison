mod auth;
mod db;
mod error;
mod handlers;
mod models;

use axum::{
    routing::{get, post, patch, delete},
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
    pub client: reqwest::Client,
    pub ai_service_url: String,
    pub elevenlabs_api_key: Option<String>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "transcript_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Configuration
    let addr = std::env::var("TRANSCRIPT_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8108".to_string());
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let ai_service_url = std::env::var("AI_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8107".to_string());
    let elevenlabs_api_key = std::env::var("ELEVENLABS_API_KEY").ok();

    // Initialize database pool
    let pool = db::init_pool(&database_url).await;

    let state = AppState {
        db: pool,
        client: reqwest::Client::new(),
        ai_service_url,
        elevenlabs_api_key,
    };

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
    tracing::info!("Transcript service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))

        // Transcript CRUD
        .route("/api/transcript", post(handlers::transcript::transcribe))
        .route("/api/transcript/save", post(handlers::transcript::save_transcript))
        .route("/api/transcript/history", get(handlers::transcript::get_transcript_history))
        .route("/api/transcript/:id", delete(handlers::transcript::delete_transcript))
        .route("/api/transcript/:id", patch(handlers::transcript::update_transcript))

        // AI features
        .route("/api/transcript/summarize", post(handlers::transcript::summarize_transcript))
        .route("/api/transcript/elevenlabs/transcribe", post(handlers::transcript::elevenlabs_transcribe))

        // Local MLX features
        .route("/api/transcript/local/check-models", get(handlers::transcript::check_models))
        .route("/api/transcript/local/check-python", get(handlers::transcript::check_python))
        .route("/api/transcript/local/check-venv", get(handlers::transcript::check_venv))
        .route("/api/transcript/local/setup", post(handlers::transcript::setup_local))
        .route("/api/transcript/local/transcribe", post(handlers::transcript::transcribe_local))
        .route("/api/transcript/local/transcribe-stream", post(handlers::transcript::transcribe_stream))

        .with_state(state)
}
