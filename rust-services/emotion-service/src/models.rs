use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionRecord {
    pub id: String,
    pub user_id: String,
    pub emotion: String,
    pub intensity: i32,
    pub note: Option<String>,
    pub study_session_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionStats {
    pub total_records: i64,
    pub dominant_emotion: String,
    pub avg_intensity: f64,
    pub study_quality: String,
    pub emotion_distribution: Vec<EmotionCount>,
    pub trend: Vec<EmotionTrendPoint>,
    pub weekly_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionCount {
    pub emotion: String,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionTrendPoint {
    pub date: String,
    pub dominant: String,
    pub avg_intensity: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LogEmotionBody {
    pub emotion: String,
    pub intensity: i32,
    pub note: Option<String>,
    pub study_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionResponse {
    pub id: String,
    pub emotion: String,
    pub intensity: i32,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}
