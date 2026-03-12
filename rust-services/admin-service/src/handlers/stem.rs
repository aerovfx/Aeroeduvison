use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;

#[derive(Debug, Serialize)]
pub struct StemResponse {
    pub total_projects: i64,
    pub total_submissions: i64,
}

/// GET /api/admin/stem
pub async fn get_stem(
    State(_state): State<AppState>,
) -> Result<Json<StemResponse>> {
    // TODO: Implement STEM data fetching
    Ok(Json(StemResponse {
        total_projects: 0,
        total_submissions: 0,
    }))
}

#[derive(Debug, Deserialize)]
pub struct SyncStemRequest {
    pub force: Option<bool>,
}

/// POST /api/admin/stem/sync
pub async fn sync_stem(
    State(_state): State<AppState>,
    Json(_body): Json<SyncStemRequest>,
) -> Result<Json<serde_json::Value>> {
    // TODO: Implement STEM sync logic
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "STEM data synced successfully"
    })))
}
