mod error;
mod handlers;
mod models;
mod services;
mod db;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::db::DbPool;
use crate::services::{AuthService, EmailService};

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub auth: AuthService,
    pub email: EmailService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "auth_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("AUTH_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8092".to_string());
    let mut database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    // Local dev: if DB requires TLS but sqlx was built without TLS, set AUTH_DATABASE_INSECURE_LOCAL=1
    // to use sslmode=disable (only for local development).
    if std::env::var("AUTH_DATABASE_INSECURE_LOCAL").ok().as_deref() == Some("1") {
        if database_url.contains("sslmode=require") {
            database_url = database_url.replace("sslmode=require", "sslmode=disable");
        } else if !database_url.contains("sslmode=") {
            let sep = if database_url.contains('?') { "&" } else { "?" };
            database_url.push_str(sep);
            database_url.push_str("sslmode=disable");
        }
    }
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-key-min-32-chars!!".to_string());
    let jwt_expiry_hours: u64 = std::env::var("JWT_EXPIRY_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    // Initialize database pool (TLS: Cargo.toml has runtime-tokio-rustls; or AUTH_DATABASE_INSECURE_LOCAL=1 for local)
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool (if TLS error: set AUTH_DATABASE_INSECURE_LOCAL=1 for local, or use DATABASE_URL without sslmode=require)");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Initialize services
    let auth_service = AuthService::new(jwt_secret, jwt_expiry_hours);
    let email_service = EmailService::new();

    // Create app state
    let state = AppState {
        db: pool,
        auth: auth_service,
        email: email_service,
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
    tracing::info!("🔐 Auth service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Auth routes
        .route("/api/auth/register", post(handlers::register))
        .route("/api/auth/login", post(handlers::login))
        .route("/api/auth/logout", post(handlers::logout))
        .route("/api/auth/me", get(handlers::get_current_user))
        // Password reset
        .route("/api/auth/forgot-password", post(handlers::forgot_password))
        .route("/api/auth/reset-password", post(handlers::reset_password))
        // Email verification
        .route("/api/auth/verify", post(handlers::verify_email))
        .route("/api/auth/resend-verification", post(handlers::resend_verification))
        .with_state(state)
}
