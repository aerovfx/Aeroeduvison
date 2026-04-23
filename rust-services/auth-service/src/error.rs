use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("User not found")]
    UserNotFound,

    #[error("User already exists")]
    UserAlreadyExists,

    #[error("Account locked")]
    AccountLocked { locked_until: chrono::NaiveDateTime, remaining_minutes: i64 },

    #[error("Account deactivated")]
    AccountDeactivated,

    #[error("2FA required")]
    TwoFactorRequired,

    #[error("Invalid 2FA code")]
    InvalidTwoFactorCode,

    #[error("2FA not enabled")]
    TwoFactorNotEnabled,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Email error: {0}")]
    Email(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AuthError::InvalidCredentials => {
                (StatusCode::UNAUTHORIZED, "Invalid email or password")
            }
            AuthError::UserNotFound => {
                (StatusCode::NOT_FOUND, "User not found")
            }
            AuthError::UserAlreadyExists => {
                (StatusCode::CONFLICT, "User with this email already exists")
            }
            AuthError::AccountLocked { locked_until, remaining_minutes } => {
                return (
                    StatusCode::LOCKED,
                    Json(json!({
                        "error": "Account is temporarily locked due to too many failed login attempts",
                        "lockedUntil": locked_until.and_utc().to_rfc3339(),
                        "remainingMinutes": remaining_minutes
                    }))
                ).into_response();
            }
            AuthError::AccountDeactivated => {
                (StatusCode::FORBIDDEN, "Account is deactivated. Please contact support.")
            }
            AuthError::TwoFactorRequired => {
                return (
                    StatusCode::OK,
                    Json(json!({
                        "success": true,
                        "requires2FA": true,
                        "message": "Two-factor authentication required"
                    }))
                ).into_response();
            }
            AuthError::InvalidTwoFactorCode => {
                (StatusCode::UNAUTHORIZED, "Invalid 2FA code")
            }
            AuthError::TwoFactorNotEnabled => {
                (StatusCode::BAD_REQUEST, "2FA is not enabled for this account")
            }
            AuthError::InvalidToken => {
                (StatusCode::UNAUTHORIZED, "Invalid or expired token")
            }
            AuthError::TokenExpired => {
                (StatusCode::UNAUTHORIZED, "Token has expired")
            }
            AuthError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            AuthError::Email(e) => {
                tracing::error!("Email error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send email")
            }
            AuthError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AuthError::Validation(e) => {
                (StatusCode::BAD_REQUEST, e.as_str())
            }
        };

        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AuthError>;
