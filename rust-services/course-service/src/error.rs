use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CourseError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Course not found")]
    CourseNotFound,

    #[error("Chapter not found")]
    ChapterNotFound,

    #[error("Invalid course data")]
    InvalidCourseData,

    #[error("Invalid chapter data")]
    InvalidChapterData,

    #[error("Course already published")]
    CourseAlreadyPublished,

    #[error("Course already unpublished")]
    CourseAlreadyUnpublished,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for CourseError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            CourseError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized")
            }
            CourseError::CourseNotFound => {
                (StatusCode::NOT_FOUND, "Course not found")
            }
            CourseError::ChapterNotFound => {
                (StatusCode::NOT_FOUND, "Chapter not found")
            }
            CourseError::InvalidCourseData => {
                (StatusCode::BAD_REQUEST, "Invalid course data")
            }
            CourseError::InvalidChapterData => {
                (StatusCode::BAD_REQUEST, "Invalid chapter data")
            }
            CourseError::CourseAlreadyPublished => {
                (StatusCode::BAD_REQUEST, "Course is already published")
            }
            CourseError::CourseAlreadyUnpublished => {
                (StatusCode::BAD_REQUEST, "Course is already unpublished")
            }
            CourseError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg.as_str())
            }
            CourseError::Conflict(msg) => {
                (StatusCode::CONFLICT, msg.as_str())
            }
            CourseError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            CourseError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            CourseError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, CourseError>;
