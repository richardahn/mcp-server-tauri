/**
 * Configuration for the MCP Bridge connection.
 *
 * This module provides configuration options for connecting to Tauri apps,
 * with support for environment variables and sensible defaults.
 */

export interface BridgeConfig {
   host: string;
   port: number;
}

/**
 * Gets the default host for MCP Bridge connections.
 *
 * Resolution priority:
 * 1. MCP_BRIDGE_HOST environment variable
 * 2. TAURI_DEV_HOST environment variable (set by Tauri CLI for mobile dev)
 * 3. 'localhost' (default)
 */
export function getDefaultHost(): string {
   // eslint-disable-next-line no-process-env
   return process.env.MCP_BRIDGE_HOST || process.env.TAURI_DEV_HOST || 'localhost';
}

/**
 * Gets the default port for MCP Bridge connections.
 *
 * Resolution priority:
 * 1. MCP_BRIDGE_PORT environment variable
 * 2. 9223 (default)
 */
export function getDefaultPort(): number {
   // eslint-disable-next-line no-process-env
   const port = process.env.MCP_BRIDGE_PORT;

   return port ? parseInt(port, 10) : 9223;
}

/**
 * Gets the full bridge configuration from environment variables.
 */
export function getConfig(): BridgeConfig {
   return {
      host: getDefaultHost(),
      port: getDefaultPort(),
   };
}

/**
 * Builds a WebSocket URL from host and port.
 */
export function buildWebSocketURL(host: string, port: number): string {
   return `ws://${host}:${port}`;
}
