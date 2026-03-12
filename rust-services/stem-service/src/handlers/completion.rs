use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::Result;
use crate::models::LabCompletion;

#[derive(Debug, Serialize)]
pub struct CompletionsListResponse {
    pub completions: Vec<CompletionInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct CompletionInfo {
    pub id: String,
    pub user_id: String,
    pub lab_id: String,
    pub lab_type: String,
    pub score: Option<f64>,
    pub completed_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/lab-completion
pub async fn list_completions(
    State(state): State<AppState>,
) -> Result<Json<CompletionsListResponse>> {
    let completions: Vec<LabCompletion> = sqlx::query_as::<_, LabCompletion>(
        r#"SELECT * FROM "LabCompletion" ORDER BY completed_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "LabCompletion""#
    )
    .fetch_one(&state.db)
    .await?;

    let completion_infos: Vec<CompletionInfo> = completions.into_iter().map(|c| {
        CompletionInfo {
            id: c.id,
            user_id: c.user_id,
            lab_id: c.lab_id,
            lab_type: c.lab_type,
            score: c.score,
            completed_at: c.completed_at,
        }
    }).collect();

    Ok(Json(CompletionsListResponse {
        completions: completion_infos,
        total,
    }))
}

#[derive(Debug, Deserialize)]
pub struct RecordCompletionBody {
    pub lab_id: String,
    pub lab_type: String,
    pub score: Option<f64>,
}

/// POST /api/lab-completion
pub async fn record_completion(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<RecordCompletionBody>,
) -> Result<Json<serde_json::Value>> {
    let user_id = require_user_id(&state, &headers)?;

    let completion = sqlx::query_as::<_, LabCompletion>(
        r#"
        INSERT INTO "LabCompletion" (id, user_id, lab_id, lab_type, score, completed_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(format!("completion_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&user_id)
    .bind(&body.lab_id)
    .bind(&body.lab_type)
    .bind(&body.score)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "completion_id": completion.id,
        "message": "Lab completion recorded successfully"
    })))
}
