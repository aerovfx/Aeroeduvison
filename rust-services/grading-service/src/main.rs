mod auth;
mod db;
mod error;
mod handlers;
mod models;
mod services;

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
use crate::services::{GradingService, LlmService, MetricsService};

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub llm: LlmService,
    pub grading: GradingService,
    pub metrics: MetricsService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "grading_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Configuration
    let addr = std::env::var("GRADING_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8100".to_string());
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Initialize database pool
    let pool = db::init_pool(&database_url).await;

    // Initialize Redis (optional)
    let redis = match std::env::var("REDIS_URL") {
        Ok(url) => {
            match redis::Client::open(url.as_str()) {
                Ok(client) => {
                    match redis::aio::ConnectionManager::new(client).await {
                        Ok(conn) => {
                            tracing::info!("Redis connected");
                            Some(conn)
                        }
                        Err(e) => {
                            tracing::warn!("Redis connection failed: {}, metrics will be skipped", e);
                            None
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Redis client error: {}, metrics will be skipped", e);
                    None
                }
            }
        }
        Err(_) => {
            tracing::info!("REDIS_URL not set, metrics will be skipped");
            None
        }
    };

    // Initialize services
    let llm = LlmService::new();
    let grading = GradingService::new(pool.clone(), llm.clone());
    let metrics = MetricsService::new(redis);

    let state = AppState {
        db: pool,
        llm,
        grading,
        metrics,
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
    tracing::info!("Grading service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))

        // Phase 1: Essay + Submit
        .route("/api/grading/essay", post(handlers::essay::grade_essay))
        .route("/api/grading/submit", post(handlers::submit::submit_grading))

        // Phase 2: Batch + Dashboard
        .route("/api/grading/batch", post(handlers::batch::batch_grade))
        .route("/api/grading/batch", get(handlers::batch::list_batch_submissions))
        .route("/api/grading/dashboard", get(handlers::dashboard::get_dashboard))

        // Phase 3: Review + Secure + Grade + Submission CRUD
        .route("/api/grading/review", post(handlers::review::submit_review))
        .route("/api/grading/review", get(handlers::review::get_review_tasks))
        .route("/api/grading/secure", post(handlers::secure::secure_submit))
        .route("/api/grading/grade", post(handlers::grade::grade_action))
        .route("/api/grading/grade", get(handlers::grade::grade_query))
        .route("/api/grading/:id", get(handlers::submission::get_submission))
        .route("/api/grading/:id", patch(handlers::submission::update_submission))
        .route("/api/grading/:id", delete(handlers::submission::delete_submission))

        .with_state(state)
}
