pub mod essay;
pub mod submit;
pub mod batch;
pub mod dashboard;
pub mod review;
pub mod secure;
pub mod submission;
pub mod grade;

use axum::Json;
use serde_json::json;

pub async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "grading-service",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
