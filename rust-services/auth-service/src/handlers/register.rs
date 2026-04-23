use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;
use crate::error::{AuthError, Result};
use crate::models::{AuthTokens, RegisterResponse};

#[derive(Debug, Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: Option<String>,
}

/// POST /api/auth/register
///
/// Returns AuthResponse matching frontend:
/// `{ user: User, tokens: { accessToken, refreshToken, expiresIn } }`
///
/// Password validation: minimum 6 chars only (matches Zod schema in Register.tsx)
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterBody>,
) -> Result<Json<RegisterResponse>> {
    let email = body.email.trim().to_lowercase();

    tracing::info!(email = %email, name = %body.name, "Registration attempt");

    // Validate password — match frontend Zod schema (min 6 chars)
    if body.password.len() < 6 {
        return Err(AuthError::Validation("Password must be at least 6 characters".to_string()));
    }
    if body.password.len() > 100 {
        return Err(AuthError::Validation("Password too long".to_string()));
    }

    // Check if user already exists
    let existing = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User" WHERE email = $1"#
    )
    .bind(&email)
    .fetch_one(&state.db)
    .await?;

    if existing > 0 {
        tracing::warn!(email = %email, "User already exists");
        return Err(AuthError::UserAlreadyExists);
    }

    // Hash password
    let hashed_password = state.auth.hash_password(&body.password)?;

    // Generate user ID
    let user_id = format!("user_{}_{}", Utc::now().timestamp(), &Uuid::new_v4().to_string()[..8]);

    // Create user
    let user = sqlx::query_as::<_, crate::models::User>(
        r#"
        INSERT INTO "User" (
            id, email, name, password, role,
            "emailVerified", "twoFactorEnabled", "twoFactorSecret",
            "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
            "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, NULL, false, NULL, 0, NULL, NULL, NULL, $6, $7)
        RETURNING id, email, name, password, role, image,
                  "emailVerified", "twoFactorEnabled", "twoFactorSecret",
                  "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
                  "createdAt", "updatedAt"
        "#
    )
    .bind(&user_id)
    .bind(&email)
    .bind(&body.name)
    .bind(&hashed_password)
    .bind(body.role.as_deref().unwrap_or("STUDENT"))
    .bind(Utc::now().naive_utc())
    .bind(Utc::now().naive_utc())
    .fetch_one(&state.db)
    .await?;

    tracing::info!(user_id = %user.id, email = %email, "User created");

    // Try to send verification email (non-fatal if email service unavailable)
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let verification_token = Uuid::new_v4().to_string();
    let token_expires = Utc::now() + Duration::hours(24);

    // Create verification token (best-effort)
    let _ = sqlx::query(
        r#"INSERT INTO "VerificationToken" (identifier, token, expires) VALUES ($1, $2, $3)"#
    )
    .bind(&email)
    .bind(&verification_token)
    .bind(token_expires.naive_utc())
    .execute(&state.db)
    .await;

    // Send verification email (best-effort — don't fail registration if email fails)
    let _ = state
        .email
        .send_verification_email(&email, &body.name, &verification_token, &app_url)
        .await;

    tracing::info!(user_id = %user.id, "Registration complete");

    // Issue JWT immediately so user can log in without waiting for email verification
    let jwt_expiry_hours = state.auth.expiry_hours();
    let token = state.auth.generate_token(&user.id, &user.email, &user.role)?;

    Ok(Json(RegisterResponse {
        user: user.to_user_info(),
        tokens: AuthTokens {
            access_token: token,
            refresh_token: String::new(),
            expires_in: jwt_expiry_hours * 3600,
        },
    }))
}
