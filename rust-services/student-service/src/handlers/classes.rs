use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{StudentError, Result};
use crate::models::Class;

#[derive(Debug, Serialize)]
pub struct ClassesListResponse {
    pub classes: Vec<ClassInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct ClassInfo {
    pub id: String,
    pub name: String,
    pub teacher_id: String,
    pub grade_level: String,
    pub academic_year: String,
    pub student_count: i64,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/classes
pub async fn list_classes(
    State(state): State<AppState>,
) -> Result<Json<ClassesListResponse>> {
    let classes = sqlx::query_as::<_, Class>(
        r#"SELECT * FROM "Class" ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Class""#
    )
    .fetch_one(&state.db)
    .await?;

    let class_infos: Vec<ClassInfo> = classes.into_iter().map(|c| {
        ClassInfo {
            id: c.id,
            name: c.name,
            teacher_id: c.teacher_id,
            grade_level: c.grade_level,
            academic_year: c.academic_year,
            student_count: 0, // TODO: Count students
            is_active: c.is_active,
            created_at: c.created_at,
        }
    }).collect();

    Ok(Json(ClassesListResponse {
        classes: class_infos,
        total,
    }))
}

/// GET /api/classes/:id
pub async fn get_class(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ClassInfo>> {
    let class = sqlx::query_as::<_, Class>(
        r#"SELECT * FROM "Class" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match class {
        Some(c) => {
            let student_count = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM "User" WHERE school_id = $1"#
            )
            .bind(&c.school_id)
            .fetch_one(&state.db)
            .await?;

            Ok(Json(ClassInfo {
                id: c.id,
                name: c.name,
                teacher_id: c.teacher_id,
                grade_level: c.grade_level,
                academic_year: c.academic_year,
                student_count,
                is_active: c.is_active,
                created_at: c.created_at,
            }))
        },
        None => Err(StudentError::ClassNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateClassBody {
    pub name: String,
    pub grade_level: String,
    pub academic_year: String,
}

/// POST /api/classes
pub async fn create_class(
    State(state): State<AppState>,
    Json(body): Json<CreateClassBody>,
) -> Result<Json<ClassInfo>> {
    // TODO: Get teacher_id from JWT
    let teacher_id = "teacher_id_placeholder";

    let class = sqlx::query_as::<_, Class>(
        r#"
        INSERT INTO "Class" (id, name, school_id, teacher_id, grade_level, academic_year, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
        RETURNING *
        "#
    )
    .bind(format!("class_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&body.name)
    .bind("default-school")
    .bind(&teacher_id)
    .bind(&body.grade_level)
    .bind(&body.academic_year)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ClassInfo {
        id: class.id,
        name: class.name,
        teacher_id: class.teacher_id,
        grade_level: class.grade_level,
        academic_year: class.academic_year,
        student_count: 0,
        is_active: class.is_active,
        created_at: class.created_at,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateClassBody {
    pub name: Option<String>,
    pub grade_level: Option<String>,
    pub academic_year: Option<String>,
    pub is_active: Option<bool>,
}

/// PUT /api/classes/:id
pub async fn update_class(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateClassBody>,
) -> Result<Json<ClassInfo>> {
    let class = sqlx::query_as::<_, Class>(
        r#"
        UPDATE "Class" 
        SET name = COALESCE($1, name),
            grade_level = COALESCE($2, grade_level),
            academic_year = COALESCE($3, academic_year),
            is_active = COALESCE($4, is_active),
            updated_at = $5
        WHERE id = $6
        RETURNING *
        "#
    )
    .bind(&body.name)
    .bind(&body.grade_level)
    .bind(&body.academic_year)
    .bind(&body.is_active)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match class {
        Some(c) => Ok(Json(ClassInfo {
            id: c.id,
            name: c.name,
            teacher_id: c.teacher_id,
            grade_level: c.grade_level,
            academic_year: c.academic_year,
            student_count: 0,
            is_active: c.is_active,
            created_at: c.created_at,
        })),
        None => Err(StudentError::ClassNotFound),
    }
}

/// DELETE /api/classes/:id
pub async fn delete_class(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "Class" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(StudentError::ClassNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Class deleted successfully"
    })))
}

/// GET /api/classes/:id/students
pub async fn list_class_students(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    // TODO: Implement class students listing
    Ok(Json(serde_json::json!({
        "students": [],
        "total": 0
    })))
}

/// POST /api/classes/:id/students/:student_id
pub async fn add_student_to_class(
    State(_state): State<AppState>,
    Path((_id, _student_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>> {
    // TODO: Implement add student to class
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Student added to class"
    })))
}
