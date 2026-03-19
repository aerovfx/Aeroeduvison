use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::error::AppError;

/// Get queue metrics (submission counts by status).
pub async fn get_queue_metrics(db: &PgPool, since: DateTime<Utc>) -> Result<serde_json::Value, AppError> {
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM submission WHERE submitted_at >= $1")
        .bind(since)
        .fetch_one(db)
        .await?;

    let pending: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM submission WHERE status = 'PENDING_REVIEW' AND submitted_at >= $1")
        .bind(since)
        .fetch_one(db)
        .await?;

    let graded: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM submission WHERE status = 'GRADED' AND submitted_at >= $1")
        .bind(since)
        .fetch_one(db)
        .await?;

    Ok(serde_json::json!({
        "total": total.0,
        "pending": pending.0,
        "completed": graded.0,
    }))
}

/// Get AI performance metrics.
pub async fn get_ai_performance(db: &PgPool, since: DateTime<Utc>) -> Result<serde_json::Value, AppError> {
    let stats: Option<(Option<f64>, i64, i64)> = sqlx::query_as(
        "SELECT AVG(confidence), COUNT(*) FILTER (WHERE status = 'GRADED'), COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') FROM submission WHERE submitted_at >= $1"
    )
    .bind(since)
    .fetch_optional(db)
    .await?;

    let (avg_conf, total_graded, total_review) = stats.unwrap_or((None, 0, 0));

    Ok(serde_json::json!({
        "averageConfidence": avg_conf.unwrap_or(0.0),
        "totalGraded": total_graded,
        "totalReviewRequired": total_review,
        "reviewRate": if total_graded + total_review > 0 {
            (total_review as f64 / (total_graded + total_review) as f64) * 100.0
        } else { 0.0 },
    }))
}

/// Get subject-level metrics.
pub async fn get_subject_metrics(_db: &PgPool, _since: DateTime<Utc>) -> Result<serde_json::Value, AppError> {
    // TODO: requires JOIN with assignment/course tables for subject info
    Ok(serde_json::json!({}))
}

/// Get daily trend metrics.
pub async fn get_trend_metrics(db: &PgPool, since: DateTime<Utc>) -> Result<Vec<serde_json::Value>, AppError> {
    let rows: Vec<(chrono::NaiveDate, i64, Option<f64>, Option<f64>)> = sqlx::query_as(
        "SELECT DATE(submitted_at) as date, COUNT(*), AVG(score), AVG(confidence) FROM submission WHERE submitted_at >= $1 GROUP BY DATE(submitted_at) ORDER BY date"
    )
    .bind(since)
    .fetch_all(db)
    .await?;

    let trends: Vec<serde_json::Value> = rows.iter().map(|(date, count, avg_score, avg_conf)| {
        serde_json::json!({
            "date": date.to_string(),
            "count": count,
            "averageScore": avg_score.unwrap_or(0.0),
            "averageConfidence": avg_conf.unwrap_or(0.0),
        })
    }).collect();

    Ok(trends)
}
