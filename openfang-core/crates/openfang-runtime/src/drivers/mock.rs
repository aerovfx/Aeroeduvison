//! Mock LLM driver for testing and development without API keys.

use crate::llm_driver::{CompletionRequest, CompletionResponse, LlmDriver, LlmError, StreamEvent};
use async_trait::async_trait;
use openfang_types::message::{ContentBlock, MessageContent, StopReason, TokenUsage};

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
                Some(text.clone().to_lowercase())
            } else {
                None
            }
        }).unwrap_or_else(|| "hello".to_string());

        let response_text = if last_message.contains("trắc nghiệm") || last_message.contains("quiz") {
            format!(
                "### 📝 Bộ câu hỏi trắc nghiệm (Mock Open Fang)\n\n\
                **Chủ đề:** {}\n\n\
                1. Câu hỏi 1: Ý nghĩa của nghiên cứu này là gì?\n\
                   - A. Phát triển bền vững\n\
                   - B. Tăng trưởng kinh tế\n\
                   - C. Cả hai\n\
                   *Đáp án: C*\n\n\
                2. Câu hỏi 2: Open Fang được viết bằng ngôn ngữ nào?\n\
                   - A. Python\n\
                   - B. Rust\n\
                   - C. C++\n\
                   *Đáp án: B*",
                last_message
            )
        } else if last_message.contains("tổng hợp") || last_message.contains("summary") {
            format!(
                "### 📖 Tóm tắt kiến thức (Mock Open Fang)\n\n\
                Dựa trên dữ liệu từ Open Fang Researcher, đây là tóm tắt cho: **{}**\n\n\
                - **Kiến thức lõi:** Đây là một hệ thống agent tiên tiến.\n\
                - **Ứng dụng:** Giáo dục, tự động hóa, nghiên cứu.\n\
                - **Nguồn:** Wikipedia, Arxiv, Giáo trình Aeroeduvison.",
                last_message
            )
        } else if last_message.contains("dự báo") || last_message.contains("predict") || last_message.contains("risk") {
            format!(
                "### 🎯 Dự báo hiệu suất (Mock Open Fang Predictor)\n\n\
                **Phân tích học sinh:** {}\n\n\
                - **Xác suất hoàn thành:** 85%\n\
                - **Điểm dự kiến:** 8.5/10\n\
                - **Rủi ro:** Có dấu hiệu sụt giảm tương tác vào cuối tuần.\n\
                - **Khuyến nghị:** Gửi lời nhắc ôn tập vào thứ 6.",
                last_message
            )
        } else {
            format!("[MOCK TUTOR] Bạn vừa nói: \"{}\". Tôi là một mô phỏng Tutor của Open Fang.", last_message)
        };

        Ok(CompletionResponse {
            content: vec![ContentBlock::Text { text: response_text }],
            stop_reason: StopReason::EndTurn,
            tool_calls: Vec::new(),
            usage: TokenUsage {
                input_tokens: 10,
                output_tokens: 200,
            },
        })
    }

    async fn stream(
        &self,
        request: CompletionRequest,
        _tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        // Just call complete for simplicity in mock
        self.complete(request).await
    }
}
