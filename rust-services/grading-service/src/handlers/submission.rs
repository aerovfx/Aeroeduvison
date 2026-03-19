use axum::{extract::{State, Path}, Json};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

/// GET /api/grading/:id — Get submission detail.
pub async fn get_submission(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let sub_id = Uuid::parse_str(&id)
        .map_err(|_| AppError::BadRequest("Invalid submission ID".to_string()))?;

    let submission: Submission = sqlx::query_as(
        "SELECT * FROM submission WHERE id = $1"
    )
    .bind(sub_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Submission not found".to_string()))?;

    // Authorization: students can only see their own
    if auth.is_student() && submission.student_id != auth.id {
        return Err(AppError::Forbidden("Access denied".to_string()));
    }

    // Parse AI grading result
    let grading = submission.ai_grading_result.clone().unwrap_or(serde_json::Value::Null);

    let needs_review = submission.status == "PENDING_REVIEW";

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "submission": {
                "id": submission.id,
                "content": submission.content,
                "submittedAt": submission.submitted_at.to_rfc3339(),
                "gradedAt": submission.graded_at.map(|d| d.to_rfc3339()),
                "status": submission.status,
            },
            "grading": {
                "score": submission.score,
                "confidence": submission.confidence,
                "feedback": submission.feedback,
                "details": grading,
            },
            "review": {
                "needsReview": needs_review,
                "reviewedBy": submission.reviewed_by,
                "reviewNotes": submission.review_notes,
            }
        }
    })))
}

/// PATCH /api/grading/:id — Update grade (teacher only).
pub async fn update_submission(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(req): Json<SubmissionUpdateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }

    let sub_id = Uuid::parse_str(&id)
        .map_err(|_| AppError::BadRequest("Invalid submission ID".to_string()))?;

    if let Some(score) = req.score {
        if score < 0.0 || score > 10.0 {
            return Err(AppError::BadRequest("Score must be between 0 and 10".to_string()));
        }
    }

    // Build dynamic update
    sqlx::query(
        "UPDATE submission SET score = COALESCE($1, score), feedback = COALESCE($2, feedback), status = COALESCE($3, status), review_notes = COALESCE($4, review_notes), reviewed_by = $5, graded_at = NOW() WHERE id = $6"
    )
    .bind(req.score)
    .bind(req.feedback.as_deref())
    .bind(req.status.as_deref())
    .bind(req.review_notes.as_deref())
    .bind(&auth.id)
    .bind(sub_id)
    .execute(&state.db)
    .await?;

    let updated: Submission = sqlx::query_as("SELECT * FROM submission WHERE id = $1")
        .bind(sub_id)
        .fetch_one(&state.db)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "id": updated.id,
            "score": updated.score,
            "feedback": updated.feedback,
            "status": updated.status,
            "gradedAt": updated.graded_at.map(|d| d.to_rfc3339()),
        }
    })))
}

/// DELETE /api/grading/:id — Delete submission (student self-delete only).
pub async fn delete_submission(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let sub_id = Uuid::parse_str(&id)
        .map_err(|_| AppError::BadRequest("Invalid submission ID".to_string()))?;

    let submission: Submission = sqlx::query_as("SELECT * FROM submission WHERE id = $1")
        .bind(sub_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Submission not found".to_string()))?;

    if submission.student_id != auth.id {
        return Err(AppError::Forbidden("Can only delete your own submissions".to_string()));
    }
    if submission.status == "GRADED" {
        return Err(AppError::BadRequest("Cannot delete graded submissions".to_string()));
    }

    sqlx::query("DELETE FROM submission WHERE id = $1")
        .bind(sub_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Submission deleted successfully",
    })))
}
