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
    pub gcs_configured: bool,
}

/// GET /health
pub async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>> {
    let database_connected: bool = sqlx::query_scalar::<_, bool>("SELECT true")
        .fetch_one(&state.db)
        .await
        .unwrap_or(false);

    let gcs_configured = state.media.is_gcs_configured();

    Ok(Json(HealthResponse {
        status: "healthy",
        service: "media-service",
        version: "0.1.0",
        database_connected,
        gcs_configured,
    }))
}
