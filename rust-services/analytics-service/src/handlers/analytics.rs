use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{
    error::ServiceError,
    models::{ActivityItem, CourseEngagement, DashboardAnalytics, DayHours, StudentPerformance, SubjectStats},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<DashboardAnalytics>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    // Get total study time
    let total_study_time: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(duration_minutes), 0) FROM study_sessions WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    // Get sessions this week
    let sessions_this_week: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM study_sessions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    // Get average session duration
    let avg_session_minutes: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(duration_minutes), 0.0) FROM study_sessions WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    // Get streak info
    let (current_streak, longest_streak): (i32, i32) = sqlx::query_as(
        "SELECT COALESCE(current_streak, 0), COALESCE(longest_streak, 0) FROM user_streaks WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?
    .unwrap_or((0, 0));

    // Get total XP
    let total_xp: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(xp_earned), 0) FROM study_sessions WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    // Get subjects breakdown
    #[derive(sqlx::FromRow)]
    struct SubjectRow {
        subject: Option<String>,
        time_spent: Option<i64>,
        sessions: i64,
        avg_score: Option<f64>,
    }

    let subject_rows: Vec<SubjectRow> = sqlx::query_as(
        "SELECT subject, SUM(duration_minutes) as time_spent, COUNT(*) as sessions, AVG(score) as avg_score
         FROM study_sessions WHERE user_id = $1 AND subject IS NOT NULL
         GROUP BY subject ORDER BY time_spent DESC LIMIT 5"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let colors = vec![
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    ];

    let subjects: Vec<SubjectStats> = subject_rows
        .into_iter()
        .enumerate()
        .map(|(idx, row)| SubjectStats {
            subject: row.subject.unwrap_or_default(),
            time_spent_minutes: row.time_spent.unwrap_or(0),
            sessions: row.sessions,
            avg_score: row.avg_score.unwrap_or(0.0),
            color: colors.get(idx).copied().unwrap_or("#999999").to_string(),
        })
        .collect();

    // Get weekly hours (last 7 days)
    #[derive(sqlx::FromRow)]
    struct WeeklyHourRow {
        date: Option<chrono::NaiveDate>,
        hours: Option<f64>,
    }

    let week_rows: Vec<WeeklyHourRow> = sqlx::query_as(
        "SELECT DATE(created_at) as date, SUM(duration_minutes)/60.0 as hours
         FROM study_sessions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at) ORDER BY date ASC"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let day_names = vec!["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let weekly_hours: Vec<DayHours> = week_rows
        .into_iter()
        .map(|row| {
            let day_name = row.date
                .map(|d| day_names[d.weekday().number_from_sunday() as usize])
                .unwrap_or("Unknown");
            DayHours {
                date: day_name.to_string(),
                hours: row.hours.unwrap_or(0.0),
            }
        })
        .collect();

    // Calculate percentiles and goal progress (simulated)
    let rank_percentile = ((total_xp as f64 / 10000.0) * 100.0).min(100.0);
    let weekly_goal_progress = ((sessions_this_week as f64 / 7.0) * 100.0).min(100.0);

    Ok(Json(DashboardAnalytics {
        total_study_time_minutes: total_study_time,
        sessions_this_week,
        avg_session_minutes,
        current_streak_days: current_streak,
        longest_streak_days: longest_streak,
        total_xp,
        rank_percentile,
        weekly_goal_progress,
        subjects,
        weekly_hours,
    }))
}

pub async fn get_activity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<ActivityItem>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;
    let limit = params.limit.unwrap_or(20).max(1).min(100);
    let offset = params.offset.unwrap_or(0).max(0);

    #[derive(sqlx::FromRow)]
    struct ActivityRow {
        id: String,
        activity_type: String,
        title: String,
        subject: Option<String>,
        xp_earned: Option<i32>,
        score: Option<f64>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let rows: Vec<ActivityRow> = sqlx::query_as(
        "SELECT id, activity_type, title, subject, xp_earned, score, created_at
         FROM activity_log WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let items: Vec<ActivityItem> = rows
        .into_iter()
        .map(|row| ActivityItem {
            id: row.id,
            activity_type: row.activity_type,
            title: row.title,
            subject: row.subject,
            xp_earned: row.xp_earned,
            score: row.score,
            created_at: row.created_at,
        })
        .collect();

    Ok(Json(items))
}

pub async fn get_courses(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<CourseEngagement>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;
    let limit = params.limit.unwrap_or(10).max(1).min(50);

    #[derive(sqlx::FromRow)]
    struct CourseRow {
        subject: Option<String>,
        total_time: Option<i64>,
        session_count: i64,
        average_score: Option<f64>,
    }

    let rows: Vec<CourseRow> = sqlx::query_as(
        "SELECT subject, SUM(duration_minutes) as total_time, COUNT(*) as session_count, AVG(score) as average_score
         FROM study_sessions WHERE user_id = $1 AND subject IS NOT NULL
         GROUP BY subject ORDER BY total_time DESC LIMIT $2"
    )
    .bind(&user_id)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let colors = vec![
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#AED6F1",
    ];

    let courses: Vec<CourseEngagement> = rows
        .into_iter()
        .enumerate()
        .map(|(idx, row)| {
            let total_time = row.total_time.unwrap_or(0);
            let progress = ((row.session_count as f64 / 20.0) * 100.0).min(100.0);
            CourseEngagement {
                subject: row.subject.unwrap_or_default(),
                total_time_minutes: total_time,
                session_count: row.session_count,
                average_score: row.average_score.unwrap_or(0.0),
                color: colors.get(idx).copied().unwrap_or("#999999").to_string(),
                progress_percentage: progress,
            }
        })
        .collect();

    Ok(Json(courses))
}

pub async fn get_students(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<StudentPerformance>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    // Check if user is teacher or admin
    let claims = decode_jwt(&extract_token(&headers)?, &state.jwt_secret)?;
    if !["TEACHER", "ADMIN"].contains(&claims.role.as_str()) {
        return Err(ServiceError::Forbidden);
    }

    let limit = params.limit.unwrap_or(50).max(1).min(200);
    let offset = params.offset.unwrap_or(0).max(0);

    #[derive(sqlx::FromRow)]
    struct StudentRow {
        user_id: String,
        email: Option<String>,
        total_study_time: Option<i64>,
        sessions_this_week: i64,
        average_score: Option<f64>,
        total_xp: Option<i64>,
    }

    let rows: Vec<StudentRow> = sqlx::query_as(
        "SELECT
            ss.user_id,
            NULL as email,
            SUM(ss.duration_minutes) as total_study_time,
            SUM(CASE WHEN ss.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as sessions_this_week,
            AVG(ss.score) as average_score,
            SUM(ss.xp_earned) as total_xp
         FROM study_sessions ss
         GROUP BY ss.user_id
         ORDER BY total_xp DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let performances: Vec<StudentPerformance> = rows
        .into_iter()
        .map(|row| StudentPerformance {
            user_id: row.user_id,
            email: row.email,
            total_study_time_minutes: row.total_study_time.unwrap_or(0),
            sessions_this_week: row.sessions_this_week,
            average_score: row.average_score.unwrap_or(0.0),
            total_xp: row.total_xp.unwrap_or(0),
        })
        .collect();

    Ok(Json(performances))
}

fn extract_token(headers: &HeaderMap) -> Result<String, ServiceError> {
    headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(|s| s.to_string())
        .ok_or(ServiceError::Unauthorized)
}

pub fn extract_user_id(headers: &HeaderMap, jwt_secret: &str) -> Result<String, ServiceError> {
    let token = extract_token(headers)?;
    let claims = decode_jwt(&token, jwt_secret)?;
    Ok(claims.sub)
}

fn decode_jwt(token: &str, secret: &str) -> Result<crate::models::JwtClaims, ServiceError> {
    let key = jsonwebtoken::DecodingKey::from_secret(secret.as_ref());
    let validation = jsonwebtoken::Validation::default();
    jsonwebtoken::decode::<crate::models::JwtClaims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|e| ServiceError::JwtError(e.to_string()))
}
