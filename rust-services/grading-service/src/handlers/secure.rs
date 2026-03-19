use axum::{extract::State, Json};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::services::security;
use crate::AppState;

/// POST /api/grading/secure — Secured submission with PII detection.
pub async fn secure_submit(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<SecureSubmitRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    match req.action.as_str() {
        "submit" => {
            let content = req.content.as_deref()
                .ok_or_else(|| AppError::BadRequest("content is required".to_string()))?;
            let rubric_id = req.rubric_id.as_deref()
                .ok_or_else(|| AppError::BadRequest("rubricId is required".to_string()))?;

            // PII detection
            let pii_types = security::detect_pii(content);
            if !pii_types.is_empty() {
                return Ok(Json(serde_json::json!({
                    "success": false,
                    "error": "PII detected in submission",
                    "details": pii_types,
                    "securityNotice": "Personal information must be removed before submission",
                })));
            }

            // Content filtering
            let (is_blocked, categories) = security::filter_content(content);
            if is_blocked {
                return Ok(Json(serde_json::json!({
                    "success": false,
                    "error": "Content blocked",
                    "details": categories,
                })));
            }

            // Redact any borderline PII and save
            let safe_content = security::redact_pii(content);
            let rid = Uuid::parse_str(rubric_id)
                .map_err(|_| AppError::BadRequest("Invalid rubricId".to_string()))?;

            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO student_submission (id, user_id, rubric_id, content, title, status, submitted_at) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())"
            )
            .bind(id)
            .bind(&auth.id)
            .bind(rid)
            .bind(&safe_content)
            .bind(req.title.as_deref())
            .execute(&state.db)
            .await?;

            Ok(Json(serde_json::json!({
                "success": true,
                "submissionId": id.to_string(),
                "status": "pending",
                "message": "Submission received and security checks passed",
            })))
        }
        "get-results" => {
            let sub_id = req.submission_id.as_deref()
                .ok_or_else(|| AppError::BadRequest("submissionId is required".to_string()))?;
            let sid = Uuid::parse_str(sub_id)
                .map_err(|_| AppError::BadRequest("Invalid submissionId".to_string()))?;

            let submission: Option<StudentSubmission> = sqlx::query_as(
                "SELECT * FROM student_submission WHERE id = $1 AND user_id = $2"
            )
            .bind(sid)
            .bind(&auth.id)
            .fetch_optional(&state.db)
            .await?;

            match submission {
                Some(s) => Ok(Json(serde_json::json!({
                    "success": true,
                    "data": s,
                }))),
                None => Err(AppError::NotFound("Submission not found".to_string())),
            }
        }
        _ => Err(AppError::BadRequest(format!("Unknown action: {}", req.action))),
    }
}
