mod documents;
mod exams;
mod questions;
mod upload;
mod health;

pub use documents::{list_documents, create_document, get_document, update_document, delete_document, process_document, upload_document, list_questions};
pub use exams::{list_exam_matrices, create_exam_matrix, get_exam_matrix, process_exam_matrix, generate_exam};
pub use questions::{batch_import_questions, import_questions_excel, list_questions_v2, create_question, update_question, delete_question};
pub use upload::{
    get_presigned_url, get_gcs_presigned_url,
    request_upload_session, upload_image, delete_upload, upload_status,
};
pub use health::health;

use axum::http::{header::AUTHORIZATION, HeaderMap};

use crate::error::{MediaError, Result};
use crate::AppState;

pub(crate) fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(MediaError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(MediaError::Unauthorized)?;

    let claims = state.media.validate_token(token)?;
    Ok(claims.sub)
}
