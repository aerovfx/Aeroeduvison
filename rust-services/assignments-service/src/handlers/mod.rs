pub mod health;
pub mod assignments;

use axum::http::HeaderMap;
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::error::ServiceError;
use crate::models::JwtClaims;

pub fn extract_user_id(headers: &HeaderMap, jwt_secret: &str) -> Result<String, ServiceError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(ServiceError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(ServiceError::Unauthorized)?;

    let decoding_key = DecodingKey::from_secret(jwt_secret.as_bytes());
    let token_data = decode::<JwtClaims>(token, &decoding_key, &Validation::default())
        .map_err(|_| ServiceError::Unauthorized)?;

    Ok(token_data.claims.sub)
}
