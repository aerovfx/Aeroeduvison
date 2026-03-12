use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use serde::Deserialize;

use crate::AppState;
use crate::db::record_failed_login;
use crate::error::{AuthError, Result};

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordBody {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordBody {
    pub token: String,
    pub new_password: String,
}

/// POST /api/auth/forgot-password
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(body): Json<ForgotPasswordBody>,
) -> Result<Json<serde_json::Value>> {
    let email = body.email.trim().to_lowercase();

    // Always return success to prevent email enumeration
    let success_response = Json(serde_json::json!({
        "success": true,
        "message": "If an account exists with this email, a password reset link has been sent."
    }));

    // Fetch user
    let user = match sqlx::query_as::<_, crate::models::User>(
        r#"
        SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
        FROM "User" WHERE email = $1
        "#
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await?
    {
        Some(u) => u,
        None => {
            // User doesn't exist - still return success (security best practice)
            return Ok(success_response);
        }
    };

    // Generate reset token
    let reset_token = crate::services::AuthService::generate_reset_token();
    let expires = Utc::now() + Duration::hours(1);

    // Delete any existing reset tokens
    sqlx::query(r#"DELETE FROM "PasswordResetToken" WHERE email = $1"#)
        .bind(&email)
        .execute(&state.db)
        .await?;

    // Store new reset token
    sqlx::query(
        r#"
        INSERT INTO "PasswordResetToken" (email, token, expires)
        VALUES ($1, $2, $3)
        "#
    )
    .bind(&email)
    .bind(&reset_token)
    .bind(expires)
    .execute(&state.db)
    .await?;

    // Send reset email
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    state
        .email
        .send_password_reset_email(&email, user.name.as_deref().unwrap_or("User"), &reset_token, &app_url)
        .await?;

    tracing::info!(email = %email, "Password reset email sent");

    Ok(success_response)
}

/// POST /api/auth/reset-password
pub async fn reset_password(
    State(state): State<AppState>,
    Json(body): Json<ResetPasswordBody>,
) -> Result<Json<serde_json::Value>> {
    // Validate reset token
    let reset_token = sqlx::query_as::<_, crate::models::PasswordResetToken>(
        r#"SELECT * FROM "PasswordResetToken" WHERE token = $1 AND expires > $2"#
    )
    .bind(&body.token)
    .bind(Utc::now())
    .fetch_optional(&state.db)
    .await?;

    let reset_token = match reset_token {
        Some(t) => t,
        None => {
            return Err(AuthError::InvalidToken);
        }
    };

    // Validate password strength
    validate_password(&body.new_password)?;

    // Hash new password
    let hashed_password = state.auth.hash_password(&body.new_password)?;

    // Update user password
    sqlx::query(
        r#"UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE email = $3"#
    )
    .bind(&hashed_password)
    .bind(Utc::now())
    .bind(&reset_token.email)
    .execute(&state.db)
    .await?;

    // Delete used reset token
    sqlx::query(r#"DELETE FROM "PasswordResetToken" WHERE email = $1"#)
        .bind(&reset_token.email)
        .execute(&state.db)
        .await?;

    tracing::info!(email = %reset_token.email, "Password reset successful");

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Password reset successfully"
    })))
}

fn validate_password(password: &str) -> Result<()> {
    let mut errors = Vec::new();

    if password.len() < 8 {
        errors.push("Password must be at least 8 characters");
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        errors.push("Password must contain at least one uppercase letter");
    }
    if !password.chars().any(|c| c.is_lowercase()) {
        errors.push("Password must contain at least one lowercase letter");
    }
    if !password.chars().any(|c| c.is_numeric()) {
        errors.push("Password must contain at least one number");
    }

    if !errors.is_empty() {
        return Err(crate::error::AuthError::Validation(errors.join("; ")));
    }

    Ok(())
}
