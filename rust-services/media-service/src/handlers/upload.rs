use axum::extract::State;
use axum::Json;
use serde::Deserialize;

use crate::AppState;
use crate::error::Result;
use crate::models::PresignedUrlResponse;

#[derive(Debug, Deserialize)]
pub struct PresignedUrlBody {
    pub filename: String,
    pub content_type: String,
}

/// POST /api/upload/presigned-url
pub async fn get_presigned_url(
    State(_state): State<AppState>,
    Json(body): Json<PresignedUrlBody>,
) -> Result<Json<PresignedUrlResponse>> {
    // Generate presigned URL for upload
    // This is a placeholder - would integrate with S3/GCS

    let expires_in = 3600; // 1 hour

    Ok(Json(PresignedUrlResponse {
        upload_url: format!("https://storage.example.com/upload/{}", body.filename),
        file_url: format!("https://storage.example.com/files/{}", body.filename),
        expires_in,
    }))
}

/// POST /api/upload/gcs-presigned-url
pub async fn get_gcs_presigned_url(
    State(state): State<AppState>,
    Json(body): Json<PresignedUrlBody>,
) -> Result<Json<PresignedUrlResponse>> {
    // Use media service to generate GCS presigned URL
    let urls = state.media.generate_gcs_presigned_url(&body.filename, &body.content_type)?;
    let url_parts: Vec<&str> = urls.split('|').collect();

    Ok(Json(PresignedUrlResponse {
        upload_url: url_parts[0].to_string(),
        file_url: url_parts[1].to_string(),
        expires_in: 3600,
    }))
}
