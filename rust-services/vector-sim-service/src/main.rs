use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Mutex;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tracing::info;

static EMBEDDING_CACHE: Lazy<Mutex<HashMap<String, Vec<f64>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Clone)]
struct AppState {
    service_version: &'static str,
}

#[derive(Debug, Deserialize)]
struct VectorSimilarityRequest {
    student_answer: String,
    model_answer: String,
    #[serde(default = "default_true")]
    use_cache: bool,
}

#[derive(Debug, Serialize)]
struct VectorSimilarityResponse {
    similarity: f64,
    similarity_percent: i32,
    student_vector_size: usize,
    model_vector_size: usize,
    cache_used: bool,
    cache_size: usize,
    processing_time_ms: u128,
    backend: &'static str,
    strangler_target: &'static str,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

#[derive(Debug, Serialize)]
struct CacheClearResponse {
    message: &'static str,
    cache_size: usize,
}

fn default_true() -> bool {
    true
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "vector_sim_service=info,tower_http=info".to_string()),
        )
        .init();

    let state = AppState {
        service_version: "0.1.0",
    };

    let app = Router::new()
        .route("/health", get(health))
        .route(
            "/v1/vector-similarity",
            post(vector_similarity).delete(clear_vector_cache),
        )
        .route("/v1/vector-similarity/cache", delete(clear_vector_cache))
        .with_state(state);

    let addr = std::env::var("VECTOR_SIM_SERVICE_ADDR")
        .ok()
        .and_then(|v| v.parse::<SocketAddr>().ok())
        .unwrap_or_else(|| "127.0.0.1:8091".parse().expect("valid default addr"));

    info!("vector-sim-service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener");

    axum::serve(listener, app).await.expect("server error");
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "vector-sim-service",
        version: state.service_version,
    })
}

async fn vector_similarity(
    State(_state): State<AppState>,
    Json(payload): Json<VectorSimilarityRequest>,
) -> Result<Json<VectorSimilarityResponse>, (StatusCode, String)> {
    if payload.student_answer.trim().is_empty() || payload.model_answer.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing required fields".to_string()));
    }

    let start = std::time::Instant::now();

    let cache_key = format!(
        "{}_{}",
        &payload.student_answer.chars().take(50).collect::<String>(),
        &payload.model_answer.chars().take(50).collect::<String>()
    );

    let student_key = format!("{}_student", cache_key);
    let model_key = format!("{}_model", cache_key);

    let (student_vector, model_vector, cache_used, cache_size) = {
        let mut cache = EMBEDDING_CACHE
            .lock()
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "cache lock poisoned".to_string()))?;

        if payload.use_cache && cache.contains_key(&student_key) && cache.contains_key(&model_key) {
            let student_vector = cache
                .get(&student_key)
                .cloned()
                .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "cache read failed".to_string()))?;
            let model_vector = cache
                .get(&model_key)
                .cloned()
                .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "cache read failed".to_string()))?;

            (student_vector, model_vector, true, cache.len())
        } else {
            let student_vector = text_to_vector(&payload.student_answer);
            let model_vector = text_to_vector(&payload.model_answer);

            if payload.use_cache {
                cache.insert(student_key, student_vector.clone());
                cache.insert(model_key, model_vector.clone());
            }

            (student_vector, model_vector, false, cache.len())
        }
    };

    let similarity = cosine_similarity(&student_vector, &model_vector);
    let similarity_percent = (similarity * 100.0).round() as i32;

    let response = VectorSimilarityResponse {
        similarity,
        similarity_percent,
        student_vector_size: student_vector.len(),
        model_vector_size: model_vector.len(),
        cache_used,
        cache_size,
        processing_time_ms: start.elapsed().as_millis(),
        backend: "rust",
        strangler_target: "rust",
    };

    Ok(Json(response))
}

async fn clear_vector_cache() -> Json<CacheClearResponse> {
    let mut cache = EMBEDDING_CACHE
        .lock()
        .expect("embedding cache lock should not be poisoned");
    cache.clear();

    Json(CacheClearResponse {
        message: "Cache cleared",
        cache_size: 0,
    })
}

fn cosine_similarity(vec1: &[f64], vec2: &[f64]) -> f64 {
    if vec1.len() != vec2.len() || vec1.is_empty() {
        return 0.0;
    }

    let mut dot_product = 0.0;
    let mut norm1 = 0.0;
    let mut norm2 = 0.0;

    for i in 0..vec1.len() {
        dot_product += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    if norm1 == 0.0 || norm2 == 0.0 {
        return 0.0;
    }

    dot_product / (norm1.sqrt() * norm2.sqrt())
}

fn text_to_vector(text: &str) -> Vec<f64> {
    let lower = text.to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_set: HashSet<&str> = words.iter().copied().collect();

    let common_words = [
        "đảng",
        "lãnh đạo",
        "nhân dân",
        "cách mạng",
        "thắng lợi",
        "đoàn kết",
        "dân tộc",
        "thời cơ",
        "độc lập",
        "tự do",
    ];

    let mut vector = Vec::with_capacity(common_words.len() + 3);

    for word in common_words {
        let count = words.iter().filter(|w| w.contains(word)).count() as f64;
        vector.push(if count > 0.0 { (count + 1.0).ln() } else { 0.0 });
    }

    let words_len = words.len() as f64;
    let vocab_len = word_set.len() as f64;
    vector.push(words_len);
    vector.push(vocab_len);
    vector.push(if words_len > 0.0 { vocab_len / words_len } else { 0.0 });

    vector
}
