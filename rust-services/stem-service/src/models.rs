use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StemProject {
    pub id: String,
    pub title: String,
    pub description: String,
    pub subject: String,
    pub grade_level: String,
    pub status: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LabCompletion {
    pub id: String,
    pub user_id: String,
    pub lab_id: String,
    pub lab_type: String,
    pub score: Option<f64>,
    pub completed_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhysicsMotionRequest {
    pub initial_velocity: f64,
    pub acceleration: f64,
    pub time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhysicsProjectileRequest {
    pub initial_velocity: f64,
    pub angle: f64,
    pub initial_height: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhysicsHarmonicRequest {
    pub amplitude: f64,
    pub frequency: f64,
    pub time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChemistryBalanceRequest {
    pub reactants: Vec<String>,
    pub products: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChemistryEnthalpyRequest {
    pub reaction_type: String,
    pub reactants: Vec<ChemicalCompound>,
    pub products: Vec<ChemicalCompound>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChemicalCompound {
    pub formula: String,
    pub moles: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Molecule3DRequest {
    pub formula: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectBody {
    pub title: String,
    pub description: String,
    pub subject: String,
    pub grade_level: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhysicsResponse {
    pub success: bool,
    pub result: SimulationResult,
    pub calculations: Vec<CalculationStep>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationResult {
    pub final_position: f64,
    pub final_velocity: f64,
    pub time_elapsed: f64,
    pub max_height: Option<f64>,
    pub range: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalculationStep {
    pub step: String,
    pub formula: String,
    pub result: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChemistryResponse {
    pub success: bool,
    pub balanced_equation: String,
    pub coefficients: Vec<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnthalpyResponse {
    pub success: bool,
    pub delta_h: f64,
    pub is_exothermic: bool,
    pub explanation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Molecule3DResponse {
    pub success: bool,
    pub atoms: Vec<AtomPosition>,
    pub bonds: Vec<Bond>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AtomPosition {
    pub element: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Bond {
    pub atom1: usize,
    pub atom2: usize,
    pub bond_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectsListResponse {
    pub projects: Vec<ProjectInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub title: String,
    pub subject: String,
    pub grade_level: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionsListResponse {
    pub completions: Vec<CompletionInfo>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionInfo {
    pub id: String,
    pub user_id: String,
    pub lab_id: String,
    pub lab_type: String,
    pub score: Option<f64>,
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub database_connected: bool,
}
