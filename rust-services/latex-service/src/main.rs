mod auth;
mod db;
mod error;
mod handlers;
mod models;

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
    pub client: reqwest::Client,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "latex_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Configuration
    //   1. LATEX_SERVICE_ADDR (explicit override — used locally to bind 127.0.0.1:8109)
    //   2. PORT env var (Cloud Run sets this automatically when deployed as a service)
    //   3. Fallback 0.0.0.0:8109 (khi chạy trong container không có PORT)
    let addr = std::env::var("LATEX_SERVICE_ADDR").unwrap_or_else(|_| {
        std::env::var("PORT")
            .map(|p| format!("0.0.0.0:{}", p))
            .unwrap_or_else(|_| "0.0.0.0:8109".to_string())
    });
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Initialize database pool
    let pool = db::init_pool(&database_url).await;

    let state = AppState {
        db: pool,
        client: reqwest::Client::new(),
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
    tracing::info!("LaTeX service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))

        // Project CRUD
        .route("/api/latex-projects", get(handlers::project::list_projects))
        .route("/api/latex-projects", post(handlers::project::create_project))
        .route("/api/latex-projects/:id", get(handlers::project::get_project))
        .route("/api/latex-projects/:id", put(handlers::project::update_project))
        .route("/api/latex-projects/:id", delete(handlers::project::delete_project))

        // Versions
        .route("/api/latex-projects/:id/versions", get(handlers::project::list_versions))
        .route("/api/latex-projects/:id/versions/restore", post(handlers::project::restore_version))

        // Collaborators
        .route("/api/latex-projects/:id/collaborators", get(handlers::project::list_collaborators))
        .route("/api/latex-projects/:id/collaborators", post(handlers::project::add_collaborator))
        .route("/api/latex-projects/:id/collaborators/:user_id", delete(handlers::project::remove_collaborator))

        // Compilation
        .route("/api/latex-projects/compile", post(handlers::project::compile_project))
        .route("/api/latex-projects/compile-optimized", post(handlers::project::compile_optimized))
        .route("/api/latex-projects/compile-advanced", post(handlers::project::compile_advanced))

        // Exports
        .route("/api/latex-projects/export-from-exam", post(handlers::project::export_from_exam))
        .route("/api/latex-projects/export-from-matrix", post(handlers::project::export_from_matrix))

        // AI exam generator (Anthropic Claude) — cần env ANTHROPIC_API_KEY
        .route("/api/latex-projects/ai-generate", post(handlers::ai_generate::ai_generate))

        .with_state(state)
}
