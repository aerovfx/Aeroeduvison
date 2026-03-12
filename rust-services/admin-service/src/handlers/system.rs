use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::AuthLog;

#[derive(Debug, Serialize)]
pub struct AlertsResponse {
    pub alerts: Vec<AlertInfo>,
}

#[derive(Debug, Serialize)]
pub struct AlertInfo {
    pub id: String,
    pub level: String,
    pub message: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/admin/alerts
pub async fn get_alerts(
    State(_state): State<AppState>,
) -> Result<Json<AlertsResponse>> {
    // TODO: Implement alerts fetching
    Ok(Json(AlertsResponse {
        alerts: vec![],
    }))
}

#[derive(Debug, Serialize)]
pub struct AuthLogsResponse {
    pub logs: Vec<AuthLogResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct AuthLogResponse {
    pub id: String,
    pub user_id: Option<String>,
    pub email: Option<String>,
    pub action: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/admin/auth-logs
pub async fn get_auth_logs(
    State(state): State<AppState>,
) -> Result<Json<AuthLogsResponse>> {
    let logs = sqlx::query_as::<_, AuthLog>(
        r#"SELECT * FROM "AuthLog" ORDER BY created_at DESC LIMIT 100"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "AuthLog""#
    )
    .fetch_one(&state.db)
    .await?;

    let log_responses: Vec<AuthLogResponse> = logs.into_iter().map(|l| {
        AuthLogResponse {
            id: l.id,
            user_id: l.user_id,
            email: l.email,
            action: l.action,
            status: l.status,
            created_at: l.created_at,
        }
    }).collect();

    Ok(Json(AuthLogsResponse {
        logs: log_responses,
        total,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UnlockAccountBody {
    pub email: String,
}

/// POST /api/admin/unlock-account
pub async fn unlock_account(
    State(_state): State<AppState>,
    Json(body): Json<UnlockAccountBody>,
) -> Result<Json<serde_json::Value>> {
    // Delete failed login attempts to unlock account
    let result: sqlx::postgres::PgQueryResult = sqlx::query(
        r#"DELETE FROM failed_login_attempts WHERE email = $1"#
    )
    .bind(&body.email)
    .execute(&_state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(Json(serde_json::json!({
            "success": false,
            "message": "Account was not locked"
        })));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Account unlocked successfully"
    })))
}

#[derive(Debug, Deserialize)]
pub struct WebhookBody {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: serde_json::Value,
}

/// POST /api/webhook
pub async fn handle_webhook(
    State(_state): State<AppState>,
    Json(body): Json<WebhookBody>,
) -> Result<Json<serde_json::Value>> {
    // Log webhook event
    tracing::info!(event_type = %body.event_type, "Webhook received");

    // TODO: Process webhook based on event type
    // For now, just acknowledge receipt

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Webhook received",
        "event_type": body.event_type
    })))
}
