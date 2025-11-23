import { z } from 'zod';
import { executeInWebview, captureScreenshot, getConsoleLogs as getConsoleLogsFromCapture } from './webview-executor.js';
import { SCRIPTS, buildScript, buildTypeScript, buildKeyEventScript } from './scripts/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const InteractSchema = z.object({
   action: z.enum([ 'click', 'double-click', 'long-press', 'scroll', 'swipe' ])
      .describe('Type of interaction to perform'),
   selector: z.string().optional().describe('CSS selector for the element to interact with'),
   x: z.number().optional().describe('X coordinate for direct coordinate interaction'),
   y: z.number().optional().describe('Y coordinate for direct coordinate interaction'),
   duration: z.number().optional()
      .describe('Duration in ms for long-press or swipe (default: 500ms for long-press, 300ms for swipe)'),
   scrollX: z.number().optional().describe('Horizontal scroll amount in pixels (positive = right)'),
   scrollY: z.number().optional().describe('Vertical scroll amount in pixels (positive = down)'),
   // Swipe-specific parameters
   fromX: z.number().optional().describe('Starting X coordinate for swipe'),
   fromY: z.number().optional().describe('Starting Y coordinate for swipe'),
   toX: z.number().optional().describe('Ending X coordinate for swipe'),
   toY: z.number().optional().describe('Ending Y coordinate for swipe'),
});

export const ScreenshotSchema = z.object({
   format: z.enum([ 'png', 'jpeg' ]).optional().default('png').describe('Image format'),
   quality: z.number().min(0).max(100).optional().describe('JPEG quality (0-100, only for jpeg format)'),
});

export const KeyboardSchema = z.object({
   action: z.enum([ 'type', 'press', 'down', 'up' ])
      .describe('Keyboard action type: "type" for typing text into an element, "press/down/up" for key events'),
   selector: z.string().optional().describe('CSS selector for element to type into (required for "type" action)'),
   text: z.string().optional().describe('Text to type (required for "type" action)'),
   key: z.string().optional().describe('Key to press (required for "press/down/up" actions, e.g., "Enter", "a", "Escape")'),
   modifiers: z.array(z.enum([ 'Control', 'Alt', 'Shift', 'Meta' ])).optional().describe('Modifier keys to hold'),
});

export const WaitForSchema = z.object({
   type: z.enum([ 'selector', 'text', 'ipc-event' ]).describe('What to wait for'),
   value: z.string().describe('Selector, text content, or IPC event name to wait for'),
   timeout: z.number().optional().default(5000).describe('Timeout in milliseconds (default: 5000ms)'),
});

export const GetStylesSchema = z.object({
   selector: z.string().describe('CSS selector for element(s) to get styles from'),
   properties: z.array(z.string()).optional().describe('Specific CSS properties to retrieve. If omitted, returns all computed styles'),
   multiple: z.boolean().optional().default(false)
      .describe('Whether to get styles for all matching elements (true) or just the first (false)'),
});

export const ExecuteJavaScriptSchema = z.object({
   script: z.string().describe('JavaScript code to execute in the webview context'),
   args: z.array(z.unknown()).optional().describe('Arguments to pass to the script'),
});

export const FocusElementSchema = z.object({
   selector: z.string().describe('CSS selector for element to focus'),
});

export const FindElementSchema = z.object({
   selector: z.string(),
   strategy: z.enum([ 'css', 'xpath', 'text' ]).default('css'),
});

export const GetConsoleLogsSchema = z.object({
   filter: z.string().optional().describe('Regex or keyword to filter logs'),
   since: z.string().optional().describe('ISO timestamp to filter logs since'),
});

// ============================================================================
// Implementation Functions
// ============================================================================

export async function interact(options: {
   action: string;
   selector?: string;
   x?: number;
   y?: number;
   duration?: number;
   scrollX?: number;
   scrollY?: number;
   fromX?: number;
   fromY?: number;
   toX?: number;
   toY?: number;
}): Promise<string> {
   const { action, selector, x, y, duration, scrollX, scrollY, fromX, fromY, toX, toY } = options;

   // Handle swipe action separately since it has different logic
   if (action === 'swipe') {
      return performSwipe(fromX, fromY, toX, toY, duration);
   }

   const script = buildScript(SCRIPTS.interact, {
      action,
      selector: selector ?? null,
      x: x ?? null,
      y: y ?? null,
      duration: duration ?? 500,
      scrollX: scrollX ?? 0,
      scrollY: scrollY ?? 0,
   });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Interaction failed: ${message}`);
   }
}

async function performSwipe(
   fromX?: number,
   fromY?: number,
   toX?: number,
   toY?: number,
   duration = 300
): Promise<string> {
   if (fromX === undefined || fromY === undefined || toX === undefined || toY === undefined) {
      throw new Error('Swipe action requires fromX, fromY, toX, and toY coordinates');
   }

   const script = buildScript(SCRIPTS.swipe, { fromX, fromY, toX, toY, duration });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Swipe failed: ${message}`);
   }
}

export async function screenshot(
   quality?: number,
   format = 'png'
): Promise<string> {
   // Use the native screenshot function from webview-executor
   return captureScreenshot(format as 'png' | 'jpeg', quality);
}

export async function keyboard(
   action: string,
   selectorOrKey?: string,
   textOrModifiers?: string | string[],
   modifiers?: string[]
): Promise<string> {
   // Handle the different parameter combinations based on action
   if (action === 'type') {
      const selector = selectorOrKey;

      const text = textOrModifiers as string;

      if (!selector || !text) {
         throw new Error('Type action requires both selector and text parameters');
      }

      const script = buildTypeScript(selector, text);

      try {
         return await executeInWebview(script);
      } catch(error: unknown) {
         const message = error instanceof Error ? error.message : String(error);

         throw new Error(`Type action failed: ${message}`);
      }
   }

   // For press/down/up actions: key is required, modifiers optional
   const key = selectorOrKey;

   const mods = Array.isArray(textOrModifiers) ? textOrModifiers : modifiers;

   if (!key) {
      throw new Error(`${action} action requires a key parameter`);
   }

   const script = buildKeyEventScript(action, key, mods || []);

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Keyboard action failed: ${message}`);
   }
}

export async function waitFor(
   type: string,
   value: string,
   timeout = 5000
): Promise<string> {
   const script = buildScript(SCRIPTS.waitFor, { type, value, timeout });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Wait failed: ${message}`);
   }
}

export async function getStyles(
   selector: string,
   properties?: string[],
   multiple = false
): Promise<string> {
   const script = buildScript(SCRIPTS.getStyles, {
      selector,
      properties: properties || [],
      multiple,
   });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Get styles failed: ${message}`);
   }
}

export async function executeJavaScript(
   script: string,
   args?: unknown[]
): Promise<string> {
   // If args are provided, we need to inject them into the script context
   const wrappedScript = args && args.length > 0
      ? `
         (function() {
            const args = ${JSON.stringify(args)};
            return (${script}).apply(null, args);
         })();
      `
      : script;

   try {
      const result = await executeInWebview(wrappedScript);

      return result;
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`JavaScript execution failed: ${message}`);
   }
}

export async function focusElement(selector: string): Promise<string> {
   const script = buildScript(SCRIPTS.focus, { selector });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Focus failed: ${message}`);
   }
}

/**
 * Find an element using various selector strategies.
 */
export async function findElement(selector: string, strategy: string): Promise<string> {
   const script = buildScript(SCRIPTS.findElement, { selector, strategy });

   try {
      return await executeInWebview(script);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Find element failed: ${message}`);
   }
}

/**
 * Get console logs from the webview.
 */
export async function getConsoleLogs(filter?: string, since?: string): Promise<string> {
   try {
      return await getConsoleLogsFromCapture(filter, since);
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to get console logs: ${message}`);
   }
}
