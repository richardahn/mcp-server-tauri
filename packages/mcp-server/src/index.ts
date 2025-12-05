#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
   CallToolRequestSchema,
   ListToolsRequestSchema,
   ListPromptsRequestSchema,
   GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import the single source of truth for all tools and prompts
import { TOOLS, TOOL_MAP, ToolResult, ToolContent } from './tools-registry.js';
import { PROMPTS, PROMPT_MAP } from './prompts-registry.js';
import { createMcpLogger } from './logger.js';

/* eslint-disable no-process-exit */

// Read version from package.json
const currentDir = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(readFileSync(join(currentDir, '..', 'package.json'), 'utf-8'));

const VERSION = packageJson.version as string;

const serverLogger = createMcpLogger('SERVER');

// Initialize server
const server = new Server(
   {
      name: 'mcp-server-tauri',
      version: VERSION,
   },
   {
      capabilities: {
         tools: {},
         prompts: {},
      },
   }
);

// Handle connection errors gracefully - don't crash on broken pipe
server.onerror = (error) => {
   // Ignore broken pipe errors - they happen when the client disconnects
   const message = error instanceof Error ? error.message : String(error);

   if (message.includes('broken pipe') || message.includes('EPIPE')) {
      // Client disconnected, exit gracefully
      process.exit(0);
   }
   // For other errors, log to stderr (will be captured by MCP client)
   serverLogger.error(message);
};

// Handle connection close - exit gracefully
server.onclose = () => {
   process.exit(0);
};

// Tool list handler - generated from registry
server.setRequestHandler(ListToolsRequestSchema, async () => {
   return {
      tools: TOOLS.map((tool) => {
         return {
            name: tool.name,
            description: tool.description,
            inputSchema: zodToJsonSchema(tool.schema) as Record<string, unknown>,
            annotations: tool.annotations,
         };
      }),
   };
});

/**
 * Convert a ToolResult to MCP content array.
 * Handles string (legacy), single content, and content arrays.
 */
function toolResultToContent(result: ToolResult): Array<{ type: string; text?: string; data?: string; mimeType?: string }> {
   // Legacy string result - convert to text content
   if (typeof result === 'string') {
      return [ { type: 'text', text: result } ];
   }

   // Array of content items
   if (Array.isArray(result)) {
      return result.map(contentToMcp);
   }

   // Single content item
   return [ contentToMcp(result) ];
}

/**
 * Convert a single ToolContent to MCP format.
 */
function contentToMcp(content: ToolContent): { type: string; text?: string; data?: string; mimeType?: string } {
   if (content.type === 'text') {
      return { type: 'text', text: content.text };
   }
   // Image content
   return { type: 'image', data: content.data, mimeType: content.mimeType };
}

// Tool call handler - generated from registry
server.setRequestHandler(CallToolRequestSchema, async (request) => {
   try {
      const tool = TOOL_MAP.get(request.params.name);

      if (!tool) {
         throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const output = await tool.handler(request.params.arguments);

      return { content: toolResultToContent(output) };
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      return {
         content: [ { type: 'text', text: `Error: ${message}` } ],
         isError: true,
      };
   }
});

// Prompt list handler - generated from registry
server.setRequestHandler(ListPromptsRequestSchema, async () => {
   return {
      prompts: PROMPTS.map((prompt) => {
         return {
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
         };
      }),
   };
});

// Get prompt handler - returns prompt messages for a specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
   const prompt = PROMPT_MAP.get(request.params.name);

   if (!prompt) {
      throw new Error(`Unknown prompt: ${request.params.name}`);
   }

   const args = (request.params.arguments || {}) as Record<string, string>;

   return {
      description: prompt.description,
      messages: prompt.handler(args),
   };
});

// Start server
async function main(): Promise<void> {
   const transport = new StdioServerTransport();

   await server.connect(transport);
   // Don't log to stderr - it interferes with MCP protocol
}

main().catch(() => {
   // Don't log errors to stderr - just exit silently
   // The error will be in the MCP response if needed
   process.exit(1);
});
