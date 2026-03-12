use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::{MediaError, Result};
use crate::models::{Document, CreateDocumentBody, DocumentListResponse, DocumentInfo};

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestionBankQuery {
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub question_type: Option<String>,
    pub search: Option<String>,
    pub subject: Option<String>,
    pub grade: Option<String>,
    pub difficulty: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestionBankResponse {
    pub questions: Vec<QuestionInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestionInfo {
    pub id: String,
    pub content: String,
    pub question_type: String,
    pub subject: String,
    pub grade: String,
    pub difficulty: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/question-bank
pub async fn list_questions(
    State(state): State<AppState>,
) -> Result<Json<QuestionBankResponse>> {
    // Placeholder - would query question bank database
    // For now, return empty list
    
    Ok(Json(QuestionBankResponse {
        questions: vec![],
        total: 0,
    }))
}

/// GET /api/documents
pub async fn list_documents(
    State(state): State<AppState>,
) -> Result<Json<DocumentListResponse>> {
    let documents: Vec<Document> = sqlx::query_as::<_, Document>(
        r#"SELECT * FROM "Document" ORDER BY created_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Document""#
    )
    .fetch_one(&state.db)
    .await?;

    let doc_infos: Vec<DocumentInfo> = documents.into_iter().map(|d: Document| d.to_info()).collect();

    Ok(Json(DocumentListResponse {
        documents: doc_infos,
        total,
    }))
}

/// POST /api/documents
pub async fn create_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateDocumentBody>,
) -> Result<Json<serde_json::Value>> {
    let created_by = require_user_id(&state, &headers)?;

    let document = sqlx::query_as::<_, Document>(
        r#"
        INSERT INTO "Document" (id, title, content, file_url, file_type, file_size, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, NULL, $4, NULL, 'draft', $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(format!("doc_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.file_type)
    .bind(&created_by)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "document_id": document.id,
        "message": "Document created successfully"
    })))
}

/// GET /api/documents/:id
pub async fn get_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Document>> {
    let document = sqlx::query_as::<_, Document>(
        r#"SELECT * FROM "Document" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match document {
        Some(d) => Ok(Json(d)),
        None => Err(MediaError::DocumentNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentBody {
    pub title: Option<String>,
    pub content: Option<String>,
    pub status: Option<String>,
}

/// PUT /api/documents/:id
pub async fn update_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateDocumentBody>,
) -> Result<Json<Document>> {
    let document = sqlx::query_as::<_, Document>(
        r#"
        UPDATE "Document" 
        SET title = COALESCE($1, title),
            content = COALESCE($2, content),
            status = COALESCE($3, status),
            updated_at = $4
        WHERE id = $5
        RETURNING *
        "#
    )
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.status)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match document {
        Some(d) => Ok(Json(d)),
        None => Err(MediaError::DocumentNotFound),
    }
}

/// DELETE /api/documents/:id
pub async fn delete_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result: sqlx::postgres::PgQueryResult = sqlx::query(
        r#"DELETE FROM "Document" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(MediaError::DocumentNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Document deleted successfully"
    })))
}

/// POST /api/documents/:id/process
pub async fn process_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    // Update document status to processing
    let result: sqlx::postgres::PgQueryResult = sqlx::query(
        r#"UPDATE "Document" SET status = 'processing', updated_at = $1 WHERE id = $2"#
    )
    .bind(chrono::Utc::now())
    .bind(&id)
    .execute(&_state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(MediaError::DocumentNotFound);
    }

    // TODO: Implement actual document processing (OCR, analysis, etc.)

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Document processing started",
        "document_id": id
    })))
}

/// POST /api/documents/upload
pub async fn upload_document(
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>> {
    // TODO: Implement multipart file upload
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Upload endpoint - implement multipart handling"
    })))
}
