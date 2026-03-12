use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid request data")]
    InvalidRequest,

    #[error("Content not found")]
    ContentNotFound,

    #[error("AI provider error: {0}")]
    AiProvider(String),

    #[error("LLM API error: {0}")]
    LlmApi(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("OpenFang error: {0}")]
    OpenFangError(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

impl IntoResponse for AiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AiError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            AiError::InvalidRequest => {
                (StatusCode::BAD_REQUEST, "Invalid request data")
            }
            AiError::ContentNotFound => {
                (StatusCode::NOT_FOUND, "Content not found")
            }
            AiError::AiProvider(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
            AiError::LlmApi(e) => {
                tracing::error!("LLM API error: {}", e);
                (StatusCode::SERVICE_UNAVAILABLE, "AI service temporarily unavailable")
            }
            AiError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            AiError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AiError::ValidationError(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
            AiError::OpenFangError(e) => {
                tracing::error!("OpenFang error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Exam generation error")
            }
            AiError::NotFound(e) => {
                (StatusCode::NOT_FOUND, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AiError>;
