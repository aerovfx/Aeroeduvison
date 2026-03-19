use axum::{extract::{State, Query}, Json};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::services::{validator, review as review_svc};
use crate::AppState;

#[derive(Deserialize)]
pub struct ReviewQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub limit: Option<i64>,
}

/// POST /api/grading/review — Submit a human review.
pub async fn submit_review(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<ReviewSubmitRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }
    if req.score < 0.0 || req.score > 10.0 {
        return Err(AppError::BadRequest("Score must be between 0 and 10".to_string()));
    }
    if req.feedback.is_empty() {
        return Err(AppError::BadRequest("Feedback is required".to_string()));
    }

    let sub_id = Uuid::parse_str(&req.submission_id)
        .map_err(|_| AppError::BadRequest("Invalid submissionId".to_string()))?;

    let submission: Submission = sqlx::query_as(
        "SELECT * FROM submission WHERE id = $1"
    )
    .bind(sub_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Submission not found".to_string()))?;

    // Compare human vs AI
    let ai_score = submission.score.unwrap_or(0.0);
    let comparison = validator::validate_against_human(ai_score, req.score);

    let review_data = serde_json::json!({
        "humanScore": req.score,
        "aiScore": ai_score,
        "comparison": comparison,
        "reviewedBy": auth.id,
        "reviewedAt": Utc::now().to_rfc3339(),
        "timeSpent": req.time_spent,
        "notes": req.notes,
    });

    // Update submission
    sqlx::query(
        "UPDATE submission SET score = $1, feedback = $2, status = 'GRADED', reviewed_by = $3, review_notes = $4, human_review_data = $5, graded_at = NOW() WHERE id = $6"
    )
    .bind(req.score)
    .bind(&req.feedback)
    .bind(&auth.id)
    .bind(req.notes.as_deref())
    .bind(&review_data)
    .bind(sub_id)
    .execute(&state.db)
    .await?;

    // Log to Redis
    let _ = state.metrics.log_review_comparison(
        &req.submission_id,
        ai_score,
        req.score,
        "unknown", // Would need assignment join for subject
    ).await;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "submissionId": req.submission_id,
            "humanScore": req.score,
            "aiScore": ai_score,
            "comparison": comparison,
            "status": "GRADED",
            "gradedAt": Utc::now().to_rfc3339(),
        }
    })))
}

/// GET /api/grading/review — Get review tasks.
pub async fn get_review_tasks(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ReviewQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }

    let status = query.status.as_deref().unwrap_or("PENDING_REVIEW");
    let limit = query.limit.unwrap_or(50);

    let submissions: Vec<Submission> = sqlx::query_as(
        "SELECT * FROM submission WHERE status = $1 ORDER BY submitted_at ASC LIMIT $2"
    )
    .bind(status)
    .bind(limit)
    .fetch_all(&state.db)
    .await?;

    let now = Utc::now();
    let tasks: Vec<serde_json::Value> = submissions.iter().map(|s| {
        let priority = review_svc::calculate_priority(s.confidence, s.score);
        let wait_secs = (now - s.submitted_at).num_seconds();

        serde_json::json!({
            "id": s.id,
            "submissionId": s.id,
            "content": s.content,
            "aiGrading": {
                "score": s.score,
                "confidence": s.confidence,
                "feedback": s.feedback,
            },
            "priority": priority,
            "status": s.status,
            "submittedAt": s.submitted_at.to_rfc3339(),
            "waitTime": wait_secs,
        })
    }).collect();

    // Filter by priority if specified
    let tasks = if let Some(ref prio) = query.priority {
        tasks.into_iter()
            .filter(|t| t["priority"].as_str() == Some(prio.as_str()))
            .collect()
    } else {
        tasks
    };

    let total = tasks.len();

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "tasks": tasks,
            "summary": {
                "total": total,
            }
        }
    })))
}
