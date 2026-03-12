//! LaTeX compiler: temp dir, primary engine (xelatex ± firejail), fallback tectonic.
//! No Docker dependency.

use std::fs;
use tempfile::tempdir;

use crate::sandbox;

#[derive(Debug)]
pub enum CompileError {
    CompileFailed { log: String },
    Timeout,
    SandboxUnavailable(String),
}

/// Compile LaTeX content to PDF.
/// Primary: xelatex (with firejail on Linux); fallback: tectonic.
pub async fn compile_latex(content: String) -> Result<Vec<u8>, CompileError> {
    let dir = tempdir().map_err(|e| CompileError::SandboxUnavailable(e.to_string()))?;
    let tex_path = dir.path().join("main.tex");
    fs::write(&tex_path, content.as_bytes())
        .map_err(|e| CompileError::SandboxUnavailable(e.to_string()))?;

    let work_dir = dir.path();
    let mut full_log = Vec::new();

    // Primary: 2 passes xelatex (firejail on Linux, else bare)
    let primary_result = run_xelatex_two_passes(work_dir, &mut full_log).await;

    if let Ok(pdf) = primary_result {
        return Ok(pdf);
    }

    // Fallback: tectonic (single pass)
    full_log.extend_from_slice(b"\n--- fallback: tectonic ---\n");
    match sandbox::run_tectonic(work_dir, "main.tex").await {
        Ok((true, stdout, stderr)) => {
            full_log.extend_from_slice(&stdout);
            full_log.extend_from_slice(&stderr);
            if let Ok(pdf) = fs::read(dir.path().join("main.pdf")) {
                return Ok(pdf);
            }
        }
        Ok((false, stdout, stderr)) => {
            full_log.extend_from_slice(&stdout);
            full_log.extend_from_slice(&stderr);
        }
        Err(e) => {
            full_log.extend_from_slice(e.as_bytes());
        }
    }

    let log = String::from_utf8_lossy(&full_log).to_string();
    Err(CompileError::CompileFailed { log })
}

async fn run_xelatex_two_passes(
    work_dir: &std::path::Path,
    full_log: &mut Vec<u8>,
) -> Result<Vec<u8>, CompileError> {
    for _ in 0..2 {
        let (success, stdout, stderr) = sandbox::run_primary(work_dir, "main.tex")
            .await
            .map_err(|e| {
                if e.contains("timed out") {
                    CompileError::Timeout
                } else {
                    CompileError::SandboxUnavailable(e)
                }
            })?;
        full_log.extend_from_slice(&stdout);
        full_log.extend_from_slice(b"\n");
        full_log.extend_from_slice(&stderr);
        if !success {
            let log = String::from_utf8_lossy(full_log).to_string();
            return Err(CompileError::CompileFailed { log });
        }
    }

    let pdf_path = work_dir.join("main.pdf");
    fs::read(&pdf_path).map_err(|_| {
        let log = String::from_utf8_lossy(full_log).to_string();
        CompileError::CompileFailed { log }
    })
}
