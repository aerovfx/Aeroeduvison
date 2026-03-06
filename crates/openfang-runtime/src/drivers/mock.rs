//! Mock LLM driver for testing and development without API keys.

use crate::llm_driver::{CompletionRequest, CompletionResponse, LlmDriver, LlmError, StreamEvent};
use async_trait::async_trait;
use openfang_types::message::{ContentBlock, MessageContent, Role, StopReason, TokenUsage};

/// Mock driver that returns canned or reflected responses.
pub struct MockDriver;

impl MockDriver {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl LlmDriver for MockDriver {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        let last_message = request.messages.last().and_then(|m| {
            if let MessageContent::Text(text) = &m.content {
                Some(text.clone())
            } else {
                None
            }
        }).unwrap_or_else(|| "Hello!".to_string());

        let response_text = format!("[MOCK TUTOR] Bạn vừa nói: \"{}\". Tôi là một mô phỏng Tutor của Open Fang.", last_message);

        Ok(CompletionResponse {
            content: vec![ContentBlock::Text { text: response_text }],
            stop_reason: StopReason::EndTurn,
            tool_calls: Vec::new(),
            usage: TokenUsage {
                input_tokens: 10,
                output_tokens: 20,
            },
        })
    }

    async fn stream(
        &self,
        request: CompletionRequest,
        tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        // Just call complete for simplicity in mock
        self.complete(request).await
    }
}
