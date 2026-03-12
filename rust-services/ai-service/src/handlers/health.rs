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
    pub ai_providers: AiProvidersStatus,
}

#[derive(Debug, serde::Serialize)]
pub struct AiProvidersStatus {
    pub grok: bool,
    pub openrouter: bool,
    pub openai: bool,
    pub ollama: bool,
}

/// GET /health
pub async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>> {
    let database_connected: bool = sqlx::query("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    let ai_providers = AiProvidersStatus {
        grok: !state.ai.grok_api_key.is_empty(),
        openrouter: !state.ai.openrouter_api_key.is_empty(),
        openai: !state.ai.openai_api_key.is_empty(),
        ollama: !state.ai.ollama_base_url.is_empty(),
    };

    Ok(Json(HealthResponse {
        status: "healthy",
        service: "ai-service",
        version: "0.1.0",
        database_connected,
        ai_providers,
    }))
}
