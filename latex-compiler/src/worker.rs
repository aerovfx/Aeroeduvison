//! Compile workers: pop jobs from Redis, compile (with cache), write result back.

use base64::Engine;
use redis::aio::ConnectionManager;

use crate::cache;
use crate::compiler;
use crate::config::{JOB_RESULT_PREFIX, JOB_RESULT_TTL_SECS, QUEUE_NAME};

const BRPOP_TIMEOUT_SECS: i32 = 2;

async fn get_redis() -> ConnectionManager {
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let client = redis::Client::open(redis_url.as_str()).expect("Invalid REDIS_URL");
    redis::aio::ConnectionManager::new(client).await.expect("Redis connection failed")
}

async fn set_job_result(redis: &mut ConnectionManager, job_id: &str, value: &serde_json::Value) {
    let key = format!("{}{}", JOB_RESULT_PREFIX, job_id);
    let serialized = serde_json::to_string(value).unwrap();
    let _: Result<(), _> = redis::cmd("SET")
        .arg(&key)
        .arg(serialized)
        .arg("EX")
        .arg(JOB_RESULT_TTL_SECS)
        .query_async(redis)
        .await;
}

pub async fn start_workers() {
    let n = num_cpus::get().max(1);
    for i in 0..n {
        tokio::spawn(worker_loop(i));
    }
}

async fn worker_loop(_id: usize) {
    let mut redis = get_redis().await;
    loop {
        // BRPOP queue (blocking pop, timeout so we can exit cleanly if needed)
        let result: Result<Option<(String, String)>, _> =
            redis::cmd("BRPOP").arg(QUEUE_NAME).arg(BRPOP_TIMEOUT_SECS).query_async(&mut redis).await;

        let Some((_, payload)) = result.ok().flatten() else {
            continue;
        };

        let job: serde_json::Value = match serde_json::from_str(&payload) {
            Ok(j) => j,
            Err(_) => continue,
        };
        let job_id = match job.get("job_id").and_then(|v| v.as_str()) {
            Some(id) => id.to_string(),
            None => continue,
        };
        let content = match job.get("content").and_then(|v| v.as_str()) {
            Some(c) => c.to_string(),
            None => continue,
        };

        // Mark compiling
        let key = format!("{}{}", JOB_RESULT_PREFIX, job_id);
        let _: Result<(), _> = redis::cmd("SET")
            .arg(&key)
            .arg(serde_json::json!({ "status": "compiling" }).to_string())
            .arg("EX")
            .arg(JOB_RESULT_TTL_SECS)
            .query_async(&mut redis)
            .await;

        // Cache lookup
        let hash = cache::content_hash(&content);
        if let Some(pdf) = cache::get_pdf(&mut redis, &hash).await {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&pdf);
            set_job_result(
                &mut redis,
                &job_id,
                &serde_json::json!({ "status": "done", "pdf_base64": b64 }),
            )
            .await;
            continue;
        }

        // Compile
        let result = compiler::compile_latex(content).await;
        match result {
            Ok(pdf) => {
                cache::set_pdf(&mut redis, &hash, &pdf, JOB_RESULT_TTL_SECS).await;
                let b64 = base64::engine::general_purpose::STANDARD.encode(&pdf);
                set_job_result(
                    &mut redis,
                    &job_id,
                    &serde_json::json!({ "status": "done", "pdf_base64": b64 }),
                )
                .await;
            }
            Err(compiler::CompileError::CompileFailed { log }) => {
                set_job_result(
                    &mut redis,
                    &job_id,
                    &serde_json::json!({ "status": "failed", "log": log }),
                )
                .await;
            }
            Err(compiler::CompileError::Timeout) => {
                set_job_result(
                    &mut redis,
                    &job_id,
                    &serde_json::json!({ "status": "failed", "log": "Compilation timed out" }),
                )
                .await;
            }
            Err(compiler::CompileError::SandboxUnavailable(e)) => {
                set_job_result(
                    &mut redis,
                    &job_id,
                    &serde_json::json!({ "status": "failed", "log": e }),
                )
                .await;
            }
        }
    }
}
