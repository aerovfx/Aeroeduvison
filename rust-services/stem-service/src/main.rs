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
use crate::services::StemService;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub stem: StemService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "stem_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("STEM_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8097".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());

    // Initialize database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize service
    let stem_service = StemService::new(jwt_secret);

    // Create app state
    let state = AppState {
        db: pool,
        stem: stem_service,
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
    tracing::info!("🔬 STEM service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Physics simulations
        .route("/api/physics/motion", post(handlers::physics_motion))
        .route("/api/physics/projectile", post(handlers::physics_projectile))
        .route("/api/physics/harmonic", post(handlers::physics_harmonic))
        // Chemistry labs
        .route("/api/chemistry/balance", post(handlers::chemistry_balance))
        .route("/api/chemistry/enthalpy", post(handlers::chemistry_enthalpy))
        .route("/api/chemistry/molecule/3d", get(handlers::chemistry_molecule_3d))
        // STEM projects
        .route("/api/stem/projects", get(handlers::list_projects))
        .route("/api/stem/projects", post(handlers::create_project))
        .route("/api/stem/projects/:id", get(handlers::get_project))
        .route("/api/stem/projects/:id", put(handlers::update_project))
        .route("/api/stem/projects/:id", delete(handlers::delete_project))
        // Lab completion
        .route("/api/lab-completion", get(handlers::list_completions))
        .route("/api/lab-completion", post(handlers::record_completion))
        .with_state(state)
}
