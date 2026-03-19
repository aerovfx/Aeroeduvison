use axum::{extract::{State, Query}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

#[derive(Deserialize)]
pub struct GradeQuery {
    pub action: Option<String>,
    pub rubric_id: Option<String>,
    pub user_id: Option<String>,
}

/// POST /api/grading/grade — Multi-action grading endpoint.
pub async fn grade_action(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<GradeActionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    match req.action.as_str() {
        "submit" => {
            let content = req.content.as_deref()
                .ok_or_else(|| AppError::BadRequest("content is required".to_string()))?;
            let rubric_id = req.rubric_id.as_deref()
                .ok_or_else(|| AppError::BadRequest("rubricId is required".to_string()))?;

            if content.len() < 50 {
                return Err(AppError::BadRequest("Content must be at least 50 characters".to_string()));
            }

            let rid = Uuid::parse_str(rubric_id)
                .map_err(|_| AppError::BadRequest("Invalid rubricId".to_string()))?;

            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO student_submission (id, user_id, rubric_id, content, title, status, submitted_at) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())"
            )
            .bind(id)
            .bind(&auth.id)
            .bind(rid)
            .bind(content)
            .bind(req.title.as_deref())
            .execute(&state.db)
            .await?;

            // Fire-and-forget async grading
            let db = state.db.clone();
            let llm = state.llm.clone();
            let submission_id = id;
            let subject = req.subject.clone().unwrap_or_else(|| "general".to_string());
            let content_clone = content.to_string();

            tokio::spawn(async move {
                // Update status to grading
                let _ = sqlx::query("UPDATE student_submission SET status = 'grading' WHERE id = $1")
                    .bind(submission_id)
                    .execute(&db)
                    .await;

                match llm.grade_submission(&content_clone, &subject, None, 10.0).await {
                    Ok((result, _model)) => {
                        let grade_id = Uuid::new_v4();
                        let percentage = result.score / 10.0 * 100.0;
                        let status = if result.score >= 5.0 { "pass" } else { "fail" };

                        let _ = sqlx::query(
                            "INSERT INTO submission_grade (id, submission_id, final_score, percentage, status, feedback, strengths, improvements, confidence_score, graded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())"
                        )
                        .bind(grade_id)
                        .bind(submission_id)
                        .bind(result.score)
                        .bind(percentage)
                        .bind(status)
                        .bind(&result.feedback)
                        .bind(serde_json::to_value(&result.strengths).ok())
                        .bind(serde_json::to_value(&result.weaknesses).ok())
                        .bind(0.8)
                        .execute(&db)
                        .await;

                        let _ = sqlx::query("UPDATE student_submission SET status = 'graded' WHERE id = $1")
                            .bind(submission_id)
                            .execute(&db)
                            .await;
                    }
                    Err(e) => {
                        tracing::error!("Async grading failed for {}: {}", submission_id, e);
                        let _ = sqlx::query("UPDATE student_submission SET status = 'failed' WHERE id = $1")
                            .bind(submission_id)
                            .execute(&db)
                            .await;
                    }
                }
            });

            Ok(Json(serde_json::json!({
                "success": true,
                "submissionId": id.to_string(),
                "status": "pending",
                "message": "Submission received, grading in progress...",
            })))
        }

        "get-results" => {
            let sub_id = req.submission_id.as_deref()
                .ok_or_else(|| AppError::BadRequest("submissionId is required".to_string()))?;
            let sid = Uuid::parse_str(sub_id)
                .map_err(|_| AppError::BadRequest("Invalid submissionId".to_string()))?;

            let grade: Option<SubmissionGrade> = sqlx::query_as(
                "SELECT * FROM submission_grade WHERE submission_id = $1"
            )
            .bind(sid)
            .fetch_optional(&state.db)
            .await?;

            match grade {
                Some(g) => Ok(Json(serde_json::json!({
                    "success": true,
                    "grade": g,
                }))),
                None => Ok(Json(serde_json::json!({
                    "success": true,
                    "grade": null,
                    "message": "Grading not yet complete",
                }))),
            }
        }

        "create-rubric" => {
            if !auth.is_teacher_or_admin() {
                return Err(AppError::Forbidden("Teacher or admin required".to_string()));
            }

            let name = req.name.as_deref()
                .ok_or_else(|| AppError::BadRequest("name is required".to_string()))?;
            let subject = req.subject.as_deref()
                .ok_or_else(|| AppError::BadRequest("subject is required".to_string()))?;
            let grade = req.grade.as_deref()
                .ok_or_else(|| AppError::BadRequest("grade is required".to_string()))?;

            let opts = req.options.as_ref();
            let max_score = opts.and_then(|o| o.max_score).unwrap_or(10.0);
            let min_pass = opts.and_then(|o| o.min_passing_score).unwrap_or(5.0);

            let rubric_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO grading_rubric (id, name, subject, grade, max_score, min_passing_score, description, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())"
            )
            .bind(rubric_id)
            .bind(name)
            .bind(subject)
            .bind(grade)
            .bind(max_score)
            .bind(min_pass)
            .bind(opts.and_then(|o| o.description.as_deref()))
            .bind(opts.and_then(|o| o.created_by.as_deref()).or(Some(&auth.id)))
            .execute(&state.db)
            .await?;

            // Insert criteria
            if let Some(criteria) = &req.criteria {
                for (i, c) in criteria.iter().enumerate() {
                    let cid = Uuid::new_v4();
                    sqlx::query(
                        "INSERT INTO rubric_criterion (id, rubric_id, criterion, description, max_points, weight, sort_order, examples) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
                    )
                    .bind(cid)
                    .bind(rubric_id)
                    .bind(&c.criterion)
                    .bind(c.description.as_deref())
                    .bind(c.max_points.unwrap_or(10.0))
                    .bind(c.weight.unwrap_or(1.0))
                    .bind(i as i32)
                    .bind(c.examples.as_ref().and_then(|e| serde_json::to_value(e).ok()))
                    .execute(&state.db)
                    .await?;
                }
            }

            Ok(Json(serde_json::json!({
                "success": true,
                "rubricId": rubric_id.to_string(),
                "message": "Rubric created successfully",
            })))
        }

        _ => Err(AppError::BadRequest(format!("Unknown action: {}", req.action))),
    }
}

/// GET /api/grading/grade — Query grading data.
pub async fn grade_query(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(query): Query<GradeQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let action = query.action.as_deref().unwrap_or("submissions");

    match action {
        "rubric" => {
            let rid = query.rubric_id.as_deref()
                .ok_or_else(|| AppError::BadRequest("rubricId is required".to_string()))?;
            let rubric_id = Uuid::parse_str(rid)
                .map_err(|_| AppError::BadRequest("Invalid rubricId".to_string()))?;

            let rubric: Option<GradingRubric> = sqlx::query_as(
                "SELECT * FROM grading_rubric WHERE id = $1"
            )
            .bind(rubric_id)
            .fetch_optional(&state.db)
            .await?;

            let criteria: Vec<RubricCriterion> = sqlx::query_as(
                "SELECT * FROM rubric_criterion WHERE rubric_id = $1 ORDER BY sort_order"
            )
            .bind(rubric_id)
            .fetch_all(&state.db)
            .await?;

            Ok(Json(serde_json::json!({
                "success": true,
                "rubric": rubric,
                "criteria": criteria,
            })))
        }
        _ => {
            Ok(Json(serde_json::json!({
                "success": true,
                "data": [],
            })))
        }
    }
}
