use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Internal server error")]
    InternalServerError,
}

impl IntoResponse for ServiceError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ServiceError::DatabaseError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", msg),
            ),
            ServiceError::NotFound => (StatusCode::NOT_FOUND, "Not found".to_string()),
            ServiceError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            ServiceError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            ServiceError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ServiceError::InternalServerError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

impl From<sqlx::Error> for ServiceError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => ServiceError::NotFound,
            _ => ServiceError::DatabaseError(err.to_string()),
        }
    }
}
