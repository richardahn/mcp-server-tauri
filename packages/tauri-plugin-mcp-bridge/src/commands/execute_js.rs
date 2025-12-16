//! JavaScript execution in webview using platform-specific APIs.
//!
//! Uses WebView2's ExecuteScript on Windows for synchronous script execution.
//! For async scripts, uses a polling mechanism with global variables.

use crate::commands::ScriptExecutor;
use crate::logging::{mcp_log_error, mcp_log_info};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use tauri::{command, Runtime, State, WebviewWindow};
use tokio::sync::oneshot;

/// Executes JavaScript code in the webview context and returns the result.
#[command]
pub async fn execute_js<R: Runtime>(
    window: WebviewWindow<R>,
    script: String,
    _executor_state: State<'_, ScriptExecutor>,
) -> Result<Value, String> {
    mcp_log_info(
        "EXECUTE_JS",
        &format!(
            "Executing script: {}...",
            &script.chars().take(100).collect::<String>()
        ),
    );

    // Detect if script needs async handling
    let needs_async = script.contains("await ") || script.contains(".then(");

    // Prepare the script with appropriate wrapping
    let (wrapped_script, exec_id) = if needs_async {
        // For async scripts, store result in a global variable and poll
        let exec_id = uuid::Uuid::new_v4().to_string().replace("-", "");
        let prepared = prepare_script(&script);
        let script = format!(
            r#"(async function() {{
                try {{
                    const __fn = async () => {{ {prepared} }};
                    const __result = await __fn();
                    window.__mcp_result_{exec_id} = JSON.stringify({{ success: true, data: __result !== undefined ? __result : null }});
                }} catch (e) {{
                    window.__mcp_result_{exec_id} = JSON.stringify({{ success: false, error: e.message || String(e) }});
                }}
            }})(); window.__mcp_result_{exec_id} || '{{"pending":true}}'"#
        );
        (script, Some(exec_id))
    } else {
        // For sync scripts, execute directly with a SYNC wrapper (not async IIFE)
        // This ensures the result is returned directly, not as a Promise
        let prepared = prepare_script(&script);
        let script = format!(
            r#"(function() {{
                try {{
                    const __fn = function() {{ {prepared} }};
                    const __result = __fn();
                    return JSON.stringify({{ success: true, data: __result !== undefined ? __result : null }});
                }} catch (e) {{
                    return JSON.stringify({{ success: false, error: e.message || String(e) }});
                }}
            }})()"#
        );
        (script, None)
    };

    // Create channel for result
    let (tx, rx) = oneshot::channel::<String>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    // Execute via platform-specific API
    #[cfg(windows)]
    {
        let tx_clone = tx.clone();
        let script_for_closure = wrapped_script.clone();

        let result = window.with_webview(move |webview| {
            use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2;
            use webview2_com::ExecuteScriptCompletedHandler;
            use windows::core::HSTRING;

            let controller = webview.controller();

            unsafe {
                let core_webview2: ICoreWebView2 = match controller.CoreWebView2() {
                    Ok(wv) => wv,
                    Err(e) => {
                        if let Some(tx) = tx_clone.lock().unwrap().take() {
                            let _ = tx.send(format!(
                                r#"{{"success":false,"error":"CoreWebView2 failed: {}"}}"#,
                                e
                            ));
                        }
                        return;
                    }
                };

                // Use ExecuteScript with callback handler
                let handler = ExecuteScriptCompletedHandler::create(Box::new(
                    move |error_code, result| {
                        if let Some(tx) = tx_clone.lock().unwrap().take() {
                            if error_code.is_ok() {
                                let result_str = result.to_string();
                                // WebView2 returns JSON-encoded strings with outer quotes
                                let clean = if result_str.starts_with('"')
                                    && result_str.ends_with('"')
                                {
                                    serde_json::from_str::<String>(&result_str)
                                        .unwrap_or(result_str.clone())
                                } else {
                                    result_str
                                };
                                let _ = tx.send(clean);
                            } else {
                                let _ = tx.send(format!(
                                    r#"{{"success":false,"error":"ExecuteScript failed: {:?}"}}"#,
                                    error_code.err()
                                ));
                            }
                        }
                        Ok(())
                    },
                ));

                let script_hstring = HSTRING::from(&script_for_closure);
                if let Err(e) = core_webview2.ExecuteScript(&script_hstring, &handler) {
                    if let Some(tx) = tx.lock().unwrap().take() {
                        let _ = tx.send(format!(
                            r#"{{"success":false,"error":"ExecuteScript call failed: {}"}}"#,
                            e
                        ));
                    }
                }
            }
        });

        if let Err(e) = result {
            return Ok(serde_json::json!({
                "success": false,
                "error": format!("with_webview failed: {}", e)
            }));
        }

        // For async scripts, we may need to poll for the result
        if let Some(ref exec_id) = exec_id {
            // Wait for initial result
            let initial_result =
                match tokio::time::timeout(std::time::Duration::from_millis(100), rx).await {
                    Ok(Ok(result)) => result,
                    Ok(Err(_)) => {
                        return Ok(serde_json::json!({"success": false, "error": "Channel closed"}))
                    }
                    Err(_) => {
                        return Ok(
                            serde_json::json!({"success": false, "error": "Initial execution timeout"}),
                        )
                    }
                };

            // Check if we got a pending result (async not yet resolved)
            if let Ok(parsed) = serde_json::from_str::<Value>(&initial_result) {
                if parsed
                    .get("pending")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    // Need to poll for the async result
                    return poll_async_result(&window, exec_id, 5000).await;
                }
            }

            // Got immediate result
            mcp_log_info(
                "EXECUTE_JS",
                &format!(
                    "Got result: {}...",
                    &initial_result.chars().take(100).collect::<String>()
                ),
            );
            return match serde_json::from_str::<Value>(&initial_result) {
                Ok(parsed) => Ok(parsed),
                Err(e) => Ok(serde_json::json!({"success": false, "error": format!("Failed to parse: {}", e)})),
            };
        }
    }

    #[cfg(not(windows))]
    {
        // For non-Windows platforms, use eval fallback
        if let Err(e) = window.eval(&wrapped_script) {
            return Ok(serde_json::json!({
                "success": false,
                "error": format!("eval failed: {}", e)
            }));
        }
        if let Some(tx) = tx.lock().unwrap().take() {
            let _ = tx.send(r#"{"success":true,"data":null}"#.to_string());
        }
    }

    // Wait for result with timeout
    match tokio::time::timeout(std::time::Duration::from_secs(5), rx).await {
        Ok(Ok(result_json)) => {
            mcp_log_info(
                "EXECUTE_JS",
                &format!(
                    "Got result: {}...",
                    &result_json.chars().take(100).collect::<String>()
                ),
            );

            match serde_json::from_str::<Value>(&result_json) {
                Ok(parsed) => Ok(parsed),
                Err(e) => Ok(serde_json::json!({
                    "success": false,
                    "error": format!("Failed to parse result: {}", e)
                })),
            }
        }
        Ok(Err(_)) => Ok(serde_json::json!({
            "success": false,
            "error": "Channel closed"
        })),
        Err(_) => Ok(serde_json::json!({
            "success": false,
            "error": "Script execution timeout"
        })),
    }
}

/// Poll for async script result
#[cfg(windows)]
async fn poll_async_result<R: Runtime>(
    window: &WebviewWindow<R>,
    exec_id: &str,
    timeout_ms: u64,
) -> Result<Value, String> {
    use std::time::{Duration, Instant};

    let start = Instant::now();
    let poll_script = format!("window.__mcp_result_{}", exec_id);

    while start.elapsed() < Duration::from_millis(timeout_ms) {
        // Small delay between polls
        tokio::time::sleep(Duration::from_millis(50)).await;

        let (tx, rx) = oneshot::channel::<String>();
        let tx = Arc::new(Mutex::new(Some(tx)));
        let tx_clone = tx.clone();
        let poll_script_clone = poll_script.clone();

        let result = window.with_webview(move |webview| {
            use webview2_com::ExecuteScriptCompletedHandler;
            use windows::core::HSTRING;

            let controller = webview.controller();

            unsafe {
                if let Ok(core_webview2) = controller.CoreWebView2() {
                    let handler = ExecuteScriptCompletedHandler::create(Box::new(
                        move |error_code, result| {
                            if let Some(tx) = tx_clone.lock().unwrap().take() {
                                if error_code.is_ok() {
                                    let result_str = result.to_string();
                                    let clean = if result_str.starts_with('"')
                                        && result_str.ends_with('"')
                                    {
                                        serde_json::from_str::<String>(&result_str)
                                            .unwrap_or(result_str.clone())
                                    } else {
                                        result_str
                                    };
                                    let _ = tx.send(clean);
                                }
                            }
                            Ok(())
                        },
                    ));

                    let script_hstring = HSTRING::from(&poll_script_clone);
                    let _ = core_webview2.ExecuteScript(&script_hstring, &handler);
                }
            }
        });

        if result.is_err() {
            continue;
        }

        if let Ok(Ok(result_str)) = tokio::time::timeout(Duration::from_millis(100), rx).await {
            // Check if result is ready (not null/undefined)
            if result_str != "null" && result_str != "undefined" && !result_str.is_empty() {
                mcp_log_info(
                    "EXECUTE_JS",
                    &format!(
                        "Async result ready: {}...",
                        &result_str.chars().take(100).collect::<String>()
                    ),
                );

                // Clean up the global variable
                let cleanup_script = format!("delete window.__mcp_result_{}", exec_id);
                let _ = window.eval(&cleanup_script);

                return match serde_json::from_str::<Value>(&result_str) {
                    Ok(parsed) => Ok(parsed),
                    Err(e) => Ok(serde_json::json!({
                        "success": false,
                        "error": format!("Failed to parse async result: {}", e)
                    })),
                };
            }
        }
    }

    mcp_log_error("EXECUTE_JS", "Async script timeout");
    Ok(serde_json::json!({
        "success": false,
        "error": "Async script execution timeout"
    }))
}

/// Prepare script by adding return statement if needed.
fn prepare_script(script: &str) -> String {
    let trimmed = script.trim();
    let needs_return = !trimmed.starts_with("return ");

    let has_real_semicolons = if let Some(without_trailing) = trimmed.strip_suffix(';') {
        without_trailing.contains(';')
    } else {
        trimmed.contains(';')
    };

    let is_multi_statement = has_real_semicolons
        || trimmed.starts_with("const ")
        || trimmed.starts_with("let ")
        || trimmed.starts_with("var ")
        || trimmed.starts_with("if ")
        || trimmed.starts_with("for ")
        || trimmed.starts_with("while ")
        || trimmed.starts_with("function ")
        || trimmed.starts_with("class ")
        || trimmed.starts_with("try ");

    let is_single_expression = trimmed.starts_with("await ")
        || trimmed.starts_with("(")
        || trimmed.starts_with("JSON.")
        || trimmed.starts_with("{")
        || trimmed.starts_with("[")
        || trimmed.ends_with(")()");

    let is_wrapped_expression = (trimmed.starts_with("(") && trimmed.ends_with(")"))
        || (trimmed.starts_with("(") && trimmed.ends_with(")()"))
        || (trimmed.starts_with("JSON.") && trimmed.ends_with(")"))
        || trimmed.starts_with("await ");

    if needs_return && (is_single_expression || is_wrapped_expression || !is_multi_statement) {
        format!("return {}", trimmed)
    } else {
        script.to_string()
    }
}
