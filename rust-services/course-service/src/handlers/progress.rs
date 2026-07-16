use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::Deserialize;

use super::require_user_id;
use crate::AppState;
use crate::error::{CourseError, Result};
use crate::models::UserProgress;

#[derive(Debug, Deserialize)]
pub struct UpdateProgressBody {
    pub is_completed: bool,
}

/// GET /api/courses/:course_id/chapters/:id/progress
pub async fn get_progress(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((_course_id, chapter_id)): Path<(String, String)>,
) -> Result<Json<UserProgress>> {
    let user_id = require_user_id(&state, &headers)?;

    let progress = sqlx::query_as::<_, UserProgress>(
        r#"SELECT * FROM "UserProgress" WHERE "chapterId" = $1 AND "userId" = $2"#
    )
    .bind(&chapter_id)
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;

    match progress {
        Some(p) => Ok(Json(p)),
        None => {
            // Create new progress record
            let progress = sqlx::query_as::<_, UserProgress>(
                r#"
                INSERT INTO "UserProgress" (id, "userId", "chapterId", "isCompleted", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, false, $4, $5)
                RETURNING *
                "#
            )
            .bind(format!("progress_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
            .bind(&user_id)
            .bind(&chapter_id)
            .bind(chrono::Utc::now())
            .bind(chrono::Utc::now())
            .fetch_one(&state.db)
            .await?;

            Ok(Json(progress))
        }
    }
}

/// POST /api/courses/:course_id/chapters/:id/progress
pub async fn update_progress(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((_course_id, chapter_id)): Path<(String, String)>,
    Json(body): Json<UpdateProgressBody>,
) -> Result<Json<UserProgress>> {
    let user_id = require_user_id(&state, &headers)?;

    let progress = sqlx::query_as::<_, UserProgress>(
        r#"
        UPDATE "UserProgress" 
        SET "isCompleted" = $1, 
            "completedAt" = CASE WHEN $1 = true THEN $2 ELSE NULL END,
            "updatedAt" = $3
        WHERE "chapterId" = $4 AND "userId" = $5
        RETURNING *
        "#
    )
    .bind(body.is_completed)
    .bind(if body.is_completed { Some(chrono::Utc::now()) } else { None })
    .bind(chrono::Utc::now())
    .bind(&chapter_id)
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;

    match progress {
        Some(p) => Ok(Json(p)),
        None => Err(CourseError::ChapterNotFound),
    }
}
