# UI Automation

Control and automate your Tauri application's UI using native Tauri IPC. These tools provide comprehensive automation capabilities for testing and interaction, working seamlessly across all platforms (Linux, Windows, macOS).

## tauri_driver_session

Manage UI automation session lifecycle. Initializes console log capture and prepares the webview for automation.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | string | Yes | Action to perform: 'start' or 'stop' |

### Example

```javascript
// Start an automation session
{
  "tool": "tauri_driver_session",
  "action": "start"
}
```

### Response

```
Session started (native IPC mode)
```

**Note**: The session uses native Tauri IPC via WebSocket, no external driver process required.

## tauri_webview_find_element

Find UI elements using various selector strategies via native JavaScript.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | Yes | Element selector |
| `strategy` | string | No | Selector strategy: 'css', 'xpath', 'text' (default: 'css') |

### Example

```javascript
// Find a button by CSS selector
{
  "tool": "tauri_webview_find_element",
  "selector": "#submit-button",
  "strategy": "css"
}

// Find by text content
{
  "tool": "tauri_webview_find_element",
  "selector": "Submit",
  "strategy": "text"
}
```

### Response

Returns element information including tag name, text content, and attributes.

## tauri_driver_get_console_logs

Retrieve console logs from the application's webview using the built-in console capture system.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | string | No | Regex pattern to filter log messages |
| `since` | string | No | ISO timestamp to filter logs after this time |

### Example

```javascript
// Get all console logs
{
  "tool": "tauri_driver_get_console_logs"
}

// Get logs matching a pattern
{
  "tool": "tauri_driver_get_console_logs",
  "filter": "error|warning"
}
```

### Response

Returns captured console logs with timestamps and log levels.

## tauri_read_platform_logs

Read platform logs from Android devices (logcat), iOS simulators, or desktop system logs. This is distinct from `tauri_driver_get_console_logs` which retrieves JavaScript console logs from the webview.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | string | Yes | Log source: 'android', 'ios', 'system' |
| `lines` | number | No | Number of log lines to retrieve (default: 50) |
| `filter` | string | No | Regex or keyword to filter logs |
| `since` | string | No | ISO timestamp to filter logs since |

### Example

```javascript
// Read Android logcat
{
  "tool": "tauri_read_platform_logs",
  "source": "android",
  "filter": "com.myapp",
  "lines": 100
}

// Read system logs
{
  "tool": "tauri_read_platform_logs",
  "source": "system",
  "lines": 50
}
```

### Response

Returns log entries from the specified source.
