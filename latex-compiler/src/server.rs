//! HTTP API: submit compile job (async), get job result, optional sync compile.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::cache;
use crate::compiler;
use crate::compiler::CompileError;
use crate::config::{JOB_RESULT_PREFIX, JOB_RESULT_TTL_SECS, QUEUE_NAME};

const MAX_CONTENT_LENGTH: usize = 500_000;

#[derive(Clone)]
pub struct AppState {
    pub redis: redis::aio::ConnectionManager,
}

#[derive(Deserialize)]
pub struct CompileRequest {
    pub content: String,
}

#[derive(Serialize)]
pub struct CompileResponse {
    pub job_id: String,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum JobResultResponse {
    Pending,
    Compiling,
    Done { pdf_base64: String },
    Failed { log: String },
}

/// POST /compile — enqueue job, return job_id. Client polls GET /job/:job_id.
pub async fn compile(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CompileRequest>,
) -> Result<Json<CompileResponse>, (StatusCode, String)> {
    if req.content.len() > MAX_CONTENT_LENGTH {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Content too long (max {} bytes)", MAX_CONTENT_LENGTH),
        ));
    }

    let job_id = Uuid::new_v4().to_string();
    let payload = serde_json::json!({ "job_id": job_id, "content": req.content });

    let mut conn = state.redis.clone();
    redis::cmd("LPUSH")
        .arg(QUEUE_NAME)
        .arg(payload.to_string())
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| (StatusCode::SERVICE_UNAVAILABLE, e.to_string()))?;

    // Mark job as pending so GET /job/:id returns immediately
    let key = format!("{}{}", JOB_RESULT_PREFIX, job_id);
    redis::cmd("SET")
        .arg(&key)
        .arg(serde_json::json!({ "status": "pending" }).to_string())
        .arg("EX")
        .arg(JOB_RESULT_TTL_SECS)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| (StatusCode::SERVICE_UNAVAILABLE, e.to_string()))?;

    Ok(Json(CompileResponse { job_id }))
}

/// GET /job/:job_id — return status and PDF (when done) or log (when failed).
pub async fn get_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<JobResultResponse>, (StatusCode, String)> {
    let key = format!("{}{}", JOB_RESULT_PREFIX, job_id);
    let mut conn = state.redis.clone();
    let raw: Option<String> = redis::cmd("GET")
        .arg(&key)
        .query_async(&mut conn)
        .await
        .map_err(|e| (StatusCode::SERVICE_UNAVAILABLE, e.to_string()))?;

    let Some(raw) = raw else {
        return Err((StatusCode::NOT_FOUND, "Job not found or expired".into()));
    };

    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid job data".into()))?;
    let status = value.get("status").and_then(|s| s.as_str()).unwrap_or("pending");

    match status {
        "pending" | "compiling" => {
            Ok(Json(if status == "compiling" {
                JobResultResponse::Compiling
            } else {
                JobResultResponse::Pending
            }))
        }
        "done" => {
            let pdf_base64 = value
                .get("pdf_base64")
                .and_then(|v| v.as_str())
                .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "Missing pdf_base64".into()))?;
            Ok(Json(JobResultResponse::Done {
                pdf_base64: pdf_base64.to_string(),
            }))
        }
        "failed" => {
            let log = value.get("log").and_then(|v| v.as_str()).unwrap_or("").to_string();
            Ok(Json(JobResultResponse::Failed { log }))
        }
        _ => Err((StatusCode::INTERNAL_SERVER_ERROR, "Unknown job status".into())),
    }
}

/// POST /compile/sync — compile in-process, return PDF binary. For drop-in replacement with Next.js.
pub async fn compile_sync(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CompileRequest>,
) -> Result<axum::response::Response, (StatusCode, String)> {
    if req.content.len() > MAX_CONTENT_LENGTH {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Content too long (max {} bytes)", MAX_CONTENT_LENGTH),
        ));
    }

    // Cache lookup first
    let hash = cache::content_hash(&req.content);
    let mut conn = state.redis.clone();
    if let Some(pdf) = cache::get_pdf(&mut conn, &hash).await {
        return Ok(pdf_response(&pdf));
    }

    let result = compiler::compile_latex(req.content).await;
    match result {
        Ok(pdf) => {
            cache::set_pdf(&mut conn, &hash, &pdf, JOB_RESULT_TTL_SECS).await;
            Ok(pdf_response(&pdf))
        }
        Err(CompileError::CompileFailed { log }) => Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            format!("Compile error: {}", log.lines().last().unwrap_or("unknown")),
        )),
        Err(CompileError::Timeout) => Err((
            StatusCode::GATEWAY_TIMEOUT,
            "Compilation timed out".into(),
        )),
        Err(CompileError::SandboxUnavailable(e)) => Err((
            StatusCode::SERVICE_UNAVAILABLE,
            format!("Compile service unavailable: {}", e),
        )),
    }
}

fn pdf_response(pdf: &[u8]) -> axum::response::Response {
    axum::response::Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", r#"inline; filename="output.pdf""#)
        .body(axum::body::Body::from(pdf.to_vec()))
        .unwrap()
}

pub async fn start_server() {
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let client = redis::Client::open(redis_url.as_str()).expect("Invalid REDIS_URL");
    let redis = redis::aio::ConnectionManager::new(client)
        .await
        .expect("Redis connection failed");

    let state = Arc::new(AppState { redis });

    let app = Router::new()
        .route("/compile", post(compile))
        .route("/compile/sync", post(compile_sync))
        .route("/job/:job_id", get(get_job))
        .route("/health", get(|| async { "ok" }))
        .with_state(state);

    let host = std::env::var("BIND_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("BIND_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = format!("{}:{}", host, port);

    let listener = tokio::net::TcpListener::bind(&addr).await.expect("Bind failed");
    tracing::info!("LaTeX compile service listening on {}", addr);
    axum::serve(listener, app).await.expect("Serve failed");
}
