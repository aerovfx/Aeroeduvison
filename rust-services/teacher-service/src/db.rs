use sqlx::postgres::PgPool;

pub type DbPool = PgPool;

pub async fn init_pool(database_url: &str) -> DbPool {
    sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await
        .expect("Failed to create database pool")
}
