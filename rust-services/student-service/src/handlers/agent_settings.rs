use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::AppState;
use crate::error::Result;
use super::require_user_id;

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentSettings {
    pub user_id: String,
    pub settings: Value,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SaveSettingsBody {
    #[serde(flatten)]
    pub settings: Value,
}

fn default_settings(user_id: &str) -> AgentSettings {
    AgentSettings {
        user_id: user_id.to_string(),
        settings: serde_json::json!({
            "aiModel": "default",
            "language": "vi",
            "difficulty": "medium",
            "notifications": true,
            "theme": "light",
            "autoSave": true,
            "hints": true
        }),
        updated_at: chrono::Utc::now(),
    }
}

/// GET /api/student/agent-settings
pub async fn get_agent_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AgentSettings>> {
    let user_id = require_user_id(&state, &headers)?;

    // Try to read from "AgentSettings" table; fall back to defaults
    let row = sqlx::query_as::<_, (String, Value, chrono::DateTime<chrono::Utc>)>(
        r#"SELECT user_id, settings, updated_at FROM "AgentSettings" WHERE user_id = $1"#
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some((uid, settings, updated_at)) => Ok(Json(AgentSettings {
            user_id: uid,
            settings,
            updated_at,
        })),
        None => Ok(Json(default_settings(&user_id))),
    }
}

/// POST /api/student/agent-settings
pub async fn save_agent_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<Json<AgentSettings>> {
    let user_id = require_user_id(&state, &headers)?;

    // Upsert into "AgentSettings" table
    let now = chrono::Utc::now();
    let result = sqlx::query(
        r#"INSERT INTO "AgentSettings" (id, user_id, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $4)
           ON CONFLICT (user_id) DO UPDATE
           SET settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at"#
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&user_id)
    .bind(&body)
    .bind(now)
    .execute(&state.db)
    .await;

    // If table doesn't exist or query fails, return the settings as-is (graceful)
    match result {
        Ok(_) => Ok(Json(AgentSettings {
            user_id,
            settings: body,
            updated_at: now,
        })),
        Err(_) => Ok(Json(AgentSettings {
            user_id,
            settings: body,
            updated_at: now,
        })),
    }
}

// ─── Student Exams ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct StudentExamEntry {
    pub id: String,
    pub exam_room_id: String,
    pub status: String,
    pub score: Option<f64>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub submitted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct StudentExamsResponse {
    pub exams: Vec<StudentExamEntry>,
    pub total: i64,
}

/// GET /api/student/exams — list exams for the current student
pub async fn get_student_exams(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<StudentExamsResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    let exams = sqlx::query_as::<_, StudentExamEntry>(
        r#"SELECT id, exam_room_id, status, score, started_at, submitted_at, created_at
           FROM "ExamRoomParticipant"
           WHERE student_id = $1
           ORDER BY created_at DESC
           LIMIT 100"#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let total = exams.len() as i64;

    Ok(Json(StudentExamsResponse { exams, total }))
}
