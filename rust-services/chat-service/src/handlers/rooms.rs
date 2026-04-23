use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::ChatError,
    models::{ChatRoom, CreateRoomRequest, JwtClaims, RoomMember},
    AppState,
};

pub async fn list_rooms(
    State(state): State<AppState>,
    claims: JwtClaims,
) -> Result<Json<Vec<ChatRoom>>, ChatError> {
    let user_id = &claims.sub;

    let rooms = sqlx::query_as::<_, ChatRoom>(
        "SELECT cr.* FROM chat_rooms cr
         INNER JOIN room_members rm ON cr.id = rm.room_id
         WHERE rm.user_id = $1
         ORDER BY cr.updated_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rooms))
}

pub async fn create_room(
    State(state): State<AppState>,
    claims: JwtClaims,
    Json(payload): Json<CreateRoomRequest>,
) -> Result<(StatusCode, Json<ChatRoom>), ChatError> {
    let room_id = format!("room-{}", Uuid::new_v4());
    let user_id = &claims.sub;
    let now = Utc::now();

    let room = sqlx::query_as::<_, ChatRoom>(
        "INSERT INTO chat_rooms (id, name, description, room_type, created_by, member_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
         RETURNING *",
    )
    .bind(&room_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.room_type)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    // Add creator as admin member
    let member_id = format!("member-{}", Uuid::new_v4());
    sqlx::query(
        "INSERT INTO room_members (id, room_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, 'admin', $4)",
    )
    .bind(&member_id)
    .bind(&room_id)
    .bind(user_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(room)))
}

pub async fn get_room_members(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    claims: JwtClaims,
) -> Result<Json<Vec<RoomMember>>, ChatError> {
    // Verify room exists
    let _room = sqlx::query_as::<_, ChatRoom>("SELECT * FROM chat_rooms WHERE id = $1")
        .bind(&room_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(ChatError::RoomNotFound)?;

    let members = sqlx::query_as::<_, RoomMember>(
        "SELECT * FROM room_members WHERE room_id = $1 ORDER BY joined_at ASC",
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(members))
}
