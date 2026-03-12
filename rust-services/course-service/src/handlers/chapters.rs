use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{CourseError, Result};
use crate::models::{Chapter, CreateChapterRequest, ReorderChaptersRequest};

#[derive(Debug, Deserialize)]
pub struct CreateChapterBody {
    pub title: String,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub is_free: Option<bool>,
}

/// POST /api/courses/:course_id/chapters
pub async fn create_chapter(
    State(state): State<AppState>,
    Path(course_id): Path<String>,
    Json(body): Json<CreateChapterBody>,
) -> Result<Json<Chapter>> {
    if body.title.trim().is_empty() {
        return Err(CourseError::InvalidChapterData);
    }

    // Get max position
    let max_position = sqlx::query_scalar::<_, i32>(
        r#"SELECT COALESCE(MAX(position), -1) FROM "Chapter" WHERE course_id = $1"#
    )
    .bind(&course_id)
    .fetch_one(&state.db)
    .await?;

    let chapter = sqlx::query_as::<_, Chapter>(
        r#"
        INSERT INTO "Chapter" (id, course_id, title, description, video_url, position, is_free, is_published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)
        RETURNING *
        "#
    )
    .bind(format!("chapter_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&course_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.video_url)
    .bind(max_position + 1)
    .bind(body.is_free.unwrap_or(false))
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(chapter))
}

#[derive(Debug, Serialize)]
pub struct ChapterListResponse {
    pub chapters: Vec<Chapter>,
    pub total: i64,
}

/// GET /api/courses/:course_id/chapters
pub async fn list_chapters(
    State(state): State<AppState>,
    Path(course_id): Path<String>,
) -> Result<Json<ChapterListResponse>> {
    let chapters = sqlx::query_as::<_, Chapter>(
        r#"SELECT * FROM "Chapter" WHERE course_id = $1 ORDER BY position ASC"#
    )
    .bind(&course_id)
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Chapter" WHERE course_id = $1"#
    )
    .bind(&course_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ChapterListResponse { chapters, total }))
}

/// GET /api/courses/:course_id/chapters/:id
pub async fn get_chapter(
    State(state): State<AppState>,
    Path((course_id, id)): Path<(String, String)>,
) -> Result<Json<Chapter>> {
    let chapter = sqlx::query_as::<_, Chapter>(
        r#"SELECT * FROM "Chapter" WHERE id = $1 AND course_id = $2"#
    )
    .bind(&id)
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await?;

    match chapter {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::ChapterNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateChapterBody {
    pub title: Option<String>,
    pub description: Option<String>,
    pub video_url: Option<String>,
    pub is_free: Option<bool>,
}

/// PUT /api/courses/:course_id/chapters/:id
pub async fn update_chapter(
    State(state): State<AppState>,
    Path((course_id, id)): Path<(String, String)>,
    Json(body): Json<UpdateChapterBody>,
) -> Result<Json<Chapter>> {
    let chapter = sqlx::query_as::<_, Chapter>(
        r#"
        UPDATE "Chapter" 
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            video_url = COALESCE($3, video_url),
            is_free = COALESCE($4, is_free),
            updated_at = $5
        WHERE id = $6 AND course_id = $7
        RETURNING *
        "#
    )
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.video_url)
    .bind(&body.is_free)
    .bind(chrono::Utc::now())
    .bind(&id)
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await?;

    match chapter {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::ChapterNotFound),
    }
}

/// DELETE /api/courses/:course_id/chapters/:id
pub async fn delete_chapter(
    State(state): State<AppState>,
    Path((course_id, id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "Chapter" WHERE id = $1 AND course_id = $2"#
    )
    .bind(&id)
    .bind(&course_id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(CourseError::ChapterNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Chapter deleted successfully"
    })))
}

/// POST /api/courses/:course_id/chapters/reorder
pub async fn reorder_chapters(
    State(state): State<AppState>,
    Path(course_id): Path<String>,
    Json(body): Json<ReorderChaptersRequest>,
) -> Result<Json<serde_json::Value>> {
    let mut tx = state.db.begin().await?;

    for update in body.updates {
        sqlx::query(
            r#"UPDATE "Chapter" SET position = $1, updated_at = $2 WHERE id = $3 AND course_id = $4"#
        )
        .bind(update.position)
        .bind(chrono::Utc::now())
        .bind(&update.id)
        .bind(&course_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Chapters reordered successfully"
    })))
}

/// POST /api/courses/:course_id/chapters/:id/publish
pub async fn publish_chapter(
    State(state): State<AppState>,
    Path((course_id, id)): Path<(String, String)>,
) -> Result<Json<Chapter>> {
    let chapter = sqlx::query_as::<_, Chapter>(
        r#"
        UPDATE "Chapter" 
        SET is_published = true, updated_at = $1
        WHERE id = $2 AND course_id = $3 AND is_published = false
        RETURNING *
        "#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await?;

    match chapter {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::ChapterNotFound),
    }
}

/// POST /api/courses/:course_id/chapters/:id/unpublish
pub async fn unpublish_chapter(
    State(state): State<AppState>,
    Path((course_id, id)): Path<(String, String)>,
) -> Result<Json<Chapter>> {
    let chapter = sqlx::query_as::<_, Chapter>(
        r#"
        UPDATE "Chapter" 
        SET is_published = false, updated_at = $1
        WHERE id = $2 AND course_id = $3 AND is_published = true
        RETURNING *
        "#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await?;

    match chapter {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::ChapterNotFound),
    }
}
