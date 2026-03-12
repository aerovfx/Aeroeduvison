//! OpenFang Core Types
//! 
//! Core data structures for OpenFang agent system

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Agent identifier
pub type AgentId = String;

/// Session identifier  
pub type SessionId = String;

/// Message identifier
pub type MessageId = String;

/// Agent state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentState {
    Idle,
    Running,
    Paused,
    Stopped,
    Error(String),
}

/// Agent capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCapability {
    pub name: String,
    pub description: String,
    pub enabled: bool,
}

/// Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent_id: AgentId,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<AgentCapability>,
    pub llm_provider: String,
    pub llm_model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

/// Message in agent conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: MessageId,
    pub session_id: SessionId,
    pub role: MessageRole,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

/// Message role
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
    Tool,
}

/// Agent session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: SessionId,
    pub agent_id: AgentId,
    pub user_id: String,
    pub state: AgentState,
    pub messages: Vec<Message>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

/// Tool call result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub tool_name: String,
    pub arguments: serde_json::Value,
    pub result: serde_json::Value,
    pub success: bool,
}

/// LLM provider type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LlmProvider {
    OpenAI,
    Anthropic,
    Gemini,
    Ollama,
    OpenRouter,
    Groq,
}

/// LLM request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmRequest {
    pub provider: LlmProvider,
    pub model: String,
    pub messages: Vec<Message>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub tools: Option<Vec<Tool>>,
}

/// LLM response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: String,
    pub finish_reason: String,
    pub usage: UsageInfo,
    pub tool_calls: Option<Vec<ToolCall>>,
}

/// Token usage info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Error types
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum OpenFangError {
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    
    #[error("LLM error: {0}")]
    LlmError(String),
    
    #[error("Tool execution error: {0}")]
    ToolError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Result type alias
pub type Result<T> = std::result::Result<T, OpenFangError>;
