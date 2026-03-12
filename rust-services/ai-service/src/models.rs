use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AiGeneratedContent {
    pub id: String,
    pub user_id: String,
    pub content_type: String,
    pub title: String,
    pub content: String,
    pub subject: String,
    pub grade: String,
    pub topic: String,
    pub curriculum: Option<String>,
    pub difficulty: String,
    pub estimated_duration: i32,
    pub status: String,
    pub usage_count: i32,
    pub rating: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub user_id: String,
    pub message: String,
    pub response: String,
    pub context_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub context: Option<String>,
    pub chat_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateContentRequest {
    pub content_type: String,
    pub subject: String,
    pub grade: String,
    pub topic: String,
    pub curriculum: Option<String>,
    pub duration: Option<i32>,
    pub difficulty: Option<String>,
    pub additional_context: Option<String>,
    pub freeform_prompt: Option<String>,
    pub ai_model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateLessonRequest {
    pub subject: String,
    pub grade: String,
    pub topic: String,
    pub duration: Option<i32>,
    pub objectives: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GradeLessonRequest {
    pub lesson_content: String,
    pub rubric_id: Option<String>,
    pub max_score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeDocumentRequest {
    pub document_url: String,
    pub analysis_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedContentResponse {
    pub id: String,
    pub title: String,
    pub content: String,
    pub content_type: String,
    pub metadata: ContentMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContentMetadata {
    pub subject: String,
    pub grade: String,
    pub topic: String,
    pub estimated_duration: i32,
    pub difficulty: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub success: bool,
    pub response: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
    pub ai_providers: AiProvidersStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiProvidersStatus {
    pub grok: bool,
    pub openrouter: bool,
    pub openai: bool,
    pub ollama: bool,
}

impl AiGeneratedContent {
    pub fn to_response(&self) -> GeneratedContentResponse {
        GeneratedContentResponse {
            id: self.id.clone(),
            title: self.title.clone(),
            content: self.content.clone(),
            content_type: self.content_type.clone(),
            metadata: ContentMetadata {
                subject: self.subject.clone(),
                grade: self.grade.clone(),
                topic: self.topic.clone(),
                estimated_duration: self.estimated_duration,
                difficulty: self.difficulty.clone(),
            },
        }
    }
}
