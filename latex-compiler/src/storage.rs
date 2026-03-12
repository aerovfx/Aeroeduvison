//! Optional object storage (e.g. MinIO) for compiled PDFs. Stub for now; can be wired for production.

/// Upload PDF to storage and return a public or signed URL.
/// Currently a no-op stub; integrate MinIO/S3 when needed.
#[allow(dead_code)]
pub async fn upload_pdf(_key: &str, _pdf: &[u8]) -> Result<String, String> {
    // MinIO: use aws-sdk-s3 or minio-rs with endpoint override.
    Err("Storage not configured".to_string())
}
