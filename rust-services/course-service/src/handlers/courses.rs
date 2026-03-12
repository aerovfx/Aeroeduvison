use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::{CourseError, Result};
use crate::models::Course;

#[derive(Debug, Deserialize)]
pub struct CreateCourseBody {
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
}

/// POST /api/courses
pub async fn create_course(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateCourseBody>,
) -> Result<Json<Course>> {
    // Validate title
    if body.title.trim().is_empty() {
        return Err(CourseError::InvalidCourseData);
    }

    let user_id = require_user_id(&state, &headers)?;

    // Create course
    let course = sqlx::query_as::<_, Course>(
        r#"
        INSERT INTO "Course" (id, user_id, school_id, title, description, category_id, is_published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
        RETURNING *
        "#
    )
    .bind(format!("course_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&user_id)
    .bind("default-school")
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.category_id)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(course))
}

#[derive(Debug, Serialize)]
pub struct CourseListResponse {
    pub courses: Vec<Course>,
    pub total: i64,
}

/// GET /api/courses
pub async fn list_courses(
    State(state): State<AppState>,
) -> Result<Json<CourseListResponse>> {
    let courses = sqlx::query_as::<_, Course>(
        r#"SELECT * FROM "Course" ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Course""#
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(CourseListResponse { courses, total }))
}

use axum::extract::Path;

/// GET /api/courses/:id
pub async fn get_course(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Course>> {
    let course = sqlx::query_as::<_, Course>(
        r#"SELECT * FROM "Course" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match course {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::CourseNotFound),
    }
}

/// PUT /api/courses/:id
pub async fn update_course(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<CreateCourseBody>,
) -> Result<Json<Course>> {
    let course = sqlx::query_as::<_, Course>(
        r#"
        UPDATE "Course" 
        SET title = $1, description = $2, category_id = $3, updated_at = $4
        WHERE id = $5
        RETURNING *
        "#
    )
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.category_id)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match course {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::CourseNotFound),
    }
}

/// DELETE /api/courses/:id
pub async fn delete_course(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "Course" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(CourseError::CourseNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Course deleted successfully"
    })))
}

/// POST /api/courses/:id/publish
pub async fn publish_course(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Course>> {
    let course = sqlx::query_as::<_, Course>(
        r#"
        UPDATE "Course" 
        SET is_published = true, updated_at = $1
        WHERE id = $2 AND is_published = false
        RETURNING *
        "#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match course {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::CourseNotFound),
    }
}

/// POST /api/courses/:id/unpublish
pub async fn unpublish_course(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Course>> {
    let course = sqlx::query_as::<_, Course>(
        r#"
        UPDATE "Course" 
        SET is_published = false, updated_at = $1
        WHERE id = $2 AND is_published = true
        RETURNING *
        "#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match course {
        Some(c) => Ok(Json(c)),
        None => Err(CourseError::CourseNotFound),
    }
}
