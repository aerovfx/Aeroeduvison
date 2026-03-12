use axum::extract::State;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::{AdminError, Result};
use crate::models::User;

#[derive(Debug, Serialize)]
pub struct UsersListResponse {
    pub users: Vec<UserResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub school_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/admin/users
pub async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<UsersListResponse>> {
    // TODO: Validate admin access from JWT

    let users = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User""#
    )
    .fetch_one(&state.db)
    .await?;

    let user_responses: Vec<UserResponse> = users.into_iter().map(|u| {
        UserResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }
    }).collect();

    Ok(Json(UsersListResponse {
        users: user_responses,
        total,
    }))
}

/// GET /api/admin/users/:id
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>(
        r#"SELECT * FROM "User" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match user {
        Some(u) => Ok(Json(UserResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        })),
        None => Err(AdminError::UserNotFound),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserBody {
    pub name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

/// PUT /api/admin/users/:id
pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateUserBody>,
) -> Result<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE "User" 
        SET name = COALESCE($1, name),
            role = COALESCE($2, role),
            is_active = COALESCE($3, is_active),
            updated_at = $4
        WHERE id = $5
        RETURNING *
        "#
    )
    .bind(&body.name)
    .bind(&body.role)
    .bind(&body.is_active)
    .bind(chrono::Utc::now())
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    match user {
        Some(u) => Ok(Json(UserResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            school_id: u.school_id,
            created_at: u.created_at,
            updated_at: u.updated_at,
        })),
        None => Err(AdminError::UserNotFound),
    }
}

/// DELETE /api/admin/users/:id
pub async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        r#"DELETE FROM "User" WHERE id = $1"#
    )
    .bind(&id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AdminError::UserNotFound);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "User deleted successfully"
    })))
}
