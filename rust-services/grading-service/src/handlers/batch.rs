use axum::{extract::{State, Query}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::services::validator;
use crate::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchQuery {
    pub assignment_id: Option<String>,
}

/// POST /api/grading/batch — Batch grade up to 100 submissions.
pub async fn batch_grade(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<BatchGradeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }
    if req.submissions.is_empty() {
        return Err(AppError::BadRequest("submissions array is required".to_string()));
    }
    if req.submissions.len() > BATCH_LIMIT {
        return Err(AppError::BadRequest(format!("Maximum {} submissions per batch", BATCH_LIMIT)));
    }

    let start = std::time::Instant::now();
    let assignment_id = Uuid::parse_str(&req.assignment_id)
        .map_err(|_| AppError::BadRequest("Invalid assignmentId".to_string()))?;

    let mut results = Vec::new();
    let mut scores = Vec::new();
    let mut success_count = 0;
    let mut failure_count = 0;

    // Grade concurrently with a semaphore (max 5 concurrent LLM calls)
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(5));

    let mut handles = Vec::new();
    for sub in &req.submissions {
        let sem = semaphore.clone();
        let grading = state.grading.clone();
        let subject = req.subject.clone();
        let atype = req.assignment_type.clone();
        let student_id = sub.student_id.clone();
        let submission_text = sub.submission.clone();

        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await;
            let result = grading.grade_single(
                &submission_text,
                &subject,
                atype.as_deref(),
                10.0,
            ).await;
            (student_id, result)
        }));
    }

    for handle in handles {
        match handle.await {
            Ok((student_id, Ok(result))) => {
                let needs_review = state.grading.needs_review(result.confidence, None, result.score);
                let status = if needs_review { "PENDING_REVIEW" } else { "GRADED" };

                scores.push((student_id.clone(), result.score));

                // Save to DB
                let sub_id = Uuid::new_v4();
                let ai_json = serde_json::to_value(&result).unwrap_or_default();

                let _ = sqlx::query(
                    "INSERT INTO submission (id, assignment_id, student_id, content, status, score, feedback, confidence, ai_grading_result, submitted_at, graded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), CASE WHEN $5 = 'GRADED' THEN NOW() ELSE NULL END) ON CONFLICT (assignment_id, student_id) DO UPDATE SET score = $6, feedback = $7, confidence = $8, ai_grading_result = $9, status = $5"
                )
                .bind(sub_id)
                .bind(assignment_id)
                .bind(&student_id)
                .bind("")
                .bind(status)
                .bind(result.score)
                .bind(&result.feedback.summary)
                .bind(result.confidence)
                .bind(&ai_json)
                .execute(&state.db)
                .await;

                results.push(serde_json::json!({
                    "submissionId": sub_id.to_string(),
                    "studentId": student_id,
                    "score": result.score,
                    "grade": result.grade,
                    "confidence": result.confidence,
                    "status": status,
                    "needsReview": needs_review,
                }));
                success_count += 1;
            }
            _ => {
                failure_count += 1;
            }
        }
    }

    // Consistency check
    let score_values: Vec<f64> = scores.iter().map(|s| s.1).collect();
    let (cv, is_consistent) = validator::check_consistency(&score_values);
    let outliers = validator::find_outliers(&scores);

    // Summary statistics
    let avg = if !score_values.is_empty() { score_values.iter().sum::<f64>() / score_values.len() as f64 } else { 0.0 };
    let max = score_values.iter().cloned().fold(f64::MIN, f64::max);
    let min = score_values.iter().cloned().fold(f64::MAX, f64::min);

    let elapsed = start.elapsed().as_millis() as u64;

    // Log batch metrics
    let _ = state.metrics.log_batch_metrics(req.submissions.len(), success_count, avg).await;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "totalGraded": success_count + failure_count,
            "successCount": success_count,
            "failureCount": failure_count,
            "summary": {
                "averageScore": avg,
                "highestScore": if max == f64::MIN { 0.0 } else { max },
                "lowestScore": if min == f64::MAX { 0.0 } else { min },
            },
            "consistency": {
                "score": 1.0 - cv,
                "isConsistent": is_consistent,
                "coefficientOfVariation": cv,
            },
            "outliers": outliers,
            "gradingTime": elapsed,
            "submissions": results,
        }
    })))
}

/// GET /api/grading/batch?assignmentId=xxx — List batch submissions.
pub async fn list_batch_submissions(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<BatchQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }

    let assignment_id = query.assignment_id
        .ok_or_else(|| AppError::BadRequest("assignmentId is required".to_string()))?;
    let aid = Uuid::parse_str(&assignment_id)
        .map_err(|_| AppError::BadRequest("Invalid assignmentId".to_string()))?;

    let submissions: Vec<Submission> = sqlx::query_as(
        "SELECT * FROM submission WHERE assignment_id = $1 ORDER BY submitted_at DESC"
    )
    .bind(aid)
    .fetch_all(&state.db)
    .await?;

    let scores: Vec<f64> = submissions.iter().filter_map(|s| s.score).collect();
    let total = submissions.len();
    let graded = submissions.iter().filter(|s| s.status == "GRADED").count();
    let pending = submissions.iter().filter(|s| s.status == "PENDING_REVIEW").count();

    let avg = if !scores.is_empty() { scores.iter().sum::<f64>() / scores.len() as f64 } else { 0.0 };
    let max = scores.iter().cloned().fold(0.0_f64, f64::max);
    let min = scores.iter().cloned().fold(10.0_f64, f64::min);

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "submissions": submissions,
            "statistics": {
                "total": total,
                "graded": graded,
                "pending": pending,
                "averageScore": avg,
                "highestScore": max,
                "lowestScore": min,
            }
        }
    })))
}
