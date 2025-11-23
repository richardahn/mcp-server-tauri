# IPC & Plugin Tools

Access Tauri's Inter-Process Communication (IPC) layer directly through the MCP Bridge plugin. These tools provide deep integration with your Tauri backend, window management, and event system.

## tauri_plugin_execute_ipc

Execute any Tauri IPC command directly.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | string | Yes | IPC command name to execute |
| `args` | any | No | Command arguments |

### Example

```javascript
// Call a custom Tauri command
{
  "tool": "tauri_plugin_execute_ipc",
  "command": "greet",
  "args": {
    "name": "World"
  }
}
```

### Response

Returns the result of the IPC command execution.

## tauri_plugin_get_window_info

Get detailed information about the current application window.

### Parameters

None.

### Example

```javascript
{
  "tool": "tauri_plugin_get_window_info"
}
```

### Response

Returns window information including size, position, title, focus state, and visibility.

## tauri_plugin_ipc_monitor

Start or stop IPC event monitoring for debugging and analysis.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | string | Yes | Action: 'start' or 'stop' |

### Example

```javascript
// Start monitoring IPC events
{
  "tool": "tauri_plugin_ipc_monitor",
  "action": "start"
}

// Stop monitoring
{
  "tool": "tauri_plugin_ipc_monitor",
  "action": "stop"
}
```

## tauri_plugin_ipc_get_events

Retrieve captured IPC events from the monitor.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | string | No | Filter events by command name |

### Example

```javascript
// Get all captured IPC events
{
  "tool": "tauri_plugin_ipc_get_events"
}

// Get events matching a filter
{
  "tool": "tauri_plugin_ipc_get_events",
  "filter": "greet"
}
```

### Response

Returns an array of captured IPC events with timestamps, command names, and payloads.

## tauri_plugin_emit_event

Emit custom events to the Tauri event system for testing event handlers.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventName` | string | Yes | Event name to emit |
| `payload` | any | No | Event payload data |

### Example

```javascript
// Emit a custom event
{
  "tool": "tauri_plugin_emit_event",
  "eventName": "user-action",
  "payload": {
    "action": "button-clicked"
  }
}
```

## tauri_plugin_get_backend_state

Get comprehensive backend application state and metadata.

### Parameters

None.

### Example

```javascript
{
  "tool": "tauri_plugin_get_backend_state"
}
```

### Response

Returns detailed backend state:

```json
{
  "app": {
    "name": "My Tauri App",
    "identifier": "com.example.myapp",
    "version": "1.0.0"
  },
  "tauri": {
    "version": "2.9.3"
  },
  "environment": {
    "debug": true,
    "os": "macos",
    "arch": "aarch64",
    "family": "unix"
  },
  "windows": [
    {
      "label": "main",
      "title": "My App",
      "focused": true,
      "visible": true
    }
  ],
  "window_count": 1,
  "timestamp": 1732654123456
}
```
