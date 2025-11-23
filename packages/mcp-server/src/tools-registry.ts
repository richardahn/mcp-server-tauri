/**
 * Single source of truth for all MCP tool definitions
 * This file defines all available tools and their metadata
 */

import { z } from 'zod';
import { runTauriCommand, RunCommandSchema } from './manager/cli.js';
import { readConfig, writeConfig, ReadConfigSchema, WriteConfigSchema } from './manager/config.js';
import { listDevices, launchEmulator, ListDevicesSchema, LaunchEmulatorSchema } from './manager/mobile.js';
import {
   manageDriverSession,
   ManageDriverSessionSchema,
} from './driver/session-manager.js';
import { readLogs, ReadLogsSchema } from './monitor/logs.js';
import { getDocs, GetDocsSchema } from './manager/docs.js';
import {
   executeIPCCommand, getWindowInfo,
   manageIPCMonitoring, getIPCEvents, emitTestEvent, getBackendState,
   ExecuteIPCCommandSchema, GetWindowInfoSchema,
   ManageIPCMonitoringSchema, GetIPCEventsSchema, EmitTestEventSchema,
   GetBackendStateSchema,
} from './driver/plugin-commands.js';
import {
   interact, screenshot, keyboard, waitFor, getStyles,
   executeJavaScript, focusElement, findElement, getConsoleLogs,
   InteractSchema, ScreenshotSchema, KeyboardSchema,
   WaitForSchema, GetStylesSchema, ExecuteJavaScriptSchema,
   FocusElementSchema, FindElementSchema, GetConsoleLogsSchema,
} from './driver/webview-interactions.js';

export type ToolHandler = (args: unknown) => Promise<string>;

export interface ToolDefinition {
   name: string;
   description: string;
   category: string;
   schema: z.ZodSchema;
   handler: ToolHandler;
}

/**
 * Tool categories for organization
 */
export const TOOL_CATEGORIES = {
   PROJECT_MANAGEMENT: 'Project Management',
   MOBILE_DEVELOPMENT: 'Mobile Development',
   UI_AUTOMATION: 'UI Automation & WebView Interaction',
   IPC_PLUGIN: 'IPC & Plugin Tools (via MCP Bridge)',
} as const;

/**
 * Complete registry of all available tools
 * This is the single source of truth for tool definitions
 */
export const TOOLS: ToolDefinition[] = [
   // Project Management Tools
   {
      name: 'tauri_run_command',
      description: 'Run any Tauri CLI command with full flexibility',
      category: TOOL_CATEGORIES.PROJECT_MANAGEMENT,
      schema: RunCommandSchema,
      handler: async (args) => {
         const parsed = RunCommandSchema.parse(args);

         return await runTauriCommand(
            parsed.command,
            parsed.cwd,
            parsed.args || [],
            parsed.timeout
         );
      },
   },

   {
      name: 'tauri_read_config',
      description: 'Read Tauri configuration files (including platform-specific configs)',
      category: TOOL_CATEGORIES.PROJECT_MANAGEMENT,
      schema: ReadConfigSchema,
      handler: async (args) => {
         const parsed = ReadConfigSchema.parse(args);

         return await readConfig(parsed.projectPath, parsed.file);
      },
   },

   {
      name: 'tauri_write_config',
      description: 'Write to Tauri configuration files with validation',
      category: TOOL_CATEGORIES.PROJECT_MANAGEMENT,
      schema: WriteConfigSchema,
      handler: async (args) => {
         const parsed = WriteConfigSchema.parse(args);

         return await writeConfig(parsed.projectPath, parsed.file, parsed.content);
      },
   },

   {
      name: 'tauri_get_docs',
      description: 'Get Tauri documentation (LLM Cheat Sheet)',
      category: TOOL_CATEGORIES.PROJECT_MANAGEMENT,
      schema: GetDocsSchema,
      handler: async (args) => {
         const parsed = GetDocsSchema.parse(args);

         return await getDocs(parsed.projectPath);
      },
   },

   // Mobile Development Tools
   {
      name: 'tauri_list_devices',
      description: 'List Android devices and iOS simulators',
      category: TOOL_CATEGORIES.MOBILE_DEVELOPMENT,
      schema: ListDevicesSchema,
      handler: async () => {
         const devices = await listDevices();

         return `Android Devices:\n${devices.android.join('\n') || 'None'}\n\niOS Booted Simulators:\n${devices.ios.join('\n') || 'None'}`;
      },
   },

   {
      name: 'tauri_launch_emulator',
      description: 'Launch Android AVD or iOS Simulator',
      category: TOOL_CATEGORIES.MOBILE_DEVELOPMENT,
      schema: LaunchEmulatorSchema,
      handler: async (args) => {
         const parsed = LaunchEmulatorSchema.parse(args);

         return await launchEmulator(parsed.platform, parsed.name);
      },
   },

   // UI Automation Tools
   {
      name: 'tauri_driver_session',
      description: 'Manage automation session (start or stop). Supports remote device connections via host parameter.',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: ManageDriverSessionSchema,
      handler: async (args) => {
         const parsed = ManageDriverSessionSchema.parse(args);

         return await manageDriverSession(parsed.action, parsed.host, parsed.port);
      },
   },

   {
      name: 'tauri_webview_find_element',
      description: 'Find elements',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: FindElementSchema,
      handler: async (args) => {
         const parsed = FindElementSchema.parse(args);

         return await findElement(parsed.selector, parsed.strategy);
      },
   },

   {
      name: 'tauri_driver_get_console_logs',
      description: 'Get console logs',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: GetConsoleLogsSchema,
      handler: async (args) => {
         const parsed = GetConsoleLogsSchema.parse(args);

         return await getConsoleLogs(parsed.filter, parsed.since);
      },
   },

   {
      name: 'tauri_read_platform_logs',
      description: 'Read platform logs (Android logcat, iOS device logs, or system logs)',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: ReadLogsSchema,
      handler: async (args) => {
         const parsed = ReadLogsSchema.parse(args);

         return await readLogs(parsed.source, parsed.lines, parsed.filter, parsed.since);
      },
   },

   // WebView Interaction Tools
   {
      name: 'tauri_webview_interact',
      description: 'Perform gestures (click, double-click, long-press, swipe) or scroll',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: InteractSchema,
      handler: async (args) => {
         const parsed = InteractSchema.parse(args);

         return await interact(parsed);
      },
   },

   {
      name: 'tauri_webview_screenshot',
      description: 'Take a screenshot of the current viewport (visible area) of the webview. ' +
         '**Important**: This only captures what is currently visible. ' +
         'Scroll content into view before taking screenshots if you need to capture specific elements.',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: ScreenshotSchema,
      handler: async (args) => {
         const parsed = ScreenshotSchema.parse(args);

         return await screenshot(parsed.quality, parsed.format);
      },
   },

   {
      name: 'tauri_webview_keyboard',
      description: 'Type text or simulate keyboard events',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: KeyboardSchema,
      handler: async (args) => {
         const parsed = KeyboardSchema.parse(args);

         if (parsed.action === 'type') {
            return await keyboard(parsed.action, parsed.selector, parsed.text);
         }
         return await keyboard(parsed.action, parsed.key, parsed.modifiers);
      },
   },

   {
      name: 'tauri_webview_wait_for',
      description: 'Wait for elements, text, or events',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: WaitForSchema,
      handler: async (args) => {
         const parsed = WaitForSchema.parse(args);

         return await waitFor(parsed.type, parsed.value, parsed.timeout);
      },
   },

   {
      name: 'tauri_webview_get_styles',
      description: 'Get computed CSS styles',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: GetStylesSchema,
      handler: async (args) => {
         const parsed = GetStylesSchema.parse(args);

         return await getStyles(parsed.selector, parsed.properties, parsed.multiple);
      },
   },

   {
      name: 'tauri_webview_execute_js',
      description: 'Execute JavaScript in webview',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: ExecuteJavaScriptSchema,
      handler: async (args) => {
         const parsed = ExecuteJavaScriptSchema.parse(args);

         return await executeJavaScript(parsed.script, parsed.args);
      },
   },

   {
      name: 'tauri_webview_focus_element',
      description: 'Focus on specific elements',
      category: TOOL_CATEGORIES.UI_AUTOMATION,
      schema: FocusElementSchema,
      handler: async (args) => {
         const parsed = FocusElementSchema.parse(args);

         return await focusElement(parsed.selector);
      },
   },

   // IPC & Plugin Tools
   {
      name: 'tauri_plugin_execute_ipc',
      description: 'Execute Tauri IPC commands',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: ExecuteIPCCommandSchema,
      handler: async (args) => {
         const parsed = ExecuteIPCCommandSchema.parse(args);

         return await executeIPCCommand(parsed.command, parsed.args);
      },
   },

   {
      name: 'tauri_plugin_get_window_info',
      description: 'Get window information',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: GetWindowInfoSchema,
      handler: async () => {
         return await getWindowInfo();
      },
   },

   {
      name: 'tauri_plugin_ipc_monitor',
      description: 'Manage IPC monitoring (start or stop)',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: ManageIPCMonitoringSchema,
      handler: async (args) => {
         const parsed = ManageIPCMonitoringSchema.parse(args);

         return await manageIPCMonitoring(parsed.action);
      },
   },

   {
      name: 'tauri_plugin_ipc_get_events',
      description: 'Get captured IPC events',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: GetIPCEventsSchema,
      handler: async (args) => {
         const parsed = GetIPCEventsSchema.parse(args);

         return await getIPCEvents(parsed.filter);
      },
   },

   {
      name: 'tauri_plugin_emit_event',
      description: 'Emit custom events',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: EmitTestEventSchema,
      handler: async (args) => {
         const parsed = EmitTestEventSchema.parse(args);

         return await emitTestEvent(parsed.eventName, parsed.payload);
      },
   },

   {
      name: 'tauri_plugin_get_backend_state',
      description: 'Get comprehensive backend state including app metadata, Tauri version, environment info, and window list',
      category: TOOL_CATEGORIES.IPC_PLUGIN,
      schema: GetBackendStateSchema,
      handler: async () => {
         return await getBackendState();
      },
   },
];

/**
 * Get all tool names for type checking
 */
export type ToolName = typeof TOOLS[number]['name'];

/**
 * Get tools grouped by category
 */
export function getToolsByCategory(): Record<string, ToolDefinition[]> {
   const grouped: Record<string, ToolDefinition[]> = {};

   for (const tool of TOOLS) {
      if (!grouped[tool.category]) {
         grouped[tool.category] = [];
      }
      grouped[tool.category].push(tool);
   }

   return grouped;
}

/**
 * Get total tool count
 */
export function getToolCount(): number {
   return TOOLS.length;
}

/**
 * Create a Map for fast tool lookup by name
 */
export const TOOL_MAP = new Map(TOOLS.map((tool) => { return [ tool.name, tool ]; }));
