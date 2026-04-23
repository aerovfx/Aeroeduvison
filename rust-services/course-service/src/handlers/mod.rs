mod categories;
mod courses;
mod chapters;
mod progress;
mod dashboard;
mod health;
mod certificates;

pub use categories::{list_categories, get_category, create_category, update_category, delete_category};
pub use courses::{create_course, list_courses, list_instructor_courses, get_course, update_course, delete_course, publish_course, unpublish_course};
pub use chapters::{create_chapter, list_chapters, get_chapter, update_chapter, delete_chapter, reorder_chapters, publish_chapter, unpublish_chapter};
pub use progress::{get_progress, update_progress};
pub use dashboard::{get_dashboard, get_course_progress};
pub use health::health;
pub use certificates::get_or_issue_certificate;

use axum::http::{header::AUTHORIZATION, HeaderMap};

use crate::error::{CourseError, Result};
use crate::AppState;

pub(crate) fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(CourseError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(CourseError::Unauthorized)?;

    let claims = state.course.validate_token(token)?;
    Ok(claims.sub)
}
