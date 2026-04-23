pub mod rooms;
pub mod participants;
pub mod schedules;

use axum::Json;
use serde_json::json;

pub async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "exam-service",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
