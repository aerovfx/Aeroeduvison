use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::db::{is_account_locked, record_failed_login, reset_failed_attempts};
use crate::error::{AuthError, Result};
use crate::models::{AuthTokens, LoginResponse, RefreshResponse, TwoFaChallengeResponse, UserInfo};

#[derive(Debug, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
    pub callback_url: Option<String>,
}

/// POST /api/auth/login
///
/// Returns AuthResponse matching frontend interface:
/// ```ts
/// interface AuthResponse { user: User; tokens: { accessToken, refreshToken, expiresIn } }
/// ```
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<LoginResponse>> {
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
        record_failed_login(&state.db, &email, Some(&user.id), "No password set").await?;
        return Err(AuthError::Internal("Please sign in with your social account (Google)".to_string()));
    }

    // Verify password
    let password_valid = state.auth.verify_password(&body.password, user.password.as_ref().unwrap())?;
    if !password_valid {
        tracing::warn!(email = %email, "Invalid password");
        record_failed_login(&state.db, &email, Some(&user.id), "Invalid password").await?;
        return Err(AuthError::InvalidCredentials);
    }

    // Reset failed attempts
    reset_failed_attempts(&state.db, &email).await?;

    // 2FA gate — return challenge before issuing tokens
    if user.two_factor_enabled {
        tracing::info!(email = %email, "2FA required");
        let user_info = user.to_user_info();
        // Return a 2FA challenge (no tokens yet — client must call /api/auth/2fa/verify)
        // We re-use LoginResponse but with requires_2fa=true and empty tokens placeholder.
        // The cleaner approach is a distinct type, but to avoid breaking the frontend
        // login flow we just return success with flag so the client can redirect.
        return Ok(Json(LoginResponse {
            user: user_info,
            tokens: AuthTokens {
                access_token: String::new(), // empty — client must complete 2FA first
                refresh_token: String::new(),
                expires_in: 0,
            },
            callback_url: body.callback_url,
            requires_2fa: Some(true),
        }));
    }

    tracing::info!(email = %email, user_id = %user.id, "Login successful");

    let jwt_expiry_hours = state.auth.expiry_hours();
    let token = state.auth.generate_token(&user.id, &user.email, &user.role)?;
    let user_info = user.to_user_info();

    Ok(Json(LoginResponse {
        user: user_info,
        tokens: AuthTokens {
            access_token: token,
            refresh_token: String::new(), // refresh via POST /api/auth/refresh with Bearer
            expires_in: jwt_expiry_hours * 3600,
        },
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
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvalidToken)?; // token valid but user deleted → 401, not 500

    Ok(Json(user.to_user_info()))
}

/// POST /api/auth/logout
pub async fn logout() -> Result<Json<serde_json::Value>> {
    Ok(Json(serde_json::json!({ "success": true, "message": "Logout successful" })))
}

// ── change-password ───────────────────────────────────────────────────────────

/// camelCase deserialization to match frontend:
/// `authService.changePassword(currentPassword, newPassword)`
/// sends `{ currentPassword, newPassword }`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordBody {
    pub current_password: String,
    pub new_password: String,
}

/// POST /api/auth/change-password
pub async fn change_password(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<ChangePasswordBody>,
) -> Result<Json<serde_json::Value>> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AuthError::InvalidToken)?;
    let token = auth_header.strip_prefix("Bearer ").ok_or(AuthError::InvalidToken)?;
    let claims = state.auth.validate_token(token)?;

    if body.new_password.len() < 6 {
        return Err(AuthError::Internal("New password must be at least 6 characters".to_string()));
    }

    let user = sqlx::query_as::<_, crate::models::User>(
        r#"SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
           FROM "User" WHERE id = $1"#
    )
    .bind(&claims.sub)
    .fetch_one(&state.db)
    .await?;

    let current_hash = user.password.ok_or_else(|| AuthError::Internal("No password set (OAuth account)".to_string()))?;
    let valid = state.auth.verify_password(&body.current_password, &current_hash)?;
    if !valid {
        return Err(AuthError::InvalidCredentials);
    }

    let new_hash = state.auth.hash_password(&body.new_password)?;
    sqlx::query(r#"UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE id = $3"#)
        .bind(&new_hash)
        .bind(chrono::Utc::now().naive_utc())
        .bind(&claims.sub)
        .execute(&state.db)
        .await?;

    tracing::info!(user_id = %claims.sub, "Password changed");
    Ok(Json(serde_json::json!({ "success": true, "message": "Password changed successfully" })))
}

// ── refresh ───────────────────────────────────────────────────────────────────

/// POST /api/auth/refresh
///
/// Frontend interceptor in api.ts expects: `data.accessToken`
/// (after serde rename_all = "camelCase" on RefreshResponse → `accessToken`)
///
/// Two supported modes:
///   1. Bearer <existing_token>  — re-issue based on current claims (silent refresh)
///   2. No token                 — return 401 so frontend redirects to /auth/login
pub async fn refresh_token(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<RefreshResponse>> {
    // No Bearer token → user has no session at all → 401
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AuthError::InvalidToken)?; // 401: triggers redirect to login
    let token = auth_header.strip_prefix("Bearer ").ok_or(AuthError::InvalidToken)?;

    // Validate token — allow expired tokens (validate only signature & claims structure)
    // so we can still issue a fresh token for recently expired sessions.
    // If token is deeply invalid (bad signature, malformed) → 401
    let claims = state.auth.validate_token(token)
        .or_else(|_| state.auth.validate_token_ignore_expiry(token))
        .map_err(|_| AuthError::InvalidToken)?;

    let user = sqlx::query_as::<_, crate::models::User>(
        r#"SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
           FROM "User" WHERE id = $1"#
    )
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    let jwt_expiry_hours = state.auth.expiry_hours();
    let new_token = state.auth.generate_token(&user.id, &user.email, &user.role)?;

    Ok(Json(RefreshResponse {
        access_token: new_token,
        expires_in: jwt_expiry_hours * 3600,
        user: user.to_user_info(),
    }))
}
