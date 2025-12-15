//! # Tauri MCP Bridge Plugin
//!
//! A Tauri plugin that bridges the Model Context Protocol (MCP) with Tauri applications,
//! enabling deep inspection and interaction with Tauri's IPC layer, backend state, and
//! window management.

pub mod commands;
pub mod config;
pub mod discovery;
mod logging;
pub mod monitor;
pub mod screenshot;
pub mod script_registry;
pub mod websocket;

pub use config::{Builder, Config};

use commands::ScriptExecutor;
use discovery::{find_available_port, use_explicit_port_or_fail};
use logging::{mcp_log_error, mcp_log_info};
use monitor::IPCMonitor;
use script_registry::create_shared_registry;
use std::sync::{Arc, Mutex};
use tauri::{plugin::Builder as PluginBuilder, plugin::TauriPlugin, Manager, Runtime};

/// Initializes the MCP Bridge plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    init_with_config(Config::default())
}

/// Initializes the MCP Bridge plugin with custom configuration.
pub fn init_with_config<R: Runtime>(config: Config) -> TauriPlugin<R> {
    let bind_address = config.bind_address.clone();
    let explicit_port = config.port;

    PluginBuilder::<R>::new("mcp-bridge")
        .invoke_handler(tauri::generate_handler![
            commands::execute_command::execute_command,
            commands::window_info::get_window_info,
            commands::backend_state::get_backend_state,
            commands::emit_event::emit_event,
            commands::ipc_monitor::start_ipc_monitor,
            commands::ipc_monitor::stop_ipc_monitor,
            commands::ipc_monitor::get_ipc_events,
            commands::execute_js::execute_js,
            commands::script_executor::script_result,
            commands::screenshot::capture_native_screenshot,
            commands::list_windows::list_windows,
            commands::script_injection::request_script_injection,
        ])
        .js_init_script(include_str!("bridge.js").to_string())
        .setup(move |app, _api| {
            // Initialize script executor state
            app.manage(ScriptExecutor::new());

            // Initialize IPC monitor state
            let monitor = Arc::new(Mutex::new(IPCMonitor::new()));
            app.manage(monitor.clone());

            // Initialize script registry for persistent script injection
            let script_registry = create_shared_registry();
            app.manage(script_registry);

            // Determine port: use explicit port (strict mode) or find available port
            let port = match explicit_port {
                Some(p) => {
                    mcp_log_info(
                        "PLUGIN",
                        &format!("Using explicit port {} (strict mode)", p),
                    );
                    use_explicit_port_or_fail(&bind_address, p)
                }
                None => {
                    let p = find_available_port(&bind_address);
                    mcp_log_info(
                        "PLUGIN",
                        &format!("Auto-selected port {} from range 9223-9322", p),
                    );
                    p
                }
            };

            // Log app information for debugging
            let app_name = app
                .config()
                .product_name
                .clone()
                .unwrap_or_else(|| "Tauri App".to_string());

            let identifier = app.config().identifier.clone();

            // Start WebSocket server in background
            let app_handle = app.clone();
            let (ws_server, _event_rx) =
                websocket::WebSocketServer::new(port, &bind_address, app_handle);

            tauri::async_runtime::spawn(async move {
                if let Err(e) = ws_server.start().await {
                    mcp_log_error("PLUGIN", &format!("WebSocket server error: {e}"));
                }
            });

            mcp_log_info(
                "PLUGIN",
                &format!(
                    "MCP Bridge plugin initialized for '{}' ({}) on {}:{}",
                    app_name, identifier, bind_address, port
                ),
            );

            Ok(())
        })
        .build()
}
