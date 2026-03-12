use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AdminError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden - Admin access required")]
    Forbidden,

    #[error("User not found")]
    UserNotFound,

    #[error("Student not found")]
    StudentNotFound,

    #[error("Invalid request data")]
    InvalidRequest,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for AdminError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AdminError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            AdminError::Forbidden => {
                (StatusCode::FORBIDDEN, "Admin access required")
            }
            AdminError::UserNotFound => {
                (StatusCode::NOT_FOUND, "User not found")
            }
            AdminError::StudentNotFound => {
                (StatusCode::NOT_FOUND, "Student not found")
            }
            AdminError::InvalidRequest => {
                (StatusCode::BAD_REQUEST, "Invalid request data")
            }
            AdminError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            AdminError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AdminError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AdminError>;
