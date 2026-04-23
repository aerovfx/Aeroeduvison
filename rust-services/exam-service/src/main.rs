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
                .unwrap_or_else(|_| "exam_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Configuration
    let addr = std::env::var("EXAM_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8107".to_string());
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
    tracing::info!("Exam service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))

        // Online exam rooms
        .route("/api/online-exam-room", get(handlers::rooms::list_rooms))
        .route("/api/online-exam-room", post(handlers::rooms::create_room))
        .route("/api/online-exam-room/:id", get(handlers::rooms::get_room))
        .route("/api/online-exam-room/:id", patch(handlers::rooms::update_room))
        .route("/api/online-exam-room/:id", delete(handlers::rooms::delete_room))

        // Exam taking and submission
        .route("/api/online-exam-room/:id/take", get(handlers::participants::get_exam_questions))
        .route("/api/online-exam-room/:id/submit", post(handlers::participants::submit_answers))
        .route("/api/online-exam-room/join", post(handlers::participants::join_room))

        // Schedules
        .route("/api/online-exam-room/:id/schedule", get(handlers::schedules::list_schedules))
        .route("/api/online-exam-room/:id/schedule", post(handlers::schedules::create_schedule))
        .route("/api/online-exam-room/:id/schedule/activate", post(handlers::schedules::activate_schedule))

        .with_state(state)
}
