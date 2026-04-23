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
    // Address priority:
    //   1. AUTH_SERVICE_ADDR (explicit override — used in start.sh to bind localhost:8092)
    //   2. PORT env var (Cloud Run — only used when running as standalone service)
    //   3. Default 127.0.0.1:8092 (local dev)
    let addr = std::env::var("AUTH_SERVICE_ADDR").unwrap_or_else(|_| {
        std::env::var("PORT")
            .map(|p| format!("0.0.0.0:{}", p))
            .unwrap_or_else(|_| "127.0.0.1:8092".to_string())
    });
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

    // Initialize database pool with timeouts so hung connections fail fast instead of hanging.
    // - acquire_timeout: fail with error (not hang) if DB not reachable within 8s
    // - idle_timeout:    recycle idle connections (prevents stale connections after DB restarts)
    // - max_lifetime:    force-recycle connections to avoid long-lived stale TCP sessions
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(std::time::Duration::from_secs(8))
        .idle_timeout(std::time::Duration::from_secs(300))   // 5 min idle → recycle
        .max_lifetime(std::time::Duration::from_secs(1800))  // 30 min max per connection
        .connect_lazy(&database_url)
        .expect("Invalid DATABASE_URL format");

    // Tables managed by Prisma — no sqlx migrations needed

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
        .route("/api/auth/google", post(handlers::google_login))
        .route("/api/auth/logout", post(handlers::logout))
        .route("/api/auth/me", get(handlers::get_current_user))
        // Password reset
        .route("/api/auth/forgot-password", post(handlers::forgot_password))
        .route("/api/auth/reset-password", post(handlers::reset_password))
        // Email verification
        .route("/api/auth/verify", post(handlers::verify_email))
        .route("/api/auth/resend-verification", post(handlers::resend_verification))
        // Token refresh & password change
        .route("/api/auth/refresh", post(handlers::refresh_token))
        .route("/api/auth/change-password", post(handlers::change_password))
        .with_state(state)
}
