use sqlx::postgres::PgPool;
use crate::error::Result;

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
        Err(crate::error::MediaError::Unauthorized)
    }
}
