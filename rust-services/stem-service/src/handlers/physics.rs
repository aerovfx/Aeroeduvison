use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::Result;
use crate::models::{PhysicsMotionRequest, PhysicsProjectileRequest, PhysicsHarmonicRequest, PhysicsResponse, SimulationResult, CalculationStep};

/// POST /api/physics/motion
pub async fn physics_motion(
    State(state): State<AppState>,
    Json(body): Json<PhysicsMotionRequest>,
) -> Result<Json<PhysicsResponse>> {
    // Calculate motion: v = u + at, s = ut + 0.5*a*t^2
    let final_velocity = body.initial_velocity + body.acceleration * body.time;
    let displacement = body.initial_velocity * body.time + 0.5 * body.acceleration * body.time * body.time;

    Ok(Json(PhysicsResponse {
        success: true,
        result: SimulationResult {
            final_position: displacement,
            final_velocity,
            time_elapsed: body.time,
            max_height: None,
            range: None,
        },
        calculations: vec![
            CalculationStep {
                step: "Final Velocity".to_string(),
                formula: "v = u + at".to_string(),
                result: format!("v = {} + {} × {} = {} m/s", body.initial_velocity, body.acceleration, body.time, final_velocity),
            },
            CalculationStep {
                step: "Displacement".to_string(),
                formula: "s = ut + ½at²".to_string(),
                result: format!("s = {} × {} + 0.5 × {} × {}² = {} m", body.initial_velocity, body.time, body.acceleration, body.time, displacement),
            },
        ],
    }))
}

/// POST /api/physics/projectile
pub async fn physics_projectile(
    State(state): State<AppState>,
    Json(body): Json<PhysicsProjectileRequest>,
) -> Result<Json<PhysicsResponse>> {
    let g = 9.81; // gravity m/s²
    let angle_rad = body.angle.to_radians();
    
    let vx = body.initial_velocity * angle_rad.cos();
    let vy = body.initial_velocity * angle_rad.sin();
    
    // Time of flight
    let time_of_flight = 2.0 * vy / g;
    
    // Maximum height
    let max_height = (vy * vy) / (2.0 * g);
    
    // Range
    let range = vx * time_of_flight;

    Ok(Json(PhysicsResponse {
        success: true,
        result: SimulationResult {
            final_position: range,
            final_velocity: body.initial_velocity,
            time_elapsed: time_of_flight,
            max_height: Some(max_height),
            range: Some(range),
        },
        calculations: vec![
            CalculationStep {
                step: "Initial Velocity Components".to_string(),
                formula: "vx = v·cos(θ), vy = v·sin(θ)".to_string(),
                result: format!("vx = {} m/s, vy = {} m/s", vx, vy),
            },
            CalculationStep {
                step: "Time of Flight".to_string(),
                formula: "t = 2vy/g".to_string(),
                result: format!("t = {} s", time_of_flight),
            },
            CalculationStep {
                step: "Maximum Height".to_string(),
                formula: "h = vy²/(2g)".to_string(),
                result: format!("h = {} m", max_height),
            },
            CalculationStep {
                step: "Range".to_string(),
                formula: "R = vx·t".to_string(),
                result: format!("R = {} m", range),
            },
        ],
    }))
}

/// POST /api/physics/harmonic
pub async fn physics_harmonic(
    State(state): State<AppState>,
    Json(body): Json<PhysicsHarmonicRequest>,
) -> Result<Json<PhysicsResponse>> {
    use std::f64::consts::PI;
    
    let angular_freq = 2.0 * PI * body.frequency;
    let position = body.amplitude * (angular_freq * body.time).cos();
    let velocity = -body.amplitude * angular_freq * (angular_freq * body.time).sin();

    Ok(Json(PhysicsResponse {
        success: true,
        result: SimulationResult {
            final_position: position,
            final_velocity: velocity,
            time_elapsed: body.time,
            max_height: Some(body.amplitude),
            range: None,
        },
        calculations: vec![
            CalculationStep {
                step: "Angular Frequency".to_string(),
                formula: "ω = 2πf".to_string(),
                result: format!("ω = {} rad/s", angular_freq),
            },
            CalculationStep {
                step: "Position".to_string(),
                formula: "x = A·cos(ωt)".to_string(),
                result: format!("x = {} m", position),
            },
            CalculationStep {
                step: "Velocity".to_string(),
                formula: "v = -Aω·sin(ωt)".to_string(),
                result: format!("v = {} m/s", velocity),
            },
        ],
    }))
}
