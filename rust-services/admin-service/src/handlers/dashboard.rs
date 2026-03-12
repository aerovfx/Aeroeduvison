use axum::extract::State;
use axum::Json;
use serde::Serialize;

use crate::AppState;
use crate::error::Result;

#[derive(Debug, Serialize)]
pub struct OverviewResponse {
    pub total_students: i64,
    pub active_students: i64,
    pub total_courses: i64,
    pub total_enrollments: i64,
    pub completed_chapters: i64,
    pub total_chapters: i64,
    pub period: String,
}

/// GET /api/admin/overview
pub async fn get_overview(
    State(_state): State<AppState>,
) -> Result<Json<OverviewResponse>> {
    // Calculate date range (default: week)
    let now = chrono::Utc::now();
    let start_date = now - chrono::Duration::days(7);

    // Fetch KPI data
    let total_students: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'"#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let active_students: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT' AND updated_at >= $1"#
    )
    .bind(start_date)
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_courses: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Course""#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_enrollments: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Purchase""#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_chapters: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Chapter""#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let completed_chapters: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "UserProgress" WHERE is_completed = true"#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    Ok(Json(OverviewResponse {
        total_students,
        active_students,
        total_courses,
        total_enrollments,
        completed_chapters,
        total_chapters,
        period: "week".to_string(),
    }))
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub total_users: i64,
    pub total_teachers: i64,
    pub total_admins: i64,
    pub total_schools: i64,
}

/// GET /api/admin/stats
pub async fn get_stats(
    State(_state): State<AppState>,
) -> Result<Json<StatsResponse>> {
    let total_users: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "User""#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_teachers: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER'"#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_admins: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'"#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    let total_schools: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(DISTINCT school_id) FROM "User""#
    )
    .fetch_one(&_state.db)
    .await
    .unwrap_or(0);

    Ok(Json(StatsResponse {
        total_users,
        total_teachers,
        total_admins,
        total_schools,
    }))
}
