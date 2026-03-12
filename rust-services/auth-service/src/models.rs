use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

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
pub struct TwoFactorDisableRequest {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub user: UserInfo,
    pub callback_url: Option<String>,
    pub requires_2fa: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub success: bool,
    pub message: String,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub image: Option<String>,
    pub role: String,
    pub email_verified: Option<NaiveDateTime>,
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

impl User {
    pub fn to_user_info(&self) -> UserInfo {
        UserInfo {
            id: self.id.clone(),
            email: self.email.clone(),
            name: self.name.clone().unwrap_or_else(|| "User".to_string()),
            image: self.image.clone(),
            role: self.role.clone(),
            email_verified: self.email_verified,
        }
    }
}
