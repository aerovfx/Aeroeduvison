use crate::error::{AiError, Result};

#[derive(Clone)]
pub struct AIService {
    pub jwt_secret: String,
    pub grok_api_key: String,
    pub openrouter_api_key: String,
    pub openai_api_key: String,
    pub ollama_base_url: String,
}

impl AIService {
    pub fn new(
        jwt_secret: String,
        grok_api_key: String,
        openrouter_api_key: String,
        openai_api_key: String,
        ollama_base_url: String,
    ) -> Self {
        Self {
            jwt_secret,
            grok_api_key,
            openrouter_api_key,
            openai_api_key,
            ollama_base_url,
        }
    }

    /// Check if Grok API is available
    pub fn has_grok_key(&self) -> bool {
        !self.grok_api_key.is_empty() && self.grok_api_key.starts_with("xai-")
    }

    /// Check if OpenRouter API is available
    pub fn has_openrouter_key(&self) -> bool {
        !self.openrouter_api_key.is_empty()
    }

    /// Check if OpenAI API is available
    pub fn has_openai_key(&self) -> bool {
        !self.openai_api_key.is_empty()
    }

    /// Get available AI provider
    pub fn get_available_provider(&self) -> Option<&str> {
        if self.has_grok_key() {
            Some("grok")
        } else if self.has_openrouter_key() {
            Some("openrouter")
        } else if self.has_openai_key() {
            Some("openai")
        } else {
            Some("ollama")
        }
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
        .map_err(|_| AiError::Unauthorized)?;

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
