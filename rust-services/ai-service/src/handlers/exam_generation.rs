//! Exam Generation API Endpoints
//! 
//! POST /api/ai/exam/generate-from-matrix
//! POST /api/ai/exam/generate-multiple-variants
//! GET /api/ai/exam/preview/:exam_id
//! POST /api/ai/exam/swap-question

use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use openfang_kernel::{OpenFangExamAgent, GeneratedExam, MatrixAnalysis, ExamAgent};
use openfang_types::{LlmProvider, OpenFangError};
use crate::AppState;
use crate::error::{AiError, Result};

/// Request to generate single exam
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateExamRequest {
    pub matrix_id: String,
    pub teacher_id: String,
    #[serde(default)]
    pub options: ExamGenerationOptions,
}

/// Request to generate multiple exam variants
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateVariantsRequest {
    pub matrix_id: String,
    pub teacher_id: String,
    pub variant_count: i32,
    #[serde(default)]
    pub options: ExamGenerationOptions,
}

/// Exam generation options
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct ExamGenerationOptions {
    #[serde(default = "default_variant")]
    pub exam_variant: String,
    #[serde(default)]
    pub shuffle_questions: bool,
    #[serde(default)]
    pub ensure_no_overlap: bool,
    pub llm_provider: Option<String>,
    pub llm_model: Option<String>,
}

fn default_variant() -> String {
    "A".to_string()
}

/// Response for exam generation
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateExamResponse {
    pub success: bool,
    pub exam_id: String,
    #[serde(skip_serializing)]
    pub exam: GeneratedExam,
    pub message: String,
    pub generation_time_ms: i64,
}

/// Response for multiple variants
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateVariantsResponse {
    pub success: bool,
    pub variants: Vec<GeneratedExam>,
    pub overlap_analysis: Option<OverlapAnalysis>,
    pub message: String,
}

/// Overlap analysis between variants
#[derive(Debug, Serialize, Deserialize)]
pub struct OverlapAnalysis {
    pub variant_pairs: Vec<VariantPair>,
    pub max_overlap_percent: f64,
    pub avg_overlap_percent: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VariantPair {
    pub variant_1: i32,
    pub variant_2: i32,
    pub overlap_count: usize,
    pub overlap_percent: f64,
}

/// Exam preview response
#[derive(Debug, Serialize, Deserialize)]
pub struct ExamPreviewResponse {
    pub success: bool,
    pub exam: GeneratedExam,
    pub statistics: ExamStatistics,
}

/// Exam statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct ExamStatistics {
    pub total_questions: i32,
    pub easy_count: i32,
    pub medium_count: i32,
    pub hard_count: i32,
    pub estimated_duration_minutes: i32,
}

// Mock database functions (replace with actual DB calls in production)
impl AppState {
    async fn get_exam(&self, _exam_id: &str) -> Option<GeneratedExam> {
        // TODO: Implement actual database query
        None
    }
    
    async fn find_alternative_questions(
        &self,
        _question_id: &str,
        _constraints: &QuestionConstraints,
        _limit: i32,
    ) -> Vec<AlternativeQuestion> {
        // TODO: Implement actual database query
        vec![]
    }
}

/// Request to swap a question
#[derive(Debug, Serialize, Deserialize)]
pub struct SwapQuestionRequest {
    pub exam_id: String,
    pub question_id: String,
    pub constraints: QuestionConstraints,
}

/// Question constraints for swap
#[derive(Debug, Serialize, Deserialize)]
pub struct QuestionConstraints {
    pub topic_id: Option<String>,
    pub cognitive_level: Option<String>,
    pub difficulty_min: Option<f64>,
    pub difficulty_max: Option<f64>,
    pub question_type: Option<String>,
}

/// Response for question swap
#[derive(Debug, Serialize, Deserialize)]
pub struct SwapQuestionResponse {
    pub success: bool,
    pub alternatives: Vec<AlternativeQuestion>,
    pub message: String,
}

/// Alternative question for swap
#[derive(Debug, Serialize, Deserialize)]
pub struct AlternativeQuestion {
    pub question_id: String,
    pub topic_name: String,
    pub cognitive_level: String,
    pub difficulty: f64,
    pub similarity_score: f64,
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/// POST /api/ai/exam/generate-from-matrix
/// 
/// Generate a single exam from a matrix
pub async fn generate_exam_from_matrix(
    State(state): State<AppState>,
    Json(body): Json<GenerateExamRequest>,
) -> Result<Json<GenerateExamResponse>> {
    let start_time = std::time::Instant::now();
    
    // Get OpenFang agent from state
    let agent = state.openfang_agent.read().await;
    
    // Generate exam
    let generated = agent.generate_exam(&body.matrix_id, &body.teacher_id)
        .await
        .map_err(|e| AiError::OpenFangError(e.to_string()))?;
    
    let generation_time = start_time.elapsed().as_millis() as i64;
    
    Ok(Json(GenerateExamResponse {
        success: true,
        exam_id: generated.exam_id.clone(),
        exam: generated,
        message: "Exam generated successfully".to_string(),
        generation_time_ms: generation_time,
    }))
}

/// POST /api/ai/exam/generate-multiple-variants
/// 
/// Generate multiple exam variants from a single matrix
pub async fn generate_exam_variants(
    State(state): State<AppState>,
    Json(body): Json<GenerateVariantsRequest>,
) -> Result<Json<GenerateVariantsResponse>> {
    // Validate variant count
    if body.variant_count < 1 || body.variant_count > 10 {
        return Err(AiError::ValidationError(
            "Variant count must be between 1 and 10".to_string()
        ));
    }
    
    let agent = state.openfang_agent.read().await;
    let mut variants = Vec::new();
    
    // Generate each variant
    for i in 0..body.variant_count {
        let _variant_options = body.options.clone();
        
        let generated = agent.generate_exam(&body.matrix_id, &body.teacher_id)
            .await
            .map_err(|e| AiError::OpenFangError(e.to_string()))?;
        
        variants.push(generated);
    }
    
    // Analyze overlap if requested
    let overlap_analysis = if body.options.ensure_no_overlap && !variants.is_empty() {
        Some(analyze_variant_overlap(&variants))
    } else {
        None
    };
    
    let variant_count = variants.len();
    
    Ok(Json(GenerateVariantsResponse {
        success: true,
        variants,
        overlap_analysis,
        message: format!("Generated {} exam variants", variant_count),
    }))
}

/// GET /api/ai/exam/preview/:exam_id
/// 
/// Get exam preview with statistics
pub async fn preview_exam(
    State(state): State<AppState>,
    Path(exam_id): Path<String>,
) -> Result<Json<ExamPreviewResponse>> {
    // Fetch exam from database
    let exam = state.get_exam(&exam_id)
        .await
        .ok_or_else(|| AiError::NotFound(format!("Exam {} not found", exam_id)))?;
    
    // Calculate statistics
    let statistics = calculate_exam_statistics(&exam);
    
    Ok(Json(ExamPreviewResponse {
        success: true,
        exam,
        statistics,
    }))
}

/// POST /api/ai/exam/swap-question
/// 
/// Find alternative questions for swapping
pub async fn swap_question(
    State(state): State<AppState>,
    Json(body): Json<SwapQuestionRequest>,
) -> Result<Json<SwapQuestionResponse>> {
    // Find alternative questions
    let alternatives = state.find_alternative_questions(
        &body.question_id,
        &body.constraints,
        5,  // Return top 5 alternatives
    )
    .await;
    
    if alternatives.is_empty() {
        return Err(AiError::NotFound(
            "No alternative questions found".to_string()
        ));
    }
    
    let alt_count = alternatives.len();
    
    Ok(Json(SwapQuestionResponse {
        success: true,
        alternatives,
        message: format!("Found {} alternative questions", alt_count),
    }))
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Analyze overlap between exam variants
fn analyze_variant_overlap(variants: &[GeneratedExam]) -> OverlapAnalysis {
    let mut pairs = Vec::new();
    
    for i in 0..variants.len() {
        for j in (i + 1)..variants.len() {
            let exam1 = &variants[i];
            let exam2 = &variants[j];
            
            let overlap = calculate_question_overlap(exam1, exam2);
            
            pairs.push(VariantPair {
                variant_1: (i + 1) as i32,
                variant_2: (j + 1) as i32,
                overlap_count: overlap.0,
                overlap_percent: overlap.1,
            });
        }
    }
    
    let max_overlap = pairs.iter()
        .map(|p| p.overlap_percent)
        .fold(0.0, f64::max);
    
    let avg_overlap = if pairs.is_empty() {
        0.0
    } else {
        pairs.iter()
            .map(|p| p.overlap_percent)
            .sum::<f64>() / pairs.len() as f64
    };
    
    OverlapAnalysis {
        variant_pairs: pairs,
        max_overlap_percent: max_overlap,
        avg_overlap_percent: avg_overlap,
    }
}

/// Calculate question overlap between two exams
fn calculate_question_overlap(exam1: &GeneratedExam, exam2: &GeneratedExam) -> (usize, f64) {
    let questions1: std::collections::HashSet<_> = exam1.questions.iter()
        .map(|q| q.question_id.clone())
        .collect();
    
    let questions2: std::collections::HashSet<_> = exam2.questions.iter()
        .map(|q| q.question_id.clone())
        .collect();
    
    let overlap: std::collections::HashSet<_> = questions1.intersection(&questions2)
        .cloned()
        .collect();
    
    let count = overlap.len();
    let percent = if questions1.is_empty() {
        0.0
    } else {
        (count as f64 / questions1.len() as f64) * 100.0
    };
    
    (count, percent)
}

/// Calculate exam statistics
fn calculate_exam_statistics(exam: &GeneratedExam) -> ExamStatistics {
    let total_questions = exam.questions.len() as i32;
    
    // Simple difficulty estimation based on position
    // In production, this would come from question metadata
    let easy_count = (total_questions as f64 * 0.2) as i32;
    let medium_count = (total_questions as f64 * 0.5) as i32;
    let hard_count = total_questions - easy_count - medium_count;
    
    ExamStatistics {
        total_questions,
        easy_count,
        medium_count,
        hard_count,
        estimated_duration_minutes: total_questions * 2, // 2 minutes per question
    }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/// Add exam generation routes to router
pub fn add_exam_routes(router: axum::Router<AppState>) -> axum::Router<AppState> {
    use axum::routing::{get, post};
    
    router
        .route("/api/ai/exam/generate-from-matrix", post(generate_exam_from_matrix))
        .route("/api/ai/exam/generate-multiple-variants", post(generate_exam_variants))
        .route("/api/ai/exam/preview/:exam_id", get(preview_exam))
        .route("/api/ai/exam/swap-question", post(swap_question))
}
