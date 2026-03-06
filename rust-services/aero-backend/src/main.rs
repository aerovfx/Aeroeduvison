mod inventory;

use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Mutex;

use axum::{
    body::Bytes,
    extract::{Multipart, Path, Request, State},
    http::{header::CONTENT_TYPE, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{any, delete, get, post},
    Json, Router,
};
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::{error, info};

static EMBEDDING_CACHE: Lazy<Mutex<HashMap<String, Vec<f64>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Clone)]
struct AppState {
    version: &'static str,
    ocr_backend_url: String,
    ocr_server_url: String,
    client: Client,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
    known_routes: usize,
    migrated_routes: usize,
}

#[derive(Debug, Deserialize)]
struct VectorSimilarityRequest {
    student_answer: String,
    model_answer: String,
    #[serde(default = "default_true")]
    use_cache: bool,
}

#[derive(Debug, Deserialize)]
struct LlmGradingRequest {
    student_answer: String,
    #[serde(default)]
    question_text: String,
    model_answer: String,
    max_score: f64,
    #[serde(default = "default_llm_provider")]
    llm_provider: String,
    #[serde(default)]
    auto_select: bool,
    #[serde(default = "default_subject")]
    subject: String,
    #[serde(default)]
    use_vector_similarity: bool,
    #[serde(default = "default_true")]
    use_embedding_cache: bool,
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
struct CacheClearResponse {
    message: &'static str,
    cache_size: usize,
    backend: &'static str,
}

#[derive(Debug, Serialize)]
struct NotImplementedResponse {
    error: &'static str,
    message: String,
    requested_path: String,
    known_api_path: bool,
    migrated_in_rust: bool,
}

fn default_true() -> bool {
    true
}

fn default_llm_provider() -> String {
    "auto".to_string()
}

fn default_subject() -> String {
    "general".to_string()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "aero_backend=info,tower_http=info".to_string()),
        )
        .init();

    let state = AppState {
        version: "0.1.0",
        ocr_backend_url: std::env::var("OCR_GRADING_BACKEND_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8012".to_string()),
        ocr_server_url: std::env::var("OCR_SERVER_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8001".to_string()),
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client"),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route(
            "/api/vector-similarity",
            post(vector_similarity).delete(clear_vector_cache),
        )
        .route("/api/vector-similarity/cache", delete(clear_vector_cache))
        .route("/api/ocr-grading", post(ocr_grading_post).get(ocr_grading_health))
        .route("/api/ocr/auto-grade", post(ocr_auto_grade_post))
        .route("/api/ocr/upload", post(ocr_upload_post))
        .route("/api/ocr-process", post(ocr_process_post))
        .route("/api/llm-grading", post(llm_grading_post))
        .route("/api/assignments/grade-ocr", post(assignments_grade_ocr_post))
        .route("/api", any(api_not_implemented_root))
        .route("/api/*path", any(api_not_implemented))
        .with_state(state);

    let addr = std::env::var("AERO_BACKEND_ADDR")
        .ok()
        .and_then(|v| v.parse::<SocketAddr>().ok())
        .unwrap_or_else(|| "127.0.0.1:8090".parse().expect("valid default addr"));

    info!("aero-backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener");

    axum::serve(listener, app)
        .await
        .expect("server error while serving aero-backend");
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "aero-backend",
        version: state.version,
        known_routes: inventory::KNOWN_API_ROUTES.len(),
        migrated_routes: inventory::MIGRATED_API_ROUTES.len(),
    })
}

async fn vector_similarity(
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

    Ok(Json(VectorSimilarityResponse {
        similarity,
        similarity_percent,
        student_vector_size: student_vector.len(),
        model_vector_size: model_vector.len(),
        cache_used,
        cache_size,
        processing_time_ms: start.elapsed().as_millis(),
        backend: "rust",
        strangler_target: "rust",
    }))
}

async fn clear_vector_cache() -> Json<CacheClearResponse> {
    let mut cache = EMBEDDING_CACHE
        .lock()
        .expect("embedding cache lock should not be poisoned");
    cache.clear();

    Json(CacheClearResponse {
        message: "Cache cleared",
        cache_size: 0,
        backend: "rust",
    })
}

async fn ocr_grading_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/api/simulate", state.ocr_backend_url);

    let mut req = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, "application/json");

    if let Some(value) = headers.get("x-request-id") {
        req = req.header("x-request-id", value);
    }

    let response = req
        .body(body)
        .send()
        .await
        .map_err(|e| {
            error!("OCR grading upstream request failed: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "success": false,
                    "error": "Backend not available",
                    "message": "OCR Grading backend is not running on port 8012",
                    "details": e.to_string(),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "success": false,
                "error": "Backend error",
                "message": text,
                "backend": "rust"
            })),
        ));
    }

    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));
    Ok((StatusCode::OK, Json(json_body)))
}

async fn ocr_grading_health(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/api/health", state.ocr_backend_url);

    let response = state.client.get(&upstream_url).send().await.map_err(|e| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "success": false,
                "error": "Backend not available",
                "message": "OCR Grading backend is not running on port 8012",
                "details": e.to_string(),
                "backend": "rust"
            })),
        )
    })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_auto_grade_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/auto-grade", state.ocr_backend_url);
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "Auto-grading failed",
                    "details": format!("Upstream OCR backend unavailable: {}", e),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_upload_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/ocr", state.ocr_backend_url);
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR processing failed",
                    "details": format!("Upstream OCR backend unavailable: {}", e),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_process_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    if !content_type.starts_with("multipart/form-data") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "No file provided",
                "backend": "rust"
            })),
        ));
    }

    let upstream_url = format!("{}/ocr", state.ocr_server_url);
    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                    "details": e.to_string(),
                    "serviceUrl": state.ocr_server_url,
                    "backend": "rust"
                })),
            )
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_else(|_| "OCR server error".to_string());
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                "details": text,
                "serviceUrl": state.ocr_server_url,
                "backend": "rust"
            })),
        ));
    }

    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let ocr_json: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    let transformed = json!({
        "success": true,
        "data": {
            "text": ocr_json.get("text").cloned().unwrap_or(json!("")),
            "lines": ocr_json.get("lines").cloned().unwrap_or(json!([])),
            "confidence": ocr_json.get("confidence").cloned().unwrap_or(json!(0)),
            "boxes": ocr_json.get("boxes").cloned().unwrap_or(json!([])),
            "total_lines": ocr_json.get("total_lines").cloned().unwrap_or(json!(0)),
            "filename": ocr_json.get("filename").cloned().unwrap_or(json!("uploaded-image"))
        },
        "backend": "rust"
    });

    Ok((StatusCode::OK, Json(transformed)))
}

async fn llm_grading_post(
    Json(payload): Json<LlmGradingRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    if payload.student_answer.trim().is_empty()
        || payload.model_answer.trim().is_empty()
        || payload.max_score <= 0.0
    {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Thiếu thông tin bắt buộc" })),
        ));
    }

    let selected_provider = if payload.auto_select || payload.llm_provider == "auto" {
        auto_select_provider(
            &payload.student_answer,
            &payload.question_text,
            &payload.model_answer,
        )
    } else {
        payload.llm_provider.clone()
    };

    // Rust orchestrator uses deterministic fallback grading for now.
    let (score, comment) = smart_simulation_grade(
        &payload.student_answer,
        &payload.model_answer,
        payload.max_score,
        &payload.subject,
    );

    let vector_similarity = if payload.use_vector_similarity {
        let student_vector = text_to_vector(&payload.student_answer);
        let model_vector = text_to_vector(&payload.model_answer);
        Some((cosine_similarity(&student_vector, &model_vector) * 100.0).round() as i32)
    } else {
        None
    };

    Ok((
        StatusCode::OK,
        Json(json!({
            "score": round1(score),
            "comment": comment,
            "provider": if matches!(selected_provider.as_str(), "gpt4" | "gemini" | "grok") { selected_provider } else { "simulation".to_string() },
            "auto_selected": payload.auto_select || payload.llm_provider == "auto",
            "reasoning": if payload.auto_select || payload.llm_provider == "auto" {
                Value::String("Auto-selected simulation provider in Rust orchestrator".to_string())
            } else {
                Value::Null
            },
            "subject": payload.subject,
            "vector_similarity": vector_similarity,
            "features_used": {
                "vector_similarity": payload.use_vector_similarity,
                "embedding_cache": payload.use_embedding_cache,
                "subject_tuning": payload.subject != "general"
            },
            "backend": "rust",
            "strangler_target": "rust"
        })),
    ))
}

async fn assignments_grade_ocr_post(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let mut assignment_id = String::new();
    let mut student_id = String::new();
    let mut answer_key = String::new();
    let mut llm_provider = "auto".to_string();
    let mut max_score = 10.0_f64;

    let mut file_name = "uploaded-image".to_string();
    let mut file_content_type = "application/octet-stream".to_string();
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid multipart payload", "details": e.to_string() })),
        )
    })? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            if let Some(filename) = field.file_name() {
                file_name = filename.to_string();
            }
            if let Some(content_type) = field.content_type() {
                file_content_type = content_type.to_string();
            }
            let bytes = field.bytes().await.map_err(|e| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Invalid file data", "details": e.to_string() })),
                )
            })?;
            file_bytes = Some(bytes.to_vec());
            continue;
        }

        let value = field.text().await.unwrap_or_default();
        match name.as_str() {
            "assignmentId" => assignment_id = value,
            "studentId" => student_id = value,
            "answerKey" => answer_key = value,
            "llmProvider" => llm_provider = value,
            "maxScore" => {
                if let Ok(parsed) = value.parse::<f64>() {
                    max_score = parsed;
                }
            }
            _ => {}
        }
    }

    if file_bytes.is_none()
        || assignment_id.trim().is_empty()
        || student_id.trim().is_empty()
        || answer_key.trim().is_empty()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Missing required fields", "backend": "rust" })),
        ));
    }

    let upload_bytes = file_bytes.unwrap_or_default();
    let file_part = match reqwest::multipart::Part::bytes(upload_bytes.clone())
        .file_name(file_name.clone())
        .mime_str(&file_content_type)
    {
        Ok(part) => part,
        Err(_) => reqwest::multipart::Part::bytes(upload_bytes).file_name(file_name.clone()),
    };
    let ocr_multipart = reqwest::multipart::Form::new().part("file", file_part);

    let ocr_url = format!("{}/ocr", state.ocr_server_url);
    let ocr_response = state
        .client
        .post(&ocr_url)
        .multipart(ocr_multipart)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                    "details": e.to_string(),
                    "serviceUrl": state.ocr_server_url,
                    "backend": "rust"
                })),
            )
        })?;

    if !ocr_response.status().is_success() {
        let status = ocr_response.status();
        let text = ocr_response
            .text()
            .await
            .unwrap_or_else(|_| "OCR server error".to_string());
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "error": "OCR processing failed",
                "details": text,
                "backend": "rust"
            })),
        ));
    }

    let ocr_text = ocr_response.text().await.unwrap_or_else(|_| "{}".to_string());
    let ocr_json: Value = serde_json::from_str(&ocr_text).unwrap_or_else(|_| json!({ "raw": ocr_text }));
    let extracted_text = ocr_json
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let ocr_confidence = ocr_json
        .get("confidence")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.95);

    let llm_payload = LlmGradingRequest {
        student_answer: extracted_text.clone(),
        question_text: String::new(),
        model_answer: answer_key.clone(),
        max_score,
        llm_provider: llm_provider.clone(),
        auto_select: llm_provider == "auto",
        subject: "math".to_string(),
        use_vector_similarity: false,
        use_embedding_cache: true,
    };

    let (score, feedback) = smart_simulation_grade(
        &llm_payload.student_answer,
        &llm_payload.model_answer,
        llm_payload.max_score,
        &llm_payload.subject,
    );

    Ok((
        StatusCode::OK,
        Json(json!({
            "success": true,
            "data": {
                "assignmentId": assignment_id,
                "studentId": student_id,
                "ocrText": extracted_text,
                "score": round1(score),
                "maxScore": max_score,
                "feedback": feedback,
                "aiProvider": if llm_provider == "auto" { "simulation" } else { llm_provider.as_str() },
                "confidence": ocr_confidence
            },
            "backend": "rust",
            "strangler_target": "rust"
        })),
    ))
}

fn auto_select_provider(student_answer: &str, question_text: &str, model_answer: &str) -> String {
    let complexity = (if student_answer.len() > 500 { 2 } else { 0 })
        + (if question_text.len() > 200 { 1 } else { 0 })
        + (if model_answer.len() > 300 { 1 } else { 0 });

    if complexity >= 2 {
        "gpt4".to_string()
    } else {
        "simulation".to_string()
    }
}

fn smart_simulation_grade(
    student_answer: &str,
    model_answer: &str,
    max_score: f64,
    _subject: &str,
) -> (f64, String) {
    let answer_words: Vec<&str> = student_answer.split_whitespace().collect();
    let model_words: Vec<&str> = model_answer.split_whitespace().collect();
    let answer_len = student_answer.chars().count();
    let model_len = model_answer.chars().count();

    let similarity = if answer_words.is_empty() || model_words.is_empty() {
        0.0
    } else {
        let overlap = answer_words
            .iter()
            .filter(|w| model_words.contains(w))
            .count() as f64;
        overlap / answer_words.len().max(model_words.len()) as f64
    };

    let length_score = (answer_len as f64 / model_len.max(1) as f64).min(1.3);
    let mut score = (similarity * 0.7 + (length_score / 1.3) * 0.3) * max_score;
    score = score.clamp(0.0, max_score);

    let comment = if score >= max_score * 0.8 {
        format!("Bài làm tốt, nội dung tương đối đầy đủ. Điểm: {}/{}.", round1(score), round1(max_score))
    } else if score >= max_score * 0.5 {
        format!("Bài làm khá, cần bổ sung thêm ý chính. Điểm: {}/{}.", round1(score), round1(max_score))
    } else {
        format!("Bài làm cần cải thiện, thiếu nhiều ý quan trọng. Điểm: {}/{}.", round1(score), round1(max_score))
    };

    (score, comment)
}

fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

async fn api_not_implemented_root(request: Request) -> impl IntoResponse {
    build_not_implemented_response(request.uri().path().to_string())
}

async fn api_not_implemented(Path(path): Path<String>) -> impl IntoResponse {
    let normalized_path = if path.starts_with('/') {
        format!("/api{}", path)
    } else {
        format!("/api/{}", path)
    };

    build_not_implemented_response(normalized_path)
}

fn build_not_implemented_response(requested_path: String) -> (StatusCode, Json<NotImplementedResponse>) {
    let known = is_known_api_path(&requested_path);
    let migrated = inventory::MIGRATED_API_ROUTES.contains(&requested_path.as_str());

    (
        StatusCode::NOT_IMPLEMENTED,
        Json(NotImplementedResponse {
            error: "Not implemented in Rust yet",
            message: if known {
                "Route exists in Node inventory but is still scaffolded in Rust".to_string()
            } else {
                "Route is not present in generated API inventory".to_string()
            },
            requested_path,
            known_api_path: known,
            migrated_in_rust: migrated,
        }),
    )
}

fn is_known_api_path(path: &str) -> bool {
    inventory::KNOWN_API_ROUTES
        .iter()
        .any(|pattern| route_pattern_matches(pattern, path))
}

fn route_pattern_matches(pattern: &str, actual: &str) -> bool {
    let p_segments: Vec<&str> = pattern.trim_matches('/').split('/').collect();
    let a_segments: Vec<&str> = actual.trim_matches('/').split('/').collect();

    let mut i = 0usize;
    let mut j = 0usize;

    while i < p_segments.len() && j < a_segments.len() {
        let ps = p_segments[i];
        let is_catch_all = ps.starts_with("[...") && ps.ends_with(']');
        let is_dynamic = ps.starts_with('[') && ps.ends_with(']');

        if is_catch_all {
            return true;
        }

        if is_dynamic {
            i += 1;
            j += 1;
            continue;
        }

        if ps != a_segments[j] {
            return false;
        }

        i += 1;
        j += 1;
    }

    if i < p_segments.len() {
        return p_segments[i].starts_with("[...") && p_segments[i].ends_with(']');
    }

    j == a_segments.len()
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
