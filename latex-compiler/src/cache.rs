//! Content-addressable cache: SHA256(content) -> PDF. Reduces redundant compiles (e.g. 90% hit rate).

use redis::aio::ConnectionManager;
use sha2::{Digest, Sha256};

const CACHE_PREFIX: &str = "latex:pdf:";

pub fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

/// Get cached PDF by content hash. Returns None if miss or error.
pub async fn get_pdf(redis: &mut ConnectionManager, hash: &str) -> Option<Vec<u8>> {
    let key = format!("{}{}", CACHE_PREFIX, hash);
    let raw: Option<Vec<u8>> = redis::cmd("GET").arg(&key).query_async(redis).await.ok()?;
    raw
}

/// Store PDF in cache with TTL (seconds).
pub async fn set_pdf(redis: &mut ConnectionManager, hash: &str, pdf: &[u8], ttl_secs: u64) {
    let key = format!("{}{}", CACHE_PREFIX, hash);
    let _: Result<(), _> = redis::cmd("SET")
        .arg(&key)
        .arg(pdf)
        .arg("EX")
        .arg(ttl_secs)
        .query_async(redis)
        .await;
}
