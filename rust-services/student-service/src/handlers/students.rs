use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{StudentError, Result};
use crate::models::User;

#[derive(Debug, Serialize)]
pub struct StudentsListResponse {
    pub students: Vec<StudentInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StudentInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub id_number: Option<String>,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListStudentsQuery {
    role: Option<String>,
    search: Option<String>,
}

/// GET /api/students
pub async fn list_students(
    State(state): State<AppState>,
) -> Result<Json<StudentsListResponse>> {
    // TODO: Get user from JWT and validate permissions

    let students = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE role = 'STUDENT' ORDER BY name ASC LIMIT 1000"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'"#
    )
    .fetch_one(&state.db)
    .await?;

    let student_infos: Vec<StudentInfo> = students.into_iter().map(|s| {
        StudentInfo {
            id: s.id,
            name: s.name,
            email: s.email,
            id_number: s.id_number,
            role: s.role,
            created_at: s.created_at,
        }
    }).collect();

    Ok(Json(StudentsListResponse {
        students: student_infos,
        total,
    }))
}

/// GET /api/students/:id
pub async fn get_student(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StudentInfo>> {
    let student = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE id = $1 AND role = 'STUDENT'"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match student {
        Some(s) => Ok(Json(StudentInfo {
            id: s.id,
            name: s.name,
            email: s.email,
            id_number: s.id_number,
            role: s.role,
            created_at: s.created_at,
        })),
        None => Err(StudentError::StudentNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateStudentBody {
    pub name: Option<String>,
    pub email: Option<String>,
    pub id_number: Option<String>,
    pub date_of_birth: Option<chrono::DateTime<chrono::Utc>>,
    pub gender: Option<String>,
    pub is_active: Option<bool>,
}

/// PUT /api/students/:id
pub async fn update_student(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateStudentBody>,
) -> Result<Json<StudentInfo>> {
    let student = sqlx::query_as::<_, User>(
        r#"
        UPDATE "User" 
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            id_number = COALESCE($3, id_number),
            date_of_birth = COALESCE($4, date_of_birth),
            gender = COALESCE($5, gender),
            is_active = COALESCE($6, is_active),
            updated_at = $7
        WHERE id = $8 AND role = 'STUDENT'
        RETURNING *
        "#
    )
    .bind(&body.name)
    .bind(&body.email)
    .bind(&body.id_number)
    .bind(&body.date_of_birth)
    .bind(&body.gender)
    .bind(&body.is_active)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match student {
        Some(s) => Ok(Json(StudentInfo {
            id: s.id,
            name: s.name,
            email: s.email,
            id_number: s.id_number,
            role: s.role,
            created_at: s.created_at,
        })),
        None => Err(StudentError::StudentNotFound),
    }
}

/// DELETE /api/students/:id
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
        return Err(StudentError::StudentNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Student deleted successfully"
    })))
}
