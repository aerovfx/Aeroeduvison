//! AeroEdu Vision desktop runtime for Apple Silicon.
//! PostgreSQL data and mutable application files live below macOS Application
//! Support, while the API only listens on the loopback interface.

use rand::{rngs::OsRng, RngCore};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command},
    sync::Mutex,
};
use tauri::{Manager, RunEvent};

const POSTGRES_LOCALE: &str = "C";

struct RuntimeState {
    node: Mutex<Option<Child>>,
    pg_ctl: PathBuf,
    pg_data: PathBuf,
}

fn postgres_bin(name: &str) -> Result<PathBuf, String> {
    for root in ["/opt/homebrew/opt/postgresql@16/bin", "/opt/homebrew/bin"] {
        let candidate = Path::new(root).join(name);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    Err("PostgreSQL 16 chưa được cài. Chạy: brew install postgresql@16".into())
}

fn run(command: &Path, args: &[&str], envs: &[(&str, &str)]) -> Result<(), String> {
    let mut child = Command::new(command);
    child.args(args);
    for (key, value) in envs {
        child.env(key, value);
    }
    let output = child
        .output()
        .map_err(|error| format!("Không chạy được {}: {error}", command.display()))?;
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Err(format!(
        "{} thất bại ({}). {}{}",
        command.display(),
        output.status,
        stderr,
        if stdout.is_empty() {
            String::new()
        } else {
            format!(" {stdout}")
        }
    ))
}

fn postgres_command(command: &Path) -> Command {
    let mut child = Command::new(command);
    // GUI applications do not inherit the same locale environment as an
    // interactive shell. PostgreSQL can abort during startup on macOS when
    // LC_ALL is missing or invalid, so give every postgres utility a stable
    // locale explicitly.
    child.env("LC_ALL", POSTGRES_LOCALE);
    child
}

fn show_startup_error(message: &str) {
    let script = "on run argv\n display dialog (item 1 of argv) with title \"AeroEdu Vision\" buttons {\"Đóng\"} default button \"Đóng\" with icon stop\nend run";
    let _ = Command::new("/usr/bin/osascript")
        .args(["-e", script, message])
        .status();
}

fn read_or_create_secret(path: &Path) -> Result<String, String> {
    if path.is_file() {
        return fs::read_to_string(path)
            .map(|value| value.trim().to_string())
            .map_err(|e| e.to_string());
    }
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let value = bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    fs::write(path, format!("{value}\n")).map_err(|e| e.to_string())?;
    Ok(value)
}

fn runtime_log(root: &Path, message: &str) {
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(root.join("desktop-runtime.log"))
    {
        let _ = writeln!(file, "{message}");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run_app() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let setup_result = (|| -> Result<(), String> {
                let data_root = app.path().app_data_dir().map_err(|e| e.to_string())?;
                let pg_data = data_root.join("postgres");
                let app_data = data_root.join("data");
                let socket_dir = PathBuf::from("/tmp/aeroedu-desktop-pg");
                fs::create_dir_all(&pg_data).map_err(|e| e.to_string())?;
                fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
                fs::create_dir_all(&socket_dir).map_err(|e| e.to_string())?;
                runtime_log(&data_root, "desktop setup started");
                let initdb = postgres_bin("initdb")?;
                let pg_ctl = postgres_bin("pg_ctl")?;
                if !pg_data.join("PG_VERSION").is_file() {
                    run(&initdb, &["-D", pg_data.to_str().unwrap(), "--username=aeroedu", "--encoding=UTF8", "--auth=trust"], &[("LC_ALL", POSTGRES_LOCALE)])?;
                }
                let status = postgres_command(&pg_ctl).args(["status", "-D", pg_data.to_str().unwrap()]).status();
                if !matches!(status, Ok(value) if value.success()) {
                    let postgres_log = data_root.join("desktop-postgres.log");
                    run(&pg_ctl, &["start", "-w", "-D", pg_data.to_str().unwrap(), "-l", postgres_log.to_str().unwrap(), "-o", "-c listen_addresses='' -c unix_socket_directories='/tmp/aeroedu-desktop-pg'"], &[("LC_ALL", POSTGRES_LOCALE)])?;
                }
                runtime_log(&data_root, "postgres ready");
                let resource = app.path().resource_dir().map_err(|e| e.to_string())?.join("resources/backend");
                let database_url = "postgresql://aeroedu@localhost/postgres?host=%2Ftmp%2Faeroedu-desktop-pg";
                let jwt = read_or_create_secret(&data_root.join("jwt-secret"))?;
                let schema = resource.join("schema.sql").to_string_lossy().to_string();
                let bootstrap = resource.join("bootstrap.cjs").to_string_lossy().to_string();
                let node_binary = std::env::current_exe().map_err(|e| e.to_string())?.parent().ok_or("Không tìm thấy thư mục executable")?.join("aeroedu-node");
                let bootstrap_output = Command::new(&node_binary).arg(bootstrap).env("DATABASE_URL", database_url).env("AEROEDU_DESKTOP_SCHEMA", schema).output().map_err(|e| e.to_string())?;
                if !bootstrap_output.status.success() {
                    return Err(format!("Khởi tạo database thất bại: {}", String::from_utf8_lossy(&bootstrap_output.stderr)));
                }
                runtime_log(&data_root, "bootstrap ready");

                let server = resource.join("server.cjs").to_string_lossy().to_string();
                let node = Command::new(&node_binary)
                    .arg(server)
                    .env("DATABASE_URL", database_url)
                    .env("JWT_SECRET", jwt)
                    .env("PORT", "43127")
                    .env("HOST", "127.0.0.1")
                    .env("PUBLIC_URL", "http://127.0.0.1:43127")
                    .env("DEPLOYMENT_MODE", "desktop")
                    .env("OFFLINE_MODE", "true")
                    .env("DATA_DIR", &app_data)
                    .spawn().map_err(|e| e.to_string())?;
                runtime_log(&data_root, "node server spawned");
                app.manage(RuntimeState { node: Mutex::new(Some(node)), pg_ctl, pg_data });
                runtime_log(&data_root, "desktop setup complete");
                Ok(())
            })();
            if let Err(error) = setup_result {
                if let Ok(data_root) = app.path().app_data_dir() {
                    let _ = fs::create_dir_all(&data_root);
                    runtime_log(&data_root, &format!("desktop setup failed: {error}"));
                }
                let message = format!("Không thể khởi động AeroEdu Vision.\n\n{error}\n\nChi tiết được lưu trong desktop-runtime.log.");
                eprintln!("{message}");
                show_startup_error(&message);
                app.handle().exit(1);
            }
            Ok(())
        });

    let app = match builder.build(tauri::generate_context!()) {
        Ok(app) => app,
        Err(error) => {
            let message = format!("Không thể khởi động AeroEdu Vision.\n\n{error}\n\nChi tiết được lưu trong desktop-runtime.log.");
            eprintln!("{message}");
            show_startup_error(&message);
            return;
        }
    };

    app.run(|handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            if let Some(state) = handle.try_state::<RuntimeState>() {
                if let Some(mut child) = state.node.lock().ok().and_then(|mut guard| guard.take()) {
                    let _ = child.kill();
                }
                let _ = postgres_command(&state.pg_ctl)
                    .args([
                        "stop",
                        "-w",
                        "-D",
                        state.pg_data.to_str().unwrap(),
                        "-m",
                        "fast",
                    ])
                    .status();
            }
        }
    });
}
