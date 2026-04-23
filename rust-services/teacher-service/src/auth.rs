use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::Deserialize;

use crate::error::AppError;
use crate::models::AuthUser;

#[derive(Debug, Deserialize)]
struct NextAuthClaims {
    sub: Option<String>,
    name: Option<String>,
    email: Option<String>,
    role: Option<String>,
    // NextAuth may also use these
    id: Option<String>,
    #[serde(rename = "userRole")]
    user_role: Option<String>,
}

/// Extract authenticated user from NextAuth JWT (cookie or Authorization header).
#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = extract_token(parts)?;
        let secret = std::env::var("NEXTAUTH_SECRET")
            .or_else(|_| std::env::var("JWT_SECRET"))
            .map_err(|_| AppError::Internal("NEXTAUTH_SECRET not configured".to_string()))?;

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = false; // NextAuth tokens may not have standard exp
        validation.required_spec_claims.clear();

        let token_data = decode::<NextAuthClaims>(
            &token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        )
        .map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;

        let claims = token_data.claims;
        let id = claims.sub
            .or(claims.id)
            .ok_or_else(|| AppError::Unauthorized("Token missing user ID".to_string()))?;
        let role = claims.role
            .or(claims.user_role)
            .unwrap_or_else(|| "STUDENT".to_string());

        Ok(AuthUser {
            id,
            role,
            name: claims.name,
            email: claims.email,
        })
    }
}

fn extract_token(parts: &Parts) -> Result<String, AppError> {
    // Try Authorization header first
    if let Some(auth) = parts.headers.get("authorization") {
        let auth_str = auth.to_str().map_err(|_| AppError::Unauthorized("Invalid header".to_string()))?;
        if let Some(token) = auth_str.strip_prefix("Bearer ") {
            return Ok(token.to_string());
        }
    }

    // Try NextAuth session cookie
    if let Some(cookie) = parts.headers.get("cookie") {
        let cookie_str = cookie.to_str().map_err(|_| AppError::Unauthorized("Invalid cookie".to_string()))?;
        for part in cookie_str.split(';') {
            let part = part.trim();
            // NextAuth uses next-auth.session-token or __Secure-next-auth.session-token
            if let Some(token) = part.strip_prefix("next-auth.session-token=")
                .or_else(|| part.strip_prefix("__Secure-next-auth.session-token="))
            {
                return Ok(token.to_string());
            }
        }
    }

    Err(AppError::Unauthorized("No authentication token found".to_string()))
}
