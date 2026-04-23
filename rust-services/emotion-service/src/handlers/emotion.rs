use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{Datelike, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::ServiceError,
    models::{
        EmotionCount, EmotionRecord, EmotionResponse, EmotionStats, EmotionTrendPoint,
        LogEmotionBody,
    },
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_emotion_stats(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<EmotionStats>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    // Get total records
    let total_records: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM emotion_records WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    if total_records == 0 {
        return Ok(Json(EmotionStats {
            total_records: 0,
            dominant_emotion: "neutral".to_string(),
            avg_intensity: 5.0,
            study_quality: "fair".to_string(),
            emotion_distribution: vec![],
            trend: vec![],
            weekly_summary: "No emotion data recorded yet".to_string(),
        }));
    }

    // Get dominant emotion
    #[derive(sqlx::FromRow)]
    struct DominantRow {
        emotion: String,
    }

    let dominant_row: Option<DominantRow> = sqlx::query_as(
        "SELECT emotion FROM emotion_records WHERE user_id = $1
         GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 1"
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let dominant_emotion = dominant_row
        .map(|r| r.emotion)
        .unwrap_or_else(|| "neutral".to_string());

    // Get emotion distribution
    #[derive(sqlx::FromRow)]
    struct DistributionRow {
        emotion: String,
        count: i64,
    }

    let dist_rows: Vec<DistributionRow> = sqlx::query_as(
        "SELECT emotion, COUNT(*) as count FROM emotion_records WHERE user_id = $1
         GROUP BY emotion"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let emotion_distribution: Vec<EmotionCount> = dist_rows
        .into_iter()
        .map(|row| {
            let percentage = (row.count as f64 / total_records as f64) * 100.0;
            EmotionCount {
                emotion: row.emotion,
                count: row.count,
                percentage,
            }
        })
        .collect();

    // Get average intensity
    let avg_intensity: f64 = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(intensity) FROM emotion_records WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?
    .unwrap_or(5.0);

    // Calculate study quality
    let study_quality = calculate_study_quality(&dominant_emotion, avg_intensity);

    // Get weekly trend (last 7 days)
    #[derive(sqlx::FromRow)]
    struct TrendRow {
        date: Option<chrono::NaiveDate>,
        dominant: String,
        avg_intensity: f64,
    }

    let trend_rows: Vec<TrendRow> = sqlx::query_as(
        "SELECT
            DATE(created_at) as date,
            (SELECT emotion FROM emotion_records er2
             WHERE er2.user_id = $1 AND DATE(er2.created_at) = DATE(er1.created_at)
             GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 1) as dominant,
            AVG(intensity) as avg_intensity
         FROM emotion_records er1
         WHERE er1.user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let day_names = vec!["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let trend: Vec<EmotionTrendPoint> = trend_rows
        .into_iter()
        .map(|row| {
            let day_name = row
                .date
                .map(|d| day_names[d.weekday().number_from_sunday() as usize])
                .unwrap_or("Unknown");
            EmotionTrendPoint {
                date: day_name.to_string(),
                dominant: row.dominant,
                avg_intensity: row.avg_intensity,
            }
        })
        .collect();

    let weekly_summary = generate_weekly_summary(&emotion_distribution, avg_intensity);

    Ok(Json(EmotionStats {
        total_records,
        dominant_emotion,
        avg_intensity,
        study_quality,
        emotion_distribution,
        trend,
        weekly_summary,
    }))
}

pub async fn log_emotion(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LogEmotionBody>,
) -> Result<Json<EmotionResponse>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    // Validate emotion type
    let valid_emotions = vec!["focused", "happy", "neutral", "confused", "stressed", "tired"];
    if !valid_emotions.contains(&body.emotion.as_str()) {
        return Err(ServiceError::InvalidRequest(
            "Invalid emotion type".to_string(),
        ));
    }

    // Validate intensity (1-10)
    if body.intensity < 1 || body.intensity > 10 {
        return Err(ServiceError::InvalidRequest(
            "Intensity must be between 1 and 10".to_string(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO emotion_records (id, user_id, emotion, intensity, note, study_session_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(&id)
    .bind(&user_id)
    .bind(&body.emotion)
    .bind(body.intensity)
    .bind(&body.note)
    .bind(&body.study_session_id)
    .bind(now)
    .execute(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    Ok(Json(EmotionResponse {
        id,
        emotion: body.emotion,
        intensity: body.intensity,
        note: body.note,
        created_at: now,
    }))
}

pub async fn get_emotion_records(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<EmotionRecord>>, ServiceError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;
    let limit = params.limit.unwrap_or(50).max(1).min(200);
    let offset = params.offset.unwrap_or(0).max(0);

    #[derive(sqlx::FromRow)]
    struct RecordRow {
        id: String,
        user_id: String,
        emotion: String,
        intensity: i32,
        note: Option<String>,
        study_session_id: Option<String>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let rows: Vec<RecordRow> = sqlx::query_as(
        "SELECT id, user_id, emotion, intensity, note, study_session_id, created_at
         FROM emotion_records WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| ServiceError::DatabaseError(e.to_string()))?;

    let records: Vec<EmotionRecord> = rows
        .into_iter()
        .map(|row| EmotionRecord {
            id: row.id,
            user_id: row.user_id,
            emotion: row.emotion,
            intensity: row.intensity,
            note: row.note,
            study_session_id: row.study_session_id,
            created_at: row.created_at,
        })
        .collect();

    Ok(Json(records))
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

pub(crate) fn calculate_study_quality(dominant_emotion: &str, avg_intensity: f64) -> String {
    match dominant_emotion {
        "focused" if avg_intensity >= 7.0 => "excellent".to_string(),
        "focused" | "happy" => "good".to_string(),
        "neutral" => "fair".to_string(),
        "stressed" | "tired" => "poor".to_string(),
        _ => "fair".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{EmotionCount, LogEmotionBody};

    #[test]
    fn test_study_quality_focused_high_intensity() {
        assert_eq!(calculate_study_quality("focused", 8.0), "excellent");
        assert_eq!(calculate_study_quality("focused", 7.0), "excellent");
    }

    #[test]
    fn test_study_quality_focused_low_intensity() {
        assert_eq!(calculate_study_quality("focused", 6.9), "good");
        assert_eq!(calculate_study_quality("focused", 1.0), "good");
    }

    #[test]
    fn test_study_quality_happy() {
        assert_eq!(calculate_study_quality("happy", 9.0), "good");
        assert_eq!(calculate_study_quality("happy", 3.0), "good");
    }

    #[test]
    fn test_study_quality_neutral() {
        assert_eq!(calculate_study_quality("neutral", 5.0), "fair");
    }

    #[test]
    fn test_study_quality_negative_states() {
        assert_eq!(calculate_study_quality("stressed", 8.0), "poor");
        assert_eq!(calculate_study_quality("tired", 2.0), "poor");
    }

    #[test]
    fn test_study_quality_unknown_emotion_defaults_to_fair() {
        assert_eq!(calculate_study_quality("confused", 5.0), "fair");
        assert_eq!(calculate_study_quality("", 5.0), "fair");
    }

    #[test]
    fn test_valid_emotions_list() {
        let valid_emotions = vec!["focused", "happy", "neutral", "confused", "stressed", "tired"];
        for emotion in &valid_emotions {
            // All valid emotions should parse correctly
            let body_json = format!(r#"{{"emotion":"{}","intensity":5}}"#, emotion);
            let body: Result<LogEmotionBody, _> = serde_json::from_str(&body_json);
            assert!(body.is_ok(), "Should parse emotion: {}", emotion);
        }
    }

    #[test]
    fn test_log_emotion_body_with_note() {
        let json = r#"{"emotion":"focused","intensity":8,"note":"Deep work session","study_session_id":"sess_1"}"#;
        let body: LogEmotionBody = serde_json::from_str(json).unwrap();
        assert_eq!(body.emotion, "focused");
        assert_eq!(body.intensity, 8);
        assert_eq!(body.note, Some("Deep work session".to_string()));
        assert_eq!(body.study_session_id, Some("sess_1".to_string()));
    }

    #[test]
    fn test_log_emotion_body_minimal() {
        let json = r#"{"emotion":"neutral","intensity":5}"#;
        let body: LogEmotionBody = serde_json::from_str(json).unwrap();
        assert!(body.note.is_none());
        assert!(body.study_session_id.is_none());
    }

    #[test]
    fn test_intensity_boundary_values() {
        // The handler rejects < 1 and > 10 — model accepts any i32
        let json_min = r#"{"emotion":"focused","intensity":1}"#;
        let json_max = r#"{"emotion":"focused","intensity":10}"#;
        let min: LogEmotionBody = serde_json::from_str(json_min).unwrap();
        let max: LogEmotionBody = serde_json::from_str(json_max).unwrap();
        assert_eq!(min.intensity, 1);
        assert_eq!(max.intensity, 10);
    }

    #[test]
    fn test_generate_weekly_summary_empty() {
        let summary = generate_weekly_summary(&[], 5.0);
        assert!(summary.contains("No emotion data"));
    }

    #[test]
    fn test_generate_weekly_summary_high_intensity() {
        let dist = vec![EmotionCount {
            emotion: "focused".to_string(),
            count: 10,
            percentage: 100.0,
        }];
        let summary = generate_weekly_summary(&dist, 8.0);
        assert!(summary.contains("focused"));
        assert!(summary.contains("high intensity"));
    }

    #[test]
    fn test_generate_weekly_summary_moderate_intensity() {
        let dist = vec![EmotionCount {
            emotion: "neutral".to_string(),
            count: 5,
            percentage: 100.0,
        }];
        let summary = generate_weekly_summary(&dist, 6.0);
        assert!(summary.contains("moderate"));
    }
}

pub(crate) fn generate_weekly_summary(emotion_distribution: &[EmotionCount], avg_intensity: f64) -> String {
    if emotion_distribution.is_empty() {
        return "No emotion data available yet".to_string();
    }

    let neutral_default = "neutral".to_string();
    let top_emotion = emotion_distribution
        .iter()
        .max_by_key(|e| e.count)
        .map(|e| &e.emotion)
        .unwrap_or(&neutral_default);

    let quality = if avg_intensity >= 7.0 {
        "You've been maintaining high intensity levels"
    } else if avg_intensity >= 5.0 {
        "Your intensity levels have been moderate"
    } else {
        "Your intensity levels have been lower this week"
    };

    format!(
        "Your most common emotion this week is {}. {}. Keep up with your studies!",
        top_emotion, quality
    )
}
