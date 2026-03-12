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
    pub email_verified: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuthLog {
    pub id: String,
    pub user_id: Option<String>,
    pub email: Option<String>,
    pub action: String,
    pub status: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AdminOverview {
    pub total_students: i64,
    pub active_students: i64,
    pub total_courses: i64,
    pub total_enrollments: i64,
    pub completed_chapters: i64,
    pub total_chapters: i64,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AdminStats {
    pub total_users: i64,
    pub total_teachers: i64,
    pub total_admins: i64,
    pub total_schools: i64,
    pub storage_used_mb: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnlockAccountRequest {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}

impl User {
    pub fn to_safe_response(&self) -> SafeUserResponse {
        SafeUserResponse {
            id: self.id.clone(),
            name: self.name.clone(),
            email: self.email.clone(),
            role: self.role.clone(),
            school_id: self.school_id.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SafeUserResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub school_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
