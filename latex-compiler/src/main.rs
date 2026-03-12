//! LaTeX Compile Service — queue-based, sandboxed, cached.
//! Architecture: Editor → NextAPI → Redis Queue → Rust Workers → Cache/Storage → PDF.

mod cache;
mod compiler;
mod config;
mod sandbox;
mod server;
mod storage;
mod worker;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "latex_compiler=info,warn".into()),
        )
        .init();

    tokio::spawn(worker::start_workers());
    server::start_server().await;
}
