// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn add_numbers(a: i32, b: i32) -> i32 {
    a + b
}

#[tauri::command]
fn get_config() -> serde_json::Value {
    serde_json::json!({
        "app_name": "test-app",
        "version": "0.1.0",
        "features": ["devtools", "mcp-bridge"]
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_mcp_bridge::init())
        .invoke_handler(tauri::generate_handler![greet, add_numbers, get_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
