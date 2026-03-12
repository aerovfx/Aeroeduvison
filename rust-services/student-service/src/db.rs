use sqlx::postgres::PgPool;
use crate::error::{StudentError, Result};

pub type DbPool = PgPool;

/// Validate user is authenticated
pub async fn validate_user_authenticated(db: &DbPool, user_id: &str) -> Result<bool> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"SELECT EXISTS(SELECT 1 FROM "User" WHERE id = $1)"#
    )
    .bind(user_id)
    .fetch_one(db)
    .await?;

    if exists {
        Ok(true)
    } else {
        Err(StudentError::Unauthorized)
    }
}

/// Validate user is teacher or admin
pub async fn validate_is_teacher_or_admin(db: &DbPool, user_id: &str) -> Result<bool> {
    let role = sqlx::query_scalar::<_, String>(
        r#"SELECT role FROM "User" WHERE id = $1"#
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?;

    match role {
        Some(r) => {
            if r == "TEACHER" || r == "ADMIN" || r == "SUPER_ADMIN" {
                Ok(true)
            } else {
                Err(StudentError::Forbidden)
            }
        }
        None => Err(StudentError::Unauthorized),
    }
}
