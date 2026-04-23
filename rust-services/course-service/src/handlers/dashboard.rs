use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::Serialize;

use super::require_user_id;
use crate::AppState;
use crate::error::{CourseError, Result};
use crate::models::Course;

#[derive(Debug, Serialize)]
pub struct CourseWithProgress {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub category_id: Option<String>,
    pub is_published: bool,
    pub total_chapters: i64,
    pub completed_chapters: i64,
    pub progress_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub enrolled_courses: Vec<CourseWithProgress>,
    pub total_enrolled: i64,
    pub completed_courses: i64,
    pub in_progress_courses: i64,
}

/// GET /api/courses/dashboard - Student dashboard with enrolled courses and progress
pub async fn get_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<DashboardResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    // Get all courses where the user has at least one progress entry
    let courses = sqlx::query_as::<_, Course>(
        r#"
        SELECT DISTINCT c.*
        FROM "Course" c
        INNER JOIN "Chapter" ch ON ch.course_id = c.id
        INNER JOIN "UserProgress" up ON up.chapter_id = ch.id AND up.user_id = $1
        WHERE c.is_published = true
        ORDER BY c.updated_at DESC
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let total_enrolled = courses.len() as i64;
    let mut completed_courses = 0i64;
    let mut in_progress_courses = 0i64;

    let mut enrolled_courses = Vec::new();

    for course in &courses {
        let total_chapters: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Chapter" WHERE course_id = $1 AND is_published = true"#
        )
        .bind(&course.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        let completed_chapters: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM "UserProgress" up
            INNER JOIN "Chapter" ch ON ch.id = up.chapter_id
            WHERE ch.course_id = $1 AND up.user_id = $2 AND up.is_completed = true
            "#
        )
        .bind(&course.id)
        .bind(&user_id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        let progress_percentage = if total_chapters > 0 {
            (completed_chapters as f64 / total_chapters as f64) * 100.0
        } else {
            0.0
        };

        if progress_percentage >= 100.0 {
            completed_courses += 1;
        } else {
            in_progress_courses += 1;
        }

        enrolled_courses.push(CourseWithProgress {
            id: course.id.clone(),
            title: course.title.clone(),
            description: course.description.clone(),
            image_url: course.image_url.clone(),
            category_id: course.category_id.clone(),
            is_published: course.is_published,
            total_chapters,
            completed_chapters,
            progress_percentage,
        });
    }

    Ok(Json(DashboardResponse {
        enrolled_courses,
        total_enrolled,
        completed_courses,
        in_progress_courses,
    }))
}

#[derive(Debug, Serialize)]
pub struct CourseProgressResponse {
    pub course_id: String,
    pub total_chapters: i64,
    pub completed_chapters: i64,
    pub progress_percentage: f64,
    pub is_completed: bool,
}

/// GET /api/courses/:courseId/progress - Get overall progress for a course
pub async fn get_course_progress(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(course_id): Path<String>,
) -> Result<Json<CourseProgressResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    // Verify course exists
    let course_exists: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(SELECT 1 FROM "Course" WHERE id = $1)"#
    )
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| CourseError::CourseNotFound)?;

    if !course_exists {
        return Err(CourseError::CourseNotFound);
    }

    let total_chapters: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Chapter" WHERE course_id = $1 AND is_published = true"#
    )
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let completed_chapters: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM "UserProgress" up
        INNER JOIN "Chapter" ch ON ch.id = up.chapter_id
        WHERE ch.course_id = $1 AND up.user_id = $2 AND up.is_completed = true
        "#
    )
    .bind(&course_id)
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let progress_percentage = if total_chapters > 0 {
        (completed_chapters as f64 / total_chapters as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(CourseProgressResponse {
        course_id,
        total_chapters,
        completed_chapters,
        progress_percentage,
        is_completed: progress_percentage >= 100.0,
    }))
}
