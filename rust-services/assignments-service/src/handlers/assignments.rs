use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    error::ServiceError,
    models::{Assignment, AssignmentResponse, CreateAssignmentRequest, UpdateProgressRequest},
    AppState,
};

use super::extract_user_id;

pub async fn list_assignments(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<Vec<AssignmentResponse>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(
        assignments
            .into_iter()
            .map(AssignmentResponse::from)
            .collect(),
    ))
}

pub async fn get_assignment(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<AssignmentResponse>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let assignment = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE id = $1 AND user_id = $2",
    )
    .bind(&id)
    .bind(&user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(AssignmentResponse::from(assignment)))
}

pub async fn create_assignment(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateAssignmentRequest>,
) -> Result<Json<AssignmentResponse>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let id = format!(
        "asgn_{}_{}",
        Utc::now().timestamp_millis(),
        Uuid::new_v4().to_string().split('-').next().unwrap()
    );

    let now = Utc::now();
    let assignment_type = req.assignment_type.unwrap_or_else(|| "lesson".to_string());
    let difficulty = req.difficulty.unwrap_or_else(|| "medium".to_string());
    let duration = req.duration.unwrap_or(30);
    let xp_reward = req.xp_reward.unwrap_or(100);
    let ai_generated = req.ai_generated.unwrap_or(false);

    let assignment = sqlx::query_as::<_, Assignment>(
        r#"
        INSERT INTO assignments (
            id, title, description, subject, assignment_type, status,
            difficulty, duration, xp_reward, progress, user_id, tags,
            ai_generated, assigned_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.subject)
    .bind(&assignment_type)
    .bind("pending")
    .bind(&difficulty)
    .bind(duration)
    .bind(xp_reward)
    .bind(0)
    .bind(&user_id)
    .bind(&req.tags)
    .bind(ai_generated)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(AssignmentResponse::from(assignment)))
}

pub async fn update_progress(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<UpdateProgressRequest>,
) -> Result<Json<AssignmentResponse>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    if req.progress < 0 || req.progress > 100 {
        return Err(ServiceError::InvalidRequest(
            "progress must be between 0 and 100".to_string(),
        ));
    }

    let now = Utc::now();
    let (new_status, completed_at) = if req.progress >= 100 {
        ("completed", Some(now))
    } else if req.progress > 0 {
        ("in-progress", None)
    } else {
        ("pending", None)
    };

    let assignment = sqlx::query_as::<_, Assignment>(
        r#"
        UPDATE assignments
        SET progress = $1, status = $2, completed_at = CASE WHEN $3::TIMESTAMPTZ IS NOT NULL THEN $3 ELSE completed_at END, updated_at = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *
        "#,
    )
    .bind(req.progress)
    .bind(new_status)
    .bind(completed_at)
    .bind(now)
    .bind(&id)
    .bind(&user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(AssignmentResponse::from(assignment)))
}

pub async fn delete_assignment(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let result = sqlx::query("DELETE FROM assignments WHERE id = $1 AND user_id = $2")
        .bind(&id)
        .bind(&user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ServiceError::NotFound);
    }

    Ok(Json(json!({ "message": "Assignment deleted" })))
}
