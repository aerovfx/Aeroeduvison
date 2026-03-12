use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::AnalyzeDocumentRequest;

#[derive(Debug, Serialize)]
pub struct AnalyzeDocumentResponse {
    pub success: bool,
    pub analysis: DocumentAnalysis,
}

#[derive(Debug, Serialize)]
pub struct DocumentAnalysis {
    pub document_type: String,
    pub summary: String,
    pub key_points: Vec<String>,
    pub sentiment: String,
    pub confidence: f64,
}

/// POST /api/ai/analyze-document
pub async fn analyze_document(
    State(state): State<AppState>,
    Json(body): Json<AnalyzeDocumentRequest>,
) -> Result<Json<AnalyzeDocumentResponse>> {
    // Analyze document (placeholder)
    let analysis = DocumentAnalysis {
        document_type: "educational".to_string(),
        summary: "Document analysis placeholder".to_string(),
        key_points: vec![
            "Key point 1".to_string(),
            "Key point 2".to_string(),
        ],
        sentiment: "neutral".to_string(),
        confidence: 0.85,
    };

    Ok(Json(AnalyzeDocumentResponse {
        success: true,
        analysis,
    }))
}
