use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ══════════════════════════════════════════════
//  Camera Models
// ══════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Camera {
    pub id: Uuid,
    pub name: String,
    pub rtsp_url: String,
    pub brand: String,
    pub location: String,
    pub location_type: String, // classroom, hallway, entrance, lab, library, etc.
    pub assigned_to: Option<String>,
    pub class_id: Option<String>,
    pub room_number: Option<String>,
    pub status: String, // online, offline, error, testing
    pub hls_url: Option<String>,
    pub stream_id: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_checked: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCameraRequest {
    pub name: String,
    pub rtsp_url: String,
    pub brand: String,
    pub location: String,
    pub location_type: String,
    pub room_number: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCameraRequest {
    pub name: Option<String>,
    pub rtsp_url: Option<String>,
    pub brand: Option<String>,
    pub location: Option<String>,
    pub location_type: Option<String>,
    pub room_number: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssignCameraRequest {
    pub camera_id: String,
    pub class_id: String,
}

#[derive(Debug, Serialize)]
pub struct CameraStreamResponse {
    pub camera_id: String,
    pub stream_id: String,
    pub hls_url: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct CameraTestResult {
    pub camera_id: String,
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub resolution: Option<String>,
    pub codec: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TeacherCamerasResponse {
    pub cameras: Vec<Camera>,
    pub total: usize,
}

// ══════════════════════════════════════════════
//  IoT Device Models
// ══════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoTDevice {
    pub id: Uuid,
    pub device_id: String,        // Unique hardware identifier
    pub name: String,
    pub device_type: String,      // arduino, raspberry_pi, esp32, esp8266, custom
    pub firmware_version: Option<String>,
    pub location: String,
    pub class_id: Option<String>,
    pub status: String,           // online, offline, error
    pub last_seen: Option<DateTime<Utc>>,
    pub capabilities: Vec<String>, // temperature, humidity, motion, light, sound, air_quality, etc.
    pub config: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterDeviceRequest {
    pub device_id: String,
    pub name: String,
    pub device_type: String,
    pub firmware_version: Option<String>,
    pub location: String,
    pub class_id: Option<String>,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RegisterDeviceResponse {
    pub id: String,
    pub device_token: String,  // Token for device authentication
    pub mqtt_topic: String,    // MQTT topic for this device
    pub ws_endpoint: String,   // WebSocket endpoint for real-time
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceTelemetry {
    pub device_id: String,
    pub timestamp: DateTime<Utc>,
    pub sensor_type: String,      // temperature, humidity, motion, etc.
    pub value: f64,
    pub unit: String,             // °C, %, lux, dB, ppm, etc.
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct TelemetryBatchRequest {
    pub device_id: String,
    pub device_token: String,
    pub readings: Vec<SensorReading>,
}

#[derive(Debug, Deserialize)]
pub struct SensorReading {
    pub sensor_type: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCommand {
    pub command_id: Uuid,
    pub device_id: String,
    pub command_type: String,     // set_led, buzzer, relay, display, reboot
    pub payload: serde_json::Value,
    pub status: String,           // pending, sent, acknowledged, failed
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SendCommandRequest {
    pub device_id: String,
    pub command_type: String,
    pub payload: serde_json::Value,
}

// ══════════════════════════════════════════════
//  Classroom Environment Models
// ══════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassroomEnvironment {
    pub class_id: String,
    pub class_name: String,
    pub temperature: Option<f64>,
    pub humidity: Option<f64>,
    pub light_level: Option<f64>,
    pub noise_level: Option<f64>,
    pub air_quality: Option<f64>,   // AQI or ppm CO2
    pub motion_detected: bool,
    pub occupancy_count: Option<i32>,
    pub camera_status: String,
    pub devices: Vec<IoTDeviceSummary>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoTDeviceSummary {
    pub device_id: String,
    pub name: String,
    pub device_type: String,
    pub status: String,
    pub latest_reading: Option<f64>,
    pub latest_unit: Option<String>,
}

// ══════════════════════════════════════════════
//  Alert Models
// ══════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoTAlert {
    pub id: Uuid,
    pub device_id: String,
    pub class_id: Option<String>,
    pub alert_type: String,  // high_temp, low_light, high_noise, air_quality, motion, camera_offline
    pub severity: String,    // info, warning, critical
    pub message: String,
    pub value: Option<f64>,
    pub threshold: Option<f64>,
    pub acknowledged: bool,
    pub created_at: DateTime<Utc>,
}

// ══════════════════════════════════════════════
//  Common Response Types
// ══════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: DateTime<Utc>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: Utc::now(),
        }
    }

    pub fn err(msg: impl Into<String>) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            error: Some(msg.into()),
            timestamp: Utc::now(),
        }
    }
}
