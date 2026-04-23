use axum::{
    extract::State,
    Json,
};

use crate::error::AppError;
use crate::models::{AuthUser, TeacherStats, StatsResponse};
use crate::AppState;

pub async fn get_stats(
    State(state): State<AppState>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<StatsResponse>, AppError> {
    // Count published and draft courses
    let courses_result: (i64, i64) = sqlx::query_as(
        r#"
        SELECT
            COUNT(CASE WHEN "isPublished" = true THEN 1 END) as published,
            COUNT(CASE WHEN "isPublished" = false THEN 1 END) as draft
        FROM "Course"
        WHERE "userId" = $1
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    let (published_courses, draft_courses) = courses_result;

    // Count total students (enrolled in teacher's courses)
    let total_students: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT cs."studentId")
        FROM "ClassStudent" cs
        JOIN "Course" c ON cs."courseId" = c."id"
        WHERE c."userId" = $1
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    // Calculate total revenue from course sales
    let revenue_result: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT SUM(c."price")
        FROM "Purchase" p
        JOIN "Course" c ON p."courseId" = c."id"
        WHERE c."userId" = $1
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    let total_revenue = revenue_result.0.unwrap_or(0.0);

    // Count recent enrollments (last 30 days)
    let recent_enrollments: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM "Purchase" p
        JOIN "Course" c ON p."courseId" = c."id"
        WHERE c."userId" = $1
        AND p."createdAt" >= NOW() - INTERVAL '30 days'
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    // Average rating (simplified - all courses)
    let rating_result: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT AVG(CAST(rating as FLOAT))
        FROM "CourseReview"
        WHERE "courseId" IN (SELECT "id" FROM "Course" WHERE "userId" = $1)
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    let average_rating = rating_result.0.unwrap_or(0.0);

    // Pending assignments (simplified)
    let pending_assignments: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM "Submission"
        WHERE "status" = 'pending'
        AND "assignmentId" IN (
            SELECT "id" FROM "Assignment" WHERE "createdBy" = $1
        )
        "#
    )
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    let stats = TeacherStats {
        total_students: total_students.0,
        published_courses,
        draft_courses,
        total_revenue,
        recent_enrollments: recent_enrollments.0,
        average_rating,
        pending_assignments: pending_assignments.0,
    };

    Ok(Json(StatsResponse {
        success: true,
        data: stats,
    }))
}
