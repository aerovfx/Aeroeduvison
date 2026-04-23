use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Achievement {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub category: String,
    pub xp_reward: i32,
    pub requirement: i32,
    pub requirement_type: String,
    pub is_rare: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserAchievement {
    pub id: String,
    pub user_id: String,
    pub achievement_id: String,
    pub unlocked_at: DateTime<Utc>,
    pub progress: i32,
}

#[derive(Debug, Serialize)]
pub struct AchievementWithStatus {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub category: String,
    pub xp_reward: i32,
    pub requirement: i32,
    pub requirement_type: String,
    pub is_rare: bool,
    pub created_at: DateTime<Utc>,
    pub unlocked: bool,
    pub unlocked_at: Option<DateTime<Utc>>,
    pub current_progress: i32,
}

impl AchievementWithStatus {
    pub fn from_achievement(ach: Achievement, user_ach: Option<UserAchievement>) -> Self {
        let (unlocked, unlocked_at, current_progress) = match user_ach {
            Some(ua) => (true, Some(ua.unlocked_at), ua.progress),
            None => (false, None, 0),
        };

        AchievementWithStatus {
            id: ach.id,
            title: ach.title,
            description: ach.description,
            icon: ach.icon,
            category: ach.category,
            xp_reward: ach.xp_reward,
            requirement: ach.requirement,
            requirement_type: ach.requirement_type,
            is_rare: ach.is_rare,
            created_at: ach.created_at,
            unlocked,
            unlocked_at,
            current_progress,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub user_id: String,
    pub total_xp: i64,
    pub total_achievements: i64,
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
    use chrono::Utc;
    use serde_json;

    fn make_achievement(id: &str, xp: i32, req: i32) -> Achievement {
        Achievement {
            id: id.to_string(),
            title: "Test Badge".to_string(),
            description: "Do the thing".to_string(),
            icon: "🏆".to_string(),
            category: "learning".to_string(),
            xp_reward: xp,
            requirement: req,
            requirement_type: "lessons_completed".to_string(),
            is_rare: false,
            created_at: Utc::now(),
        }
    }

    fn make_user_achievement(achievement_id: &str, progress: i32) -> UserAchievement {
        UserAchievement {
            id: "ua_1".to_string(),
            user_id: "user_1".to_string(),
            achievement_id: achievement_id.to_string(),
            unlocked_at: Utc::now(),
            progress,
        }
    }

    #[test]
    fn test_achievement_with_status_locked() {
        let ach = make_achievement("ach_1", 100, 10);
        let result = AchievementWithStatus::from_achievement(ach, None);
        assert!(!result.unlocked);
        assert!(result.unlocked_at.is_none());
        assert_eq!(result.current_progress, 0);
        assert_eq!(result.xp_reward, 100);
        assert_eq!(result.requirement, 10);
    }

    #[test]
    fn test_achievement_with_status_unlocked() {
        let ach = make_achievement("ach_2", 250, 5);
        let ua = make_user_achievement("ach_2", 5);
        let result = AchievementWithStatus::from_achievement(ach, Some(ua));
        assert!(result.unlocked);
        assert!(result.unlocked_at.is_some());
        assert_eq!(result.current_progress, 5);
        assert_eq!(result.id, "ach_2");
    }

    #[test]
    fn test_achievement_with_status_serializes_unlocked_field() {
        let ach = make_achievement("ach_3", 50, 1);
        let result = AchievementWithStatus::from_achievement(ach, None);
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["unlocked"], false);
        assert_eq!(json["current_progress"], 0);
        assert!(json.get("unlocked_at").is_some());
    }

    #[test]
    fn test_leaderboard_entry_serialization() {
        let entry = LeaderboardEntry {
            user_id: "user_42".to_string(),
            total_xp: 9500,
            total_achievements: 12,
        };
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["user_id"], "user_42");
        assert_eq!(json["total_xp"], 9500);
        assert_eq!(json["total_achievements"], 12);
    }

    #[test]
    fn test_rare_achievement_flag() {
        let mut ach = make_achievement("ach_rare", 1000, 100);
        ach.is_rare = true;
        let result = AchievementWithStatus::from_achievement(ach, None);
        assert!(result.is_rare);
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["is_rare"], true);
    }
}
