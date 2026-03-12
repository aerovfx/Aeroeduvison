use crate::error::{CourseError, Result};

#[derive(Clone)]
pub struct CourseService {
    pub jwt_secret: String,
}

impl CourseService {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }

    /// Validate JWT token from Authorization header
    pub fn validate_token(&self, token: &str) -> Result<JwtClaims> {
        use jsonwebtoken::{decode, DecodingKey, Validation};

        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(|_| CourseError::Unauthorized)?;

        Ok(token_data.claims)
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct JwtClaims {
    pub sub: String, // user id
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}
