use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ChatError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Room not found")]
    RoomNotFound,

    #[error("User not found")]
    UserNotFound,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("JWT error: {0}")]
    JwtError(String),
}

impl IntoResponse for ChatError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ChatError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            ChatError::RoomNotFound => (StatusCode::NOT_FOUND, "Room not found".to_string()),
            ChatError::UserNotFound => (StatusCode::NOT_FOUND, "User not found".to_string()),
            ChatError::Database(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ),
            ChatError::Internal(e) => (StatusCode::INTERNAL_SERVER_ERROR, e),
            ChatError::InvalidRequest(e) => (StatusCode::BAD_REQUEST, e),
            ChatError::JwtError(e) => (StatusCode::UNAUTHORIZED, format!("JWT error: {}", e)),
        };

        let body = Json(json!({
            "error": error_message
        }));

        (status, body).into_response()
    }
}
