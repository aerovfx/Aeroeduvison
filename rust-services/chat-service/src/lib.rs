pub mod error;
pub mod handlers;
pub mod models;
pub mod ws;

use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::request::Parts,
    routing::{get, post},
    Router,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use sqlx::PgPool;
use tower_http::cors::CorsLayer;

pub use models::JwtClaims;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub channels: ws::RoomChannels,
}

/// JWT extractor for Axum handlers — reads the Authorization header.
#[async_trait]
impl FromRequestParts<AppState> for JwtClaims {
    type Rejection = error::ChatError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(error::ChatError::Unauthorized)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(error::ChatError::Unauthorized)?;

        let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
        decode::<JwtClaims>(token, &key, &Validation::default())
            .map(|data| data.claims)
            .map_err(|e| error::ChatError::JwtError(e.to_string()))
    }
}

/// Build the Axum router (without WebSocket handler, which lives in main.rs).
pub fn create_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route(
            "/api/chat/rooms",
            get(handlers::list_rooms).post(handlers::create_room),
        )
        .route(
            "/api/chat/rooms/:room_id/messages",
            get(handlers::get_messages).post(handlers::send_message),
        )
        .route(
            "/api/chat/rooms/:room_id/members",
            get(handlers::get_room_members),
        )
        .layer(CorsLayer::permissive())
        .with_state(state)
}
