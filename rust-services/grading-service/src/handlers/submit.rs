use axum::{extract::State, Json};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

/// POST /api/grading/submit — Submit and grade a single assignment.
pub async fn submit_grading(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<SubmitGradingRequest>,
) -> Result<Json<SubmitGradingResponse>, AppError> {
    // Validate
    if req.assignment_id.is_empty() || req.submission.is_empty() || req.subject.is_empty() {
        return Err(AppError::BadRequest("assignmentId, submission, and subject are required".to_string()));
    }
    if req.submission.len() < 50 {
        return Err(AppError::BadRequest("Submission must be at least 50 characters".to_string()));
    }

    let start = std::time::Instant::now();
    let assignment_id = Uuid::parse_str(&req.assignment_id)
        .map_err(|_| AppError::BadRequest("Invalid assignmentId format".to_string()))?;

    // Check assignment exists
    let assignment: Option<Assignment> = sqlx::query_as(
        "SELECT id, title, description, \"courseId\" as course_id FROM \"Chapter\" WHERE id = $1"
    )
    .bind(assignment_id)
    .fetch_optional(&state.db)
    .await?;

    if assignment.is_none() {
        return Err(AppError::NotFound("Assignment not found".to_string()));
    }

    // Check existing submission
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM submission WHERE student_id = $1 AND assignment_id = $2"
    )
    .bind(&auth.id)
    .bind(assignment_id)
    .fetch_optional(&state.db)
    .await?;

    // AI grading
    let grading_result = state.grading.grade_single(
        &req.submission,
        &req.subject,
        req.assignment_type.as_deref(),
        10.0,
    ).await?;

    // Outlier detection
    let historical = state.grading.get_historical_scores(&auth.id, &req.assignment_id).await?;
    let outlier = if historical.len() >= 10 {
        state.grading.detect_outlier(grading_result.score, &historical)
    } else {
        None
    };

    let needs_review = state.grading.needs_review(
        grading_result.confidence,
        outlier.as_ref(),
        grading_result.score,
    );

    let status = if needs_review { "PENDING_REVIEW" } else { "GRADED" };
    let graded_at = if needs_review { None } else { Some(chrono::Utc::now()) };
    let ai_result_json = serde_json::to_value(&grading_result)
        .unwrap_or(serde_json::Value::Null);

    // Save or update
    let submission_id = if let Some((id,)) = existing {
        sqlx::query(
            "UPDATE submission SET content = $1, status = $2, score = $3, feedback = $4, confidence = $5, ai_grading_result = $6, graded_at = $7 WHERE id = $8"
        )
        .bind(&req.submission)
        .bind(status)
        .bind(grading_result.score)
        .bind(&grading_result.feedback.summary)
        .bind(grading_result.confidence)
        .bind(&ai_result_json)
        .bind(graded_at)
        .bind(id)
        .execute(&state.db)
        .await?;
        id
    } else {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO submission (id, assignment_id, student_id, content, status, score, feedback, confidence, ai_grading_result, submitted_at, graded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)"
        )
        .bind(id)
        .bind(assignment_id)
        .bind(&auth.id)
        .bind(&req.submission)
        .bind(status)
        .bind(grading_result.score)
        .bind(&grading_result.feedback.summary)
        .bind(grading_result.confidence)
        .bind(&ai_result_json)
        .bind(graded_at)
        .execute(&state.db)
        .await?;
        id
    };

    // Log metrics
    let _ = state.metrics.log_grading_metrics(
        &req.subject,
        grading_result.score,
        grading_result.confidence,
        needs_review,
        outlier.as_ref().map(|o| o.is_outlier).unwrap_or(false),
    ).await;

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(Json(SubmitGradingResponse {
        success: true,
        data: SubmitGradingData {
            submission_id: submission_id.to_string(),
            score: grading_result.score,
            percentage: grading_result.percentage,
            grade: grading_result.grade,
            confidence: grading_result.confidence,
            feedback: GradingFeedback {
                summary: grading_result.feedback.summary,
                strengths: grading_result.feedback.strengths,
                improvements: grading_result.feedback.improvements,
                suggestions: grading_result.feedback.suggestions,
            },
            criteria_scores: grading_result.criteria_scores,
            needs_review,
            status: status.to_string(),
            grading_time: elapsed,
            outlier_analysis: outlier,
        },
    }))
}
