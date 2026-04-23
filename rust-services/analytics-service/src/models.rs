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
pub struct DashboardAnalytics {
    pub total_study_time_minutes: i64,
    pub sessions_this_week: i64,
    pub avg_session_minutes: f64,
    pub current_streak_days: i32,
    pub longest_streak_days: i32,
    pub total_xp: i64,
    pub rank_percentile: f64,
    pub weekly_goal_progress: f64,
    pub subjects: Vec<SubjectStats>,
    pub weekly_hours: Vec<DayHours>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectStats {
    pub subject: String,
    pub time_spent_minutes: i64,
    pub sessions: i64,
    pub avg_score: f64,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayHours {
    pub date: String,
    pub hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityItem {
    pub id: String,
    pub activity_type: String,
    pub title: String,
    pub subject: Option<String>,
    pub xp_earned: Option<i32>,
    pub score: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseEngagement {
    pub subject: String,
    pub total_time_minutes: i64,
    pub session_count: i64,
    pub average_score: f64,
    pub color: String,
    pub progress_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentPerformance {
    pub user_id: String,
    pub email: Option<String>,
    pub total_study_time_minutes: i64,
    pub sessions_this_week: i64,
    pub average_score: f64,
    pub total_xp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_dashboard_analytics_serializes_all_fields() {
        let analytics = DashboardAnalytics {
            total_study_time_minutes: 1200,
            sessions_this_week: 7,
            avg_session_minutes: 45.5,
            current_streak_days: 5,
            longest_streak_days: 14,
            total_xp: 4500,
            rank_percentile: 78.3,
            weekly_goal_progress: 85.7,
            subjects: vec![],
            weekly_hours: vec![],
        };
        let json = serde_json::to_value(&analytics).unwrap();
        assert_eq!(json["total_study_time_minutes"], 1200);
        assert_eq!(json["sessions_this_week"], 7);
        assert_eq!(json["current_streak_days"], 5);
        assert_eq!(json["total_xp"], 4500);
    }

    #[test]
    fn test_subject_stats_serialization() {
        let stats = SubjectStats {
            subject: "Mathematics".to_string(),
            time_spent_minutes: 360,
            sessions: 12,
            avg_score: 87.5,
            color: "#FF6B6B".to_string(),
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["subject"], "Mathematics");
        assert_eq!(json["time_spent_minutes"], 360);
        assert_eq!(json["color"], "#FF6B6B");
    }

    #[test]
    fn test_day_hours_serialization() {
        let day = DayHours {
            date: "Mon".to_string(),
            hours: 2.5,
        };
        let json = serde_json::to_value(&day).unwrap();
        assert_eq!(json["date"], "Mon");
        assert_eq!(json["hours"], 2.5);
    }

    #[test]
    fn test_rank_percentile_capped_at_100() {
        // Business rule tested in handler: rank_percentile = (xp / 10000 * 100).min(100)
        let xp: f64 = 50000.0;
        let percentile = ((xp / 10000.0) * 100.0).min(100.0);
        assert_eq!(percentile, 100.0);

        let xp_low: f64 = 500.0;
        let percentile_low = ((xp_low / 10000.0) * 100.0).min(100.0);
        assert_eq!(percentile_low, 5.0);
    }

    #[test]
    fn test_weekly_goal_progress_capped_at_100() {
        // Business rule: weekly_goal_progress = (sessions / 7 * 100).min(100)
        let sessions_over: f64 = 10.0;
        let progress = ((sessions_over / 7.0) * 100.0).min(100.0);
        assert_eq!(progress, 100.0);

        let sessions_half: f64 = 3.5;
        let progress_half = ((sessions_half / 7.0) * 100.0).min(100.0);
        assert!((progress_half - 50.0).abs() < 0.01);
    }

    #[test]
    fn test_course_engagement_serialization() {
        let engagement = CourseEngagement {
            subject: "Physics".to_string(),
            total_time_minutes: 180,
            session_count: 6,
            average_score: 91.2,
            color: "#4ECDC4".to_string(),
            progress_percentage: 30.0,
        };
        let json = serde_json::to_value(&engagement).unwrap();
        assert_eq!(json["subject"], "Physics");
        assert_eq!(json["session_count"], 6);
        assert_eq!(json["progress_percentage"], 30.0);
    }

    #[test]
    fn test_activity_item_with_optional_fields() {
        use chrono::Utc;
        let item = ActivityItem {
            id: "act_1".to_string(),
            activity_type: "lesson".to_string(),
            title: "Intro to Algebra".to_string(),
            subject: Some("Math".to_string()),
            xp_earned: Some(50),
            score: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["activity_type"], "lesson");
        assert_eq!(json["xp_earned"], 50);
        assert!(json["score"].is_null());
    }
}
