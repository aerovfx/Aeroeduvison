use axum::extract::State;
use axum::Json;

use crate::AppState;
use crate::error::Result;

#[derive(Debug, serde::Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}

/// GET /health
pub async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>> {
    let database_connected: bool = sqlx::query("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    Ok(Json(HealthResponse {
        status: "healthy",
        service: "course-service",
        version: "0.1.0",
        database_connected,
    }))
}
