use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::User;

#[derive(Debug, Deserialize)]
pub struct UsersQuery {
    pub role: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct UsersListResponse {
    pub users: Vec<UserInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub school_id: String,
    pub id_number: Option<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<User> for UserInfo {
    fn from(u: User) -> Self {
        UserInfo {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            school_id: u.school_id,
            id_number: u.id_number,
            is_active: u.is_active,
            created_at: u.created_at,
        }
    }
}

/// GET /api/users — list users, optionally filtered by role
pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<UsersQuery>,
) -> Result<Json<UsersListResponse>> {
    let limit = params.limit.unwrap_or(100).min(500);
    let offset = (params.page.unwrap_or(1) - 1) * limit;

    let (users, total) = match (&params.role, &params.search) {
        (Some(role), Some(search)) => {
            let pattern = format!("%{}%", search);
            let users = sqlx::query_as::<_, User>(
                r#"SELECT * FROM "User" WHERE role = $1 AND (name ILIKE $2 OR email ILIKE $2)
                   ORDER BY name ASC LIMIT $3 OFFSET $4"#
            )
            .bind(role)
            .bind(&pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let total = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM "User" WHERE role = $1 AND (name ILIKE $2 OR email ILIKE $2)"#
            )
            .bind(role)
            .bind(&pattern)
            .fetch_one(&state.db)
            .await?;

            (users, total)
        }
        (Some(role), None) => {
            let users = sqlx::query_as::<_, User>(
                r#"SELECT * FROM "User" WHERE role = $1 ORDER BY name ASC LIMIT $2 OFFSET $3"#
            )
            .bind(role)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let total = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM "User" WHERE role = $1"#
            )
            .bind(role)
            .fetch_one(&state.db)
            .await?;

            (users, total)
        }
        (None, Some(search)) => {
            let pattern = format!("%{}%", search);
            let users = sqlx::query_as::<_, User>(
                r#"SELECT * FROM "User" WHERE name ILIKE $1 OR email ILIKE $1
                   ORDER BY name ASC LIMIT $2 OFFSET $3"#
            )
            .bind(&pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let total = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM "User" WHERE name ILIKE $1 OR email ILIKE $1"#
            )
            .bind(&pattern)
            .fetch_one(&state.db)
            .await?;

            (users, total)
        }
        (None, None) => {
            let users = sqlx::query_as::<_, User>(
                r#"SELECT * FROM "User" ORDER BY name ASC LIMIT $1 OFFSET $2"#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let total = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM "User""#
            )
            .fetch_one(&state.db)
            .await?;

            (users, total)
        }
    };

    Ok(Json(UsersListResponse {
        users: users.into_iter().map(UserInfo::from).collect(),
        total,
    }))
}
