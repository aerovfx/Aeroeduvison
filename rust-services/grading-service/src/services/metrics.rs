use redis::aio::ConnectionManager;

use crate::error::AppError;
use crate::models::METRICS_TTL_DAYS;

#[derive(Clone)]
pub struct MetricsService {
    redis: Option<ConnectionManager>,
}

impl MetricsService {
    pub fn new(redis: Option<ConnectionManager>) -> Self {
        Self { redis }
    }

    /// Log grading metrics to Redis with 30-day TTL.
    pub async fn log_grading_metrics(
        &self,
        subject: &str,
        score: f64,
        confidence: f64,
        needs_review: bool,
        is_outlier: bool,
    ) -> Result<(), AppError> {
        let Some(ref mut conn) = self.redis.clone() else {
            return Ok(()); // Skip if no Redis
        };

        let timestamp = chrono::Utc::now().timestamp();
        let ttl = METRICS_TTL_DAYS * 86400;

        let metrics_key = format!("grading:metrics:{}", timestamp);
        let metrics_value = serde_json::json!({
            "subject": subject,
            "score": score,
            "confidence": confidence,
            "needsReview": needs_review,
            "isOutlier": is_outlier,
            "timestamp": timestamp,
        });

        // Store metrics entry
        let _: Result<(), _> = redis::cmd("SETEX")
            .arg(&metrics_key)
            .arg(ttl)
            .arg(metrics_value.to_string())
            .query_async(&mut conn.clone())
            .await;

        // Increment counters
        let _: Result<(), _> = redis::cmd("INCR")
            .arg("grading:total")
            .query_async(&mut conn.clone())
            .await;

        if needs_review {
            let _: Result<(), _> = redis::cmd("INCR")
                .arg("grading:review_required")
                .query_async(&mut conn.clone())
                .await;
        }

        if is_outlier {
            let _: Result<(), _> = redis::cmd("INCR")
                .arg("grading:outliers")
                .query_async(&mut conn.clone())
                .await;
        }

        // Update subject stats
        let subject_key = format!("grading:subject:{}", subject);
        let _: Result<(), _> = redis::cmd("HINCRBY")
            .arg(&subject_key)
            .arg("count")
            .arg(1i64)
            .query_async(&mut conn.clone())
            .await;

        let _: Result<(), _> = redis::cmd("HINCRBYFLOAT")
            .arg(&subject_key)
            .arg("total_score")
            .arg(score)
            .query_async(&mut conn.clone())
            .await;

        let _: Result<(), _> = redis::cmd("HINCRBYFLOAT")
            .arg(&subject_key)
            .arg("total_confidence")
            .arg(confidence)
            .query_async(&mut conn.clone())
            .await;

        Ok(())
    }

    /// Log batch grading metrics.
    pub async fn log_batch_metrics(
        &self,
        total_submissions: usize,
        success_count: usize,
        average_score: f64,
    ) -> Result<(), AppError> {
        let Some(ref mut conn) = self.redis.clone() else {
            return Ok(());
        };

        let timestamp = chrono::Utc::now().timestamp();
        let ttl = METRICS_TTL_DAYS * 86400;

        let key = format!("grading:batch:{}", timestamp);
        let value = serde_json::json!({
            "totalSubmissions": total_submissions,
            "successCount": success_count,
            "averageScore": average_score,
            "timestamp": timestamp,
        });

        let _: Result<(), _> = redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl)
            .arg(value.to_string())
            .query_async(&mut conn.clone())
            .await;

        let _: Result<(), _> = redis::cmd("INCR")
            .arg("grading:batch:total")
            .query_async(&mut conn.clone())
            .await;

        let _: Result<(), _> = redis::cmd("INCRBY")
            .arg("grading:batch:submissions")
            .arg(total_submissions as i64)
            .query_async(&mut conn.clone())
            .await;

        Ok(())
    }

    /// Log review comparison to Redis with 90-day TTL.
    pub async fn log_review_comparison(
        &self,
        submission_id: &str,
        ai_score: f64,
        human_score: f64,
        subject: &str,
    ) -> Result<(), AppError> {
        let Some(ref mut conn) = self.redis.clone() else {
            return Ok(());
        };

        let timestamp = chrono::Utc::now().timestamp();
        let ttl = crate::models::REVIEW_TTL_DAYS * 86400;

        let key = format!("review:comparison:{}:{}", timestamp, submission_id);
        let value = serde_json::json!({
            "aiScore": ai_score,
            "humanScore": human_score,
            "difference": (ai_score - human_score).abs(),
            "subject": subject,
            "timestamp": timestamp,
        });

        let _: Result<(), _> = redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl)
            .arg(value.to_string())
            .query_async(&mut conn.clone())
            .await;

        let _: Result<(), _> = redis::cmd("INCR")
            .arg("review:total")
            .query_async(&mut conn.clone())
            .await;

        Ok(())
    }
}
