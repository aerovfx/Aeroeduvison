use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        AddCollaboratorRequest, AuthUser, CollaboratorInfo, CollaboratorResponse, CompileRequest,
        CompileResponse, CreateProjectRequest, ExportFromExamRequest, ExportFromMatrixRequest,
        LatexProject, LatexProjectCollaborator, LatexProjectVersion, ProjectListResponse,
        ProjectResponse, RestoreVersionRequest, UpdateProjectRequest, User, DEFAULT_LATEX_TEMPLATE,
    },
    AppState,
};

/// GET /api/latex-projects - List projects (owner or collaborator)
pub async fn list_projects(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ProjectListResponse>, AppError> {
    let limit = params
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(50)
        .min(500);
    let offset = params
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    let projects = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c.project_id = p.id AND c.user_id = $1
        WHERE p.user_id = $1 OR c.user_id = $1
        ORDER BY p.updated_at DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(&user.id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let count = projects.len() as i64;

    Ok(Json(ProjectListResponse {
        success: true,
        data: projects,
        count,
    }))
}

/// POST /api/latex-projects - Create new project
pub async fn create_project(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ProjectResponse>), AppError> {
    if body.title.is_empty() {
        return Err(AppError::ValidationError("Title cannot be empty".to_string()));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let content = body.content.unwrap_or_else(|| DEFAULT_LATEX_TEMPLATE.to_string());

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        INSERT INTO "LatexProject" (id, title, content, user_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, content, user_id, is_public, compiled_pdf_url, created_at, updated_at
        "#
    )
    .bind(&id)
    .bind(&body.title)
    .bind(&content)
    .bind(&user.id)
    .bind(false)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(ProjectResponse {
            success: true,
            data: project,
        }),
    ))
}

/// GET /api/latex-projects/:id - Get project details
pub async fn get_project(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ProjectResponse>, AppError> {
    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c.project_id = p.id AND c.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR c.user_id = $1 OR p.is_public = true)
        "#
    )
    .bind(&user.id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    let project = project.ok_or_else(|| {
        AppError::NotFound("Project not found or unauthorized".to_string())
    })?;

    Ok(Json(ProjectResponse {
        success: true,
        data: project,
    }))
}

/// PUT /api/latex-projects/:id - Update project
pub async fn update_project(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectResponse>, AppError> {
    // Verify ownership or edit access
    let existing = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c.project_id = p.id AND c.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR (c.user_id = $1 AND c.can_edit = true))
        "#
    )
    .bind(&user.id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    let existing = existing.ok_or_else(|| {
        AppError::Forbidden("You do not have permission to edit this project".to_string())
    })?;

    let new_title = body.title.as_ref().unwrap_or(&existing.title);
    let new_content = body.content.as_ref().unwrap_or(&existing.content);
    let now = Utc::now();

    // Save version if content changed
    if let Some(ref new_content) = body.content {
        if new_content != &existing.content {
            let version_number = sqlx::query_scalar::<_, i32>(
                r#"
                SELECT COALESCE(MAX(version_number), 0) + 1
                FROM "LatexProjectVersion"
                WHERE project_id = $1
                "#
            )
            .bind(&id)
            .fetch_one(&state.db)
            .await?;

            sqlx::query(
                r#"
                INSERT INTO "LatexProjectVersion" (id, project_id, content, version_number, created_by, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                "#
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&id)
            .bind(&existing.content)
            .bind(version_number)
            .bind(&user.id)
            .bind(now)
            .execute(&state.db)
            .await?;
        }
    }

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        UPDATE "LatexProject"
        SET title = $1, content = $2, updated_at = $3
        WHERE id = $4
        RETURNING id, title, content, user_id, is_public, compiled_pdf_url, created_at, updated_at
        "#
    )
    .bind(new_title)
    .bind(new_content)
    .bind(now)
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ProjectResponse {
        success: true,
        data: project,
    }))
}

/// DELETE /api/latex-projects/:id - Delete project (owner only)
pub async fn delete_project(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = sqlx::query(
        r#"
        DELETE FROM "LatexProject"
        WHERE id = $1 AND user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::Forbidden(
            "Only project owner can delete".to_string(),
        ));
    }

    Ok(Json(json!({
        "success": true,
        "message": "Project deleted"
    })))
}

/// GET /api/latex-projects/:id/versions - List version history
pub async fn list_versions(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<crate::models::VersionResponse>, AppError> {
    // Verify access
    let _project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c.project_id = p.id AND c.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR c.user_id = $1)
        "#
    )
    .bind(&user.id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

    let versions = sqlx::query_as::<_, LatexProjectVersion>(
        r#"
        SELECT id, project_id, content, version_number, created_by, created_at
        FROM "LatexProjectVersion"
        WHERE project_id = $1
        ORDER BY version_number DESC
        "#
    )
    .bind(&id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(crate::models::VersionResponse {
        success: true,
        data: versions,
    }))
}

/// POST /api/latex-projects/:id/versions/restore - Restore a version
pub async fn restore_version(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<RestoreVersionRequest>,
) -> Result<Json<ProjectResponse>, AppError> {
    // Verify ownership
    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        WHERE p.id = $1 AND p.user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Forbidden("Only owner can restore versions".to_string()))?;

    // Get version content
    let version = sqlx::query_as::<_, LatexProjectVersion>(
        r#"
        SELECT id, project_id, content, version_number, created_by, created_at
        FROM "LatexProjectVersion"
        WHERE id = $1 AND project_id = $2
        "#
    )
    .bind(&body.version_id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Version not found".to_string()))?;

    let now = Utc::now();

    // Create new version from current content
    let version_number = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(MAX(version_number), 0) + 1
        FROM "LatexProjectVersion"
        WHERE project_id = $1
        "#
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO "LatexProjectVersion" (id, project_id, content, version_number, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&id)
    .bind(&project.content)
    .bind(version_number)
    .bind(&user.id)
    .bind(now)
    .execute(&state.db)
    .await?;

    // Update project with restored content
    let updated = sqlx::query_as::<_, LatexProject>(
        r#"
        UPDATE "LatexProject"
        SET content = $1, updated_at = $2
        WHERE id = $3
        RETURNING id, title, content, user_id, is_public, compiled_pdf_url, created_at, updated_at
        "#
    )
    .bind(&version.content)
    .bind(now)
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ProjectResponse {
        success: true,
        data: updated,
    }))
}

/// GET /api/latex-projects/:id/collaborators - List collaborators
pub async fn list_collaborators(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<CollaboratorResponse>, AppError> {
    // Verify access
    let _project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        WHERE p.id = $1 AND p.user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Forbidden("Only owner can view collaborators".to_string()))?;

    let collaborators = sqlx::query_as::<_, (String, Option<String>, Option<String>, bool)>(
        r#"
        SELECT u.id, u.name, u.email, c.can_edit
        FROM "LatexProjectCollaborator" c
        LEFT JOIN "User" u ON u.id = c.user_id
        WHERE c.project_id = $1
        "#
    )
    .bind(&id)
    .fetch_all(&state.db)
    .await?;

    let data = collaborators
        .into_iter()
        .map(|(user_id, name, email, can_edit)| CollaboratorInfo {
            user_id,
            name,
            email,
            can_edit,
        })
        .collect();

    Ok(Json(CollaboratorResponse {
        success: true,
        data,
    }))
}

/// POST /api/latex-projects/:id/collaborators - Add collaborator
pub async fn add_collaborator(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<AddCollaboratorRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Verify ownership
    let _project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        WHERE p.id = $1 AND p.user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Forbidden("Only owner can add collaborators".to_string()))?;

    // Find user by email
    let collab_user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, name, email FROM "User" WHERE email = $1
        "#
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let can_edit = body.can_edit.unwrap_or(true);
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO "LatexProjectCollaborator" (id, project_id, user_id, can_edit, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        "#
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&id)
    .bind(&collab_user.id)
    .bind(can_edit)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(Json(json!({
        "success": true,
        "message": format!("Added {} as collaborator", body.email)
    })))
}

/// DELETE /api/latex-projects/:id/collaborators/:user_id - Remove collaborator
pub async fn remove_collaborator(
    State(state): State<AppState>,
    user: AuthUser,
    Path((id, user_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Verify ownership
    let _project = sqlx::query_as::<_, LatexProject>(
        r#"
        SELECT p.id, p.title, p.content, p.user_id, p.is_public, p.compiled_pdf_url, p.created_at, p.updated_at
        FROM "LatexProject" p
        WHERE p.id = $1 AND p.user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Forbidden("Only owner can remove collaborators".to_string()))?;

    sqlx::query(
        r#"
        DELETE FROM "LatexProjectCollaborator"
        WHERE project_id = $1 AND user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user_id)
    .execute(&state.db)
    .await?;

    Ok(Json(json!({
        "success": true,
        "message": "Collaborator removed"
    })))
}

/// POST /api/latex-projects/compile - Compile LaTeX to PDF
pub async fn compile_project(
    _state: State<AppState>,
    _user: AuthUser,
    Json(body): Json<CompileRequest>,
) -> Result<Json<CompileResponse>, AppError> {
    // Check if pdflatex is available
    let pdflatex_check = std::process::Command::new("which")
        .arg("pdflatex")
        .output();

    match pdflatex_check {
        Ok(output) if output.status.success() => {
            // pdflatex is available - in production would compile
            // For now, return stub
            Ok(Json(CompileResponse {
                success: false,
                pdf_url: None,
                log: None,
                error: Some("PDF compilation not fully implemented on this server".to_string()),
            }))
        }
        _ => {
            // pdflatex not available
            Ok(Json(CompileResponse {
                success: false,
                pdf_url: None,
                log: None,
                error: Some("pdflatex not installed on server. Install TeX Live to enable compilation.".to_string()),
            }))
        }
    }
}

/// POST /api/latex-projects/compile-optimized - Alias for compile
pub async fn compile_optimized(
    state: State<AppState>,
    user: AuthUser,
    body: Json<CompileRequest>,
) -> Result<Json<CompileResponse>, AppError> {
    compile_project(state, user, body).await
}

/// POST /api/latex-projects/compile-advanced - Alias for compile
pub async fn compile_advanced(
    state: State<AppState>,
    user: AuthUser,
    body: Json<CompileRequest>,
) -> Result<Json<CompileResponse>, AppError> {
    compile_project(state, user, body).await
}

/// POST /api/latex-projects/export-from-exam - Create project from exam questions
pub async fn export_from_exam(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<ExportFromExamRequest>,
) -> Result<(StatusCode, Json<ProjectResponse>), AppError> {
    let _exam_id = &body.exam_id;
    // In production, would fetch exam questions from DB
    // For now, create project with stub content
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let title = body.title.unwrap_or_else(|| format!("Exam Export {}", _exam_id));
    let content = r#"\documentclass{article}
\usepackage[utf8]{inputenc}
\title{Exam Questions}
\author{}
\date{}
\begin{document}
\maketitle
\section{Questions}
% Exam questions would be inserted here
\end{document}"#;

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        INSERT INTO "LatexProject" (id, title, content, user_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, content, user_id, is_public, compiled_pdf_url, created_at, updated_at
        "#
    )
    .bind(&id)
    .bind(&title)
    .bind(content)
    .bind(&user.id)
    .bind(false)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(ProjectResponse {
            success: true,
            data: project,
        }),
    ))
}

/// POST /api/latex-projects/export-from-matrix - Create project from matrix
pub async fn export_from_matrix(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<ExportFromMatrixRequest>,
) -> Result<(StatusCode, Json<ProjectResponse>), AppError> {
    let _matrix_id = &body.matrix_id;
    // In production, would fetch matrix data from DB
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let title = body.title.unwrap_or_else(|| format!("Matrix Export {}", _matrix_id));
    let content = r#"\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{array}
\title{Exam Matrix}
\author{}
\date{}
\begin{document}
\maketitle
\section{Matrix}
% Matrix data would be inserted here
\end{document}"#;

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        INSERT INTO "LatexProject" (id, title, content, user_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, content, user_id, is_public, compiled_pdf_url, created_at, updated_at
        "#
    )
    .bind(&id)
    .bind(&title)
    .bind(content)
    .bind(&user.id)
    .bind(false)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(ProjectResponse {
            success: true,
            data: project,
        }),
    ))
}
