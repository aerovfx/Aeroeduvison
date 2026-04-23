use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── DB row structs (sqlx) ─────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub password: Option<String>,
    pub role: String,
    pub image: Option<String>,
    #[sqlx(rename = "emailVerified")]
    pub email_verified: Option<NaiveDateTime>,
    #[sqlx(rename = "twoFactorEnabled")]
    pub two_factor_enabled: bool,
    #[sqlx(rename = "twoFactorSecret")]
    pub two_factor_secret: Option<String>,
    #[sqlx(rename = "failedLoginAttempts")]
    pub failed_login_attempts: i32,
    #[sqlx(rename = "lockedUntil")]
    pub locked_until: Option<NaiveDateTime>,
    #[sqlx(rename = "lastLoginAt")]
    pub last_login_at: Option<NaiveDateTime>,
    #[sqlx(rename = "lastLoginIp")]
    pub last_login_ip: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub user_id: String,
    pub provider: String,
    pub provider_account_id: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub id_token: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct VerificationToken {
    pub identifier: String,
    pub token: String,
    pub expires: NaiveDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PasswordResetToken {
    pub email: String,
    pub token: String,
    pub expires: NaiveDateTime,
}

// ── Request bodies ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub callback_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TwoFactorSetupRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TwoFactorVerifyRequest {
    pub user_id: String,
    pub code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
}

// ── UserInfo — serialized as camelCase to match frontend User type ────────────

/// Matches frontend:
/// ```ts
/// interface User {
///   id, name, email, image, role,
///   isTwoFactorEnabled, createdAt, updatedAt
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub image: Option<String>,
    pub role: String,
    pub is_two_factor_enabled: bool,
    pub created_at: String,  // ISO 8601 string
    pub updated_at: String,
}

// ── AuthTokens — matches frontend AuthTokens interface ───────────────────────
/// ```ts
/// interface AuthTokens { accessToken, refreshToken, expiresIn }
/// ```
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String, // reserved for future httpOnly cookie flow
    pub expires_in: u64,       // seconds
}

// ── AuthResponse — matches frontend AuthResponse interface ───────────────────
/// ```ts
/// interface AuthResponse { user: User, tokens: AuthTokens }
/// ```
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserInfo,
    pub tokens: AuthTokens,
}

// ── Login-specific extras (2FA, callback) ────────────────────────────────────
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub user: UserInfo,
    pub tokens: AuthTokens,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_2fa: Option<bool>,
}

/// Lightweight 2FA challenge response (no tokens yet)
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwoFaChallengeResponse {
    pub success: bool,
    pub message: String,
    pub user: UserInfo,
    pub requires_2fa: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user: UserInfo,
    pub tokens: AuthTokens,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TwoFactorSetupResponse {
    pub success: bool,
    pub secret: String,
    pub qr_code_url: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}

// ── Refresh response — matches frontend api.ts interceptor ───────────────────
/// Frontend expects: `data.accessToken`
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResponse {
    pub access_token: String,
    pub expires_in: u64,
    pub user: UserInfo,
}

// ── Builder helpers ───────────────────────────────────────────────────────────

impl User {
    pub fn to_user_info(&self) -> UserInfo {
        UserInfo {
            id: self.id.clone(),
            email: self.email.clone(),
            name: self.name.clone().unwrap_or_else(|| "User".to_string()),
            image: self.image.clone(),
            role: self.role.clone(),
            is_two_factor_enabled: self.two_factor_enabled,
            created_at: self.created_at.and_utc().to_rfc3339(),
            updated_at: self.updated_at.and_utc().to_rfc3339(),
        }
    }
}
