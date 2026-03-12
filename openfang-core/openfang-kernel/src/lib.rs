//! OpenFang Kernel
//! 
//! Agent orchestration for Aeroeduvison Exam Generation

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use openfang_types::*;
use openfang_runtime::{AgentRuntime, LlmRequest, Message, MessageRole};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Exam Agent trait
#[async_trait]
pub trait ExamAgent: Send + Sync {
    async fn generate_exam(&self, matrix_id: &str, teacher_id: &str) -> Result<GeneratedExam>;
    async fn analyze_matrix(&self, matrix_id: &str) -> Result<MatrixAnalysis>;
}

/// Generated exam result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedExam {
    pub exam_id: String,
    pub matrix_id: String,
    pub teacher_id: String,
    pub questions: Vec<ExamQuestion>,
    pub answer_key: AnswerKey,
    pub metadata: ExamMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamQuestion {
    pub question_id: String,
    pub position: i32,
    pub assigned_score: f64,
    pub question_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnswerKey {
    pub exam_id: String,
    pub answers: Vec<ExamAnswer>,
    pub total_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamAnswer {
    pub question_id: String,
    pub position: i32,
    pub correct_answer: String,
    pub explanation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamMetadata {
    pub generated_at: DateTime<Utc>,
    pub variant: String,
    pub generation_time_ms: i64,
    pub llm_model: String,
}

/// Matrix analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixAnalysis {
    pub matrix_id: String,
    pub total_questions: i32,
    pub topic_distribution: Vec<TopicDistribution>,
    pub cognitive_distribution: Vec<CognitiveDistribution>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicDistribution {
    pub topic_id: String,
    pub topic_name: String,
    pub question_count: i32,
    pub weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveDistribution {
    pub level: String,
    pub level_name: String,
    pub question_count: i32,
    pub weight: f64,
}

/// OpenFang Exam Agent implementation
pub struct OpenFangExamAgent {
    runtime: Arc<RwLock<AgentRuntime>>,
    llm_provider: LlmProvider,
    llm_model: String,
}

impl OpenFangExamAgent {
    pub fn new(runtime: Arc<RwLock<AgentRuntime>>, llm_provider: LlmProvider, llm_model: String) -> Self {
        Self {
            runtime,
            llm_provider,
            llm_model,
        }
    }
    
    /// Analyze exam matrix
    pub async fn analyze_matrix(&self, matrix_id: &str) -> Result<MatrixAnalysis> {
        let prompt = format!(
            "Phân tích ma trận đề thi với ID: {}
            
            Yêu cầu:
            1. Xác định tổng số câu hỏi
            2. Phân bổ theo chủ đề
            3. Phân bổ theo mức độ nhận thức (NB, TH, VD, VDC)
            4. Đề xuất chiến lược chọn câu hỏi
            
            Trả về kết quả dưới dạng JSON.",
            matrix_id
        );
        
        let analysis = self.call_llm(&prompt).await?;
        
        // Parse analysis result (in production, parse JSON properly)
        Ok(MatrixAnalysis {
            matrix_id: matrix_id.to_string(),
            total_questions: 30,  // Placeholder
            topic_distribution: vec![],
            cognitive_distribution: vec![],
            recommendations: vec![
                "Chọn câu hỏi từ dễ đến khó".to_string(),
                "Đảm bảo cân đối các chủ đề".to_string(),
                "Tránh trùng lặp câu hỏi giữa các đề".to_string(),
            ],
        })
    }
    
    /// Generate exam from matrix
    pub async fn generate_exam(&self, matrix_id: &str, teacher_id: &str) -> Result<GeneratedExam> {
        let start_time = std::time::Instant::now();
        
        // Step 1: Analyze matrix
        let analysis = self.analyze_matrix(matrix_id).await?;
        
        // Step 2: Build prompt for question selection
        let prompt = format!(
            "Tạo đề thi từ ma trận ID: {}
            
            Thông tin ma trận:
            - Tổng số câu: {}
            - Phân bổ chủ đề: {:?}
            - Phân bổ mức độ: {:?}
            
            Yêu cầu:
            1. Chọn câu hỏi phù hợp từ ngân hàng câu hỏi
            2. Đảm bảo cân đối độ khó
            3. Sắp xếp từ dễ đến khó
            4. Tạo đáp án chi tiết
            
            Trả về danh sách câu hỏi được chọn dưới dạng JSON.",
            matrix_id,
            analysis.total_questions,
            analysis.topic_distribution,
            analysis.cognitive_distribution,
        );
        
        let exam_content = self.call_llm(&prompt).await?;
        
        // Step 3: Parse and assemble exam (in production, parse JSON properly)
        let questions = self.parse_exam_questions(&exam_content).await?;
        let answer_key = self.generate_answer_key(&questions).await?;
        
        let generation_time = start_time.elapsed().as_millis() as i64;
        
        Ok(GeneratedExam {
            exam_id: format!("exam_{}_{}", matrix_id, Uuid::new_v4()),
            matrix_id: matrix_id.to_string(),
            teacher_id: teacher_id.to_string(),
            questions,
            answer_key,
            metadata: ExamMetadata {
                generated_at: Utc::now(),
                variant: "A".to_string(),
                generation_time_ms: generation_time,
                llm_model: self.llm_model.clone(),
            },
        })
    }
    
    /// Call LLM with prompt
    async fn call_llm(&self, prompt: &str) -> Result<String> {
        let runtime = self.runtime.read().await;
        
        let driver = runtime
            .get_driver(&self.llm_provider)
            .ok_or_else(|| OpenFangError::LlmError(format!("Driver not found for {:?}", self.llm_provider)))?;
        
        let messages = vec![
            Message {
                id: Uuid::new_v4().to_string(),
                session_id: Uuid::new_v4().to_string(),
                role: MessageRole::System,
                content: "Bạn là một trợ lý AI chuyên tạo đề thi tự động. Nhiệm vụ của bạn là phân tích ma trận và chọn câu hỏi phù hợp từ ngân hàng câu hỏi.".to_string(),
                timestamp: Utc::now(),
                metadata: None,
            },
            Message {
                id: Uuid::new_v4().to_string(),
                session_id: Uuid::new_v4().to_string(),
                role: MessageRole::User,
                content: prompt.to_string(),
                timestamp: Utc::now(),
                metadata: None,
            },
        ];
        
        let request = LlmRequest {
            provider: self.llm_provider.clone(),
            model: self.llm_model.clone(),
            messages,
            max_tokens: Some(4096),
            temperature: Some(0.7),
            tools: None,
        };
        
        let response = driver.chat(request).await?;
        
        Ok(response.content)
    }
    
    /// Parse exam questions from LLM response
    async fn parse_exam_questions(&self, content: &str) -> Result<Vec<ExamQuestion>> {
        // In production, parse JSON from LLM response
        // For now, return placeholder
        Ok(vec![
            ExamQuestion {
                question_id: "q1".to_string(),
                position: 1,
                assigned_score: 0.25,
                question_type: "MCQ".to_string(),
            },
            ExamQuestion {
                question_id: "q2".to_string(),
                position: 2,
                assigned_score: 0.25,
                question_type: "MCQ".to_string(),
            },
        ])
    }
    
    /// Generate answer key
    async fn generate_answer_key(&self, questions: &[ExamQuestion]) -> Result<AnswerKey> {
        // In production, generate answers from question data
        let answers = questions.iter().map(|q| ExamAnswer {
            question_id: q.question_id.clone(),
            position: q.position,
            correct_answer: "A".to_string(),  // Placeholder
            explanation: Some("Giải thích chi tiết...".to_string()),
        }).collect();
        
        let total_score = questions.iter().map(|q| q.assigned_score).sum();
        
        Ok(AnswerKey {
            exam_id: Uuid::new_v4().to_string(),
            answers,
            total_score,
        })
    }
}

#[async_trait]
impl ExamAgent for OpenFangExamAgent {
    async fn generate_exam(&self, matrix_id: &str, teacher_id: &str) -> Result<GeneratedExam> {
        self.generate_exam(matrix_id, teacher_id).await
    }
    
    async fn analyze_matrix(&self, matrix_id: &str) -> Result<MatrixAnalysis> {
        self.analyze_matrix(matrix_id).await
    }
}

/// Builder for OpenFangExamAgent
pub struct OpenFangExamAgentBuilder {
    runtime: Arc<RwLock<AgentRuntime>>,
    llm_provider: LlmProvider,
    llm_model: String,
}

impl OpenFangExamAgentBuilder {
    pub fn new(runtime: Arc<RwLock<AgentRuntime>>) -> Self {
        Self {
            runtime,
            llm_provider: LlmProvider::Ollama,  // Default to local Ollama
            llm_model: "llama3.2".to_string(),
        }
    }
    
    pub fn llm_provider(mut self, provider: LlmProvider) -> Self {
        self.llm_provider = provider;
        self
    }
    
    pub fn llm_model(mut self, model: String) -> Self {
        self.llm_model = model;
        self
    }
    
    pub fn build(self) -> OpenFangExamAgent {
        OpenFangExamAgent::new(self.runtime, self.llm_provider, self.llm_model)
    }
}
