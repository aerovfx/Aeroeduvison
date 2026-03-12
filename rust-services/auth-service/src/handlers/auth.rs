use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::db::{is_account_locked, record_failed_login, reset_failed_attempts};
use crate::error::{AuthError, Result};
use crate::models::UserInfo;

#[derive(Debug, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
    pub callback_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginSuccess {
    pub success: bool,
    pub message: String,
    pub user: UserInfo,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_2fa: Option<bool>,
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<LoginSuccess>> {
    let email = body.email.to_lowercase().trim().to_string();
    
    tracing::info!(email = %email, "Login attempt");

    // Check if account is locked
    let lock_status = is_account_locked(&state.db, &email).await?;
    if lock_status.is_locked {
        tracing::warn!(email = %email, "Account locked");
        
        record_failed_login(&state.db, &email, None, "Account locked").await?;
        
        return Err(AuthError::AccountLocked {
            locked_until: lock_status.locked_until.unwrap(),
            remaining_minutes: lock_status.remaining_minutes,
        });
    }

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
    .bind(&email)
    .fetch_optional(&state.db)
    .await?;

    let user = match user {
        Some(u) => u,
        None => {
            tracing::warn!(email = %email, "User not found");
            record_failed_login(&state.db, &email, None, "User not found").await?;
            return Err(AuthError::InvalidCredentials);
        }
    };

    // Check if user has password (OAuth-only accounts)
    if user.password.is_none() {
        tracing::warn!(email = %email, "User has no password (OAuth account)");
        record_failed_login(&state.db, &email, Some(&user.id), "No password set").await?;
        return Err(AuthError::Internal("Please sign in with your social account (Google)".to_string()));
    }

    // Verify password
    let password_valid = state.auth.verify_password(
        &body.password,
        &user.password.clone().unwrap()
    )?;

    if !password_valid {
        tracing::warn!(email = %email, "Invalid password");
        record_failed_login(&state.db, &email, Some(&user.id), "Invalid password").await?;
        return Err(AuthError::InvalidCredentials);
    }

    // Check 2FA if enabled
    if user.two_factor_enabled {
        tracing::info!(email = %email, "2FA required");
        
        // Reset failed attempts before returning 2FA required
        reset_failed_attempts(&state.db, &email).await?;
        
        return Ok(Json(LoginSuccess {
            success: true,
            message: "Two-factor authentication required".to_string(),
            user: user.to_user_info(),
            token: None,
            callback_url: body.callback_url,
            requires_2fa: Some(true),
        }));
    }

    // Success - reset failed attempts
    reset_failed_attempts(&state.db, &email).await?;

    tracing::info!(email = %email, user_id = %user.id, "Login successful");

    let token = state.auth.generate_token(&user.id, &user.email, &user.role)?;

    Ok(Json(LoginSuccess {
        success: true,
        message: "Login successful".to_string(),
        user: user.to_user_info(),
        token: Some(token),
        callback_url: body.callback_url,
        requires_2fa: None,
    }))
}

/// GET /api/auth/me - Get current user from JWT
pub async fn get_current_user(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<UserInfo>> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AuthError::InvalidToken)?;

    let token = auth_header.strip_prefix("Bearer ").ok_or(AuthError::InvalidToken)?;
    
    let claims = state.auth.validate_token(token)?;

    // Fetch user from database
    let user = sqlx::query_as::<_, crate::models::User>(
        r#"
        SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
        FROM "User" WHERE id = $1
        "#
    )
    .bind(&claims.sub)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(user.to_user_info()))
}

/// POST /api/auth/logout - Invalidate token (client-side removal)
pub async fn logout() -> Result<Json<serde_json::Value>> {
    // JWT is stateless - client just needs to remove the token
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Logout successful"
    })))
}
