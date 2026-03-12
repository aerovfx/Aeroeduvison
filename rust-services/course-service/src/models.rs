use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Course {
    pub id: String,
    pub user_id: String,
    pub school_id: String,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub price: Option<f64>,
    pub is_published: bool,
    pub category_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub position: i32,
    pub is_published: bool,
    pub is_free: bool,
    pub course_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub url: String,
    pub course_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserProgress {
    pub id: String,
    pub user_id: String,
    pub chapter_id: String,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCourseRequest {
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub price: Option<f64>,
    pub category_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateChapterRequest {
    pub title: String,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub is_free: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateChapterRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub is_free: Option<bool>,
    pub position: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderChaptersRequest {
    pub updates: Vec<ChapterReorderUpdate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterReorderUpdate {
    pub id: String,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgressRequest {
    pub is_completed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CourseResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub price: Option<f64>,
    pub is_published: bool,
    pub category_id: Option<String>,
    pub user_id: String,
    pub school_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub position: i32,
    pub is_published: bool,
    pub is_free: bool,
    pub course_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressResponse {
    pub id: String,
    pub user_id: String,
    pub chapter_id: String,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}

impl Course {
    pub fn to_response(&self) -> CourseResponse {
        CourseResponse {
            id: self.id.clone(),
            title: self.title.clone(),
            description: self.description.clone(),
            image_url: self.image_url.clone(),
            price: self.price,
            is_published: self.is_published,
            category_id: self.category_id.clone(),
            user_id: self.user_id.clone(),
            school_id: self.school_id.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

impl Chapter {
    pub fn to_response(&self) -> ChapterResponse {
        ChapterResponse {
            id: self.id.clone(),
            title: self.title.clone(),
            description: self.description.clone(),
            video_url: self.video_url.clone(),
            position: self.position,
            is_published: self.is_published,
            is_free: self.is_free,
            course_id: self.course_id.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

impl UserProgress {
    pub fn to_response(&self) -> ProgressResponse {
        ProgressResponse {
            id: self.id.clone(),
            user_id: self.user_id.clone(),
            chapter_id: self.chapter_id.clone(),
            is_completed: self.is_completed,
            completed_at: self.completed_at,
        }
    }
}
