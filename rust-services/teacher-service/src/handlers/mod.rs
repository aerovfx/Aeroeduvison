pub mod stats;
pub mod students;
pub mod exams;

use axum::Json;
use serde_json::json;

pub async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "teacher-service",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
