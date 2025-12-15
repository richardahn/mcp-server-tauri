//! Script executor state and result handling.

use crate::logging::mcp_log_info;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{command, AppHandle, Manager, Runtime};
use tokio::sync::{oneshot, Mutex};

/// Store for pending script execution results
pub type PendingResults = Arc<Mutex<HashMap<String, oneshot::Sender<Value>>>>;

/// Script executor state for managing JavaScript execution
#[derive(Clone)]
pub struct ScriptExecutor {
    pub pending_results: PendingResults,
}

impl ScriptExecutor {
    pub fn new() -> Self {
        Self {
            pending_results: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn handle_result(
        &self,
        exec_id: &str,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
    ) {
        let mut pending = self.pending_results.lock().await;

        mcp_log_info(
            "SCRIPT_EXEC",
            &format!(
                "handle_result called: exec_id={}, success={}, pending_count={}",
                exec_id,
                success,
                pending.len(),
            ),
        );

        if let Some(tx) = pending.remove(exec_id) {
            let result = if success {
                serde_json::json!({
                    "success": true,
                    "result": data
                })
            } else {
                serde_json::json!({
                    "success": false,
                    "error": error.unwrap_or_else(|| "Unknown error".to_string())
                })
            };

            let _ = tx.send(result);
        }
    }
}

impl Default for ScriptExecutor {
    fn default() -> Self {
        Self::new()
    }
}

/// Command to receive script execution results from JavaScript.
///
/// This is called by JavaScript after script execution completes.
#[command(rename_all = "snake_case")]
pub async fn script_result<R: Runtime>(
    app: AppHandle<R>,
    exec_id: String,
    success: bool,
    data: Option<Value>,
    error: Option<String>,
) -> Result<(), String> {
    // Get the script executor from app state
    if let Some(executor) = app.try_state::<ScriptExecutor>() {
        executor
            .handle_result(&exec_id, success, data, error)
            .await;
    }

    Ok(())
}


