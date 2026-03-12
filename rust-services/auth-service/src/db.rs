use sqlx::postgres::PgPool;
use crate::error::Result;
use chrono::{Duration, Utc};

pub type DbPool = PgPool;

/// Check if account is locked due to failed login attempts
pub async fn is_account_locked(pool: &DbPool, email: &str) -> Result<AccountLockStatus> {
    let record = sqlx::query_as::<_, (i32, Option<chrono::NaiveDateTime>)>(
        r#"SELECT "failedLoginAttempts", "lockedUntil" FROM "User" WHERE email = $1"#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    if let Some((_attempts, locked_until)) = record {
        if let Some(locked_until) = locked_until {
            let now = Utc::now().naive_utc();
            if now < locked_until {
                let remaining_minutes = (locked_until - now).num_minutes();
                return Ok(AccountLockStatus {
                    is_locked: true,
                    locked_until: Some(locked_until),
                    remaining_minutes,
                });
            }
        }
    }

    Ok(AccountLockStatus {
        is_locked: false,
        locked_until: None,
        remaining_minutes: 0,
    })
}

/// Record a failed login attempt
pub async fn record_failed_login(
    pool: &DbPool,
    email: &str,
    _user_id: Option<&str>,
    reason: &str,
) -> Result<()> {
    let now = Utc::now().naive_utc();
    
    // Lock after 5 failed attempts for 30 minutes
    const MAX_ATTEMPTS: i32 = 5;
    const LOCK_DURATION_MINUTES: i64 = 30;

    sqlx::query(
        r#"
        UPDATE "User"
        SET "failedLoginAttempts" = COALESCE("failedLoginAttempts", 0) + 1,
            "lockedUntil" = CASE
                WHEN COALESCE("failedLoginAttempts", 0) + 1 >= $2
                THEN $3
                ELSE "lockedUntil"
            END,
            "updatedAt" = $4
        WHERE email = $1
        "#,
    )
    .bind(email)
    .bind(MAX_ATTEMPTS)
    .bind(Some(now + Duration::minutes(LOCK_DURATION_MINUTES)))
    .bind(now)
    .execute(pool)
    .await?;

    tracing::warn!(
        email = %email,
        reason = %reason,
        "Failed login attempt recorded"
    );

    Ok(())
}

/// Reset failed login attempts (called on successful login)
pub async fn reset_failed_attempts(pool: &DbPool, email: &str) -> Result<()> {
    sqlx::query(
        r#"UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL, "updatedAt" = $2 WHERE email = $1"#,
    )
        .bind(email)
        .bind(Utc::now().naive_utc())
        .execute(pool)
        .await?;

    Ok(())
}

#[derive(Debug, Clone)]
pub struct AccountLockStatus {
    pub is_locked: bool,
    pub locked_until: Option<chrono::NaiveDateTime>,
    pub remaining_minutes: i64,
}
