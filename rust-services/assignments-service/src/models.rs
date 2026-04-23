use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Assignment {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub subject: String,
    pub assignment_type: String,
    pub status: String,
    pub difficulty: String,
    pub duration: i32,
    pub xp_reward: i32,
    pub accuracy: Option<f64>,
    pub progress: i32,
    pub user_id: String,
    pub tags: Option<serde_json::Value>,
    pub ai_generated: bool,
    pub assigned_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssignmentRequest {
    pub title: String,
    pub description: Option<String>,
    pub subject: String,
    pub assignment_type: Option<String>,
    pub difficulty: Option<String>,
    pub duration: Option<i32>,
    pub xp_reward: Option<i32>,
    pub tags: Option<serde_json::Value>,
    pub ai_generated: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProgressRequest {
    pub progress: i32,
}

#[derive(Debug, Serialize)]
pub struct AssignmentResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub subject: String,
    pub assignment_type: String,
    pub status: String,
    pub difficulty: String,
    pub duration: i32,
    pub xp_reward: i32,
    pub accuracy: Option<f64>,
    pub progress: i32,
    pub user_id: String,
    pub tags: Option<serde_json::Value>,
    pub ai_generated: bool,
    pub assigned_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Assignment> for AssignmentResponse {
    fn from(a: Assignment) -> Self {
        AssignmentResponse {
            id: a.id,
            title: a.title,
            description: a.description,
            subject: a.subject,
            assignment_type: a.assignment_type,
            status: a.status,
            difficulty: a.difficulty,
            duration: a.duration,
            xp_reward: a.xp_reward,
            accuracy: a.accuracy,
            progress: a.progress,
            user_id: a.user_id,
            tags: a.tags,
            ai_generated: a.ai_generated,
            assigned_at: a.assigned_at,
            completed_at: a.completed_at,
            created_at: a.created_at,
            updated_at: a.updated_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_create_assignment_request_all_fields() {
        let json = r#"{
            "title": "Math HW",
            "description": "Chapter 3",
            "subject": "Math",
            "assignment_type": "homework",
            "difficulty": "hard",
            "duration": 60,
            "xp_reward": 200,
            "ai_generated": true
        }"#;
        let req: CreateAssignmentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, "Math HW");
        assert_eq!(req.subject, "Math");
        assert_eq!(req.assignment_type, Some("homework".to_string()));
        assert_eq!(req.difficulty, Some("hard".to_string()));
        assert_eq!(req.duration, Some(60));
        assert_eq!(req.xp_reward, Some(200));
        assert_eq!(req.ai_generated, Some(true));
    }

    #[test]
    fn test_create_assignment_request_minimal() {
        // Only required fields — optionals default to None
        let json = r#"{"title":"Quiz","subject":"Science"}"#;
        let req: CreateAssignmentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, "Quiz");
        assert!(req.assignment_type.is_none());
        assert!(req.difficulty.is_none());
        assert!(req.duration.is_none());
        assert!(req.xp_reward.is_none());
        assert!(req.ai_generated.is_none());
    }

    #[test]
    fn test_update_progress_request_deserialize() {
        let json = r#"{"progress": 75}"#;
        let req: UpdateProgressRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.progress, 75);
    }

    #[test]
    fn test_update_progress_boundary_values() {
        // The handler rejects < 0 and > 100 but the model itself accepts any i32
        let json_min = r#"{"progress": 0}"#;
        let json_max = r#"{"progress": 100}"#;
        let min: UpdateProgressRequest = serde_json::from_str(json_min).unwrap();
        let max: UpdateProgressRequest = serde_json::from_str(json_max).unwrap();
        assert_eq!(min.progress, 0);
        assert_eq!(max.progress, 100);
    }

    #[test]
    fn test_assignment_response_serialization_has_correct_keys() {
        use chrono::Utc;
        let now = Utc::now();
        let resp = AssignmentResponse {
            id: "asgn_1".to_string(),
            title: "Test".to_string(),
            description: None,
            subject: "Physics".to_string(),
            assignment_type: "lesson".to_string(),
            status: "pending".to_string(),
            difficulty: "easy".to_string(),
            duration: 30,
            xp_reward: 100,
            accuracy: None,
            progress: 0,
            user_id: "u1".to_string(),
            tags: None,
            ai_generated: false,
            assigned_at: now,
            completed_at: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_value(&resp).unwrap();
        // Verify key names match what the frontend expects (snake_case)
        assert!(json.get("id").is_some());
        assert!(json.get("assignment_type").is_some());
        assert!(json.get("ai_generated").is_some());
        assert!(json.get("xp_reward").is_some());
        assert!(json.get("assigned_at").is_some());
        assert!(json.get("completed_at").is_some());
        assert_eq!(json["status"], "pending");
        assert_eq!(json["progress"], 0);
    }

    #[test]
    fn test_progress_to_status_logic() {
        // Mirrors the logic in update_progress handler
        let determine_status = |progress: i32| -> &'static str {
            if progress >= 100 { "completed" }
            else if progress > 0 { "in-progress" }
            else { "pending" }
        };

        assert_eq!(determine_status(0), "pending");
        assert_eq!(determine_status(1), "in-progress");
        assert_eq!(determine_status(50), "in-progress");
        assert_eq!(determine_status(99), "in-progress");
        assert_eq!(determine_status(100), "completed");
    }
}
