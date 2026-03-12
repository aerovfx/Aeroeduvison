use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub school_id: String,
    pub id_number: Option<String>,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub gender: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Class {
    pub id: String,
    pub name: String,
    pub school_id: String,
    pub teacher_id: String,
    pub grade_level: String,
    pub academic_year: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearningPath {
    pub id: String,
    pub student_id: String,
    pub title: String,
    pub description: Option<String>,
    pub goals: Vec<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StudentSkill {
    pub id: String,
    pub student_id: String,
    pub skill_name: String,
    pub proficiency_level: f64,
    pub last_practiced: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearningInteraction {
    pub id: String,
    pub student_id: String,
    pub content_id: String,
    pub interaction_type: String,
    pub score: Option<f64>,
    pub time_spent_seconds: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub id_number: Option<String>,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub gender: Option<String>,
    pub role: String,
    pub school_id: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClassResponse {
    pub id: String,
    pub name: String,
    pub teacher_id: String,
    pub grade_level: String,
    pub academic_year: String,
    pub student_count: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlgData {
    pub student_id: String,
    pub skills: Vec<SkillInfo>,
    pub recent_interactions: Vec<InteractionSummary>,
    pub learning_path: Option<LearningPathInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub skill_name: String,
    pub proficiency_level: f64,
    pub last_practiced: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InteractionSummary {
    pub content_id: String,
    pub interaction_type: String,
    pub score: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LearningPathInfo {
    pub id: String,
    pub title: String,
    pub status: String,
    pub goals: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Recommendation {
    pub content_id: String,
    pub content_type: String,
    pub title: String,
    pub reason: String,
    pub priority: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}

impl User {
    pub fn to_student_response(&self) -> StudentResponse {
        StudentResponse {
            id: self.id.clone(),
            name: self.name.clone(),
            email: self.email.clone(),
            id_number: self.id_number.clone(),
            date_of_birth: self.date_of_birth,
            gender: self.gender.clone(),
            role: self.role.clone(),
            school_id: self.school_id.clone(),
            is_active: self.is_active,
            created_at: self.created_at,
        }
    }
}
