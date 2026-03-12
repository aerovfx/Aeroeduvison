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
use crate::services::CourseService;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub course: CourseService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "course_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("COURSE_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8093".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Initialize service
    let course_service = CourseService::new(jwt_secret);

    // Create app state
    let state = AppState {
        db: pool,
        course: course_service,
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
    tracing::info!("📚 Course service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Course routes
        .route("/api/courses", post(handlers::create_course))
        .route("/api/courses", get(handlers::list_courses))
        .route("/api/courses/:id", get(handlers::get_course))
        .route("/api/courses/:id", put(handlers::update_course))
        .route("/api/courses/:id", delete(handlers::delete_course))
        .route("/api/courses/:id/publish", post(handlers::publish_course))
        .route("/api/courses/:id/unpublish", post(handlers::unpublish_course))
        // Chapter routes
        .route("/api/courses/:course_id/chapters", post(handlers::create_chapter))
        .route("/api/courses/:course_id/chapters", get(handlers::list_chapters))
        .route("/api/courses/:course_id/chapters/:id", get(handlers::get_chapter))
        .route("/api/courses/:course_id/chapters/:id", put(handlers::update_chapter))
        .route("/api/courses/:course_id/chapters/:id", delete(handlers::delete_chapter))
        .route("/api/courses/:course_id/chapters/reorder", post(handlers::reorder_chapters))
        .route("/api/courses/:course_id/chapters/:id/publish", post(handlers::publish_chapter))
        .route("/api/courses/:course_id/chapters/:id/unpublish", post(handlers::unpublish_chapter))
        // Progress routes
        .route("/api/courses/:course_id/chapters/:id/progress", get(handlers::get_progress))
        .route("/api/courses/:course_id/chapters/:id/progress", post(handlers::update_progress))
        .with_state(state)
}
