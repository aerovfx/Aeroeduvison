use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── Database Models ──

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct TranscriptRecord {
    pub id: String,
    pub user_id: String,
    pub title: Option<String>,
    pub content: String,
    pub transcript_type: Option<String>,
    pub language: Option<String>,
    pub duration_ms: Option<i64>,
    pub word_count: Option<i32>,
    pub source_url: Option<String>,
    pub file_name: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── Request DTOs ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTranscriptRequest {
    pub title: Option<String>,
    pub content: String,
    pub transcript_type: Option<String>,
    pub language: Option<String>,
    pub duration_ms: Option<i64>,
    pub source_url: Option<String>,
    pub file_name: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTranscriptRequest {
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeRequest {
    pub source_url: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TranscriptHistoryQuery {
    pub transcript_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ── Response DTOs ──

#[derive(Debug, Serialize)]
pub struct TranscriptResponse {
    pub success: bool,
    pub data: TranscriptRecord,
}

#[derive(Debug, Serialize)]
pub struct TranscriptListResponse {
    pub success: bool,
    pub data: Vec<TranscriptRecord>,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct TranscribeResponse {
    pub success: bool,
    pub transcript: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SummarizeResponse {
    pub success: bool,
    pub summary: String,
    pub delegated: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ElevenLabsTranscribeResponse {
    pub success: bool,
    pub transcript: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LocalCheckResponse {
    pub success: bool,
    pub available: bool,
    pub path: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LocalSetupResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct LocalTranscribeResponse {
    pub success: bool,
    pub transcript: Option<String>,
    pub error: Option<String>,
}

// ── Auth ──

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub role: String,
    pub name: Option<String>,
    pub email: Option<String>,
}

impl AuthUser {
    pub fn is_teacher(&self) -> bool {
        self.role == "TEACHER"
    }

    pub fn is_admin(&self) -> bool {
        self.role == "ADMIN" || self.role == "SUPER_ADMIN"
    }

    pub fn is_teacher_or_admin(&self) -> bool {
        self.is_teacher() || self.is_admin()
    }

    pub fn is_student(&self) -> bool {
        self.role == "STUDENT"
    }
}
