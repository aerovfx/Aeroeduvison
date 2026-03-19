use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{
    IoTDevice, RegisterDeviceRequest, RegisterDeviceResponse, 
    DeviceTelemetry, TelemetryBatchRequest, DeviceCommand, SendCommandRequest
};
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

#[derive(Clone)]
pub struct IoTService {
    pool: DbPool,
    mqtt_client: Option<rumqttc::AsyncClient>,
}

impl IoTService {
    pub fn new(pool: DbPool, mqtt_client: Option<rumqttc::AsyncClient>) -> Self {
        Self { pool, mqtt_client }
    }

    pub async fn register_device(&self, req: RegisterDeviceRequest) -> Result<RegisterDeviceResponse, AppError> {
        let id = Uuid::new_v4();
        let device_token = Uuid::new_v4().to_string(); // Simple token-based auth
        let now = Utc::now();
        
        let mqtt_topic = format!("aero/devices/{}", req.device_id);
        let ws_endpoint = format!("/api/iot/ws/{}", req.device_id);

        sqlx::query(
            r#"
            INSERT INTO iot_devices (
                id, device_id, name, device_type, firmware_version, 
                location, class_id, status, capabilities, device_token, 
                created_at, last_seen
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#
        )
        .bind(id)
        .bind(&req.device_id)
        .bind(&req.name)
        .bind(&req.device_type)
        .bind(&req.firmware_version)
        .bind(&req.location)
        .bind(&req.class_id)
        .bind("online")
        .bind(&req.capabilities)
        .bind(&device_token)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(RegisterDeviceResponse {
            id: id.to_string(),
            device_token,
            mqtt_topic,
            ws_endpoint,
        })
    }

    pub async fn process_telemetry(&self, req: TelemetryBatchRequest) -> Result<(), AppError> {
        // 1. Validate device token (simplified)
        let device = sqlx::query!(
            "SELECT id FROM iot_devices WHERE device_id = $1 AND device_token = $2",
            req.device_id, req.device_token
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid device token".to_string()))?;

        // 2. Insert readings
        let now = Utc::now();
        for reading in req.readings {
            let timestamp = reading.timestamp.unwrap_or(now);
            
            sqlx::query(
                "INSERT INTO device_telemetry (device_id, timestamp, sensor_type, value, unit) 
                 VALUES ($1, $2, $3, $4, $5)"
            )
            .bind(&req.device_id)
            .bind(timestamp)
            .bind(&reading.sensor_type)
            .bind(reading.value)
            .bind(&reading.unit)
            .execute(&self.pool)
            .await?;
        }

        // 3. Update device last_seen
        sqlx::query(
            "UPDATE iot_devices SET last_seen = $1, status = 'online' WHERE device_id = $2"
        )
        .bind(now)
        .bind(&req.device_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn send_command(&self, req: SendCommandRequest) -> Result<DeviceCommand, AppError> {
        let command_id = Uuid::new_v4();
        let now = Utc::now();
        
        let command = DeviceCommand {
            command_id,
            device_id: req.device_id.clone(),
            command_type: req.command_type.clone(),
            payload: req.payload.clone(),
            status: "pending".to_string(),
            created_at: now,
        };

        // 1. Store in DB
        sqlx::query(
            "INSERT INTO device_commands (id, device_id, command_type, payload, status, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(command_id)
        .bind(&req.device_id)
        .bind(&req.command_type)
        .bind(&req.payload)
        .bind("pending")
        .bind(now)
        .execute(&self.pool)
        .await?;

        // 2. Publish to MQTT if client is available
        if let Some(client) = &self.mqtt_client {
            let topic = format!("aero/devices/{}/cmd", req.device_id);
            let payload = serde_json::to_vec(&json!({
                "command_id": command_id,
                "type": req.command_type,
                "payload": req.payload
            })).map_err(|e| AppError::Internal(e.to_string()))?;

            client.publish(topic, rumqttc::QoS::AtLeastOnce, false, payload)
                .await
                .map_err(|e| AppError::MqttError(e.to_string()))?;
            
            // Update status to sent
            sqlx::query("UPDATE device_commands SET status = 'sent' WHERE id = $1")
                .bind(command_id)
                .execute(&self.pool)
                .await?;
        }

        Ok(command)
    }

    pub async fn get_device_telemetry(&self, device_id: &str, limit: i64) -> Result<Vec<DeviceTelemetry>, AppError> {
        let telemetry = sqlx::query_as!(
            DeviceTelemetry,
            "SELECT device_id, timestamp, sensor_type, value, unit, NULL as metadata 
             FROM device_telemetry WHERE device_id = $1 ORDER BY timestamp DESC LIMIT $2",
            device_id, limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(telemetry)
    }

    pub async fn get_classroom_environment(&self, class_id: &str) -> Result<crate::models::ClassroomEnvironment, AppError> {
        // 1. Get classroom name (mocked for now, in a real app would join with classes table)
        let class_name = format!("Lớp {}", class_id);
        
        // 2. Get camera status for this class
        let camera_status = sqlx::query!(
            "SELECT status FROM cameras WHERE class_id = $1 LIMIT 1",
            class_id
        )
        .fetch_optional(&self.pool)
        .await?
        .map(|r| r.status)
        .unwrap_or_else(|| "none".to_string());

        // 3. Get devices and their latest readings
        let devices = sqlx::query!(
            r#"
            SELECT device_id, name, device_type, status 
            FROM iot_devices 
            WHERE class_id = $1
            "#,
            class_id
        )
        .fetch_all(&self.pool)
        .await?;

        let mut device_summaries = Vec::new();
        let mut latest_temp = None;
        let mut latest_hum = None;
        let mut latest_light = None;
        let mut latest_noise = None;
        let mut latest_air = None;
        let mut motion_detected = false;
        let mut occupancy_count = None;

        for d in devices {
            // Get latest reading for this device
            let latest = sqlx::query!(
                "SELECT sensor_type, value, unit FROM device_telemetry 
                 WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 10",
                d.device_id
            )
            .fetch_all(&self.pool)
            .await?;

            let mut last_val = None;
            let mut last_unit = None;

            for r in latest {
                if last_val.is_none() {
                    last_val = Some(r.value);
                    last_unit = Some(r.unit.clone());
                }

                match r.sensor_type.as_str() {
                    "temperature" => {
                        if latest_temp.is_none() { latest_temp = Some(r.value) }
                        if r.value > 30.0 {
                            self.create_alert(&d.device_id, Some(class_id), "high_temp", "warning", 
                                &format!("Nhiệt độ phòng học cao: {}°C", r.value), Some(r.value), Some(30.0)).await.ok();
                        }
                    },
                    "humidity" => if latest_hum.is_none() { latest_hum = Some(r.value) },
                    "light" => if latest_light.is_none() { latest_light = Some(r.value) },
                    "noise" => {
                        if latest_noise.is_none() { latest_noise = Some(r.value) }
                        if r.value > 70.0 {
                            self.create_alert(&d.device_id, Some(class_id), "high_noise", "info", 
                                &format!("Tiếng ồn trong lớp cao: {}dB", r.value), Some(r.value), Some(70.0)).await.ok();
                        }
                    },
                    "air_quality" => if latest_air.is_none() { latest_air = Some(r.value) },
                    "motion" => if r.value > 0.0 { motion_detected = true },
                    "person_count" => if occupancy_count.is_none() { occupancy_count = Some(r.value as i32) },
                    _ => {}
                }
            }

            device_summaries.push(crate::models::IoTDeviceSummary {
                device_id: d.device_id,
                name: d.name,
                device_type: d.device_type,
                status: d.status,
                latest_reading: last_val,
                latest_unit: last_unit,
            });
        }

        // Simulating AI Person counting from Camera if no sensor present
        if occupancy_count.is_none() && camera_status == "online" {
             // Mock AI vision: 25-35 students
             let mut rng = rand::thread_rng();
             occupancy_count = Some(rand::Rng::gen_range(&mut rng, 25..36));
        }

        Ok(crate::models::ClassroomEnvironment {
            class_id: class_id.to_string(),
            class_name,
            temperature: latest_temp,
            humidity: latest_hum,
            light_level: latest_light,
            noise_level: latest_noise,
            air_quality: latest_air,
            motion_detected,
            occupancy_count,
            camera_status,
            devices: device_summaries,
            last_updated: Utc::now(),
        })
    }

    async fn create_alert(&self, device_id: &str, class_id: Option<&str>, alert_type: &str, severity: &str, message: &str, value: Option<f64>, threshold: Option<f64>) -> Result<(), AppError> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            "INSERT INTO iot_alerts (id, device_id, class_id, alert_type, severity, message, value, threshold, acknowledged, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
        )
        .bind(id)
        .bind(device_id)
        .bind(class_id)
        .bind(alert_type)
        .bind(severity)
        .bind(message)
        .bind(value)
        .bind(threshold)
        .bind(false)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
