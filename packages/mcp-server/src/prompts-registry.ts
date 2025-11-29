/**
 * Single source of truth for all MCP prompt definitions
 * Prompts are user-controlled templates that appear as slash commands in MCP clients
 */

export interface PromptArgument {
   name: string;
   description: string;
   required?: boolean;
}

export interface PromptMessage {
   role: 'user' | 'assistant';
   content: {
      type: 'text';
      text: string;
   };
}

export interface PromptDefinition {
   name: string;
   description: string;
   arguments?: PromptArgument[];
   handler: (args: Record<string, string>) => PromptMessage[];
}

const FIX_WEBVIEW_ERRORS_PROMPT = `I need help finding and fixing JavaScript errors in my Tauri app's webview.

Please follow these steps:

1. **Start a session** - Use \`tauri_driver_session\` with action "start" to connect to the running Tauri app

2. **Get console logs** - Use \`tauri_driver_get_console_logs\` to retrieve any JavaScript errors or warnings from the webview console

3. **Analyze the errors** - Look at the error messages, stack traces, and identify:
   - What type of error it is (TypeError, ReferenceError, SyntaxError, etc.)
   - Which file and line number the error originates from
   - What the root cause might be

4. **Find the source code** - Use code search or file reading tools to locate the problematic code in my project

5. **Propose a fix** - Explain what's wrong and suggest a concrete fix for each error found

6. **Stop the session** - Use \`tauri_driver_session\` with action "stop" to clean up

If no errors are found, let me know the app is running cleanly.

If the session fails to start, help me troubleshoot the connection (is the app running? is the MCP bridge plugin installed?).`;

/**
 * Complete registry of all available prompts
 */
export const PROMPTS: PromptDefinition[] = [
   {
      name: 'fix-webview-errors',
      description:
         'Find and fix JavaScript errors in the Tauri webview. ' +
         'Starts a session, retrieves console errors, and guides you through fixing them.',
      arguments: [],
      handler: () => {
         return [
            {
               role: 'user',
               content: {
                  type: 'text',
                  text: FIX_WEBVIEW_ERRORS_PROMPT,
               },
            },
         ];
      },
   },
];

/**
 * Create a Map for fast prompt lookup by name
 */
export const PROMPT_MAP = new Map(PROMPTS.map((prompt) => { return [ prompt.name, prompt ]; }));
