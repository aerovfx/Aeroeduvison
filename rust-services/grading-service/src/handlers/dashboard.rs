use axum::{extract::{State, Query}, Json};
use chrono::{Duration, Utc};
use serde::Deserialize;

use crate::error::AppError;
use crate::models::AuthUser;
use crate::services::analytics;
use crate::AppState;

#[derive(Deserialize)]
pub struct DashboardQuery {
    pub range: Option<String>,
}

/// GET /api/grading/dashboard — Analytics dashboard.
pub async fn get_dashboard(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<DashboardQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    if !auth.is_teacher_or_admin() {
        return Err(AppError::Forbidden("Teacher or admin role required".to_string()));
    }

    let range = query.range.as_deref().unwrap_or("7d");
    let since = match range {
        "30d" => Utc::now() - Duration::days(30),
        "90d" => Utc::now() - Duration::days(90),
        "all" => Utc::now() - Duration::days(3650),
        _ => Utc::now() - Duration::days(7),
    };

    // Run queries in parallel
    let (queue, ai_perf, subjects, trends) = tokio::join!(
        analytics::get_queue_metrics(&state.db, since),
        analytics::get_ai_performance(&state.db, since),
        analytics::get_subject_metrics(&state.db, since),
        analytics::get_trend_metrics(&state.db, since),
    );

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "timeRange": range,
            "generatedAt": Utc::now().to_rfc3339(),
            "queue": queue.unwrap_or(serde_json::json!({})),
            "aiPerformance": ai_perf.unwrap_or(serde_json::json!({})),
            "subjects": subjects.unwrap_or(serde_json::json!({})),
            "trends": trends.unwrap_or_default(),
        }
    })))
}
