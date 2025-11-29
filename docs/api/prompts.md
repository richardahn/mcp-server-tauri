---
title: Prompts (Slash Commands)
description: Pre-built prompt templates that appear as slash commands in your AI assistant for common Tauri development tasks.
head:
  - - meta
    - name: keywords
      content: tauri prompts, slash commands, mcp prompts, ai workflows, tauri debugging
---

<script setup>
import { MessageSquareCode, Bug, Zap } from 'lucide-vue-next';
</script>

# <MessageSquareCode :size="28" :stroke-width="2" class="heading-icon" /> Prompts (Slash Commands)

Prompts are pre-built templates that guide your AI assistant through common Tauri development tasks. In MCP clients like Windsurf, Claude Desktop, and others, these appear as **slash commands** that you can invoke directly.

## What Are Prompts?

Unlike tools (which the AI calls automatically), prompts are **user-controlled**. When you type a slash command like `/fix-webview-errors`, the prompt injects a structured set of instructions into your conversation, guiding the AI through a multi-step workflow.

::: tip When to Use Prompts
Use prompts when you want a guided, multi-step workflow rather than a single action. They're perfect for debugging sessions, testing flows, and complex tasks that require multiple tools working together.
:::

## Available Prompts

### <Bug :size="20" :stroke-width="2" class="heading-icon" /> fix-webview-errors

**Slash command:** `/fix-webview-errors`

Finds and fixes JavaScript errors in your Tauri app's webview. This prompt guides the AI through a complete debugging workflow:

1. **Connects** to your running Tauri app via the MCP bridge
2. **Retrieves** console logs and errors from the webview
3. **Analyzes** error messages, stack traces, and identifies root causes
4. **Locates** the problematic source code in your project
5. **Proposes** concrete fixes for each error found
6. **Cleans up** the session when done

**Example usage:**

```
/fix-webview-errors
```

The AI will then:
- Start an automation session with your app
- Pull any JavaScript errors from the console
- Help you understand what went wrong and how to fix it

::: warning Prerequisites
- Your Tauri app must be running with the MCP bridge plugin installed
- The `withGlobalTauri` option must be enabled in `tauri.conf.json`
:::

**What it does behind the scenes:**

| Step | Tool Used | Purpose |
|------|-----------|---------|
| 1 | `tauri_driver_session` | Connect to the running app |
| 2 | `tauri_driver_get_console_logs` | Retrieve JS errors and warnings |
| 3 | Code search tools | Find source code locations |
| 4 | `tauri_driver_session` | Clean up connection |

## How Prompts Work

When you invoke a prompt, it sends a structured message to the AI that includes:

- **Context** about what you're trying to accomplish
- **Step-by-step instructions** for the AI to follow
- **Tool suggestions** for each step
- **Error handling guidance** for common issues

The AI then executes these steps using the available MCP tools, providing feedback along the way.

## Creating Custom Workflows

While the built-in prompts cover common scenarios, you can always ask your AI to perform similar workflows manually. For example:

> "Connect to my Tauri app, check for any console errors, and help me fix them"

This achieves the same result as `/fix-webview-errors` but gives you more control over the process.

## Prompt vs Tool: When to Use Which

| Use Case | Prompt | Tool |
|----------|--------|------|
| Debug JS errors in webview | `/fix-webview-errors` | - |
| Take a single screenshot | - | `tauri_webview_screenshot` |
| Multi-step testing workflow | Ask AI to create one | - |
| Check a specific element | - | `tauri_webview_find_element` |
| Guided debugging session | Use a prompt | - |
| Quick one-off action | - | Let AI choose the tool |

## See Also

- [UI Automation Tools](/api/ui-automation) - Tools used by debugging prompts
- [Getting Started](/guides/getting-started) - Setup instructions
