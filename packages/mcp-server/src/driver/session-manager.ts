import { z } from 'zod';

import { getDefaultHost, getDefaultPort } from '../config.js';
import { AppDiscovery } from './app-discovery.js';
import { resetPluginClient, getPluginClient } from './plugin-client.js';
import { resetInitialization } from './webview-executor.js';

/**
 * Session Manager - Native IPC-based session management
 *
 * This module provides lightweight native session management using Tauri IPC.
 * The "session" concept is maintained for API compatibility.
 *
 * Connection Strategy (when port is NOT explicitly configured):
 * 1. Try localhost first (most reliable for simulators/emulators/desktop)
 * 2. If localhost fails and a remote host is configured, try that host
 * 3. Auto-discover on localhost (scan port range)
 * 4. Return error if all connection attempts fail
 *
 * Connection Strategy (when port IS explicitly configured via env var or param):
 * 1. Try localhost first (most reliable)
 * 2. Try configured host if different from localhost
 * 3. SKIP auto-discovery (to prevent connecting to wrong app)
 * 4. Return clear error message
 */

// ============================================================================
// Schemas
// ============================================================================

export const ManageDriverSessionSchema = z.object({
   action: z.enum([ 'start', 'stop', 'status' ]).describe('Action to perform: start or stop the session, or check status'),
   host: z.string().optional().describe(
      'Host address to connect to (e.g., 192.168.1.100). Falls back to MCP_BRIDGE_HOST or TAURI_DEV_HOST env vars'
   ),
   port: z.number().optional().describe('Port to connect to (default: 9223)'),
});

// ============================================================================
// Module State
// ============================================================================

// AppDiscovery instance - recreated when host changes
// Track current session info
let appDiscovery: AppDiscovery | null = null,
    currentSession: { name: string; host: string; port: number } | null = null;

function getAppDiscovery(host: string): AppDiscovery {
   if (!appDiscovery || appDiscovery.host !== host) {
      appDiscovery = new AppDiscovery(host);
   }

   return appDiscovery;
}

/**
 * Check if a port was explicitly configured via environment variable.
 */
function isPortExplicitlyConfigured(): boolean {
   return !!process.env.MCP_BRIDGE_PORT;
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
 * 3. If port is NOT explicitly configured, try auto-discovery on localhost
 * 4. Return error if all attempts fail
 *
 * When port is explicitly configured (via MCP_BRIDGE_PORT env var or port param),
 * auto-discovery is SKIPPED to prevent accidentally connecting to the wrong app.
 *
 * @param action - 'start' or 'stop'
 * @param host - Optional host address (defaults to env var or localhost)
 * @param port - Optional port number (defaults to 9223)
 */
export async function manageDriverSession(
   action: 'start' | 'stop' | 'status',
   host?: string,
   port?: number
): Promise<string> {
   // Handle status action
   if (action === 'status') {
      const client = getPluginClient();

      if (client.isConnected() && currentSession) {
         return JSON.stringify({
            connected: true,
            app: currentSession.name,
            host: currentSession.host,
            port: currentSession.port,
         });
      }
      return JSON.stringify({
         connected: false,
         app: null,
         host: null,
         port: null,
      });
   }

   if (action === 'start') {
      // Reset any existing plugin client to ensure fresh connection
      resetPluginClient();

      const configuredHost = host ?? getDefaultHost();
      const configuredPort = port ?? getDefaultPort();

      // Determine if port is explicitly configured (via param or env var)
      // When explicit, we skip auto-discovery to prevent connecting to wrong app
      const portIsExplicit = port !== undefined || isPortExplicitlyConfigured();

      // Strategy 1: Try localhost first (most reliable)
      if (configuredHost !== 'localhost' && configuredHost !== '127.0.0.1') {
         try {
            const session = await tryConnect('localhost', configuredPort);

            currentSession = session;
            return `Session started with app: ${session.name} (localhost:${session.port})`;
         } catch {
            // Localhost failed, will try configured host next
         }
      }

      // Strategy 2: Try the configured/provided host
      try {
         const session = await tryConnect(configuredHost, configuredPort);

         currentSession = session;
         return `Session started with app: ${session.name} (${session.host}:${session.port})`;
      } catch {
         // Configured host failed
      }

      // Strategy 3: Auto-discover on localhost (scan port range)
      // SKIP this if port was explicitly configured to prevent connecting to wrong app
      if (!portIsExplicit) {
         const localhostDiscovery = getAppDiscovery('localhost');
         const firstApp = await localhostDiscovery.getFirstAvailableApp();

         if (firstApp) {
            try {
               // Reset client again to connect to discovered port
               resetPluginClient();

               const session = await tryConnect('localhost', firstApp.port);

               currentSession = session;
               return `Session started with app: ${session.name} (localhost:${session.port})`;
            } catch {
               // Discovery found app but connection failed
            }
         }
      }

      // If port was explicitly configured and we get here, fail with clear message
      if (portIsExplicit) {
         currentSession = null;
         return `Failed to connect to Tauri app at ${configuredHost}:${configuredPort}. ` +
                `Port ${configuredPort} was explicitly configured - auto-discovery disabled. ` +
                `Ensure your Tauri app is running with the MCP Bridge plugin on this port.`;
      }

      // Strategy 4: Try default port on configured host as last resort (non-explicit port only)
      try {
         resetPluginClient();

         const session = await tryConnect(configuredHost, configuredPort);

         currentSession = session;
         return `Session started with app: ${session.name} (${session.host}:${session.port})`;
      } catch {
         // All attempts failed
         currentSession = null;
         return `Session started (native IPC mode - no Tauri app found at localhost or ${configuredHost}:${configuredPort})`;
      }
   }

   // Stop action - disconnect all apps and reset initialization state
   if (appDiscovery) {
      await appDiscovery.disconnectAll();
   }

   resetPluginClient();
   resetInitialization();
   currentSession = null;

   return 'Session stopped';
}
