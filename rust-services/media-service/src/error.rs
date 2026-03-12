use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MediaError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Document not found")]
    DocumentNotFound,

    #[error("Exam matrix not found")]
    ExamMatrixNotFound,

    #[error("Invalid request data")]
    InvalidRequest,

    #[error("Upload error: {0}")]
    UploadError(String),

    #[error("GCS error: {0}")]
    GcsError(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for MediaError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            MediaError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            MediaError::DocumentNotFound => {
                (StatusCode::NOT_FOUND, "Document not found")
            }
            MediaError::ExamMatrixNotFound => {
                (StatusCode::NOT_FOUND, "Exam matrix not found")
            }
            MediaError::InvalidRequest => {
                (StatusCode::BAD_REQUEST, "Invalid request data")
            }
            MediaError::UploadError(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
            MediaError::GcsError(e) => {
                tracing::error!("GCS error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Cloud storage error")
            }
            MediaError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            MediaError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            MediaError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, MediaError>;
