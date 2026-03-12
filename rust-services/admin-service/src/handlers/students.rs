use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{AdminError, Result};
use crate::models::User;

#[derive(Debug, Serialize)]
pub struct StudentsListResponse {
    pub students: Vec<StudentResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StudentResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub school_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/admin/students
pub async fn list_students(
    State(state): State<AppState>,
) -> Result<Json<StudentsListResponse>> {
    let students = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE role = 'STUDENT' ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'"#
    )
    .fetch_one(&state.db)
    .await?;

    let student_responses: Vec<StudentResponse> = students.into_iter().map(|u| {
        StudentResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }
    }).collect();

    Ok(Json(StudentsListResponse {
        students: student_responses,
        total,
    }))
}

/// GET /api/admin/students/:id
pub async fn get_student(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StudentResponse>> {
    let student = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE id = $1 AND role = 'STUDENT'"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match student {
        Some(u) => Ok(Json(StudentResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        })),
        None => Err(AdminError::StudentNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateStudentBody {
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

/// PUT /api/admin/students/:id
pub async fn update_student(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateStudentBody>,
) -> Result<Json<StudentResponse>> {
    let student = sqlx::query_as::<_, User>(
        r#"
        UPDATE "User" 
        SET name = COALESCE($1, name),
            is_active = COALESCE($2, is_active),
            updated_at = $3
        WHERE id = $4 AND role = 'STUDENT'
        RETURNING *
        "#
    )
    .bind(&body.name)
    .bind(&body.is_active)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match student {
        Some(u) => Ok(Json(StudentResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        })),
        None => Err(AdminError::StudentNotFound),
    }
}

/// DELETE /api/admin/students/:id
pub async fn delete_student(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "User" WHERE id = $1 AND role = 'STUDENT'"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AdminError::StudentNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Student deleted successfully"
    })))
}
