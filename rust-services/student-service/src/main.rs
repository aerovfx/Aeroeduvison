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
use crate::services::StudentService;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub student: StudentService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "student_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("STUDENT_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8096".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize service
    let student_service = StudentService::new(jwt_secret);

    // Create app state
    let state = AppState {
        db: pool,
        student: student_service,
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
    tracing::info!("🎓 Student service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Students
        .route("/api/students", get(handlers::list_students))
        .route("/api/students/:id", get(handlers::get_student))
        .route("/api/students/:id", put(handlers::update_student))
        .route("/api/students/:id", delete(handlers::delete_student))
        // Classes
        .route("/api/classes", get(handlers::list_classes))
        .route("/api/classes/:id", get(handlers::get_class))
        .route("/api/classes", post(handlers::create_class))
        .route("/api/classes/:id", put(handlers::update_class))
        .route("/api/classes/:id", delete(handlers::delete_class))
        .route("/api/classes/:id/students", get(handlers::list_class_students))
        .route("/api/classes/:id/students/:student_id", post(handlers::add_student_to_class))
        // Learning Paths
        .route("/api/learning-paths", get(handlers::list_learning_paths))
        .route("/api/learning-path/create", post(handlers::create_learning_path))
        // PLG
        .route("/api/plg/:student_id", get(handlers::get_plg_data))
        .route("/api/plg/:student_id/update-skill", post(handlers::update_skill))
        .route("/api/plg/:student_id/record-interaction", post(handlers::record_interaction))
        .route("/api/plg/:student_id/recommendations", get(handlers::get_recommendations))
        // XP (Consolidated from /api/user/xp)
        .route("/api/user/xp", post(handlers::update_xp))
        // Users — list all users with optional role filter (replaces Next.js /api/users)
        .route("/api/users", get(handlers::list_users))
        // Student self-service routes (replaces Next.js /api/student/*)
        .route("/api/student/agent-settings", get(handlers::get_agent_settings).post(handlers::save_agent_settings))
        .route("/api/student/exams", get(handlers::get_student_exams))
        .with_state(state)
}
