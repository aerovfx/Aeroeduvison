use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::Result;
use crate::models::ChatRequest;

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub success: bool,
    pub response: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub user_id: String,
}

/// POST /api/ai-chat
pub async fn ai_chat(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ChatRequest>,
) -> Result<Json<ChatResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    // Generate AI response (placeholder - will integrate with LLM)
    let response = format!("AI response to: {}", body.message);

    Ok(Json(ChatResponse {
        success: true,
        response,
        timestamp: chrono::Utc::now(),
        user_id: user_id.to_string(),
    }))
}

/// POST /api/ai-tutor-chat
pub async fn tutor_chat(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ChatRequest>,
) -> Result<Json<ChatResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    // Generate tutor response (placeholder)
    let response = format!("Tutor response to: {}", body.message);

    Ok(Json(ChatResponse {
        success: true,
        response,
        timestamp: chrono::Utc::now(),
        user_id: user_id.to_string(),
    }))
}
