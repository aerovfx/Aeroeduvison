mod chat;
mod content;
mod lesson;
mod document;
mod analytics;
mod health;
mod exam_generation;

pub use chat::{ai_chat, tutor_chat};
pub use content::{generate_content, generate_content_stream, save_content, get_content, delete_content};
pub use lesson::{generate_lesson, grade_lesson};
pub use document::analyze_document;
pub use analytics::ai_analytics;
pub use health::health;
pub use exam_generation::{
    generate_exam_from_matrix,
    generate_exam_variants,
    preview_exam,
    swap_question,
};

use axum::http::{header::AUTHORIZATION, HeaderMap};

use crate::error::{AiError, Result};
use crate::AppState;

pub(crate) fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(AiError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AiError::Unauthorized)?;

    let claims = state.ai.validate_token(token)?;
    Ok(claims.sub)
}
