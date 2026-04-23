use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    error::ServiceError,
    models::{Achievement, AchievementWithStatus, LeaderboardEntry, UserAchievement},
    AppState,
};

use super::extract_user_id;

pub async fn list_achievements(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<Vec<AchievementWithStatus>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let achievements = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements ORDER BY created_at ASC",
    )
    .fetch_all(&state.db)
    .await?;

    let mut result = Vec::new();

    for ach in achievements {
        let user_ach = sqlx::query_as::<_, UserAchievement>(
            "SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2",
        )
        .bind(&user_id)
        .bind(&ach.id)
        .fetch_optional(&state.db)
        .await?;

        result.push(AchievementWithStatus::from_achievement(ach, user_ach));
    }

    Ok(Json(result))
}

pub async fn get_achievement(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<AchievementWithStatus>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let achievement = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE id = $1",
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    let user_ach = sqlx::query_as::<_, UserAchievement>(
        "SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2",
    )
    .bind(&user_id)
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(AchievementWithStatus::from_achievement(achievement, user_ach)))
}

pub async fn unlock_achievement(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<AchievementWithStatus>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let achievement = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE id = $1",
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    let user_ach_id = format!(
        "uach_{}_{}",
        Utc::now().timestamp_millis(),
        Uuid::new_v4().to_string().split('-').next().unwrap()
    );

    let now = Utc::now();

    let user_ach = sqlx::query_as::<_, UserAchievement>(
        r#"
        INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, achievement_id) DO UPDATE
        SET progress = $5, unlocked_at = $4
        RETURNING *
        "#,
    )
    .bind(&user_ach_id)
    .bind(&user_id)
    .bind(&id)
    .bind(now)
    .bind(achievement.requirement)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(AchievementWithStatus::from_achievement(
        achievement,
        Some(user_ach),
    )))
}

#[derive(sqlx::FromRow)]
struct LeaderboardRow {
    user_id: String,
    total_xp: Option<i64>,
    total_achievements: Option<i64>,
}

pub async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<LeaderboardEntry>>, ServiceError> {
    let rows = sqlx::query_as::<_, LeaderboardRow>(
        r#"
        SELECT ua.user_id, SUM(a.xp_reward) as total_xp, COUNT(ua.id) as total_achievements
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        GROUP BY ua.user_id
        ORDER BY total_xp DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let entries = rows
        .into_iter()
        .map(|row| LeaderboardEntry {
            user_id: row.user_id,
            total_xp: row.total_xp.unwrap_or(0),
            total_achievements: row.total_achievements.unwrap_or(0),
        })
        .collect();

    Ok(Json(entries))
}
