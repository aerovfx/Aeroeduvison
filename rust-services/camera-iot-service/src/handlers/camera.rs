use axum::{
    extract::{Path, State, Query},
    Json,
};
use crate::AppState;
use crate::error::AppError;
use crate::models::{Camera, CreateCameraRequest, UpdateCameraRequest, AssignCameraRequest, TeacherCamerasResponse};
use uuid::Uuid;

pub async fn list_cameras(
    State(state): State<AppState>,
) -> Result<Json<Vec<Camera>>, AppError> {
    let cameras = state.camera.list_cameras().await?;
    Ok(Json(cameras))
}

#[derive(Debug, serde::Deserialize)]
pub struct TeacherCamerasQuery {
    pub class_ids: Option<String>, // comma separated
}

pub async fn get_teacher_cameras(
    State(state): State<AppState>,
    Query(query): Query<TeacherCamerasQuery>,
) -> Result<Json<TeacherCamerasResponse>, AppError> {
    let class_ids = query.class_ids
        .map(|s| s.split(',').map(|id| id.trim().to_string()).collect::<Vec<String>>())
        .unwrap_or_default();
    
    let cameras = state.camera.list_cameras_for_classes(class_ids).await?;
    let total = cameras.len();
    
    Ok(Json(TeacherCamerasResponse {
        total,
        cameras,
    }))
}

pub async fn get_camera(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Camera>, AppError> {
    let camera = state.camera.get_camera(id).await?;
    Ok(Json(camera))
}

pub async fn create_camera(
    State(state): State<AppState>,
    Json(req): Json<CreateCameraRequest>,
) -> Result<Json<Camera>, AppError> {
    let camera = state.camera.create_camera(req).await?;
    Ok(Json(camera))
}

pub async fn update_camera(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCameraRequest>,
) -> Result<Json<Camera>, AppError> {
    let camera = state.camera.update_camera(id, req).await?;
    Ok(Json(camera))
}

pub async fn delete_camera(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.camera.delete_camera(id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn assign_camera(
    State(state): State<AppState>,
    Json(req): Json<AssignCameraRequest>,
) -> Result<Json<Camera>, AppError> {
    let camera_id = Uuid::parse_str(&req.camera_id)
        .map_err(|_| AppError::BadRequest("Invalid camera UUID".to_string()))?;
    
    let camera = state.camera.assign_camera(camera_id, req.class_id).await?;
    Ok(Json(camera))
}
