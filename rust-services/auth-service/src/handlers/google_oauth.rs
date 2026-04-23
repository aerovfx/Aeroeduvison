use axum::extract::State;
use axum::Json;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{AuthError, Result};
use crate::models::{AuthTokens, LoginResponse, User};

/// Body gửi từ frontend sau khi Google trả về credential
#[derive(Debug, Deserialize)]
pub struct GoogleLoginBody {
    /// Google ID token (JWT) từ Google Identity Services
    pub credential: String,
    pub callback_url: Option<String>,
}

/// Claims từ Google ID token (chỉ cần một số field)
///
/// NOTE: Google tokeninfo trả về `email_verified` là STRING "true"/"false",
/// không phải bool. Dùng custom deserializer để handle cả hai dạng.
#[derive(Debug, Deserialize)]
struct GoogleClaims {
    pub sub: String,      // Google user ID
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    #[serde(default, deserialize_with = "deserialize_bool_or_string")]
    pub email_verified: bool,
}

/// Google tokeninfo có thể trả về email_verified là bool hoặc string "true"/"false"
fn deserialize_bool_or_string<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum BoolOrString {
        Bool(bool),
        Str(String),
    }
    match BoolOrString::deserialize(deserializer)? {
        BoolOrString::Bool(b) => Ok(b),
        BoolOrString::Str(s) => Ok(s.eq_ignore_ascii_case("true")),
    }
}

/// Gọi Google tokeninfo API để verify credential và lấy user info
/// Endpoint: https://oauth2.googleapis.com/tokeninfo?id_token=<TOKEN>
async fn verify_google_credential(credential: &str) -> Result<GoogleClaims> {
    let url = format!(
        "https://oauth2.googleapis.com/tokeninfo?id_token={}",
        credential
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AuthError::Internal(format!("Google verify network error: {}", e)))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        tracing::warn!(status = status, body = %body, "Google tokeninfo rejected");
        return Err(AuthError::Internal("Invalid Google credential".to_string()));
    }

    let claims: GoogleClaims = resp
        .json()
        .await
        .map_err(|e| AuthError::Internal(format!("Google claims parse error: {}", e)))?;

    Ok(claims)
}

/// POST /api/auth/google
///
/// Flow:
///   1. Frontend gọi Google GSI → nhận credential (ID token)
///   2. Frontend POST { credential } tới đây
///   3. Backend verify với Google tokeninfo API
///   4. Tìm hoặc tạo user trong DB
///   5. Trả về JWT giống login thường
pub async fn google_login(
    State(state): State<AppState>,
    Json(body): Json<GoogleLoginBody>,
) -> Result<Json<LoginResponse>> {
    // 1. Verify Google token
    let claims = verify_google_credential(&body.credential).await?;

    tracing::info!(
        email = %claims.email,
        google_sub = %claims.sub,
        "Google OAuth login"
    );

    let email = claims.email.to_lowercase().trim().to_string();

    // 2. Tìm user theo email
    let existing_user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, name, password, role, image,
               "emailVerified", "twoFactorEnabled", "twoFactorSecret",
               "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
               "createdAt", "updatedAt"
        FROM "User" WHERE email = $1
        "#,
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await?;

    let user = match existing_user {
        Some(u) => {
            // User đã có → cập nhật image nếu chưa có
            if u.image.is_none() {
                if let Some(ref picture) = claims.picture {
                    sqlx::query(
                        r#"UPDATE "User" SET image = $1, "updatedAt" = $2 WHERE id = $3"#,
                    )
                    .bind(picture)
                    .bind(Utc::now().naive_utc())
                    .bind(&u.id)
                    .execute(&state.db)
                    .await
                    .ok();
                }
            }
            u
        }
        None => {
            // User chưa tồn tại → tạo mới (Google account không cần password)
            let new_id = Uuid::new_v4().to_string();
            let now = Utc::now().naive_utc();
            let display_name = claims
                .name
                .clone()
                .unwrap_or_else(|| email.split('@').next().unwrap_or("User").to_string());

            sqlx::query(
                r#"
                INSERT INTO "User" (
                    id, email, name, password, role, image,
                    "emailVerified", "twoFactorEnabled", "twoFactorSecret",
                    "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, NULL, 'STUDENT', $4,
                    $5, false, NULL,
                    0, NULL, $6, NULL,
                    $7, $8
                )
                "#,
            )
            .bind(&new_id)
            .bind(&email)
            .bind(&display_name)
            .bind(&claims.picture)
            .bind(now)   // emailVerified = now (Google already verified)
            .bind(now)   // lastLoginAt
            .bind(now)   // createdAt
            .bind(now)   // updatedAt
            .execute(&state.db)
            .await?;

            // Đồng thời tạo Account record (NextAuth compatible)
            let account_id = Uuid::new_v4().to_string();
            sqlx::query(
                r#"
                INSERT INTO "Account" (
                    id, "userId", provider, "providerAccountId", type,
                    "createdAt", "updatedAt"
                ) VALUES ($1, $2, 'google', $3, 'oauth', $4, $5)
                ON CONFLICT ("provider", "providerAccountId") DO NOTHING
                "#,
            )
            .bind(&account_id)
            .bind(&new_id)
            .bind(&claims.sub)
            .bind(now)
            .bind(now)
            .execute(&state.db)
            .await
            .ok(); // Không fail nếu đã tồn tại

            tracing::info!(email = %email, user_id = %new_id, "New user created via Google OAuth");

            // Fetch lại để trả về đúng struct
            sqlx::query_as::<_, User>(
                r#"
                SELECT id, email, name, password, role, image,
                       "emailVerified", "twoFactorEnabled", "twoFactorSecret",
                       "failedLoginAttempts", "lockedUntil", "lastLoginAt", "lastLoginIp",
                       "createdAt", "updatedAt"
                FROM "User" WHERE id = $1
                "#,
            )
            .bind(&new_id)
            .fetch_one(&state.db)
            .await?
        }
    };

    // 3. Phát JWT
    let jwt_expiry_hours = state.auth.expiry_hours();
    let token = state.auth.generate_token(&user.id, &user.email, &user.role)?;
    let user_info = user.to_user_info();

    tracing::info!(
        email = %email,
        user_id = %user_info.id,
        role = %user_info.role,
        "Google OAuth login successful"
    );

    Ok(Json(LoginResponse {
        user: user_info,
        tokens: AuthTokens {
            access_token: token,
            refresh_token: String::new(),
            expires_in: jwt_expiry_hours * 3600,
        },
        callback_url: body.callback_url,
        requires_2fa: None,
    }))
}
