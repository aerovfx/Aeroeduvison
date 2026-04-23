use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── Database Models ──
// Column names follow the Prisma schema (camelCase) — sqlx rename maps them.

/// LatexProject — maps Prisma camelCase DB columns to Rust, serializes to camelCase JSON.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatexProject {
    pub id: String,
    pub title: String,
    /// DB column: mainContent — exposed to frontend as "content"
    #[sqlx(rename = "mainContent")]
    #[serde(rename = "content")]
    pub content: String,
    /// DB column: userId
    #[sqlx(rename = "userId")]
    pub user_id: String,
    /// DB column: createdAt
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    /// DB column: updatedAt
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

/// LatexProjectVersion — version snapshot record.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatexProjectVersion {
    pub id: String,
    /// DB column: projectId
    #[sqlx(rename = "projectId")]
    pub project_id: String,
    /// DB column: mainContent
    #[sqlx(rename = "mainContent")]
    #[serde(rename = "content")]
    pub content: String,
    /// DB column: createdAt
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

/// LatexProjectCollaborator — project collaborator record.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatexProjectCollaborator {
    pub id: String,
    /// DB column: projectId
    #[sqlx(rename = "projectId")]
    pub project_id: String,
    /// DB column: userId
    #[sqlx(rename = "userId")]
    pub user_id: String,
    /// DB column: role ("VIEW" | "EDIT")
    pub role: String,
    /// DB column: createdAt
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: String,
    pub name: Option<String>,
    pub email: Option<String>,
}

// ── Request DTOs ──

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub title: String,
    /// Frontend may send either `content` (legacy) or `mainContent` (new)
    pub content: Option<String>,
    #[serde(rename = "mainContent")]
    pub main_content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub title: Option<String>,
    /// Legacy key — kept for backward compatibility
    pub content: Option<String>,
    /// New key — used by the Vite frontend
    #[serde(rename = "mainContent")]
    pub main_content: Option<String>,
}

impl UpdateProjectRequest {
    /// Returns whichever content field is set (mainContent takes priority)
    pub fn resolved_content(&self) -> Option<&String> {
        self.main_content.as_ref().or(self.content.as_ref())
    }
}

#[derive(Debug, Deserialize)]
pub struct CompileRequest {
    pub project_id: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddCollaboratorRequest {
    pub email: String,
    /// true → "EDIT", false → "VIEW"
    pub can_edit: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct RestoreVersionRequest {
    pub version_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportFromExamRequest {
    pub exam_id: String,
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExportFromMatrixRequest {
    pub matrix_id: String,
    pub title: Option<String>,
}

pub struct ProjectListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ── Response DTOs ──

#[derive(Debug, Serialize)]
pub struct ProjectResponse {
    pub success: bool,
    pub data: LatexProject,
}

#[derive(Debug, Serialize)]
pub struct ProjectListResponse {
    pub success: bool,
    pub data: Vec<LatexProject>,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct VersionResponse {
    pub success: bool,
    pub data: Vec<LatexProjectVersion>,
}

#[derive(Debug, Serialize)]
pub struct CollaboratorResponse {
    pub success: bool,
    pub data: Vec<CollaboratorInfo>,
}

#[derive(Debug, Serialize)]
pub struct CollaboratorInfo {
    pub user_id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: String,
}

#[derive(Debug, Serialize)]
pub struct CompileResponse {
    pub success: bool,
    pub pdf_url: Option<String>,
    pub log: Option<String>,
    pub error: Option<String>,
}

// ── Auth ──

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub role: String,
    pub name: Option<String>,
    pub email: Option<String>,
}

impl AuthUser {
    pub fn is_teacher(&self) -> bool {
        self.role == "TEACHER"
    }

    pub fn is_admin(&self) -> bool {
        self.role == "ADMIN" || self.role == "SUPER_ADMIN"
    }

    pub fn is_teacher_or_admin(&self) -> bool {
        self.is_teacher() || self.is_admin()
    }

    pub fn is_student(&self) -> bool {
        self.role == "STUDENT"
    }
}

// ── Constants ──

pub const DEFAULT_LATEX_TEMPLATE: &str = r#"\documentclass{article}

\usepackage[utf8]{inputenc}

\title{My Document}
\author{}
\date{}

\begin{document}

\maketitle

\section{Introduction}

\end{document}"#;
