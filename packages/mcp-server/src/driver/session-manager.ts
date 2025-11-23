import { z } from 'zod';

import { getDefaultHost, getDefaultPort } from '../config.js';
import { AppDiscovery } from './app-discovery.js';
import { resetPluginClient } from './plugin-client.js';
import { resetInitialization } from './webview-executor.js';

/**
 * Session Manager - Native IPC-based session management
 *
 * This module provides lightweight native session management using Tauri IPC.
 * The "session" concept is maintained for API compatibility.
 *
 * Connection Strategy:
 * 1. Try localhost first (most reliable for simulators/emulators/desktop)
 * 2. If localhost fails and a remote host is configured, try that host
 * 3. Return error if all connection attempts fail
 */

// ============================================================================
// Schemas
// ============================================================================

export const ManageDriverSessionSchema = z.object({
   action: z.enum([ 'start', 'stop' ]).describe('Action to perform: start or stop the session'),
   host: z.string().optional().describe(
      'Host address to connect to (e.g., 192.168.1.100). Falls back to MCP_BRIDGE_HOST or TAURI_DEV_HOST env vars'
   ),
   port: z.number().optional().describe('Port to connect to (default: 9223)'),
});

// ============================================================================
// Module State
// ============================================================================

// AppDiscovery instance - recreated when host changes
let appDiscovery: AppDiscovery | null = null;

function getAppDiscovery(host: string): AppDiscovery {
   if (!appDiscovery || appDiscovery.host !== host) {
      appDiscovery = new AppDiscovery(host);
   }

   return appDiscovery;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Try to connect to a specific host and port.
 * Returns session info on success, throws on failure.
 */
async function tryConnect(host: string, port: number): Promise<{ name: string; host: string; port: number }> {
   const discovery = getAppDiscovery(host);

   const session = await discovery.connectToPort(port, undefined, host);

   return {
      name: session.name,
      host: session.host,
      port: session.port,
   };
}

/**
 * Manage session lifecycle (start or stop).
 *
 * Connection strategy for 'start':
 * 1. Try localhost:{port} first (most reliable for simulators/emulators/desktop)
 * 2. If localhost fails AND a different host is configured, try {host}:{port}
 * 3. If both fail, try auto-discovery on localhost
 * 4. Return error if all attempts fail
 *
 * @param action - 'start' or 'stop'
 * @param host - Optional host address (defaults to env var or localhost)
 * @param port - Optional port number (defaults to 9223)
 */
export async function manageDriverSession(
   action: 'start' | 'stop',
   host?: string,
   port?: number
): Promise<string> {
   if (action === 'start') {
      // Reset any existing plugin client to ensure fresh connection
      resetPluginClient();

      const configuredHost = host ?? getDefaultHost();

      const configuredPort = port ?? getDefaultPort();

      // Strategy 1: Try localhost first (most reliable)
      if (configuredHost !== 'localhost' && configuredHost !== '127.0.0.1') {
         try {
            const session = await tryConnect('localhost', configuredPort);

            return `Session started with app: ${session.name} (localhost:${session.port})`;
         } catch{
            // Localhost failed, will try configured host next
         }
      }

      // Strategy 2: Try the configured/provided host
      try {
         const session = await tryConnect(configuredHost, configuredPort);

         return `Session started with app: ${session.name} (${session.host}:${session.port})`;
      } catch{
         // Configured host failed
      }

      // Strategy 3: Auto-discover on localhost (scan port range)

      const localhostDiscovery = getAppDiscovery('localhost');

      const firstApp = await localhostDiscovery.getFirstAvailableApp();

      if (firstApp) {
         try {
            // Reset client again to connect to discovered port
            resetPluginClient();

            const session = await tryConnect('localhost', firstApp.port);

            return `Session started with app: ${session.name} (localhost:${session.port})`;
         } catch{
            // Discovery found app but connection failed
         }
      }

      // Strategy 4: Try default port on configured host as last resort
      try {
         resetPluginClient();

         const session = await tryConnect(configuredHost, configuredPort);

         return `Session started with app: ${session.name} (${session.host}:${session.port})`;
      } catch{
         // All attempts failed
         return `Session started (native IPC mode - no Tauri app found at localhost or ${configuredHost}:${configuredPort})`;
      }
   }

   // Stop action - disconnect all apps and reset initialization state
   if (appDiscovery) {
      await appDiscovery.disconnectAll();
   }

   resetPluginClient();
   resetInitialization();

   return 'Session stopped';
}
