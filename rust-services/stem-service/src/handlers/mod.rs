mod physics;
mod chemistry;
mod projects;
mod completion;
mod health;

pub use physics::{physics_motion, physics_projectile, physics_harmonic};
pub use chemistry::{chemistry_balance, chemistry_enthalpy, chemistry_molecule_3d};
pub use projects::{list_projects, create_project, get_project, update_project, delete_project};
pub use completion::{list_completions, record_completion};
pub use health::health;

use axum::http::{header::AUTHORIZATION, HeaderMap};

use crate::error::{Result, StemError};
use crate::AppState;

pub(crate) fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(StemError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StemError::Unauthorized)?;

    let claims = state.stem.validate_token(token)?;
    Ok(claims.sub)
}
