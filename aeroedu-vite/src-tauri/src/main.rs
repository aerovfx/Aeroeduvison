// Ẩn cửa sổ console thừa trên Windows khi chạy bản release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    aeroedu_desktop_lib::run()
}
