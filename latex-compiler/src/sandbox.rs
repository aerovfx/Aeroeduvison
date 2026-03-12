//! Sandbox: run xelatex on host (no Docker). Optional firejail on Linux.
//! Fallback engine: tectonic. Always -no-shell-escape to prevent LaTeX exploits.

use std::path::Path;
use tokio::process::Command;

const TIMEOUT_SECS: u64 = 90;
const FIREJAIL_RLIMIT_CPU: u64 = 90;

/// Run a command in work_dir with timeout, capture stdout/stderr. Returns (success, stdout, stderr).
async fn run_cmd_with_timeout(
    work_dir: &Path,
    mut cmd: Command,
) -> Result<(bool, Vec<u8>, Vec<u8>), String> {
    let mut child = cmd
        .current_dir(work_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let timeout = tokio::time::Duration::from_secs(TIMEOUT_SECS);
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let (stdout, stderr) = tokio::join!(
        async {
            let mut out = Vec::new();
            if let Some(mut s) = stdout {
                let _ = tokio::io::AsyncReadExt::read_to_end(&mut s, &mut out).await;
            }
            out
        },
        async {
            let mut out = Vec::new();
            if let Some(mut s) = stderr {
                let _ = tokio::io::AsyncReadExt::read_to_end(&mut s, &mut out).await;
            }
            out
        }
    );

    let result = tokio::time::timeout(timeout, child.wait()).await;
    let status = match result {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => return Err(e.to_string()),
        Err(_) => {
            let _ = child.start_kill();
            return Err("Compilation timed out".to_string());
        }
    };
    Ok((status.success(), stdout, stderr))
}

/// Primary: run xelatex directly on host (no Docker).
pub async fn run_xelatex(work_dir: &Path, tex_name: &str) -> Result<(bool, Vec<u8>, Vec<u8>), String> {
    let mut cmd = Command::new("xelatex");
    cmd.args([
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-no-shell-escape",
        tex_name,
    ]);
    run_cmd_with_timeout(work_dir, cmd).await
}

/// Sandbox on Linux: run xelatex under firejail (--private, --net=none, --rlimit-cpu).
/// Returns Ok(..) if firejail ran; Err if firejail not found or spawn failed.
pub async fn run_xelatex_firejail(work_dir: &Path, tex_name: &str) -> Result<(bool, Vec<u8>, Vec<u8>), String> {
    let work = work_dir
        .to_str()
        .ok_or_else(|| "Invalid work path".to_string())?;

    let mut cmd = Command::new("firejail");
    cmd.args([
        &format!("--private={}", work),
        "--net=none",
        &format!("--rlimit-cpu={}", FIREJAIL_RLIMIT_CPU),
        "--",
        "xelatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-no-shell-escape",
        tex_name,
    ]);
    run_cmd_with_timeout(work_dir, cmd).await
}

/// Fallback: tectonic (self-contained, downloads packages; no full TeX Live needed).
pub async fn run_tectonic(work_dir: &Path, tex_name: &str) -> Result<(bool, Vec<u8>, Vec<u8>), String> {
    let mut cmd = Command::new("tectonic");
    cmd.arg(tex_name);
    run_cmd_with_timeout(work_dir, cmd).await
}

#[cfg(target_os = "linux")]
fn use_firejail_by_default() -> bool {
    true
}

#[cfg(not(target_os = "linux"))]
fn use_firejail_by_default() -> bool {
    false
}

/// Run primary engine: on Linux try firejail first, then bare xelatex; else bare xelatex.
pub async fn run_primary(work_dir: &Path, tex_name: &str) -> Result<(bool, Vec<u8>, Vec<u8>), String> {
    if use_firejail_by_default() {
        if let Ok(out) = run_xelatex_firejail(work_dir, tex_name).await {
            return Ok(out);
        }
    }
    run_xelatex(work_dir, tex_name).await
}
