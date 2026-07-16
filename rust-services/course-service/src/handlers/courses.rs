use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::require_user_id;
use crate::AppState;
use crate::error::{CourseError, Result};
use crate::models::Course;

// ── Instructor-facing response shape (camelCase to match frontend) ────────────

#[derive(Debug, Serialize)]
pub struct InstructorCourse {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    pub slug: String,
    pub overview: Option<String>,
    pub image: Option<String>,
    #[serde(rename = "regularPrice")]
    pub regular_price: f64,
    #[serde(rename = "beforePrice")]
    pub before_price: f64,
    pub lessons: i64,
    pub duration: Option<String>,
    #[serde(rename = "accessTime")]
    pub access_time: Option<String>,
    pub requirements: Option<String>,
    #[serde(rename = "whatYouWillLearn")]
    pub what_you_will_learn: Option<String>,
    #[serde(rename = "whoIsThisCourseFor")]
    pub who_is_this_course_for: Option<String>,
    #[serde(rename = "isPublished")]
    pub is_published: bool,
    #[serde(rename = "categoryId")]
    pub category_id: Option<String>,
    pub category: Option<Value>,
    pub enrollments: Vec<Value>,
    pub videos: Vec<Value>,
    pub assets: Vec<Value>,
    pub user: Value,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(sqlx::FromRow)]
struct InstructorCourseRow {
    id: String,
    user_id: String,
    title: String,
    description: Option<String>,
    image_url: Option<String>,
    price: Option<f64>,
    is_published: bool,
    category_id: Option<String>,
    created_at: chrono::NaiveDateTime,
    updated_at: chrono::NaiveDateTime,
    lesson_count: i64,
}

/// GET /api/instructor/courses — teacher's own courses
pub async fn list_instructor_courses(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<InstructorCourse>>> {
    let user_id = require_user_id(&state, &headers)?;

    let rows: Vec<InstructorCourseRow> = sqlx::query_as(r#"
        SELECT
            c.id,
            c."userId"      AS user_id,
            c.title,
            c.description,
            c."imageUrl"    AS image_url,
            c.price,
            c."isPublished" AS is_published,
            c."categoryId"  AS category_id,
            c."createdAt"   AS created_at,
            c."updatedAt"   AS updated_at,
            COALESCE((
                SELECT COUNT(*) FROM "Chapter" ch
                WHERE ch."courseId" = c.id AND ch."isPublished" = true
            ), 0) AS lesson_count
        FROM "Course" c
        WHERE c."userId" = $1
        ORDER BY c."createdAt" DESC
    "#)
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(CourseError::Database)?;

    let courses = rows.into_iter().map(|row| InstructorCourse {
        slug: row.id.clone(),
        user: serde_json::json!({ "id": row.user_id, "name": null, "image": null }),
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        overview: row.description,
        image: row.image_url,
        regular_price: row.price.unwrap_or(0.0),
        before_price: 0.0,
        lessons: row.lesson_count,
        duration: None,
        access_time: None,
        requirements: None,
        what_you_will_learn: None,
        who_is_this_course_for: None,
        is_published: row.is_published,
        category_id: row.category_id,
        category: None,
        enrollments: vec![],
        videos: vec![],
        assets: vec![],
        created_at: row.created_at.format("%Y-%m-%dT%H:%M:%S%.fZ").to_string(),
        updated_at: row.updated_at.format("%Y-%m-%dT%H:%M:%S%.fZ").to_string(),
    }).collect();

    Ok(Json(courses))
}

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
        INSERT INTO "Course" (id, "userId", "schoolId", title, description, "categoryId", "isPublished", "createdAt", "updatedAt")
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
        r#"SELECT * FROM "Course" ORDER BY "createdAt" DESC"#
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
        SET title = $1, description = $2, "categoryId" = $3, "updatedAt" = $4
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
        SET "isPublished" = true, "updatedAt" = $1
        WHERE id = $2 AND "isPublished" = false
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
        SET "isPublished" = false, "updatedAt" = $1
        WHERE id = $2 AND "isPublished" = true
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
