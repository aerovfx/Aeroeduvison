use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── Database Models ──

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct OnlineExamRoom {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub access_code: String,
    pub status: String,
    pub is_public: bool,
    pub max_students: Option<i32>,
    pub teacher_id: String,
    pub exam_matrix_id: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExamRoomParticipant {
    pub id: String,
    pub exam_room_id: String,
    pub student_id: String,
    #[sqlx(rename = "joinedAt")]
    pub joined_at: DateTime<Utc>,
    pub score: Option<f64>,
    #[sqlx(rename = "submittedAt")]
    pub submitted_at: Option<DateTime<Utc>>,
    pub answers: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExamRoomSchedule {
    pub id: String,
    pub exam_room_id: String,
    #[sqlx(rename = "scheduledAt")]
    pub scheduled_at: DateTime<Utc>,
    pub duration_minutes: Option<i32>,
    pub is_active: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ExamRoomQuestion {
    pub id: String,
    pub exam_room_id: String,
    pub question_id: String,
    pub position: i32,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Question {
    pub id: String,
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub question_type: Option<String>,
    pub correct_answer: Option<String>,
    pub explanation: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct QuestionForStudent {
    pub id: String,
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub question_type: Option<String>,
    // Note: correct_answer is NOT included for students
}

#[derive(Debug, Clone, Serialize)]
pub struct ExamRoomWithParticipants {
    pub room: OnlineExamRoom,
    pub participants: Vec<ExamRoomParticipant>,
}

// ── Request DTOs ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub max_students: Option<i32>,
    pub exam_matrix_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoomRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub is_public: Option<bool>,
    pub max_students: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitAnswersRequest {
    pub answers: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinRoomRequest {
    pub access_code: Option<String>,
    pub room_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduleRequest {
    pub scheduled_at: String, // ISO 8601 datetime
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateScheduleRequest {
    pub schedule_id: String,
}

// ── Response DTOs ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomListResponse {
    pub success: bool,
    pub data: Vec<OnlineExamRoom>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomDetailResponse {
    pub success: bool,
    pub data: ExamRoomWithParticipants,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomResponse {
    pub success: bool,
    pub data: OnlineExamRoom,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoomResponse {
    pub success: bool,
    pub data: OnlineExamRoom,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamQuestionListResponse {
    pub success: bool,
    pub data: Vec<QuestionForStudent>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitAnswersResponse {
    pub success: bool,
    pub data: SubmitAnswersData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitAnswersData {
    pub score: f64,
    pub total_points: f64,
    pub percentage: f64,
    pub graded: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinRoomResponse {
    pub success: bool,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleListResponse {
    pub success: bool,
    pub data: Vec<ExamRoomSchedule>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduleResponse {
    pub success: bool,
    pub data: ExamRoomSchedule,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateScheduleResponse {
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
