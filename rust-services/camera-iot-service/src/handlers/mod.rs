pub mod camera;
pub mod iot;

use axum::Json;
use serde_json::{json, Value};

pub async fn health() -> Json<Value> {
    json!( {
        "status": "ok",
        "service": "camera-iot-service",
        "version": "0.1.0"
    }).into()
}
