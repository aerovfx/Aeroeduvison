use axum::{extract::State, Json};

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

/// POST /api/grading/essay — Grade an essay using AI.
pub async fn grade_essay(
    State(state): State<AppState>,
    Json(req): Json<EssayGradeRequest>,
) -> Result<Json<EssayGradeResponse>, AppError> {
    if req.essay_content.trim().is_empty() {
        return Err(AppError::BadRequest("essayContent is required".to_string()));
    }

    let max_score = req.max_score.unwrap_or(2.0);

    match state.llm.grade_essay(
        &req.essay_content,
        req.rubric_description.as_deref(),
        max_score,
    ).await {
        Ok((result, model_name)) => {
            Ok(Json(EssayGradeResponse {
                success: true,
                result: EssayGradeResult {
                    score: result.score,
                    feedback: result.feedback,
                    strengths: result.strengths,
                    weaknesses: result.weaknesses,
                },
                model: model_name,
                fallback: None,
            }))
        }
        Err(e) => {
            tracing::warn!("Essay grading failed, returning fallback: {}", e);
            Ok(Json(EssayGradeResponse {
                success: true,
                result: EssayGradeResult {
                    score: (max_score * 0.75).min(max_score),
                    feedback: "Hệ thống AI tạm thời không khả dụng. Điểm tạm tính.".to_string(),
                    strengths: vec!["Bài viết đã được nộp thành công".to_string()],
                    weaknesses: vec!["Cần giáo viên chấm lại".to_string()],
                },
                model: "fallback".to_string(),
                fallback: Some(true),
            }))
        }
    }
}
