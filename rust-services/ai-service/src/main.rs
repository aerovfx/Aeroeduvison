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
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use openfang_kernel::{OpenFangExamAgent, OpenFangExamAgentBuilder};
use openfang_runtime::AgentRuntime;
use openfang_types::LlmProvider;

use crate::db::DbPool;
use crate::services::ai_service::AIService;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub ai: AIService,
    pub openfang_agent: std::sync::Arc<tokio::sync::RwLock<OpenFangExamAgent>>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ai_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("AI_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8095".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());
    let grok_api_key = std::env::var("GROK_API_KEY").unwrap_or_default();
    let openrouter_api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
    let openai_api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
    let ollama_base_url = std::env::var("OLLAMA_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize AI service
    let ai_service = AIService::new(
        jwt_secret,
        grok_api_key,
        openrouter_api_key,
        openai_api_key,
        ollama_base_url,
    );

    // Initialize OpenFang agent
    let runtime = Arc::new(RwLock::new(AgentRuntime::new()));
    let openfang_agent = Arc::new(RwLock::new(
        OpenFangExamAgentBuilder::new(runtime)
            .llm_provider(LlmProvider::OpenRouter)
            .llm_model("meta-llama/llama-3.2-3b-instruct".to_string())
            .build()
    ));

    // Create app state
    let state = AppState {
        db: pool,
        ai: ai_service,
        openfang_agent,
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
    tracing::info!("🤖 AI service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    let app = Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Chat
        .route("/api/ai-chat", post(handlers::ai_chat))
        .route("/api/ai-tutor-chat", post(handlers::tutor_chat))
        // Content generation
        .route("/api/ai-content/generate", post(handlers::generate_content))
        .route("/api/ai-content/generate-stream", post(handlers::generate_content_stream))
        .route("/api/ai-content/save", post(handlers::save_content))
        .route("/api/ai-content/:id", get(handlers::get_content))
        .route("/api/ai-content/:id", delete(handlers::delete_content))
        // Lesson generation
        .route("/api/ai-generate-lesson", post(handlers::generate_lesson))
        .route("/api/ai-grade-lesson", post(handlers::grade_lesson))
        // Document analysis
        .route("/api/ai/analyze-document", post(handlers::analyze_document))
        // Analytics
        .route("/api/ai-analytics/dashboard", get(handlers::ai_analytics))
        // Exam generation (NEW!)
        .route("/api/ai/exam/generate-from-matrix", post(handlers::generate_exam_from_matrix))
        .route("/api/ai/exam/generate-multiple-variants", post(handlers::generate_exam_variants))
        .route("/api/ai/exam/preview/:exam_id", get(handlers::preview_exam))
        .route("/api/ai/exam/swap-question", post(handlers::swap_question))
        .with_state(state);
    
    app
}
