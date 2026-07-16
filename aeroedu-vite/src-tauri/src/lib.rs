// AeroEdu Vision — lõi Tauri desktop app.
//
// App đóng gói toàn bộ frontend Vite (aeroedu-vite) thành app native macOS/
// Windows/Linux. Mọi API call đi thẳng tới https://inphysic.com/api (xem
// aeroedu-vite/src/services/api.ts — detect window.__TAURI_INTERNALS__).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running AeroEdu Vision desktop app");
}
