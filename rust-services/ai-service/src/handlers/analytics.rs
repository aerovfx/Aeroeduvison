use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;

#[derive(Debug, Serialize)]
pub struct AiAnalyticsResponse {
    pub total_generations: i64,
    pub total_chats: i64,
    pub total_analyses: i64,
    pub popular_subjects: Vec<SubjectUsage>,
    pub usage_trend: String,
}

#[derive(Debug, Serialize)]
pub struct SubjectUsage {
    pub subject: String,
    pub count: i64,
}

/// GET /api/ai-analytics/dashboard
pub async fn ai_analytics(
    State(state): State<AppState>,
) -> Result<Json<AiAnalyticsResponse>> {
    // Get AI usage analytics
    let total_generations = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "AIGeneratedContent""#
    )
    .fetch_one(&state.db)
    .await?;

    // Placeholder for other metrics
    Ok(Json(AiAnalyticsResponse {
        total_generations,
        total_chats: 0,
        total_analyses: 0,
        popular_subjects: vec![],
        usage_trend: "stable".to_string(),
    }))
}
