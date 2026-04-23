use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{AdminError, Result};
use crate::models::User;

#[derive(Debug, Serialize)]
pub struct TeacherResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub school_id: String,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub total_courses: i64,
    pub total_students: i64,
}

#[derive(Debug, Serialize)]
pub struct TeachersListResponse {
    pub teachers: Vec<TeacherResponse>,
    pub total: i64,
}

/// GET /api/admin/teachers
pub async fn list_teachers(
    State(state): State<AppState>,
) -> Result<Json<TeachersListResponse>> {
    let teachers = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE role = 'TEACHER' ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(AdminError::Database)?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER'"#
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let mut teacher_responses = Vec::new();
    for teacher in &teachers {
        let total_courses: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Course" WHERE user_id = $1"#
        )
        .bind(&teacher.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        // Count unique students enrolled in this teacher's courses via UserProgress
        let total_students: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT up.user_id)
            FROM "UserProgress" up
            INNER JOIN "Chapter" ch ON ch.id = up.chapter_id
            INNER JOIN "Course" c ON c.id = ch.course_id
            WHERE c.user_id = $1
            "#
        )
        .bind(&teacher.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        teacher_responses.push(TeacherResponse {
            id: teacher.id.clone(),
            name: teacher.name.clone(),
            email: teacher.email.clone(),
            role: teacher.role.clone(),
            school_id: teacher.school_id.clone(),
            is_active: teacher.is_active,
            created_at: teacher.created_at,
            updated_at: teacher.updated_at,
            total_courses,
            total_students,
        });
    }

    Ok(Json(TeachersListResponse {
        teachers: teacher_responses,
        total,
    }))
}

/// GET /api/admin/teachers/:id
pub async fn get_teacher(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<TeacherResponse>> {
    let teacher = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE id = $1 AND role = 'TEACHER'"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(AdminError::Database)?
    .ok_or(AdminError::UserNotFound)?;

    let total_courses: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Course" WHERE user_id = $1"#
    )
    .bind(&teacher.id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_students: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT up.user_id)
        FROM "UserProgress" up
        INNER JOIN "Chapter" ch ON ch.id = up.chapter_id
        INNER JOIN "Course" c ON c.id = ch.course_id
        WHERE c.user_id = $1
        "#
    )
    .bind(&teacher.id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    Ok(Json(TeacherResponse {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        school_id: teacher.school_id,
        is_active: teacher.is_active,
        created_at: teacher.created_at,
        updated_at: teacher.updated_at,
        total_courses,
        total_students,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateTeacherBody {
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

/// PUT /api/admin/teachers/:id
pub async fn update_teacher(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateTeacherBody>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"
        UPDATE "User"
        SET name = COALESCE($1, name),
            is_active = COALESCE($2, is_active),
            updated_at = $3
        WHERE id = $4 AND role = 'TEACHER'
        "#
    )
    .bind(&body.name)
    .bind(body.is_active)
    .bind(chrono::Utc::now())
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(AdminError::Database)?;

    if result.rows_affected() == 0 {
        return Err(AdminError::UserNotFound);
    }

    Ok(Json(serde_json::json!({ "success": true, "message": "Teacher updated" })))
}
