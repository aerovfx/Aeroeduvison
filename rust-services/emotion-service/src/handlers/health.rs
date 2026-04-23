use axum::Json;
use crate::models::HealthResponse;

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "emotion-service".to_string(),
        version: "0.1.0".to_string(),
    })
}
