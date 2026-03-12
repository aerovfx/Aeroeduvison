use axum::{extract::State, Json};
use serde::Deserialize;

use crate::AppState;
use crate::error::{AuthError, Result};

#[derive(Debug, Deserialize)]
pub struct VerifyEmailBody {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ResendVerificationBody {
    pub email: String,
}

/// POST /api/auth/verify
pub async fn verify_email(
    State(state): State<AppState>,
    Json(body): Json<VerifyEmailBody>,
) -> Result<Json<serde_json::Value>> {
    // Find verification token
    let token = sqlx::query_as::<_, crate::models::VerificationToken>(
        r#"SELECT * FROM "VerificationToken" WHERE token = $1 AND expires > $2"#
    )
    .bind(&body.token)
    .bind(chrono::Utc::now())
    .fetch_optional(&state.db)
    .await?;

    let token = match token {
        Some(t) => t,
        None => {
            return Err(AuthError::InvalidToken);
        }
    };

    // Find user by email
    let user = sqlx::query_as::<_, crate::models::User>(
        r#"
        SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
        FROM "User" WHERE email = $1
        "#
    )
    .bind(&token.identifier)
    .fetch_optional(&state.db)
    .await?;

    let user = match user {
        Some(u) => u,
        None => {
            return Err(AuthError::UserNotFound);
        }
    };

    // Mark email as verified
    sqlx::query(
        r#"UPDATE "User" SET "emailVerified" = $1, "updatedAt" = $2 WHERE id = $3"#
    )
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .bind(&user.id)
    .execute(&state.db)
    .await?;

    // Delete used verification token
    sqlx::query(r#"DELETE FROM "VerificationToken" WHERE identifier = $1"#)
        .bind(&token.identifier)
        .execute(&state.db)
        .await?;

    tracing::info!(email = %user.email, "Email verified successfully");

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Email verified successfully"
    })))
}

/// POST /api/auth/resend-verification
pub async fn resend_verification(
    State(state): State<AppState>,
    Json(body): Json<ResendVerificationBody>,
) -> Result<Json<serde_json::Value>> {
    let email = body.email.trim().to_lowercase();

    // Find user
    let user = sqlx::query_as::<_, crate::models::User>(
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
    .await?;

    let user = match user {
        Some(u) => u,
        None => {
            // Don't reveal if user exists
            return Ok(Json(serde_json::json!({
                "success": true,
                "message": "If an account exists, a verification email has been sent."
            })));
        }
    };

    // Check if already verified
    if user.email_verified.is_some() {
        return Ok(Json(serde_json::json!({
            "success": true,
            "message": "Email is already verified."
        })));
    }

    // Generate new verification token
    let verification_token = uuid::Uuid::new_v4().to_string();
    let token_expires = chrono::Utc::now() + chrono::Duration::hours(24);

    // Delete old tokens
    sqlx::query(r#"DELETE FROM "VerificationToken" WHERE identifier = $1"#)
        .bind(&email)
        .execute(&state.db)
        .await?;

    // Store new token
    sqlx::query(
        r#"
        INSERT INTO "VerificationToken" (identifier, token, expires)
        VALUES ($1, $2, $3)
        "#
    )
    .bind(&email)
    .bind(&verification_token)
    .bind(token_expires)
    .execute(&state.db)
    .await?;

    // Send verification email
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    state
        .email
        .send_verification_email(&email, user.name.as_deref().unwrap_or("User"), &verification_token, &app_url)
        .await?;

    tracing::info!(email = %email, "Verification email resent");

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "If an account exists, a verification email has been sent."
    })))
}
