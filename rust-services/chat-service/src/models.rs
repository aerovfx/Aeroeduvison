use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChatRoom {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub room_type: String,
    pub created_by: String,
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub member_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChatMessage {
    pub id: String,
    pub room_id: String,
    pub user_id: String,
    pub user_name: Option<String>,
    pub content: String,
    pub message_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoomMember {
    pub id: String,
    pub room_id: String,
    pub user_id: String,
    pub user_name: Option<String>,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub description: Option<String>,
    pub room_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

// WsMessage lives in ws.rs — re-export here for convenience
pub use crate::ws::WsMessage;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_create_room_request_deserialize() {
        let json = r#"{"name":"General","description":"A public room","room_type":"public"}"#;
        let req: CreateRoomRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name, "General");
        assert_eq!(req.room_type, "public");
        assert_eq!(req.description, Some("A public room".to_string()));
    }

    #[test]
    fn test_create_room_request_no_description() {
        let json = r#"{"name":"Private","room_type":"private"}"#;
        let req: CreateRoomRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name, "Private");
        assert!(req.description.is_none());
    }

    #[test]
    fn test_send_message_request_deserialize() {
        let json = r#"{"content":"Hello world!"}"#;
        let req: SendMessageRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.content, "Hello world!");
    }

    #[test]
    fn test_ws_message_serialize_roundtrip() {
        let msg = WsMessage {
            room_id: "room-1".to_string(),
            user_id: "user-1".to_string(),
            user_name: Some("alice@test.com".to_string()),
            content: "Hi there".to_string(),
            message_type: "text".to_string(),
            timestamp: "2026-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let decoded: WsMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.room_id, "room-1");
        assert_eq!(decoded.content, "Hi there");
        assert_eq!(decoded.user_name, Some("alice@test.com".to_string()));
    }

    #[test]
    fn test_ws_message_no_username() {
        let msg = WsMessage {
            room_id: "room-2".to_string(),
            user_id: "user-2".to_string(),
            user_name: None,
            content: "Anonymous".to_string(),
            message_type: "text".to_string(),
            timestamp: "2026-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""user_name":null"#));
    }

    #[test]
    fn test_jwt_claims_serialize() {
        let claims = JwtClaims {
            sub: "user_123".to_string(),
            email: "test@example.com".to_string(),
            role: "STUDENT".to_string(),
            exp: 9999999999,
            iat: 1000000000,
        };
        let json = serde_json::to_value(&claims).unwrap();
        assert_eq!(json["sub"], "user_123");
        assert_eq!(json["email"], "test@example.com");
        assert_eq!(json["role"], "STUDENT");
    }
}
