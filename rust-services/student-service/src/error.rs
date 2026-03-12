use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StudentError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Student not found")]
    StudentNotFound,

    #[error("Class not found")]
    ClassNotFound,

    #[error("Learning path not found")]
    LearningPathNotFound,

    #[error("Invalid request data")]
    InvalidRequest,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for StudentError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            StudentError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            StudentError::Forbidden => {
                (StatusCode::FORBIDDEN, "Forbidden")
            }
            StudentError::StudentNotFound => {
                (StatusCode::NOT_FOUND, "Student not found")
            }
            StudentError::ClassNotFound => {
                (StatusCode::NOT_FOUND, "Class not found")
            }
            StudentError::LearningPathNotFound => {
                (StatusCode::NOT_FOUND, "Learning path not found")
            }
            StudentError::InvalidRequest => {
                (StatusCode::BAD_REQUEST, "Invalid request data")
            }
            StudentError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            StudentError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            StudentError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, StudentError>;
