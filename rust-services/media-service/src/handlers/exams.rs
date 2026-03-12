use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::{MediaError, Result};
use crate::models::{ExamMatrix, CreateExamMatrixBody, ExamMatrixListResponse, ExamMatrixInfo};

/// GET /api/exam-matrices
pub async fn list_exam_matrices(
    State(state): State<AppState>,
) -> Result<Json<ExamMatrixListResponse>> {
    let matrices: Vec<ExamMatrix> = sqlx::query_as::<_, ExamMatrix>(
        r#"SELECT * FROM "ExamMatrix" ORDER BY created_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "ExamMatrix""#
    )
    .fetch_one(&state.db)
    .await?;

    let matrix_infos: Vec<ExamMatrixInfo> = matrices.into_iter().map(|m: ExamMatrix| m.to_info()).collect();

    Ok(Json(ExamMatrixListResponse {
        matrices: matrix_infos,
        total,
    }))
}

/// POST /api/exam-matrices
pub async fn create_exam_matrix(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateExamMatrixBody>,
) -> Result<Json<serde_json::Value>> {
    let created_by = require_user_id(&state, &headers)?;

    let matrix = sqlx::query_as::<_, ExamMatrix>(
        r#"
        INSERT INTO "ExamMatrix" (id, title, subject, grade_level, matrix_data, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8)
        RETURNING *
        "#
    )
    .bind(format!("matrix_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&body.title)
    .bind(&body.subject)
    .bind(&body.grade_level)
    .bind(&body.matrix_data)
    .bind(&created_by)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "matrix_id": matrix.id,
        "message": "Exam matrix created successfully"
    })))
}

/// GET /api/exam-matrices/:id
pub async fn get_exam_matrix(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ExamMatrix>> {
    let matrix = sqlx::query_as::<_, ExamMatrix>(
        r#"SELECT * FROM "ExamMatrix" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match matrix {
        Some(m) => Ok(Json(m)),
        None => Err(MediaError::ExamMatrixNotFound),
    }
}

/// POST /api/exam-matrices/:id/process
pub async fn process_exam_matrix(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    // Update matrix status to processing
    let _result: sqlx::postgres::PgQueryResult = sqlx::query(
        r#"UPDATE "ExamMatrix" SET status = 'processing', updated_at = $1 WHERE id = $2"#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .execute(&_state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Exam matrix processing started",
        "matrix_id": id
    })))
}

#[derive(Debug, Deserialize)]
pub struct GenerateExamBody {
    pub matrix_id: String,
    pub title: Option<String>,
    pub duration_minutes: Option<i32>,
}

/// POST /api/exams/generate-from-matrix
pub async fn generate_exam(
    State(state): State<AppState>,
    Json(body): Json<GenerateExamBody>,
) -> Result<Json<serde_json::Value>> {
    // Verify matrix exists
    let matrix_exists: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(SELECT 1 FROM "ExamMatrix" WHERE id = $1)"#
    )
    .bind(&body.matrix_id)
    .fetch_one(&state.db)
    .await?;

    if !matrix_exists {
        return Err(MediaError::ExamMatrixNotFound);
    }

    // TODO: Generate exam from matrix
    // For now, return placeholder response

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Exam generation started",
        "matrix_id": body.matrix_id,
        "exam_id": format!("exam_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4())
    })))
}
