use axum::{
    extract::{Path, State, ws::{Message, WebSocket, WebSocketUpgrade}},
    Json, response::IntoResponse,
};
use crate::AppState;
use crate::error::AppError;
use crate::models::{
    RegisterDeviceRequest, RegisterDeviceResponse, TelemetryBatchRequest, 
    SendCommandRequest, DeviceTelemetry, DeviceCommand
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;

pub async fn register_device(
    State(state): State<AppState>,
    Json(req): Json<RegisterDeviceRequest>,
) -> Result<Json<RegisterDeviceResponse>, AppError> {
    let response = state.iot.register_device(req).await?;
    Ok(Json(response))
}

pub async fn push_telemetry(
    State(state): State<AppState>,
    Json(req): Json<TelemetryBatchRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.iot.process_telemetry(req).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn send_command(
    State(state): State<AppState>,
    Json(req): Json<SendCommandRequest>,
) -> Result<Json<DeviceCommand>, AppError> {
    let command = state.iot.send_command(req).await?;
    Ok(Json(command))
}

pub async fn get_telemetry(
    State(state): State<AppState>,
    Path(device_id): Path<String>,
) -> Result<Json<Vec<DeviceTelemetry>>, AppError> {
    let telemetry = state.iot.get_device_telemetry(&device_id, 100).await?;
    Ok(Json(telemetry))
}

pub async fn get_classroom_environment(
    State(state): State<AppState>,
    Path(class_id): Path<String>,
) -> Result<Json<crate::models::ClassroomEnvironment>, AppError> {
    let environment = state.iot.get_classroom_environment(&class_id).await?;
    Ok(Json(environment))
}

// ── WebSocket Handler for real-time telemetry ──
pub async fn iot_ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(device_id): Path<String>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, device_id))
}

async fn handle_socket(mut socket: WebSocket, state: AppState, device_id: String) {
    tracing::debug!("New IoT WebSocket connection for device: {}", device_id);

    while let Some(msg) = socket.next().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(text) => {
                    // Echo back or process message (e.g., direct command from UI)
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        tracing::debug!("Received IoT WS message from {}: {:?}", device_id, val);
                    }
                }
                Message::Close(_) => {
                    tracing::debug!("IoT WebSocket closed for: {}", device_id);
                    break;
                }
                _ => {}
            }
        } else {
            break;
        }
    }
}
