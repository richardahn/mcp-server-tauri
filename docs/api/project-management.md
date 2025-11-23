# Project Management Tools

Essential tools for managing your Tauri project lifecycle, from running CLI commands to configuring your application and managing mobile development environments.

## tauri_run_command

Run any Tauri CLI command with full flexibility.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | string | Yes | The Tauri command to run (e.g., 'init', 'dev', 'build', 'android dev') |
| `cwd` | string | Yes | Working directory for the command (the Tauri project directory) |
| `args` | string[] | No | Additional arguments to pass to the command |
| `timeout` | number | No | Command timeout in milliseconds (default: 180000) |

### Example

```json
{
  "tool": "tauri_run_command",
  "command": "build",
  "cwd": "/path/to/project",
  "args": ["--target", "universal-apple-darwin"]
}
```

### Response

Returns the command output as text.

## tauri_read_config

Read Tauri configuration files, including platform-specific configurations.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectPath` | string | Yes | Path to the Tauri project |
| `file` | string | Yes | Config file to read (see supported files below) |

**Supported files:**
- `tauri.conf.json`, `tauri.conf.json5`, `Tauri.toml`
- Platform-specific: `tauri.windows.conf.json`, `tauri.linux.conf.json`, `tauri.macos.conf.json`, `tauri.android.conf.json`, `tauri.ios.conf.json`
- Build-specific: `tauri.conf.dev.json`, `tauri.conf.prod.json`
- Project files: `Cargo.toml`, `package.json`
- Mobile: `Info.plist`, `AndroidManifest.xml`

### Example

```json
{
  "tool": "tauri_read_config",
  "projectPath": "/path/to/project",
  "file": "tauri.conf.json"
}
```

### Response

Returns the file contents as text.

## tauri_write_config

Write to Tauri configuration files with validation.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectPath` | string | Yes | Path to the Tauri project |
| `file` | string | Yes | Config file to write (same options as read_config) |
| `content` | string | Yes | The new content of the file |

### Example

```json
{
  "tool": "tauri_write_config",
  "projectPath": "/path/to/project",
  "file": "tauri.conf.json",
  "content": "{ \"productName\": \"My App\" }"
}
```

### Response

Returns confirmation message on success.

## tauri_get_docs

Get Tauri documentation (LLM Cheat Sheet) for the detected project version.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectPath` | string | Yes | Path to the Tauri project |

### Example

```json
{
  "tool": "tauri_get_docs",
  "projectPath": "/path/to/project"
}
```

### Response

Returns Tauri documentation as markdown text, tailored for the detected version.

## Common Use Cases

### Creating a New Project

```javascript
// Initialize a new Tauri project
{
  "tool": "tauri_run_command",
  "command": "init",
  "cwd": "/workspace"
}
```

### Building for Production

```javascript
// Build for current platform
{
  "tool": "tauri_run_command",
  "command": "build",
  "cwd": "/path/to/project"
}

// Build for specific target
{
  "tool": "tauri_run_command",
  "command": "build",
  "cwd": "/path/to/project",
  "args": ["--target", "x86_64-pc-windows-msvc"]
}
```

### Running on Mobile

```javascript
// Run on Android
{
  "tool": "tauri_run_command",
  "command": "android dev",
  "cwd": "/path/to/project"
}
```

## Mobile Development Tools

### tauri_list_devices

List available Android devices and iOS simulators for mobile development.

### Parameters

None.

### Example

```json
{
  "tool": "tauri_list_devices"
}
```

### Response

Returns lists of Android devices and iOS simulators.

### tauri_launch_emulator

Launch Android emulator or iOS simulator for testing.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `platform` | string | Yes | Platform: 'android' or 'ios' |
| `name` | string | Yes | Name of the AVD or Simulator |

### Example

```json
{
  "tool": "tauri_launch_emulator",
  "platform": "android",
  "name": "Pixel_6_Pro_API_33"
}
```

### Response

Returns confirmation message when emulator/simulator is launched.
