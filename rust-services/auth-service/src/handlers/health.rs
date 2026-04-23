use axum::extract::State;
use axum::Json;
use std::time::Duration;

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
/// Always returns 200 immediately — DB check is best-effort with short timeout.
/// Cloud Run uses this for startup/liveness probes; must respond fast.
pub async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>> {
    // Short-circuit DB check: 2s timeout so health never blocks Cloud Run probe
    let database_connected = tokio::time::timeout(
        Duration::from_secs(2),
        sqlx::query("SELECT 1").fetch_one(&state.db),
    )
    .await
    .map(|r| r.is_ok())
    .unwrap_or(false); // timeout → false, but still return 200

    Ok(Json(HealthResponse {
        status: "healthy",
        service: "auth-service",
        version: "0.1.0",
        database_connected,
    }))
}
