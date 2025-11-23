import { z } from 'zod';
import { getPluginClient, connectPlugin } from './plugin-client.js';

export const ExecuteIPCCommandSchema = z.object({
   command: z.string(),
   args: z.unknown().optional(),
});

export async function executeIPCCommand(command: string, args: unknown = {}): Promise<string> {
   try {
      // Ensure we're connected to the plugin
      await connectPlugin();
      const client = getPluginClient();

      // Send IPC command via WebSocket to the mcp-bridge plugin
      const response = await client.sendCommand({
         command: 'invoke_tauri',
         args: { command, args },
      });

      if (!response.success) {
         return JSON.stringify({ success: false, error: response.error || 'Unknown error' });
      }

      return JSON.stringify({ success: true, result: response.data });
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      return JSON.stringify({ success: false, error: message });
   }
}

export const GetWindowInfoSchema = z.object({});

export async function getWindowInfo(): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|get_window_info');

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      return JSON.stringify(parsed.result);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to get window info: ${message}`);
   }
}

// Combined schema for managing IPC monitoring
export const ManageIPCMonitoringSchema = z.object({
   action: z.enum([ 'start', 'stop' ]).describe('Action to perform: start or stop IPC monitoring'),
});

// Keep individual schemas for backward compatibility if needed
export const StartIPCMonitoringSchema = z.object({});
export const StopIPCMonitoringSchema = z.object({});

export async function manageIPCMonitoring(action: 'start' | 'stop'): Promise<string> {
   if (action === 'start') {
      return startIPCMonitoring();
   }
   return stopIPCMonitoring();
}

export async function startIPCMonitoring(): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|start_ipc_monitor');

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      return JSON.stringify(parsed.result);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to start IPC monitoring: ${message}`);
   }
}

export async function stopIPCMonitoring(): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|stop_ipc_monitor');

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      return JSON.stringify(parsed.result);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to stop IPC monitoring: ${message}`);
   }
}

export const GetIPCEventsSchema = z.object({
   filter: z.string().optional().describe('Filter events by command name'),
});

export async function getIPCEvents(filter?: string): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|get_ipc_events');

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      let events = parsed.result;

      if (filter && Array.isArray(events)) {
         events = events.filter((e: unknown) => {
            const event = e as { command?: string };

            return event.command && event.command.includes(filter);
         });
      }

      return JSON.stringify(events);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to get IPC events: ${message}`);
   }
}

export const EmitTestEventSchema = z.object({
   eventName: z.string(),
   payload: z.unknown(),
});

export async function emitTestEvent(eventName: string, payload: unknown): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|emit_event', {
         eventName,
         payload,
      });

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      return JSON.stringify(parsed.result);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to emit event: ${message}`);
   }
}

export const GetBackendStateSchema = z.object({});

export async function getBackendState(): Promise<string> {
   try {
      const result = await executeIPCCommand('plugin:mcp-bridge|get_backend_state');

      const parsed = JSON.parse(result);

      if (!parsed.success) {
         throw new Error(parsed.error || 'Unknown error');
      }

      return JSON.stringify(parsed.result);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to get backend state: ${message}`);
   }
}
