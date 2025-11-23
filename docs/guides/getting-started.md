# Getting Started with MCP Server Tauri

This guide will walk you through setting up MCP Server Tauri with your AI assistant and creating your first Tauri application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ and npm
- **Rust** and Cargo
- **Tauri CLI**: Install with `npm install -g @tauri-apps/cli@next`
- An MCP-compatible AI Assistant (Claude Code, Cursor, VS Code, etc.)

## Step 1: Add the MCP Bridge Plugin to Your Tauri App

The MCP Bridge plugin enables communication between the MCP server and your Tauri application. Add it to your Tauri app's `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-mcp-bridge = "0.1"
```

Then register the plugin in `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_mcp_bridge::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Step 2: Configure Your AI Assistant

See the [home page](/) for detailed, assistant-specific configuration examples (Claude Code, Cursor, VS Code, Windsurf, Cline, etc.). The configuration snippets there all point to the same command:

```json
"args": ["-y", "@hypothesi/tauri-mcp-server"]
```

This tells your assistant to launch the MCP server via `npx @hypothesi/tauri-mcp-server`.

### Using Local Development Build

If you're developing the MCP server itself, you can point to your local build:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tauri-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-tauri/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Make sure to replace `/absolute/path/to` with the actual path to your installation.

## Step 3: Verify the Installation

Restart your AI Assistant and verify that the MCP server is loaded. You can ask:

> "What Tauri tools are available?"

The assistant should list the available MCP tools for Tauri development.

## Step 4: Create Your First Tauri App

Now you can ask your AI Assistant to create a Tauri application:

> "Create a new Tauri application called 'my-app' with React and TypeScript"

Your AI Assistant will use the MCP tools to:
1. Initialize a new Tauri project
2. Set up the frontend with React and TypeScript
3. Configure the Rust backend
4. Install necessary dependencies

## Step 5: Run the Development Server

Once the app is created, you can start the development server:

> "Start the Tauri development server for my-app"

This will launch your application in development mode with hot-reload enabled.

## Step 6: Explore Available Tools

The MCP server provides many tools for Tauri development:

- **Project Management**: Create, configure, and build Tauri apps
- **Mobile Development**: Test on Android and iOS devices
- **UI Automation**: Automate UI testing
- **IPC Monitoring**: Debug communication between frontend and backend
- **Configuration Management**: Modify Tauri configuration files

Ask your AI Assistant about specific tasks:

> "Show me how to add a new IPC command to my Tauri app"

> "Help me configure my app for Android development"

> "Create a UI test for the main window"

## Next Steps

Now that you have MCP Server Tauri set up, you can:

1. **Explore the API Reference** to learn about all available tools
2. **Read the Mobile Development Guide** to build for Android and iOS
3. **Learn about IPC Monitoring** to debug your application
4. **Check out Best Practices** for efficient development

## Troubleshooting

### MCP Server Not Loading

If your AI Assistant doesn't recognize the MCP tools:

1. Verify the path in your configuration is correct
2. Check that the build completed successfully (or use `npx @hypothesi/tauri-mcp-server` for the published version)
3. Restart your AI Assistant application
4. Check the logs for any error messages

### Build Errors

If you encounter build errors:

1. Ensure all prerequisites are installed
2. Try cleaning and rebuilding: `npm run clean && npm run build`
3. Check that you have the correct Node.js version (20+)
4. Verify Rust and Cargo are properly installed

### Need Help?

- Check the [GitHub Issues](https://github.com/hypothesi/mcp-server-tauri/issues)
- Read the [Tauri Documentation](https://tauri.app)
- Learn about the [Model Context Protocol](https://modelcontextprotocol.io)
