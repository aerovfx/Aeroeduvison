use crate::error::{MediaError, Result};

#[derive(Clone)]
pub struct MediaService {
    pub jwt_secret: String,
    pub gcs_bucket: String,
}

impl MediaService {
    pub fn new(jwt_secret: String, gcs_bucket: String) -> Self {
        Self {
            jwt_secret,
            gcs_bucket,
        }
    }

    /// Check if GCS is configured
    pub fn is_gcs_configured(&self) -> bool {
        !self.gcs_bucket.is_empty()
    }

    /// Generate GCS presigned URL (placeholder - would use google-cloud-storage crate)
    pub fn generate_gcs_presigned_url(&self, filename: &str, _content_type: &str) -> Result<String> {
        if !self.is_gcs_configured() {
            return Err(MediaError::GcsError("GCS not configured".to_string()));
        }

        // Placeholder - real implementation would use GCS client
        let upload_url = format!(
            "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}",
            self.gcs_bucket, filename
        );

        let file_url = format!(
            "https://storage.googleapis.com/{}/{}",
            self.gcs_bucket, filename
        );

        Ok(format!("{}|{}", upload_url, file_url))
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
        .map_err(|_| MediaError::Unauthorized)?;

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
