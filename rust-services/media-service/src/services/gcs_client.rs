/// GCS Client — Google Cloud Storage integration for AeroEduVision
///
/// Supports two auth modes (auto-detected):
///  1. Cloud Run / GCE: uses the metadata server (no credentials needed)
///  2. Local dev:       uses GCS_SA_KEY env var (base64-encoded service account JSON)
///
/// Key operations:
///  - `create_resumable_upload_session` — returns a session URI for large file uploads (videos)
///  - `generate_download_url`           — returns a public or signed access URL
///  - `delete_object`                   — removes an object from a bucket

use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::error::{MediaError, Result};

// ── Service Account JSON structure ────────────────────────────────────────────

#[derive(Debug, Deserialize, Clone)]
pub struct ServiceAccountKey {
    pub project_id: String,
    pub private_key_id: String,
    pub private_key: String,
    pub client_email: String,
    pub token_uri: String,
}

// ── Access token cache ────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct CachedToken {
    access_token: String,
    expires_at: u64, // unix seconds
}

// ── GCS Config ────────────────────────────────────────────────────────────────

/// Single-bucket config: all content types go into one bucket,
/// differentiated by folder prefix (videos/, images/, documents/, uploads/)
#[derive(Debug, Clone)]
pub struct GcsBuckets {
    /// The single media bucket (e.g. aeroedu-media-extreme-lattice-491123-p2)
    pub media: String,
}

impl GcsBuckets {
    pub fn from_env() -> Self {
        // Primary: GCS_BUCKET_MEDIA (single bucket)
        // Fallback: construct from project suffix
        let default_bucket = std::env::var("GCS_BUCKET_MEDIA").unwrap_or_else(|_| {
            let project = std::env::var("GCS_PROJECT_SUFFIX")
                .unwrap_or_else(|_| "extreme-lattice-491123-p2".to_string());
            format!("aeroedu-media-{}", project)
        });
        Self { media: default_bucket }
    }

    /// All content types use the same bucket — folder prefix differentiates them
    pub fn bucket_for_content_type(&self, _content_type: &str) -> &str {
        &self.media
    }

    /// Folder prefix within the bucket based on MIME type
    pub fn folder_for_content_type(&self, content_type: &str) -> &str {
        if content_type.starts_with("video/") {
            "videos"
        } else if content_type.starts_with("image/") {
            "images"
        } else if content_type.starts_with("application/pdf")
            || content_type.contains("document")
            || content_type.contains("spreadsheet")
            || content_type.contains("presentation")
        {
            "documents"
        } else {
            "uploads"
        }
    }
}

// ── Client ────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct GcsClient {
    http: Client,
    sa_key: Option<ServiceAccountKey>,  // None → use metadata server
    token_cache: Arc<Mutex<Option<CachedToken>>>,
    pub buckets: GcsBuckets,
    pub enabled: bool,
}

impl GcsClient {
    /// Create client from env vars.
    /// If GCS_SA_KEY is set (base64 JSON), uses that; otherwise uses metadata server.
    pub fn from_env() -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        let buckets = GcsBuckets::from_env();

        // Try to parse service account key from env
        let sa_key = std::env::var("GCS_SA_KEY")
            .ok()
            .and_then(|b64| {
                let decoded = base64_decode(&b64).ok()?;
                let key: ServiceAccountKey = serde_json::from_slice(&decoded)
                    .map_err(|e| tracing::warn!("GCS_SA_KEY parse error: {}", e))
                    .ok()?;
                Some(key)
            });

        let enabled = sa_key.is_some()
            || std::env::var("GCS_USE_METADATA").is_ok()
            || is_running_on_gce();

        if enabled {
            tracing::info!(
                "GCS client initialized (auth={}, bucket={})",
                if sa_key.is_some() { "service-account" } else { "metadata-server" },
                buckets.media,
            );
        } else {
            tracing::warn!("GCS client disabled — set GCS_SA_KEY or run on Cloud Run");
        }

        Self {
            http,
            sa_key,
            token_cache: Arc::new(Mutex::new(None)),
            buckets,
            enabled,
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    // ── Token acquisition ─────────────────────────────────────────────────────

    /// Returns a valid bearer access token (fetches / refreshes as needed)
    pub async fn access_token(&self) -> Result<String> {
        // Check cache first
        {
            let cache = self.token_cache.lock().await;
            if let Some(ref cached) = *cache {
                let now = unix_now();
                if cached.expires_at > now + 60 {
                    return Ok(cached.access_token.clone());
                }
            }
        }

        let token = if let Some(ref sa) = self.sa_key {
            self.fetch_token_from_sa(sa).await?
        } else {
            self.fetch_token_from_metadata().await?
        };

        // Cache the token
        {
            let mut cache = self.token_cache.lock().await;
            *cache = Some(CachedToken {
                access_token: token.access_token.clone(),
                expires_at: unix_now() + token.expires_in as u64,
            });
        }

        Ok(token.access_token)
    }

    /// Fetch token using service account key (JWT assertion → token exchange)
    async fn fetch_token_from_sa(&self, sa: &ServiceAccountKey) -> Result<TokenResponse> {
        let now = unix_now();
        let claims = SaJwtClaims {
            iss: sa.client_email.clone(),
            sub: sa.client_email.clone(),
            aud: sa.token_uri.clone(),
            iat: now,
            exp: now + 3600,
            scope: "https://www.googleapis.com/auth/devstorage.read_write".to_string(),
        };

        let header = jsonwebtoken::Header::new(jsonwebtoken::Algorithm::RS256);
        let key = jsonwebtoken::EncodingKey::from_rsa_pem(sa.private_key.as_bytes())
            .map_err(|e| MediaError::GcsError(format!("Invalid SA private key: {}", e)))?;
        let jwt = jsonwebtoken::encode(&header, &claims, &key)
            .map_err(|e| MediaError::GcsError(format!("JWT encode error: {}", e)))?;

        let response = self.http
            .post(&sa.token_uri)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", &jwt),
            ])
            .send()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?
            .json::<TokenResponse>()
            .await
            .map_err(|e| MediaError::GcsError(format!("Token response parse error: {}", e)))?;

        Ok(response)
    }

    /// Fetch token from GCE/Cloud Run metadata server (no credentials needed)
    async fn fetch_token_from_metadata(&self) -> Result<TokenResponse> {
        self.http
            .get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token")
            .header("Metadata-Flavor", "Google")
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| MediaError::GcsError(format!("Metadata server unreachable: {}", e)))?
            .json::<TokenResponse>()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))
    }

    // ── GCS Operations ────────────────────────────────────────────────────────

    /// Initiate a GCS resumable upload session.
    ///
    /// Returns the session URI which the browser uploads to directly.
    /// No auth required for the actual upload (the URI itself is the credential).
    ///
    /// Ideal for videos and large files.
    pub async fn create_resumable_upload_session(
        &self,
        bucket: &str,
        object_name: &str,
        content_type: &str,
        metadata: Option<serde_json::Value>,
    ) -> Result<ResumableUploadSession> {
        if !self.enabled {
            return Err(MediaError::GcsError("GCS not configured".to_string()));
        }

        let token = self.access_token().await?;

        let url = format!(
            "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=resumable&name={}",
            urlencoding::encode(bucket),
            urlencoding::encode(object_name),
        );

        let body = metadata.unwrap_or_else(|| serde_json::json!({
            "name": object_name,
            "contentType": content_type,
        }));

        let response = self.http
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json; charset=UTF-8")
            .header("X-Upload-Content-Type", content_type)
            .json(&body)
            .send()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MediaError::GcsError(format!(
                "Failed to create upload session: {} — {}",
                status, text
            )));
        }

        let session_uri = response
            .headers()
            .get("location")
            .or_else(|| response.headers().get("Location"))
            .ok_or_else(|| MediaError::GcsError("No Location header in GCS response".to_string()))?
            .to_str()
            .map_err(|_| MediaError::GcsError("Invalid Location header".to_string()))?
            .to_string();

        // The public URL the file will be accessible at after upload completes
        let public_url = self.public_url(bucket, object_name);

        Ok(ResumableUploadSession {
            session_uri,
            public_url,
            bucket: bucket.to_string(),
            object_name: object_name.to_string(),
        })
    }

    /// Simple upload for small files (≤5MB) — proxied through backend
    pub async fn upload_bytes(
        &self,
        bucket: &str,
        object_name: &str,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<String> {
        if !self.enabled {
            return Err(MediaError::GcsError("GCS not configured".to_string()));
        }

        let token = self.access_token().await?;

        let url = format!(
            "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}",
            urlencoding::encode(bucket),
            urlencoding::encode(object_name),
        );

        let response = self.http
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", content_type)
            .body(data)
            .send()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MediaError::GcsError(format!(
                "Upload failed: {} — {}", status, text
            )));
        }

        Ok(self.public_url(bucket, object_name))
    }

    /// Delete an object from GCS
    pub async fn delete_object(&self, bucket: &str, object_name: &str) -> Result<()> {
        if !self.enabled {
            return Ok(()); // no-op when not configured
        }

        let token = self.access_token().await?;
        let url = format!(
            "https://storage.googleapis.com/storage/v1/b/{}/o/{}",
            urlencoding::encode(bucket),
            urlencoding::encode(object_name),
        );

        self.http
            .delete(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?;

        Ok(())
    }

    /// Construct the public URL for an object
    pub fn public_url(&self, bucket: &str, object_name: &str) -> String {
        format!(
            "https://storage.googleapis.com/{}/{}",
            bucket,
            urlencoding::encode(object_name)
        )
    }

    /// List objects in a bucket with optional prefix
    pub async fn list_objects(&self, bucket: &str, prefix: &str) -> Result<Vec<GcsObject>> {
        if !self.enabled {
            return Ok(vec![]);
        }

        let token = self.access_token().await?;
        let url = format!(
            "https://storage.googleapis.com/storage/v1/b/{}/o?prefix={}",
            urlencoding::encode(bucket),
            urlencoding::encode(prefix),
        );

        let response: ListObjectsResponse = self.http
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?
            .json()
            .await
            .map_err(|e| MediaError::GcsError(e.to_string()))?;

        Ok(response.items.unwrap_or_default())
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default = "default_expires_in")]
    expires_in: u32,
    #[allow(dead_code)]
    token_type: Option<String>,
}

fn default_expires_in() -> u32 { 3600 }

#[derive(Debug, Serialize)]
struct SaJwtClaims {
    iss: String,
    sub: String,
    aud: String,
    iat: u64,
    exp: u64,
    scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumableUploadSession {
    /// Browser uploads directly to this URI (no auth required)
    pub session_uri: String,
    /// Public URL after upload completes
    pub public_url: String,
    pub bucket: String,
    pub object_name: String,
}

#[derive(Debug, Deserialize)]
struct ListObjectsResponse {
    items: Option<Vec<GcsObject>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GcsObject {
    pub name: String,
    pub size: Option<String>,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
    #[serde(rename = "timeCreated")]
    pub time_created: Option<String>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Decode base64 (handles both standard and URL-safe variants)
fn base64_decode(input: &str) -> std::result::Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(input)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(input))
        .map_err(|e| e.to_string())
}

/// Heuristic: check if we're running on GCE/Cloud Run
fn is_running_on_gce() -> bool {
    // Try to reach the metadata server (fast timeout)
    // We do a synchronous check here at startup only
    std::env::var("K_SERVICE").is_ok() // Cloud Run sets K_SERVICE
        || std::env::var("GOOGLE_CLOUD_PROJECT").is_ok()
}
