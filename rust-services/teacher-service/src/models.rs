use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── Database Models ──

#[derive(Debug, Clone, Serialize)]
pub struct TeacherStats {
    pub total_students: i64,
    pub published_courses: i64,
    pub draft_courses: i64,
    pub total_revenue: f64,
    pub recent_enrollments: i64,
    pub average_rating: f64,
    pub pending_assignments: i64,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct StudentInfo {
    #[sqlx(rename = "id")]
    pub student_id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub average_score: Option<f64>,
    pub attendance_rate: Option<f64>,
    pub total_xp: Option<i32>,
    pub completed_exams: Option<i32>,
    pub passed_exams: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExamSummary {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub exam_type: Option<String>,
    pub status: String,
    pub duration: Option<i32>,
    pub total_questions: Option<i32>,
    pub total_score: Option<f64>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    pub matrix_id: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExamDetail {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub exam_type: Option<String>,
    pub status: String,
    pub duration: Option<i32>,
    pub total_questions: Option<i32>,
    pub total_score: Option<f64>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    pub matrix_id: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct QuestionDetail {
    pub id: String,
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub question_type: Option<String>,
    pub explanation: Option<String>,
    pub correct_answer: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExamWithQuestions {
    pub exam: ExamDetail,
    pub questions: Vec<QuestionDetail>,
}

// ── Request DTOs ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateExamRequest {
    pub exam_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListExamsQuery {
    pub status: Option<String>,
    #[serde(rename = "examType")]
    pub exam_type: Option<String>,
    pub search: Option<String>,
}

// ── Response DTOs ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsResponse {
    pub success: bool,
    pub data: TeacherStats,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentListResponse {
    pub success: bool,
    pub data: Vec<StudentInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentDetailResponse {
    pub success: bool,
    pub data: StudentInfo,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamListResponse {
    pub success: bool,
    pub data: Vec<ExamSummary>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamDetailResponse {
    pub success: bool,
    pub data: ExamWithQuestions,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateExamResponse {
    pub success: bool,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResponse {
    pub success: bool,
    pub message: String,
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
