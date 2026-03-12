use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StemError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Project not found")]
    ProjectNotFound,

    #[error("Invalid simulation parameters")]
    InvalidSimulationParams,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for StemError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            StemError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            StemError::ProjectNotFound => {
                (StatusCode::NOT_FOUND, "Project not found")
            }
            StemError::InvalidSimulationParams => {
                (StatusCode::BAD_REQUEST, "Invalid simulation parameters")
            }
            StemError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            StemError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            StemError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, StemError>;
