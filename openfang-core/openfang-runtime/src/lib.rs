//! OpenFang Runtime
//! 
//! Agent execution loop and LLM drivers

use async_trait::async_trait;
pub use openfang_types::*;
use std::collections::HashMap;

/// LLM Driver trait
#[async_trait]
pub trait LlmDriver: Send + Sync {
    async fn chat(&self, request: LlmRequest) -> Result<LlmResponse>;
    fn provider(&self) -> LlmProvider;
}

/// OpenAI-compatible driver
pub struct OpenAiDriver {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl OpenAiDriver {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmDriver for OpenAiDriver {
    async fn chat(&self, request: LlmRequest) -> Result<LlmResponse> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": request.model,
                "messages": request.messages.iter().map(|m| serde_json::json!({
                    "role": match m.role {
                        MessageRole::User => "user",
                        MessageRole::Assistant => "assistant",
                        MessageRole::System => "system",
                        MessageRole::Tool => "tool",
                    },
                    "content": m.content,
                })).collect::<Vec<_>>(),
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
            }))
            .send()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let usage = UsageInfo {
            prompt_tokens: json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: json["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32,
        };
        
        Ok(LlmResponse {
            content,
            finish_reason: json["choices"][0]["finish_reason"]
                .as_str()
                .unwrap_or("stop")
                .to_string(),
            usage,
            tool_calls: None,
        })
    }
    
    fn provider(&self) -> LlmProvider {
        LlmProvider::OpenAI
    }
}

/// OpenRouter driver (multi-model gateway)
pub struct OpenRouterDriver {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl OpenRouterDriver {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmDriver for OpenRouterDriver {
    async fn chat(&self, request: LlmRequest) -> Result<LlmResponse> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://aeroeduvison.com")
            .header("X-Title", "Aeroeduvison Exam Generator")
            .json(&serde_json::json!({
                "model": request.model,
                "messages": request.messages.iter().map(|m| serde_json::json!({
                    "role": match m.role {
                        MessageRole::User => "user",
                        MessageRole::Assistant => "assistant",
                        MessageRole::System => "system",
                        MessageRole::Tool => "tool",
                    },
                    "content": m.content,
                })).collect::<Vec<_>>(),
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
            }))
            .send()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let usage = UsageInfo {
            prompt_tokens: json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: json["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32,
        };
        
        Ok(LlmResponse {
            content,
            finish_reason: json["choices"][0]["finish_reason"]
                .as_str()
                .unwrap_or("stop")
                .to_string(),
            usage,
            tool_calls: None,
        })
    }
    
    fn provider(&self) -> LlmProvider {
        LlmProvider::OpenRouter
    }
}

/// Ollama driver (local LLM)
pub struct OllamaDriver {
    base_url: String,
    client: reqwest::Client,
}

impl OllamaDriver {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| "http://localhost:11434".to_string()),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmDriver for OllamaDriver {
    async fn chat(&self, request: LlmRequest) -> Result<LlmResponse> {
        let url = format!("{}/api/generate", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": request.model,
                "prompt": request.messages.last()
                    .map(|m| m.content.clone())
                    .unwrap_or_default(),
                "stream": false,
            }))
            .send()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| OpenFangError::LlmError(e.to_string()))?;
        
        let content = json["response"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        Ok(LlmResponse {
            content,
            finish_reason: if json["done"].as_bool().unwrap_or(false) {
                "stop".to_string()
            } else {
                "length".to_string()
            },
            usage: UsageInfo {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
            tool_calls: None,
        })
    }
    
    fn provider(&self) -> LlmProvider {
        LlmProvider::Ollama
    }
}

/// Agent runtime
pub struct AgentRuntime {
    drivers: HashMap<LlmProvider, Box<dyn LlmDriver>>,
    agents: HashMap<AgentId, AgentConfig>,
}

impl AgentRuntime {
    pub fn new() -> Self {
        Self {
            drivers: HashMap::new(),
            agents: HashMap::new(),
        }
    }
    
    pub fn register_driver(&mut self, driver: Box<dyn LlmDriver>) {
        let provider = driver.provider();
        self.drivers.insert(provider, driver);
    }
    
    pub fn register_agent(&mut self, config: AgentConfig) {
        self.agents.insert(config.agent_id.clone(), config);
    }
    
    pub fn get_driver(&self, provider: &LlmProvider) -> Option<&dyn LlmDriver> {
        self.drivers.get(provider).map(|d| d.as_ref())
    }
    
    pub fn get_agent(&self, agent_id: &str) -> Option<&AgentConfig> {
        self.agents.get(agent_id)
    }
}

impl Default for AgentRuntime {
    fn default() -> Self {
        Self::new()
    }
}
