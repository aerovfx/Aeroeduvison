use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use uuid::Uuid;
use chrono::DateTime;

use crate::error::AppError;
use crate::models::{
    ExamRoomSchedule,
    ScheduleListResponse, CreateScheduleResponse, ActivateScheduleResponse,
    CreateScheduleRequest, ActivateScheduleRequest,
};
use crate::AppState;

pub async fn list_schedules(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
) -> Result<Json<ScheduleListResponse>, AppError> {
    let schedules: Vec<ExamRoomSchedule> = sqlx::query_as(
        r#"
        SELECT
            id,
            "examRoomId" as exam_room_id,
            "scheduledAt",
            "durationMinutes" as duration_minutes,
            "isActive" as is_active,
            "createdAt"
        FROM "ExamRoomSchedule"
        WHERE "examRoomId" = $1
        ORDER BY "scheduledAt" ASC
        "#
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(ScheduleListResponse {
        success: true,
        data: schedules,
    }))
}

pub async fn create_schedule(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    Json(req): Json<CreateScheduleRequest>,
) -> Result<(StatusCode, Json<CreateScheduleResponse>), AppError> {
    // Parse the ISO 8601 datetime
    let scheduled_at = DateTime::parse_from_rfc3339(&req.scheduled_at)
        .map_err(|_| AppError::BadRequest("Invalid datetime format".to_string()))?
        .with_timezone(&chrono::Utc);

    let schedule_id = Uuid::new_v4().to_string();

    let schedule: ExamRoomSchedule = sqlx::query_as(
        r#"
        INSERT INTO "ExamRoomSchedule" (
            id, "examRoomId", "scheduledAt", "durationMinutes", "isActive", "createdAt"
        )
        VALUES ($1, $2, $3, $4, false, NOW())
        RETURNING
            id,
            "examRoomId" as exam_room_id,
            "scheduledAt",
            "durationMinutes" as duration_minutes,
            "isActive" as is_active,
            "createdAt"
        "#
    )
    .bind(&schedule_id)
    .bind(&room_id)
    .bind(scheduled_at)
    .bind(req.duration_minutes)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(CreateScheduleResponse {
        success: true,
        data: schedule,
    })))
}

pub async fn activate_schedule(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    Json(req): Json<ActivateScheduleRequest>,
) -> Result<Json<ActivateScheduleResponse>, AppError> {
    // Deactivate all other schedules for this room
    sqlx::query(
        r#"
        UPDATE "ExamRoomSchedule"
        SET "isActive" = false
        WHERE "examRoomId" = $1 AND id != $2
        "#
    )
    .bind(&room_id)
    .bind(&req.schedule_id)
    .execute(&state.db)
    .await?;

    // Activate this schedule
    sqlx::query(
        r#"
        UPDATE "ExamRoomSchedule"
        SET "isActive" = true
        WHERE id = $1
        "#
    )
    .bind(&req.schedule_id)
    .execute(&state.db)
    .await?;

    Ok(Json(ActivateScheduleResponse {
        success: true,
        message: "Schedule activated successfully".to_string(),
    }))
}
