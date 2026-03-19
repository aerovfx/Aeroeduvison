use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct LlmService {
    client: Client,
}

#[derive(Debug, Clone)]
struct LlmProvider {
    name: String,
    base_url: String,
    api_key: String,
    model: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Option<Vec<OpenAiChoice>>,
    // Ollama format
    message: Option<OllamaMessage>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OllamaMessage,
}

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmGradingResult {
    pub score: f64,
    pub feedback: String,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
}

impl LlmService {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .expect("Failed to build HTTP client"),
        }
    }

    /// Select the best available LLM provider based on environment configuration.
    /// Priority: Claude > OpenAI > Grok > Gemini > Ollama
    fn select_provider(&self) -> Result<LlmProvider, AppError> {
        // Claude (Anthropic) — native Messages API
        if let Ok(key) = std::env::var("ANTHROPIC_API_KEY") {
            if !key.is_empty() {
                let model = std::env::var("ANTHROPIC_MODEL")
                    .unwrap_or_else(|_| "claude-sonnet-4-20250514".to_string());
                return Ok(LlmProvider {
                    name: "claude".to_string(),
                    base_url: "https://api.anthropic.com".to_string(),
                    api_key: key,
                    model,
                });
            }
        }

        // OpenAI
        if let (Ok(key), Ok(url)) = (
            std::env::var("OPENAI_API_KEY"),
            std::env::var("OPENAI_BASE_URL"),
        ) {
            if !key.is_empty() {
                let model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4".to_string());
                return Ok(LlmProvider {
                    name: "openai".to_string(),
                    base_url: url,
                    api_key: key,
                    model,
                });
            }
        }

        // Grok (X.AI)
        if let Ok(key) = std::env::var("GROK_API_KEY") {
            if !key.is_empty() {
                return Ok(LlmProvider {
                    name: "grok".to_string(),
                    base_url: "https://api.x.ai/v1".to_string(),
                    api_key: key,
                    model: "grok-beta".to_string(),
                });
            }
        }

        // Gemini
        if let Ok(key) = std::env::var("GEMINI_API_KEY") {
            if !key.is_empty() {
                return Ok(LlmProvider {
                    name: "gemini".to_string(),
                    base_url: "https://generativelanguage.googleapis.com/v1beta/openai".to_string(),
                    api_key: key,
                    model: "gemini-2.5-pro-preview-05-06".to_string(),
                });
            }
        }

        // Ollama (local, no API key needed)
        let ollama_url = std::env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string());
        let ollama_model = std::env::var("OLLAMA_MODEL")
            .unwrap_or_else(|_| "deepseek-coder:6.7b".to_string());

        Ok(LlmProvider {
            name: "ollama".to_string(),
            base_url: ollama_url,
            api_key: String::new(),
            model: ollama_model,
        })
    }

    /// Grade an essay using the selected LLM provider.
    pub async fn grade_essay(
        &self,
        essay_content: &str,
        rubric_description: Option<&str>,
        max_score: f64,
    ) -> Result<(LlmGradingResult, String), AppError> {
        let provider = self.select_provider()?;

        let rubric_text = rubric_description.unwrap_or(
            "Đánh giá dựa trên: nội dung chính xác, lập luận logic, ngôn ngữ và trình bày"
        );

        let prompt = format!(
            r#"Bạn là giáo viên chấm bài. Hãy chấm bài luận sau đây.

Tiêu chí đánh giá: {}
Thang điểm: 0 đến {}

Bài luận:
---
{}
---

Trả lời theo JSON format:
{{
  "score": <điểm số>,
  "feedback": "<nhận xét tổng quan bằng tiếng Việt>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"]
}}"#,
            rubric_text, max_score, essay_content
        );

        let result = self.call_llm(&provider, &prompt).await?;
        let parsed = self.parse_grading_response(&result, max_score)?;

        Ok((parsed, provider.name))
    }

    /// Grade a general submission using the selected LLM provider.
    pub async fn grade_submission(
        &self,
        submission: &str,
        subject: &str,
        assignment_type: Option<&str>,
        max_score: f64,
    ) -> Result<(LlmGradingResult, String), AppError> {
        let provider = self.select_provider()?;
        let atype = assignment_type.unwrap_or("general");

        let prompt = format!(
            r#"Bạn là giáo viên chấm bài môn {}. Loại bài: {}.
Thang điểm: 0 đến {}.

Bài làm của học sinh:
---
{}
---

Trả lời theo JSON format:
{{
  "score": <điểm số>,
  "feedback": "<nhận xét tổng quan bằng tiếng Việt>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"]
}}"#,
            subject, atype, max_score, submission
        );

        let result = self.call_llm(&provider, &prompt).await?;
        let parsed = self.parse_grading_response(&result, max_score)?;

        Ok((parsed, provider.name))
    }

    async fn call_llm(&self, provider: &LlmProvider, prompt: &str) -> Result<String, AppError> {
        // Claude uses a different API format (Messages API)
        if provider.name == "claude" {
            return self.call_claude(provider, prompt).await;
        }

        let url = format!("{}/v1/chat/completions", provider.base_url.trim_end_matches('/'));

        let body = json!({
            "model": provider.model,
            "messages": [
                { "role": "system", "content": "You are an expert Vietnamese educator. Always respond in valid JSON." },
                { "role": "user", "content": prompt }
            ],
            "temperature": 0.3,
            "max_tokens": 1000,
            "response_format": { "type": "json_object" }
        });

        let mut req = self.client.post(&url).json(&body);
        if !provider.api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", provider.api_key));
        }

        let resp = req.send().await
            .map_err(|e| AppError::LlmError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::LlmError(format!("LLM returned {}: {}", status, text)));
        }

        let data: serde_json::Value = resp.json().await
            .map_err(|e| AppError::LlmError(format!("Failed to parse response: {}", e)))?;

        // Handle OpenAI format
        if let Some(choices) = data["choices"].as_array() {
            if let Some(first) = choices.first() {
                if let Some(content) = first["message"]["content"].as_str() {
                    return Ok(content.to_string());
                }
            }
        }

        // Handle Ollama format
        if let Some(content) = data["message"]["content"].as_str() {
            return Ok(content.to_string());
        }

        Err(AppError::LlmError("Unable to extract content from LLM response".to_string()))
    }

    /// Call Claude's native Messages API (https://api.anthropic.com/v1/messages)
    async fn call_claude(&self, provider: &LlmProvider, prompt: &str) -> Result<String, AppError> {
        let url = format!("{}/v1/messages", provider.base_url.trim_end_matches('/'));

        let body = json!({
            "model": provider.model,
            "max_tokens": 1024,
            "system": "You are an expert Vietnamese educator. Always respond in valid JSON.",
            "messages": [
                { "role": "user", "content": prompt }
            ],
            "temperature": 0.3
        });

        let resp = self.client
            .post(&url)
            .header("x-api-key", &provider.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::LlmError(format!("Claude request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::LlmError(format!("Claude returned {}: {}", status, text)));
        }

        let data: serde_json::Value = resp.json().await
            .map_err(|e| AppError::LlmError(format!("Failed to parse Claude response: {}", e)))?;

        // Claude Messages API response: { "content": [{ "type": "text", "text": "..." }] }
        if let Some(content) = data["content"].as_array() {
            for block in content {
                if block["type"].as_str() == Some("text") {
                    if let Some(text) = block["text"].as_str() {
                        return Ok(text.to_string());
                    }
                }
            }
        }

        Err(AppError::LlmError("Unable to extract text from Claude response".to_string()))
    }

    fn parse_grading_response(&self, response: &str, max_score: f64) -> Result<LlmGradingResult, AppError> {
        // Clean markdown code blocks if present
        let cleaned = response
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        let parsed: serde_json::Value = serde_json::from_str(cleaned)
            .map_err(|e| AppError::LlmError(format!("Failed to parse JSON: {} — raw: {}", e, &cleaned[..cleaned.len().min(200)])))?;

        let score = parsed["score"].as_f64().unwrap_or(0.0).min(max_score).max(0.0);
        let feedback = parsed["feedback"].as_str().unwrap_or("Không có nhận xét").to_string();

        let strengths = parsed["strengths"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        let weaknesses = parsed["weaknesses"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        Ok(LlmGradingResult {
            score,
            feedback,
            strengths,
            weaknesses,
        })
    }
}
