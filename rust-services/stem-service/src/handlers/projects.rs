use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::{StemError, Result};
use crate::models::{StemProject, CreateProjectBody, ProjectsListResponse, ProjectInfo};

/// GET /api/stem/projects
pub async fn list_projects(
    State(state): State<AppState>,
) -> Result<Json<ProjectsListResponse>> {
    let projects: Vec<StemProject> = sqlx::query_as::<_, StemProject>(
        r#"SELECT * FROM "StemProject" ORDER BY created_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "StemProject""#
    )
    .fetch_one(&state.db)
    .await?;

    let project_infos: Vec<ProjectInfo> = projects.into_iter().map(|p| {
        ProjectInfo {
            id: p.id,
            title: p.title,
            subject: p.subject,
            grade_level: p.grade_level,
            status: p.status,
            created_at: p.created_at,
        }
    }).collect();

    Ok(Json(ProjectsListResponse {
        projects: project_infos,
        total,
    }))
}

/// POST /api/stem/projects
pub async fn create_project(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateProjectBody>,
) -> Result<Json<serde_json::Value>> {
    let created_by = require_user_id(&state, &headers)?;

    let project = sqlx::query_as::<_, StemProject>(
        r#"
        INSERT INTO "StemProject" (id, title, description, subject, grade_level, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8)
        RETURNING *
        "#
    )
    .bind(format!("project_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.subject)
    .bind(&body.grade_level)
    .bind(&created_by)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "project_id": project.id,
        "message": "Project created successfully"
    })))
}

/// GET /api/stem/projects/:id
pub async fn get_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StemProject>> {
    let project = sqlx::query_as::<_, StemProject>(
        r#"SELECT * FROM "StemProject" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match project {
        Some(p) => Ok(Json(p)),
        None => Err(StemError::ProjectNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectBody {
    pub title: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub grade_level: Option<String>,
    pub status: Option<String>,
}

/// PUT /api/stem/projects/:id
pub async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateProjectBody>,
) -> Result<Json<StemProject>> {
    let project = sqlx::query_as::<_, StemProject>(
        r#"
        UPDATE "StemProject" 
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            subject = COALESCE($3, subject),
            grade_level = COALESCE($4, grade_level),
            status = COALESCE($5, status),
            updated_at = $6
        WHERE id = $7
        RETURNING *
        "#
    )
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.subject)
    .bind(&body.grade_level)
    .bind(&body.status)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match project {
        Some(p) => Ok(Json(p)),
        None => Err(StemError::ProjectNotFound),
    }
}

/// DELETE /api/stem/projects/:id
pub async fn delete_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result: sqlx::postgres::PgQueryResult = sqlx::query(
        r#"DELETE FROM "StemProject" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(StemError::ProjectNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Project deleted successfully"
    })))
}
