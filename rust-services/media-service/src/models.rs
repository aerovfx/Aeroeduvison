use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
    pub file_size: Option<i64>,
    pub status: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ExamMatrix {
    pub id: String,
    pub title: String,
    pub subject: String,
    pub grade_level: String,
    pub matrix_data: serde_json::Value,
    pub status: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Exam {
    pub id: String,
    pub matrix_id: String,
    pub title: String,
    pub content: serde_json::Value,
    pub duration_minutes: i32,
    pub total_score: f64,
    pub status: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentBody {
    pub title: String,
    pub content: Option<String>,
    pub file_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateExamMatrixBody {
    pub title: String,
    pub subject: String,
    pub grade_level: String,
    pub matrix_data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateExamBody {
    pub matrix_id: String,
    pub title: Option<String>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PresignedUrlRequest {
    pub filename: String,
    pub content_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PresignedUrlResponse {
    pub upload_url: String,
    pub file_url: String,
    pub expires_in: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentListResponse {
    pub documents: Vec<DocumentInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub id: String,
    pub title: String,
    pub file_type: Option<String>,
    pub file_size: Option<i64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExamMatrixListResponse {
    pub matrices: Vec<ExamMatrixInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExamMatrixInfo {
    pub id: String,
    pub title: String,
    pub subject: String,
    pub grade_level: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
    pub gcs_configured: bool,
}

impl Document {
    pub fn to_info(&self) -> DocumentInfo {
        DocumentInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            file_type: self.file_type.clone(),
            file_size: self.file_size,
            status: self.status.clone(),
            created_at: self.created_at,
        }
    }
}

impl ExamMatrix {
    pub fn to_info(&self) -> ExamMatrixInfo {
        ExamMatrixInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            subject: self.subject.clone(),
            grade_level: self.grade_level.clone(),
            status: self.status.clone(),
            created_at: self.created_at,
        }
    }
}
