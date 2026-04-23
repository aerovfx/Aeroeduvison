mod students;
mod classes;
mod learning_paths;
mod plg;
mod health;
mod users;
mod agent_settings;

pub use students::{list_students, get_student, update_student, delete_student};
pub use classes::{list_classes, get_class, create_class, update_class, delete_class, list_class_students, add_student_to_class};
pub use learning_paths::{list_learning_paths, create_learning_path};
pub use plg::{get_plg_data, update_skill, record_interaction, get_recommendations, update_xp};
pub use health::health;
pub use users::list_users;
pub use agent_settings::{get_agent_settings, save_agent_settings, get_student_exams};

use axum::http::{header::AUTHORIZATION, HeaderMap};

use crate::error::{Result, StudentError};
use crate::AppState;

pub(crate) fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(StudentError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StudentError::Unauthorized)?;

    let claims = state.student.validate_token(token)?;
    Ok(claims.sub)
}
