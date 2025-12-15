//! Configuration for the MCP Bridge plugin.
//!
//! This module provides configuration options for customizing the plugin behavior,
//! including the WebSocket server bind address and port.

/// Configuration for the MCP Bridge plugin.
#[derive(Clone, Debug)]
pub struct Config {
    /// The address to bind the WebSocket server to.
    /// Default: "0.0.0.0" (all interfaces, for remote device support)
    /// Use "127.0.0.1" for localhost-only access.
    pub bind_address: String,

    /// Optional explicit port for the WebSocket server.
    /// When `Some(port)`, the server will use exactly this port and fail if unavailable.
    /// When `None`, the server auto-selects from the range 9223-9322.
    pub port: Option<u16>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind_address: "0.0.0.0".to_string(),
            port: None,
        }
    }
}

impl Config {
    /// Creates a new configuration with the specified bind address.
    pub fn new(bind_address: &str) -> Self {
        Self {
            bind_address: bind_address.to_string(),
            port: None,
        }
    }

    /// Creates a configuration that binds to localhost only.
    pub fn localhost_only() -> Self {
        Self {
            bind_address: "127.0.0.1".to_string(),
            port: None,
        }
    }
}

/// Builder for creating a configured MCP Bridge plugin.
///
/// # Examples
///
/// ```rust,ignore
/// use tauri_plugin_mcp_bridge::Builder;
///
/// // Default: binds to 0.0.0.0 (all interfaces), auto-selects port
/// let plugin: tauri::plugin::TauriPlugin<tauri::Wry> = Builder::new().build();
///
/// // Localhost only with auto-selected port:
/// let plugin: tauri::plugin::TauriPlugin<tauri::Wry> = Builder::new()
///     .bind_address("127.0.0.1")
///     .build();
///
/// // Explicit port (strict mode - fails if unavailable):
/// let plugin: tauri::plugin::TauriPlugin<tauri::Wry> = Builder::new()
///     .port(9225)
///     .build();
/// ```
pub struct Builder {
    config: Config,
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

impl Builder {
    /// Creates a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: Config::default(),
        }
    }

    /// Sets the bind address for the WebSocket server.
    ///
    /// # Arguments
    ///
    /// * `addr` - The address to bind to (e.g., "0.0.0.0" or "127.0.0.1")
    ///
    /// # Examples
    ///
    /// ```rust
    /// use tauri_plugin_mcp_bridge::Builder;
    ///
    /// let builder = Builder::new().bind_address("127.0.0.1");
    /// ```
    pub fn bind_address(mut self, addr: &str) -> Self {
        self.config.bind_address = addr.to_string();
        self
    }

    /// Sets an explicit port for the WebSocket server.
    ///
    /// When set, the plugin will use exactly this port and fail if it's
    /// unavailable (strict mode). When not set, the plugin auto-selects
    /// from the range 9223-9322.
    ///
    /// # Arguments
    ///
    /// * `port` - The port number to bind to
    ///
    /// # Examples
    ///
    /// ```rust
    /// use tauri_plugin_mcp_bridge::Builder;
    ///
    /// // Use explicit port 9225
    /// let builder = Builder::new().port(9225);
    /// ```
    pub fn port(mut self, port: u16) -> Self {
        self.config.port = Some(port);
        self
    }

    /// Builds the plugin with the configured options.
    pub fn build<R: tauri::Runtime>(self) -> tauri::plugin::TauriPlugin<R> {
        crate::init_with_config(self.config)
    }
}
