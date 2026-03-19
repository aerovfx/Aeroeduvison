use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ── Database Models ──

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Submission {
    pub id: Uuid,
    pub assignment_id: Uuid,
    pub student_id: String,
    pub content: String,
    pub status: String,
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub confidence: Option<f64>,
    pub ai_grading_result: Option<serde_json::Value>,
    pub human_review_data: Option<serde_json::Value>,
    pub reviewed_by: Option<String>,
    pub review_notes: Option<String>,
    pub submitted_at: DateTime<Utc>,
    pub graded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct StudentSubmission {
    pub id: Uuid,
    pub user_id: String,
    pub rubric_id: Uuid,
    pub content: String,
    pub title: Option<String>,
    pub status: String,
    pub submitted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct SubmissionGrade {
    pub id: Uuid,
    pub submission_id: Uuid,
    pub final_score: f64,
    pub percentage: f64,
    pub status: String,
    pub feedback: Option<String>,
    pub criterion_scores: Option<serde_json::Value>,
    pub criterion_feedback: Option<serde_json::Value>,
    pub strengths: Option<serde_json::Value>,
    pub improvements: Option<serde_json::Value>,
    pub grammar_issues: Option<serde_json::Value>,
    pub concept_errors: Option<serde_json::Value>,
    pub recommended_concepts: Option<serde_json::Value>,
    pub confidence_score: Option<f64>,
    pub graded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct GradingRubric {
    pub id: Uuid,
    pub name: String,
    pub subject: String,
    pub grade: String,
    pub max_score: f64,
    pub min_passing_score: f64,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct RubricCriterion {
    pub id: Uuid,
    pub rubric_id: Uuid,
    pub criterion: String,
    pub description: Option<String>,
    pub max_points: f64,
    pub weight: f64,
    pub sort_order: i32,
    pub examples: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow)]
pub struct Assignment {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub course_id: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct CourseInfo {
    pub id: String,
    pub title: Option<String>,
}

// ── Request DTOs ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EssayGradeRequest {
    pub essay_content: String,
    pub rubric_description: Option<String>,
    pub max_score: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitGradingRequest {
    pub assignment_id: String,
    pub submission: String,
    pub subject: String,
    pub grade_level: Option<String>,
    pub assignment_type: Option<String>,
    pub context: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchGradeRequest {
    pub assignment_id: String,
    pub submissions: Vec<BatchSubmissionItem>,
    pub subject: String,
    pub grade_level: Option<String>,
    pub assignment_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSubmissionItem {
    pub student_id: String,
    pub submission: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewSubmitRequest {
    pub submission_id: String,
    pub score: f64,
    pub criteria_scores: Option<serde_json::Value>,
    pub feedback: String,
    pub confidence: Option<f64>,
    pub notes: Option<String>,
    pub time_spent: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionUpdateRequest {
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub status: Option<String>,
    pub review_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GradeActionRequest {
    pub action: String,
    // submit
    pub rubric_id: Option<String>,
    pub content: Option<String>,
    pub title: Option<String>,
    pub session_id: Option<String>,
    pub subject: Option<String>,
    pub concept_ids: Option<Vec<String>>,
    // get-results
    pub submission_id: Option<String>,
    // review
    pub grade_id: Option<String>,
    pub adjusted_score: Option<f64>,
    pub notes: Option<String>,
    // create-rubric
    pub name: Option<String>,
    pub grade: Option<String>,
    pub criteria: Option<Vec<RubricCriterionInput>>,
    pub options: Option<RubricOptions>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RubricCriterionInput {
    pub criterion: String,
    pub description: Option<String>,
    pub max_points: Option<f64>,
    pub weight: Option<f64>,
    pub examples: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RubricOptions {
    pub created_by: Option<String>,
    pub max_score: Option<f64>,
    pub min_passing_score: Option<f64>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecureSubmitRequest {
    pub action: String,
    pub rubric_id: Option<String>,
    pub content: Option<String>,
    pub title: Option<String>,
    pub submission_id: Option<String>,
    pub user_id: Option<String>,
}

// ── Response DTOs ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EssayGradeResponse {
    pub success: bool,
    pub result: EssayGradeResult,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct EssayGradeResult {
    pub score: f64,
    pub feedback: String,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitGradingResponse {
    pub success: bool,
    pub data: SubmitGradingData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitGradingData {
    pub submission_id: String,
    pub score: f64,
    pub percentage: f64,
    pub grade: String,
    pub confidence: f64,
    pub feedback: GradingFeedback,
    pub criteria_scores: Vec<serde_json::Value>,
    pub needs_review: bool,
    pub status: String,
    pub grading_time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outlier_analysis: Option<OutlierAnalysis>,
}

#[derive(Debug, Serialize)]
pub struct GradingFeedback {
    pub summary: String,
    pub strengths: Vec<String>,
    pub improvements: Vec<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlierAnalysis {
    pub is_outlier: bool,
    pub severity: String,
    pub z_score: f64,
}

// ── Internal Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiGradingResult {
    pub score: f64,
    pub percentage: f64,
    pub grade: String,
    pub confidence: f64,
    pub feedback: GradingFeedbackInternal,
    pub criteria_scores: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradingFeedbackInternal {
    pub summary: String,
    pub strengths: Vec<String>,
    pub improvements: Vec<String>,
    pub suggestions: Vec<String>,
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

// ── Constants ──

pub const CONFIDENCE_CRITICAL: f64 = 0.5;
pub const CONFIDENCE_HIGH: f64 = 0.7;
pub const CONFIDENCE_MEDIUM: f64 = 0.85;
pub const BATCH_LIMIT: usize = 100;
pub const SLA_HOURS: i64 = 24;
pub const REVIEW_SCORE_PERFECT: f64 = 9.5;
pub const REVIEW_SCORE_FAILING: f64 = 2.0;
pub const METRICS_TTL_DAYS: i64 = 30;
pub const REVIEW_TTL_DAYS: i64 = 90;

pub fn score_to_grade(score: f64) -> String {
    if score >= 9.0 { "A".to_string() }
    else if score >= 7.0 { "B".to_string() }
    else if score >= 5.0 { "C".to_string() }
    else if score >= 3.0 { "D".to_string() }
    else { "F".to_string() }
}
