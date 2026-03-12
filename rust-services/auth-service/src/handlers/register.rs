use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;
use crate::db::record_failed_login;
use crate::error::{AuthError, Result};
use crate::models::{RegisterRequest, RegisterResponse, UserInfo};

#[derive(Debug, Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: Option<String>,
}

/// POST /api/auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterBody>,
) -> Result<Json<RegisterResponse>> {
    let email = body.email.trim().to_lowercase();
    
    tracing::info!(email = %email, name = %body.name, "Registration attempt");

    // Validate password strength
    validate_password(&body.password)?;

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
    let user_id = format!("user_{}_{}", Utc::now().timestamp(), Uuid::new_v4().to_string()[..8].to_string());

    // Generate verification token
    let verification_token = Uuid::new_v4().to_string();
    let token_expires = Utc::now() + Duration::hours(24);

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
    .bind(Utc::now())
    .bind(Utc::now())
    .fetch_one(&state.db)
    .await?;

    tracing::info!(user_id = %user.id, email = %email, "User created");

    // Create verification token in database
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

    tracing::info!(user_id = %user.id, "Verification token created");

    // Send verification email
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    state
        .email
        .send_verification_email(&email, &body.name, &verification_token, &app_url)
        .await?;

    tracing::info!(user_id = %user.id, "Verification email sent");

    Ok(Json(RegisterResponse {
        success: true,
        message: "Account created successfully. Please check your email to verify your account.".to_string(),
        user: user.to_user_info(),
    }))
}

fn validate_password(password: &str) -> Result<()> {
    let mut errors = Vec::new();

    if password.len() < 8 {
        errors.push("Password must be at least 8 characters");
    }
    if password.len() > 100 {
        errors.push("Password must be less than 100 characters");
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
    if !password.chars().any(|c| !c.is_alphanumeric()) {
        errors.push("Password must contain at least one special character");
    }

    if !errors.is_empty() {
        return Err(AuthError::Validation(errors.join("; ")));
    }

    Ok(())
}
