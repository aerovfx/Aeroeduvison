use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::{AiError, Result};
use crate::models::{GenerateContentRequest, AiGeneratedContent};

#[derive(Debug, Serialize)]
pub struct GenerateContentResponse {
    pub success: bool,
    pub content: GeneratedContentData,
}

#[derive(Debug, Serialize)]
pub struct GeneratedContentData {
    pub id: String,
    pub title: String,
    pub content: String,
    pub content_type: String,
    pub metadata: ContentMetadata,
}

#[derive(Debug, Serialize)]
pub struct ContentMetadata {
    pub subject: String,
    pub grade: String,
    pub topic: String,
    pub estimated_duration: i32,
    pub difficulty: String,
}

/// POST /api/ai-content/generate
pub async fn generate_content(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<GenerateContentRequest>,
) -> Result<Json<GenerateContentResponse>> {
    let _user_id = require_user_id(&state, &headers)?;

    // Generate content (placeholder - will integrate with LLM)
    let content_id = format!("content_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4());
    
    let generated_content = GeneratedContentData {
        id: content_id,
        title: format!("Generated {} for {}", body.content_type, body.topic),
        content: "Generated content placeholder".to_string(),
        content_type: body.content_type.clone(),
        metadata: ContentMetadata {
            subject: body.subject.clone(),
            grade: body.grade.clone(),
            topic: body.topic.clone(),
            estimated_duration: body.duration.unwrap_or(45),
            difficulty: body.difficulty.clone().unwrap_or_else(|| "medium".to_string()),
        },
    };

    Ok(Json(GenerateContentResponse {
        success: true,
        content: generated_content,
    }))
}

/// POST /api/ai-content/generate-stream
pub async fn generate_content_stream(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<GenerateContentRequest>,
) -> Result<Json<GenerateContentResponse>> {
    // For now, same as non-streaming (streaming to be implemented)
    generate_content(State(state), headers, Json(body)).await
}

#[derive(Debug, Deserialize)]
pub struct SaveContentBody {
    pub content_id: String,
    pub title: String,
    pub content: String,
    pub content_type: String,
    pub subject: String,
    pub grade: String,
    pub topic: String,
}

/// POST /api/ai-content/save
pub async fn save_content(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SaveContentBody>,
) -> Result<Json<serde_json::Value>> {
    let user_id = require_user_id(&state, &headers)?;

    // Save content to database
    let content = sqlx::query_as::<_, AiGeneratedContent>(
        r#"
        INSERT INTO "AIGeneratedContent" (id, user_id, content_type, title, content, subject, grade, topic, difficulty, estimated_duration, status, usage_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', 0, $11, $12)
        RETURNING *
        "#
    )
    .bind(format!("content_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&user_id)
    .bind(&body.content_type)
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.subject)
    .bind(&body.grade)
    .bind(&body.topic)
    .bind("medium")
    .bind(45)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "content_id": content.id,
        "message": "Content saved successfully"
    })))
}

/// GET /api/ai-content/:id
pub async fn get_content(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<AiGeneratedContent>> {
    let content = sqlx::query_as::<_, AiGeneratedContent>(
        r#"SELECT * FROM "AIGeneratedContent" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match content {
        Some(c) => Ok(Json(c)),
        None => Err(AiError::ContentNotFound),
    }
}

/// DELETE /api/ai-content/:id
pub async fn delete_content(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "AIGeneratedContent" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AiError::ContentNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Content deleted successfully"
    })))
}
