use sqlx::postgres::PgPool;
use crate::error::{CourseError, Result};

pub type DbPool = PgPool;

/// Validate user can manage courses (teacher/admin)
pub async fn validate_can_manage_courses(db: &DbPool, user_id: &str) -> Result<bool> {
    let role = sqlx::query_scalar::<_, String>(
        r#"SELECT role FROM "User" WHERE id = $1"#
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?;

    match role {
        Some(r) => Ok(r == "TEACHER" || r == "ADMIN"),
        None => Err(CourseError::Unauthorized),
    }
}

/// Get user's school ID
pub async fn get_user_school_id(db: &DbPool, user_id: &str) -> Result<String> {
    let school_id = sqlx::query_scalar::<_, String>(
        r#"SELECT school_id FROM "User" WHERE id = $1"#
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?;

    Ok(school_id.unwrap_or_else(|| "default-school".to_string()))
}
