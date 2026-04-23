use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ── Database Models ──

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct LatexProject {
    pub id: String,
    pub title: String,
    pub content: String,
    pub user_id: String,
    pub is_public: bool,
    pub compiled_pdf_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct LatexProjectVersion {
    pub id: String,
    pub project_id: String,
    pub content: String,
    pub version_number: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct LatexProjectCollaborator {
    pub id: String,
    pub project_id: String,
    pub user_id: String,
    pub can_edit: bool,
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
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CompileRequest {
    pub project_id: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddCollaboratorRequest {
    pub email: String,
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
    pub can_edit: bool,
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
