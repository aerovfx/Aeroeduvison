use assignments_service::{create_app, AppState};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET not set");
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let addr = std::env::var("ASSIGNMENTS_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8102".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .expect("Failed to connect to database");

    let state = Arc::new(AppState {
        db: pool,
        jwt_secret,
    });

    let app = create_app(state);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind address");

    tracing::info!("Server running on http://{}", addr);

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
