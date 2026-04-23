use emotion_service::{create_app, AppState};
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let service_addr = std::env::var("EMOTION_SERVICE_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8105".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    // Tables managed by Prisma — no sqlx migrations needed

    let state = AppState {
        db: pool,
        jwt_secret,
    };

    let app = create_app(state);

    let listener = tokio::net::TcpListener::bind(&service_addr)
        .await
        .expect("Failed to bind listener");

    tracing::info!("Emotion service listening on {}", service_addr);

    axum::serve(listener, app).await.expect("Server failed");
}
