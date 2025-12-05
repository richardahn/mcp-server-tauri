export interface McpLogger {
   info: (...args: unknown[]) => void;
   warn: (...args: unknown[]) => void;
   error: (...args: unknown[]) => void;
}

export function createMcpLogger(scope: string): McpLogger {
   return {
      info: (...args: unknown[]): void => {
         console.log('[MCP][' + scope + '][INFO]', ...args);
      },
      warn: (...args: unknown[]): void => {
         console.warn('[MCP][' + scope + '][WARN]', ...args);
      },
      error: (...args: unknown[]): void => {
         console.error('[MCP][' + scope + '][ERROR]', ...args);
      },
   };
}
