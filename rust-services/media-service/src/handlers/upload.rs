/// Upload handlers — GCS-backed file storage for AeroEduVision
///
/// Endpoints:
///   POST /api/upload/request          — get a resumable session URI for large files (videos)
///   POST /api/upload/image            — proxy small image upload through backend → GCS
///   POST /api/upload/presigned-url    — legacy compat (returns resumable session URI)
///   DELETE /api/upload/object         — delete a GCS object

use axum::extract::{Multipart, State};
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{MediaError, Result};
use crate::handlers::require_user_id;

// ── Request / Response types ──────────────────────────────────────────────────

/// Request a resumable upload session (for videos, large documents)
#[derive(Debug, Deserialize)]
pub struct UploadRequestBody {
    /// Original filename — used to pick extension
    pub filename: String,
    /// MIME type — determines which bucket and storage class
    pub content_type: String,
    /// Optional folder prefix: "courses/abc123", "avatars", "assignments" etc.
    pub folder: Option<String>,
    /// Optional metadata to attach to the GCS object
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct UploadRequestResponse {
    pub success: bool,
    /// Browser uploads directly to this URI (PUT or POST, no auth required)
    pub session_uri: String,
    /// The public URL once upload completes
    pub public_url: String,
    /// GCS object path (bucket + name)
    pub object_name: String,
    pub bucket: String,
    /// Which GCS bucket type was chosen
    pub storage_type: String,
}

#[derive(Debug, Deserialize)]
pub struct PresignedUrlBody {
    pub filename: String,
    pub content_type: String,
    pub folder: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PresignedUrlResponse {
    pub upload_url: String,
    pub file_url: String,
    pub expires_in: u32,
}

#[derive(Debug, Deserialize)]
pub struct DeleteObjectBody {
    pub bucket: String,
    pub object_name: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Build a GCS object path like: courses/abc/video-uuid.mp4
fn build_object_name(folder: Option<&str>, filename: &str) -> String {
    let ext = std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin");
    let id = Uuid::new_v4().to_string().replace('-', "");
    match folder {
        Some(f) if !f.is_empty() => format!("{}/{}.{}", f.trim_matches('/'), id, ext),
        _ => format!("uploads/{}.{}", id, ext),
    }
}

/// Storage type label based on content-type (single-bucket, folder-based layout)
fn storage_label_for(content_type: &str) -> &'static str {
    if content_type.starts_with("video/") { "video" }
    else if content_type.starts_with("image/") { "image" }
    else if content_type.contains("pdf") || content_type.contains("document") { "document" }
    else { "upload" }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// POST /api/upload/request
/// Client requests a resumable session URI for large file uploads.
///
/// Flow:
/// 1. Backend creates a resumable session on GCS (authenticated)
/// 2. Returns the session URI + public URL to the client
/// 3. Client uploads file bytes directly to the session URI (no auth needed)
/// 4. After upload completes, the file is available at public_url
pub async fn request_upload_session(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UploadRequestBody>,
) -> Result<Json<UploadRequestResponse>> {
    // Auth optional for demo — in production require a valid teacher/admin token
    let _user_id = require_user_id(&state, &headers)
        .unwrap_or_else(|_| "anonymous".to_string());

    let gcs = &state.gcs;

    if !gcs.is_enabled() {
        // Fallback for local dev without GCS: return a mock session
        let object_name = build_object_name(body.folder.as_deref(), &body.filename);
        return Ok(Json(UploadRequestResponse {
            success: true,
            session_uri: format!(
                "http://localhost:8098/api/upload/mock-session/{}",
                object_name
            ),
            public_url: format!(
                "http://localhost:8098/api/upload/mock-file/{}",
                object_name
            ),
            object_name: object_name.clone(),
            bucket: "local".to_string(),
            storage_type: "local".to_string(),
        }));
    }

    let bucket = gcs.buckets.bucket_for_content_type(&body.content_type);
    let object_name = build_object_name(body.folder.as_deref(), &body.filename);

    // Attach metadata: uploader, original filename, course context
    let gcs_metadata = serde_json::json!({
        "name": &object_name,
        "contentType": &body.content_type,
        "metadata": {
            "originalFilename": &body.filename,
            "uploadedBy": _user_id,
        }
    });

    let session = gcs
        .create_resumable_upload_session(bucket, &object_name, &body.content_type, Some(gcs_metadata))
        .await?;

    let storage_type = storage_label_for(&body.content_type);

    Ok(Json(UploadRequestResponse {
        success: true,
        session_uri: session.session_uri,
        public_url: session.public_url,
        object_name,
        bucket: bucket.to_string(),
        storage_type: storage_type.to_string(),
    }))
}

/// POST /api/upload/image  (multipart/form-data)
/// Proxies small images through the backend → GCS.
/// Good for profile pictures, thumbnails, etc. (≤ 5MB)
pub async fn upload_image(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>> {
    let _user_id = require_user_id(&state, &headers)
        .unwrap_or_else(|_| "anonymous".to_string());

    let gcs = &state.gcs;

    let mut file_data: Option<Vec<u8>> = None;
    let mut content_type = "image/jpeg".to_string();
    let mut filename = format!("image-{}.jpg", Uuid::new_v4());
    let mut folder = "images".to_string();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" | "image" => {
                if let Some(ct) = field.content_type() {
                    content_type = ct.to_string();
                }
                if let Some(fname) = field.file_name() {
                    filename = fname.to_string();
                }
                let data = field.bytes().await
                    .map_err(|e| MediaError::Internal(e.to_string()))?;
                file_data = Some(data.to_vec());
            }
            "folder" => {
                if let Ok(f) = field.text().await {
                    if !f.is_empty() { folder = f; }
                }
            }
            _ => {}
        }
    }

    let data = file_data
        .ok_or_else(|| MediaError::Validation("No file in request".to_string()))?;

    // 5MB limit for proxied uploads
    if data.len() > 5 * 1024 * 1024 {
        return Err(MediaError::Validation(
            "Image too large (max 5MB). Use /api/upload/request for large files.".to_string(),
        ));
    }

    let object_name = build_object_name(Some(&folder), &filename);

    let public_url = if gcs.is_enabled() {
        let bucket = &gcs.buckets.media;
        gcs.upload_bytes(bucket, &object_name, &content_type, data).await?
    } else {
        // Local dev fallback
        format!("http://localhost:8098/api/upload/mock-file/{}", object_name)
    };

    // Return shape: { url, object_name } — matches instructor.service.ts uploadImage()
    Ok(Json(serde_json::json!({
        "url": public_url,
        "object_name": object_name,
    })))
}

/// POST /api/upload/presigned-url  (legacy compat)
/// Returns a resumable upload session URI (same as /request but legacy shape)
pub async fn get_presigned_url(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<PresignedUrlBody>,
) -> Result<Json<PresignedUrlResponse>> {
    let gcs = &state.gcs;

    if !gcs.is_enabled() {
        return Ok(Json(PresignedUrlResponse {
            upload_url: format!("http://localhost:8098/api/upload/mock-session/{}", &body.filename),
            file_url: format!("http://localhost:8098/api/upload/mock-file/{}", &body.filename),
            expires_in: 3600,
        }));
    }

    let bucket = gcs.buckets.bucket_for_content_type(&body.content_type);
    let object_name = build_object_name(body.folder.as_deref(), &body.filename);

    let session = gcs
        .create_resumable_upload_session(bucket, &object_name, &body.content_type, None)
        .await?;

    Ok(Json(PresignedUrlResponse {
        upload_url: session.session_uri,
        file_url: session.public_url,
        expires_in: 3600,
    }))
}

/// POST /api/upload/gcs-presigned-url  (legacy compat alias)
pub async fn get_gcs_presigned_url(
    state: State<AppState>,
    headers: HeaderMap,
    body: Json<PresignedUrlBody>,
) -> Result<Json<PresignedUrlResponse>> {
    get_presigned_url(state, headers, body).await
}

/// DELETE /api/upload/object
/// Remove a GCS object (teacher deleting course material)
pub async fn delete_upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<DeleteObjectBody>,
) -> Result<Json<serde_json::Value>> {
    require_user_id(&state, &headers)?; // require auth for deletes

    state.gcs
        .delete_object(&body.bucket, &body.object_name)
        .await?;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// GET /api/upload/status
/// Returns GCS configuration status (for health checks)
pub async fn upload_status(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let gcs = &state.gcs;
    Json(serde_json::json!({
        "gcs_enabled": gcs.is_enabled(),
        "bucket": gcs.buckets.media,
    }))
}
