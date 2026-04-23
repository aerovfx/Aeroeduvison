use axum::{
    extract::{State, Path},
    Json,
};

use crate::error::AppError;
use crate::models::{AuthUser, StudentInfo, StudentListResponse, StudentDetailResponse};
use crate::AppState;

pub async fn list_students(
    State(state): State<AppState>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<StudentListResponse>, AppError> {
    let students: Vec<StudentInfo> = sqlx::query_as(
        r#"
        SELECT DISTINCT
            cs."studentId" as id,
            u."name",
            u."email",
            cs."averageScore" as average_score,
            cs."attendanceRate" as attendance_rate,
            cs."totalXp" as total_xp,
            cs."completedExams" as completed_exams,
            cs."passedExams" as passed_exams,
            cs."status"
        FROM "ClassStudent" cs
        JOIN "User" u ON cs."studentId" = u."id"
        JOIN "Course" c ON cs."courseId" = c."id"
        WHERE c."userId" = $1
        ORDER BY u."name"
        "#
    )
    .bind(&teacher_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(StudentListResponse {
        success: true,
        data: students,
    }))
}

pub async fn get_student(
    State(state): State<AppState>,
    Path(student_id): Path<String>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<StudentDetailResponse>, AppError> {
    let student: StudentInfo = sqlx::query_as(
        r#"
        SELECT
            cs."studentId" as id,
            u."name",
            u."email",
            cs."averageScore" as average_score,
            cs."attendanceRate" as attendance_rate,
            cs."totalXp" as total_xp,
            cs."completedExams" as completed_exams,
            cs."passedExams" as passed_exams,
            cs."status"
        FROM "ClassStudent" cs
        JOIN "User" u ON cs."studentId" = u."id"
        JOIN "Course" c ON cs."courseId" = c."id"
        WHERE cs."studentId" = $1
        AND c."userId" = $2
        "#
    )
    .bind(&student_id)
    .bind(&teacher_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Student not found".to_string()))?;

    Ok(Json(StudentDetailResponse {
        success: true,
        data: student,
    }))
}
