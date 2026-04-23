use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    AuthUser, OnlineExamRoom, ExamRoomParticipant, ExamRoomWithParticipants,
    RoomListResponse, RoomDetailResponse, CreateRoomResponse, UpdateRoomResponse, DeleteResponse,
    CreateRoomRequest, UpdateRoomRequest,
};
use crate::AppState;

pub async fn list_rooms(
    State(state): State<AppState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<RoomListResponse>, AppError> {
    let rooms: Vec<OnlineExamRoom> = sqlx::query_as(
        r#"
        SELECT
            id,
            name,
            description,
            "accessCode" as access_code,
            status,
            "isPublic" as is_public,
            "maxStudents" as max_students,
            "teacherId" as teacher_id,
            "examMatrixId" as exam_matrix_id,
            "createdAt",
            "updatedAt"
        FROM "OnlineExamRoom"
        WHERE "teacherId" = $1 OR "isPublic" = true
        ORDER BY "createdAt" DESC
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(RoomListResponse {
        success: true,
        data: rooms,
    }))
}

pub async fn get_room(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
) -> Result<Json<RoomDetailResponse>, AppError> {
    let room: OnlineExamRoom = sqlx::query_as(
        r#"
        SELECT
            id,
            name,
            description,
            "accessCode" as access_code,
            status,
            "isPublic" as is_public,
            "maxStudents" as max_students,
            "teacherId" as teacher_id,
            "examMatrixId" as exam_matrix_id,
            "createdAt",
            "updatedAt"
        FROM "OnlineExamRoom"
        WHERE id = $1
        "#
    )
    .bind(&room_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Room not found".to_string()))?;

    let participants: Vec<ExamRoomParticipant> = sqlx::query_as(
        r#"
        SELECT
            id,
            "examRoomId" as exam_room_id,
            "studentId" as student_id,
            "joinedAt",
            score,
            "submittedAt",
            answers
        FROM "ExamRoomParticipant"
        WHERE "examRoomId" = $1
        "#
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(RoomDetailResponse {
        success: true,
        data: ExamRoomWithParticipants {
            room,
            participants,
        },
    }))
}

pub async fn create_room(
    State(state): State<AppState>,
    AuthUser { id: teacher_id, .. }: AuthUser,
    Json(req): Json<CreateRoomRequest>,
) -> Result<(StatusCode, Json<CreateRoomResponse>), AppError> {
    let room_id = Uuid::new_v4().to_string();
    let access_code = generate_access_code();

    let room: OnlineExamRoom = sqlx::query_as(
        r#"
        INSERT INTO "OnlineExamRoom" (
            id, name, description, "accessCode", status, "isPublic",
            "maxStudents", "teacherId", "examMatrixId", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING
            id,
            name,
            description,
            "accessCode" as access_code,
            status,
            "isPublic" as is_public,
            "maxStudents" as max_students,
            "teacherId" as teacher_id,
            "examMatrixId" as exam_matrix_id,
            "createdAt",
            "updatedAt"
        "#
    )
    .bind(&room_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&access_code)
    .bind("open")
    .bind(req.is_public.unwrap_or(false))
    .bind(req.max_students)
    .bind(&teacher_id)
    .bind(&req.exam_matrix_id)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(CreateRoomResponse {
        success: true,
        data: room,
    })))
}

pub async fn update_room(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    Json(req): Json<UpdateRoomRequest>,
) -> Result<Json<UpdateRoomResponse>, AppError> {
    // Build dynamic UPDATE query
    let mut updates = vec![];
    let mut values: Vec<String> = vec![room_id.clone()];

    if let Some(name) = req.name {
        updates.push(format!(r#"name = ${}"#, values.len() + 1));
        values.push(name);
    }
    if let Some(description) = req.description {
        updates.push(format!(r#"description = ${}"#, values.len() + 1));
        values.push(description);
    }
    if let Some(status) = req.status {
        updates.push(format!(r#"status = ${}"#, values.len() + 1));
        values.push(status);
    }
    if let Some(is_public) = req.is_public {
        updates.push(format!(r#""isPublic" = ${}"#, values.len() + 1));
        values.push(is_public.to_string());
    }
    if let Some(max_students) = req.max_students {
        updates.push(format!(r#""maxStudents" = ${}"#, values.len() + 1));
        values.push(max_students.to_string());
    }

    updates.push(format!(r#""updatedAt" = NOW()"#));

    let sql = format!(
        r#"
        UPDATE "OnlineExamRoom"
        SET {}
        WHERE id = $1
        RETURNING
            id,
            name,
            description,
            "accessCode" as access_code,
            status,
            "isPublic" as is_public,
            "maxStudents" as max_students,
            "teacherId" as teacher_id,
            "examMatrixId" as exam_matrix_id,
            "createdAt",
            "updatedAt"
        "#,
        updates.join(", ")
    );

    let room: OnlineExamRoom = match values.len() {
        1 => sqlx::query_as(&sql).bind(&values[0]).fetch_one(&state.db).await?,
        2 => sqlx::query_as(&sql).bind(&values[0]).bind(&values[1]).fetch_one(&state.db).await?,
        3 => sqlx::query_as(&sql).bind(&values[0]).bind(&values[1]).bind(&values[2]).fetch_one(&state.db).await?,
        4 => sqlx::query_as(&sql).bind(&values[0]).bind(&values[1]).bind(&values[2]).bind(&values[3]).fetch_one(&state.db).await?,
        5 => sqlx::query_as(&sql).bind(&values[0]).bind(&values[1]).bind(&values[2]).bind(&values[3]).bind(&values[4]).fetch_one(&state.db).await?,
        _ => return Err(AppError::Internal("Invalid update parameters".to_string())),
    };

    Ok(Json(UpdateRoomResponse {
        success: true,
        data: room,
    }))
}

pub async fn delete_room(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
) -> Result<(StatusCode, Json<DeleteResponse>), AppError> {
    // Delete participants first
    sqlx::query(r#"DELETE FROM "ExamRoomParticipant" WHERE "examRoomId" = $1"#)
        .bind(&room_id)
        .execute(&state.db)
        .await?;

    // Delete schedules
    sqlx::query(r#"DELETE FROM "ExamRoomSchedule" WHERE "examRoomId" = $1"#)
        .bind(&room_id)
        .execute(&state.db)
        .await?;

    // Delete questions
    sqlx::query(r#"DELETE FROM "ExamRoomQuestion" WHERE "examRoomId" = $1"#)
        .bind(&room_id)
        .execute(&state.db)
        .await?;

    // Delete room
    sqlx::query(r#"DELETE FROM "OnlineExamRoom" WHERE id = $1"#)
        .bind(&room_id)
        .execute(&state.db)
        .await?;

    Ok((StatusCode::OK, Json(DeleteResponse {
        success: true,
        message: "Room deleted successfully".to_string(),
    })))
}

fn generate_access_code() -> String {
    use uuid::Uuid;
    Uuid::new_v4().to_string()[0..8].to_uppercase()
}
