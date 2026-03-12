use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::GenerateLessonRequest;

#[derive(Debug, Serialize)]
pub struct GenerateLessonResponse {
    pub success: bool,
    pub lesson: LessonData,
}

#[derive(Debug, Serialize)]
pub struct LessonData {
    pub title: String,
    pub objectives: Vec<String>,
    pub content: String,
    pub activities: Vec<String>,
    pub assessment: String,
}

/// POST /api/ai-generate-lesson
pub async fn generate_lesson(
    State(state): State<AppState>,
    Json(body): Json<GenerateLessonRequest>,
) -> Result<Json<GenerateLessonResponse>> {
    // Generate lesson plan (placeholder)
    let lesson = LessonData {
        title: format!("Lesson: {}", body.topic),
        objectives: vec![
            "Understand key concepts".to_string(),
            "Apply knowledge to problems".to_string(),
        ],
        content: "Lesson content placeholder".to_string(),
        activities: vec![
            "Group discussion".to_string(),
            "Problem solving".to_string(),
        ],
        assessment: "Quiz and discussion".to_string(),
    };

    Ok(Json(GenerateLessonResponse {
        success: true,
        lesson,
    }))
}

#[derive(Debug, Deserialize)]
pub struct GradeLessonBody {
    pub lesson_content: String,
    pub rubric_id: Option<String>,
    pub max_score: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct GradeLessonResponse {
    pub success: bool,
    pub score: f64,
    pub max_score: f64,
    pub feedback: String,
    pub strengths: Vec<String>,
    pub improvements: Vec<String>,
}

/// POST /api/ai-grade-lesson
pub async fn grade_lesson(
    State(state): State<AppState>,
    Json(body): Json<GradeLessonBody>,
) -> Result<Json<GradeLessonResponse>> {
    // Grade lesson (placeholder)
    Ok(Json(GradeLessonResponse {
        success: true,
        score: 85.0,
        max_score: body.max_score.unwrap_or(100.0),
        feedback: "Good lesson plan with clear objectives".to_string(),
        strengths: vec![
            "Clear learning objectives".to_string(),
            "Well-structured content".to_string(),
        ],
        improvements: vec![
            "Add more interactive activities".to_string(),
            "Include formative assessment".to_string(),
        ],
    }))
}
