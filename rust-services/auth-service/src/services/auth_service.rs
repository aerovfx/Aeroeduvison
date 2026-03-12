use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use bcrypt::verify as bcrypt_verify;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AuthError, Result};

const JWT_SECRET_MIN_LENGTH: usize = 32;

#[derive(Clone)]
pub struct AuthService {
    jwt_secret: String,
    jwt_expiry_hours: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String, // user id
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

impl AuthService {
    pub fn new(jwt_secret: String, jwt_expiry_hours: u64) -> Self {
        if jwt_secret.len() < JWT_SECRET_MIN_LENGTH {
            tracing::warn!("JWT secret is less than {} characters", JWT_SECRET_MIN_LENGTH);
        }
        Self {
            jwt_secret,
            jwt_expiry_hours,
        }
    }

    /// Hash password using Argon2
    pub fn hash_password(&self, password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2.hash_password(password.as_bytes(), &salt)?;
        Ok(hash.to_string())
    }

    /// Verify password against hash
    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        if hash.starts_with("$2") {
            return bcrypt_verify(password, hash)
                .map_err(|e| AuthError::Internal(format!("Bcrypt verification error: {}", e)));
        }

        let parsed_hash = PasswordHash::new(hash).map_err(|e| {
            AuthError::Internal(format!("Failed to parse password hash: {}", e))
        })?;
        
        match Argon2::default().verify_password(password.as_bytes(), &parsed_hash) {
            Ok(_) => Ok(true),
            Err(argon2::password_hash::Error::Password) => Ok(false),
            Err(e) => Err(AuthError::Internal(format!("Password verification error: {}", e))),
        }
    }

    /// Generate JWT token
    pub fn generate_token(&self, user_id: &str, email: &str, role: &str) -> Result<String> {
        let now = Utc::now();
        let exp = now + Duration::hours(self.jwt_expiry_hours as i64);

        let claims = JwtClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
        .map_err(|e| AuthError::Internal(format!("Failed to generate JWT: {}", e)))
    }

    /// Validate JWT token
    pub fn validate_token(&self, token: &str) -> Result<JwtClaims> {
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            _ => AuthError::InvalidToken,
        })?;

        Ok(token_data.claims)
    }

    /// Generate password reset token
    pub fn generate_reset_token() -> String {
        Uuid::new_v4().to_string()
    }

    /// Generate email verification token
    pub fn generate_verification_token() -> String {
        Uuid::new_v4().to_string()
    }
}

impl From<argon2::password_hash::Error> for AuthError {
    fn from(e: argon2::password_hash::Error) -> Self {
        AuthError::Internal(format!("Argon2 error: {}", e))
    }
}
