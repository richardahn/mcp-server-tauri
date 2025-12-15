//! JavaScript execution in webview.
//!
//! Fixed for Tauri 2.x compatibility: Uses DOM events to send results through
//! the bridge.js, which can properly invoke Rust commands from the main context.

use super::script_executor::ScriptExecutor;
use crate::logging::mcp_log_info;
use serde_json::Value;
use tauri::{command, Runtime, State, WebviewWindow};
use tokio::sync::oneshot;
use uuid::Uuid;

/// Executes JavaScript code in the webview context.
#[command]
pub async fn execute_js<R: Runtime>(
    window: WebviewWindow<R>,
    script: String,
    state: State<'_, ScriptExecutor>,
) -> Result<Value, String> {
    // Generate unique execution ID
    let exec_id = Uuid::new_v4().to_string();

    mcp_log_info(
        "EXECUTE_JS",
        &format!("Executing script with exec_id: {}", exec_id),
    );

    // Create oneshot channel for the result
    let (tx, rx) = oneshot::channel();

    // Store the sender for when result comes back via script_result command
    {
        let mut pending = state.pending_results.lock().await;
        pending.insert(exec_id.clone(), tx);
    }

    // Prepare the script with appropriate return handling
    let prepared_script = prepare_script(&script);

    // Create wrapped script that uses DOM events to communicate back through bridge.js
    // The bridge.js (which runs in main context, not eval context) will forward
    // the result to Rust via invoke(), which works properly from there.
    let wrapped_script = format!(
        r#"
        (function() {{
            // Helper to send result back via DOM event
            // bridge.js will catch this and forward to Rust
            function __sendResult(success, data, error) {{
                try {{
                    window.dispatchEvent(new CustomEvent('__mcp_script_result', {{
                        detail: {{
                            exec_id: '{exec_id}',
                            success: success,
                            data: data !== undefined ? data : null,
                            error: error
                        }}
                    }}));
                }} catch (e) {{
                    console.error('[MCP] Failed to dispatch result:', e);
                }}
            }}

            // Execute the user script
            (async () => {{
                try {{
                    // Create function to execute user script
                    const __executeScript = async () => {{
                        {prepared_script}
                    }};

                    // Execute and get result
                    const __result = await __executeScript();

                    __sendResult(true, __result !== undefined ? __result : null, null);
                }} catch (error) {{
                    __sendResult(false, null, error?.message || String(error));
                }}
            }})().catch(function(error) {{
                // Catch any unhandled promise rejections
                __sendResult(false, null, error?.message || String(error));
            }});
        }})();
        "#
    );

    // Execute the wrapped script
    if let Err(e) = window.eval(&wrapped_script) {
        // Clean up pending result on error
        let mut pending = state.pending_results.lock().await;
        pending.remove(&exec_id);

        return Ok(serde_json::json!({
            "success": false,
            "error": format!("Failed to execute script: {}", e)
        }));
    }

    mcp_log_info(
        "EXECUTE_JS",
        "Script injected, waiting for result via DOM event -> bridge.js -> invoke...",
    );

    // Wait for result with timeout
    let result = match tokio::time::timeout(std::time::Duration::from_secs(5), rx).await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(_)) => {
            // Channel was dropped
            Ok(serde_json::json!({
                "success": false,
                "error": "Script execution failed: channel closed"
            }))
        }
        Err(_) => {
            // Timeout - clean up pending result
            let mut pending = state.pending_results.lock().await;
            pending.remove(&exec_id);

            Ok(serde_json::json!({
                "success": false,
                "error": "Script execution timeout"
            }))
        }
    };

    result
}

/// Prepare script by adding return statement if needed.
fn prepare_script(script: &str) -> String {
    let trimmed = script.trim();
    let needs_return = !trimmed.starts_with("return ");

    // Check if it's a multi-statement script
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

    // Single expression patterns
    let is_single_expression = trimmed.starts_with("await ")
        || trimmed.starts_with("(")
        || trimmed.starts_with("JSON.")
        || trimmed.starts_with("{")
        || trimmed.starts_with("[")
        || trimmed.ends_with(")()");

    let is_wrapped_expression = (trimmed.starts_with("(") && trimmed.ends_with(")"))
        || (trimmed.starts_with("(") && trimmed.ends_with(")()"))
        || (trimmed.starts_with("JSON.") && trimmed.ends_with(")"))
        || (trimmed.starts_with("await "));

    if needs_return && (is_single_expression || is_wrapped_expression || !is_multi_statement) {
        format!("return {}", trimmed)
    } else {
        script.to_string()
    }
}
