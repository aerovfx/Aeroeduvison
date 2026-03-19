mod error;
mod handlers;
mod models;
mod db;
mod services;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::db::DbPool;
use crate::services::{CameraService, IoTService};

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub camera: CameraService,
    pub iot: IoTService,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "camera_iot_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get configuration
    let addr = std::env::var("CAMERA_IOT_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:8099".to_string());
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    // MQTT configuration (Optional but recommended for IoT)
    // let mqtt_host = std::env::var("MQTT_HOST").unwrap_or_else(|_| "localhost".to_string());
    // let mqtt_port = 1883;

    // Initialize database pool
    let pool = db::init_pool(&database_url).await;

    // Initialize services
    let camera_service = CameraService::new(pool.clone());
    let iot_service = IoTService::new(pool.clone(), None); // Placeholder for MQTT client

    // Create app state
    let state = AppState {
        db: pool,
        camera: camera_service,
        iot: iot_service,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = create_router(state).layer(cors).layer(TraceLayer::new_for_http());

    // Start server
    let addr: SocketAddr = addr.parse().expect("Invalid address");
    tracing::info!("🎥 Camera & IoT service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health))
        
        // Cameras API
        .route("/api/cameras", get(handlers::camera::list_cameras))
        .route("/api/cameras", post(handlers::camera::create_camera))
        .route("/api/camera/teacher", get(handlers::camera::get_teacher_cameras)) // For Teacher Dashboard
        .route("/api/cameras/teacher", get(handlers::camera::get_teacher_cameras))
        .route("/api/cameras/:id", get(handlers::camera::get_camera))
        .route("/api/cameras/:id", put(handlers::camera::update_camera))
        .route("/api/cameras/:id", delete(handlers::camera::delete_camera))
        .route("/api/cameras/assign", post(handlers::camera::assign_camera))

        // IoT API
        .route("/api/iot/devices", post(handlers::iot::register_device))
        .route("/api/iot/telemetry", post(handlers::iot::push_telemetry))
        .route("/api/iot/telemetry/:device_id", get(handlers::iot::get_telemetry))
        .route("/api/iot/commands", post(handlers::iot::send_command))
        
        // Real-time IoT via WebSockets
        .route("/api/iot/ws/:device_id", get(handlers::iot::iot_ws_handler))
        
        // Dashboard Aggregation
        .route("/api/iot/classroom/:class_id", get(handlers::iot::get_classroom_environment))
        
        .with_state(state)
}
