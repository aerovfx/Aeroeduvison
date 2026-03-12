use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::LearningPath;

#[derive(Debug, Serialize)]
pub struct LearningPathsResponse {
    pub learning_paths: Vec<LearningPathInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct LearningPathInfo {
    pub id: String,
    pub student_id: String,
    pub title: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/learning-paths
pub async fn list_learning_paths(
    State(state): State<AppState>,
) -> Result<Json<LearningPathsResponse>> {
    let paths = sqlx::query_as::<_, LearningPath>(
        r#"SELECT * FROM "LearningPath" ORDER BY created_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "LearningPath""#
    )
    .fetch_one(&state.db)
    .await?;

    let path_infos: Vec<LearningPathInfo> = paths.into_iter().map(|p| {
        LearningPathInfo {
            id: p.id,
            student_id: p.student_id,
            title: p.title,
            status: p.status,
            created_at: p.created_at,
        }
    }).collect();

    Ok(Json(LearningPathsResponse {
        learning_paths: path_infos,
        total,
    }))
}

#[derive(Debug, Deserialize)]
pub struct CreateLearningPathBody {
    pub student_id: String,
    pub title: String,
    pub description: Option<String>,
    pub goals: Vec<String>,
}

/// POST /api/learning-path/create
pub async fn create_learning_path(
    State(state): State<AppState>,
    Json(body): Json<CreateLearningPathBody>,
) -> Result<Json<serde_json::Value>> {
    // Save learning path to database
    let path = sqlx::query_as::<_, LearningPath>(
        r#"
        INSERT INTO "LearningPath" (id, student_id, title, description, goals, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        RETURNING *
        "#
    )
    .bind(format!("path_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&body.student_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.goals)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "learning_path_id": path.id,
        "message": "Learning path created successfully"
    })))
}
