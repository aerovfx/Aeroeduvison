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
        LatexProject, LatexProjectVersion, ProjectListResponse,
        ProjectResponse, RestoreVersionRequest, UpdateProjectRequest, User, DEFAULT_LATEX_TEMPLATE,
    },
    AppState,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/// SELECT columns for LatexProject (matches Prisma camelCase column names → sqlx rename attrs)
const PROJECT_COLS: &str =
    r#"p.id, p.title, p."mainContent", p."userId", p."createdAt", p."updatedAt""#;

// ── Handlers ─────────────────────────────────────────────────────────────────

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

    let sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c."projectId" = p.id AND c."userId" = $1
        WHERE p."userId" = $1 OR c."userId" = $1
        ORDER BY p."updatedAt" DESC
        LIMIT $2 OFFSET $3
        "#
    );

    let projects = sqlx::query_as::<_, LatexProject>(&sql)
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
    // Resolve content: mainContent takes priority, then content, then default template
    let content = body.main_content
        .or(body.content)
        .unwrap_or_else(|| DEFAULT_LATEX_TEMPLATE.to_string());

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        INSERT INTO "LatexProject" (id, title, "mainContent", "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, "mainContent", "userId", "createdAt", "updatedAt"
        "#
    )
    .bind(&id)
    .bind(&body.title)
    .bind(&content)
    .bind(&user.id)
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
    let sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c."projectId" = p.id AND c."userId" = $1
        WHERE p.id = $2 AND (p."userId" = $1 OR c."userId" = $1)
        "#
    );

    let project = sqlx::query_as::<_, LatexProject>(&sql)
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
    // Verify ownership or EDIT-role collaborator access
    let existing_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c."projectId" = p.id AND c."userId" = $1
        WHERE p.id = $2 AND (p."userId" = $1 OR (c."userId" = $1 AND c.role = 'EDIT'))
        "#
    );

    let existing = sqlx::query_as::<_, LatexProject>(&existing_sql)
        .bind(&user.id)
        .bind(&id)
        .fetch_optional(&state.db)
        .await?;

    let existing = existing.ok_or_else(|| {
        AppError::Forbidden("You do not have permission to edit this project".to_string())
    })?;

    let new_title = body.title.as_deref().unwrap_or(&existing.title);
    let new_content = body.resolved_content().map(|s| s.as_str()).unwrap_or(&existing.content);
    let now = Utc::now();

    // Save version snapshot if content changed
    if let Some(incoming) = body.resolved_content() {
        if incoming != &existing.content {
            sqlx::query(
                r#"
                INSERT INTO "LatexProjectVersion" (id, "projectId", "mainContent", "createdAt")
                VALUES ($1, $2, $3, $4)
                "#
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&id)
            .bind(&existing.content)
            .bind(now)
            .execute(&state.db)
            .await?;
        }
    }

    let project = sqlx::query_as::<_, LatexProject>(
        r#"
        UPDATE "LatexProject"
        SET title = $1, "mainContent" = $2, "updatedAt" = $3
        WHERE id = $4
        RETURNING id, title, "mainContent", "userId", "createdAt", "updatedAt"
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
        WHERE id = $1 AND "userId" = $2
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
    let access_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        LEFT JOIN "LatexProjectCollaborator" c ON c."projectId" = p.id AND c."userId" = $1
        WHERE p.id = $2 AND (p."userId" = $1 OR c."userId" = $1)
        "#
    );
    sqlx::query_as::<_, LatexProject>(&access_sql)
        .bind(&user.id)
        .bind(&id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

    let versions = sqlx::query_as::<_, LatexProjectVersion>(
        r#"
        SELECT id, "projectId", "mainContent", "createdAt"
        FROM "LatexProjectVersion"
        WHERE "projectId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 50
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
    let project_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        WHERE p.id = $1 AND p."userId" = $2
        "#
    );
    let project = sqlx::query_as::<_, LatexProject>(&project_sql)
        .bind(&id)
        .bind(&user.id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::Forbidden("Only owner can restore versions".to_string()))?;

    // Get version content
    let version = sqlx::query_as::<_, LatexProjectVersion>(
        r#"
        SELECT id, "projectId", "mainContent", "createdAt"
        FROM "LatexProjectVersion"
        WHERE id = $1 AND "projectId" = $2
        "#
    )
    .bind(&body.version_id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Version not found".to_string()))?;

    let now = Utc::now();

    // Snapshot current content before restoring
    sqlx::query(
        r#"
        INSERT INTO "LatexProjectVersion" (id, "projectId", "mainContent", "createdAt")
        VALUES ($1, $2, $3, $4)
        "#
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&id)
    .bind(&project.content)
    .bind(now)
    .execute(&state.db)
    .await?;

    // Update project with restored content
    let updated = sqlx::query_as::<_, LatexProject>(
        r#"
        UPDATE "LatexProject"
        SET "mainContent" = $1, "updatedAt" = $2
        WHERE id = $3
        RETURNING id, title, "mainContent", "userId", "createdAt", "updatedAt"
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
    // Verify owner access
    let owner_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        WHERE p.id = $1 AND p."userId" = $2
        "#
    );
    sqlx::query_as::<_, LatexProject>(&owner_sql)
        .bind(&id)
        .bind(&user.id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::Forbidden("Only owner can view collaborators".to_string()))?;

    let collaborators = sqlx::query_as::<_, (String, Option<String>, Option<String>, String)>(
        r#"
        SELECT u.id, u.name, u.email, c.role
        FROM "LatexProjectCollaborator" c
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE c."projectId" = $1
        "#
    )
    .bind(&id)
    .fetch_all(&state.db)
    .await?;

    let data = collaborators
        .into_iter()
        .map(|(user_id, name, email, role)| CollaboratorInfo {
            user_id,
            name,
            email,
            role,
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
    let owner_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        WHERE p.id = $1 AND p."userId" = $2
        "#
    );
    sqlx::query_as::<_, LatexProject>(&owner_sql)
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

    let role = if body.can_edit.unwrap_or(true) { "EDIT" } else { "VIEW" };
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO "LatexProjectCollaborator" (id, "projectId", "userId", role, "createdAt")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT ("projectId", "userId") DO UPDATE SET role = EXCLUDED.role
        "#
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&id)
    .bind(&collab_user.id)
    .bind(role)
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
    let owner_sql = format!(
        r#"
        SELECT {PROJECT_COLS}
        FROM "LatexProject" p
        WHERE p.id = $1 AND p."userId" = $2
        "#
    );
    sqlx::query_as::<_, LatexProject>(&owner_sql)
        .bind(&id)
        .bind(&user.id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::Forbidden("Only owner can remove collaborators".to_string()))?;

    sqlx::query(
        r#"
        DELETE FROM "LatexProjectCollaborator"
        WHERE "projectId" = $1 AND "userId" = $2
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
            Ok(Json(CompileResponse {
                success: false,
                pdf_url: None,
                log: None,
                error: Some("PDF compilation not fully implemented on this server".to_string()),
            }))
        }
        _ => {
            let _ = body; // suppress unused warning
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
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let title = body.title.unwrap_or_else(|| format!("Exam Export {}", body.exam_id));
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
        INSERT INTO "LatexProject" (id, title, "mainContent", "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, "mainContent", "userId", "createdAt", "updatedAt"
        "#
    )
    .bind(&id)
    .bind(&title)
    .bind(content)
    .bind(&user.id)
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
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let title = body.title.unwrap_or_else(|| format!("Matrix Export {}", body.matrix_id));
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
        INSERT INTO "LatexProject" (id, title, "mainContent", "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, "mainContent", "userId", "createdAt", "updatedAt"
        "#
    )
    .bind(&id)
    .bind(&title)
    .bind(content)
    .bind(&user.id)
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
