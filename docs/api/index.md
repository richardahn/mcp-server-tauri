---
title: What Your AI Can Do
---

<script setup>
import { Wrench, Smartphone, Target, Zap, Rocket, Bug, FlaskConical, Activity } from 'lucide-vue-next';
</script>

# What Your AI Can Do

Once configured, your AI assistant has **26 powerful capabilities** to help you build, test, and debug your Tauri application. Just ask in natural language!

## <Wrench :size="24" :stroke-width="2" class="heading-icon" /> Project Management

Your AI can help manage your Tauri project without you leaving the conversation.

**Build & Development**
- Run any Tauri CLI command (`dev`, `build`, `init`, etc.)
- Read and understand your app's configuration
- Modify settings in `tauri.conf.json`
- Look up Tauri documentation when needed

::: tip Example
"Run my app in development mode" or "Change the window title to 'My App'"
:::

[View all project management capabilities →](/api/project-management)

## <Smartphone :size="24" :stroke-width="2" class="heading-icon" /> Mobile Development

Work with Android and iOS without switching tools.

**Device Management**
- See what emulators and simulators you have
- Launch Android emulators or iOS simulators
- Check device status and availability

::: tip Example
"Show me my Android emulators" or "Start the Pixel 6 emulator"
:::

## <Target :size="24" :stroke-width="2" class="heading-icon" /> UI Testing & Automation

Your AI can interact with your app's interface just like a user would.

**Visual Testing**
- Click buttons, fill forms, navigate menus
- Test swipe gestures and touch interactions
- Verify UI elements exist and work correctly
- Check visual appearance with screenshots

**Debugging**
- See console logs and errors
- Inspect element styles and properties
- Run JavaScript in your app's context
- Monitor what's happening in real-time

::: tip Example
"Click the submit button and tell me if it worked" or "Take a screenshot of the login page"
:::

[View all UI automation capabilities →](/api/ui-automation)
[View all interaction capabilities →](/api/webview-interaction)

## <Zap :size="24" :stroke-width="2" class="heading-icon" /> Advanced Debugging

Deep insights into your app's internal communication.

**IPC Monitoring**
- Watch messages between frontend and backend
- Debug communication issues
- Understand event flow
- Access backend state and window information

::: tip Example
"Show me what IPC calls happen when I click login"
:::

[View all debugging capabilities →](/api/ipc-plugin)

## Common Use Cases

### <Rocket :size="20" :stroke-width="2" class="heading-icon" /> Development Workflow

**"Build and run my app"**
Your AI can start dev servers, rebuild your app, and restart when things go wrong.

**"What's in my config?"**
Quickly check settings without opening files.

**"Update my app icon path"**
Make configuration changes through conversation.

### <Bug :size="20" :stroke-width="2" class="heading-icon" /> Debugging

**"Why is this button not working?"**
Your AI can click it, check the console, and report what happened.

**"Show me the error logs"**
Access all logs without leaving your chat.

**"What CSS is applied to this element?"**
Inspect styles and understand layout issues.

### <FlaskConical :size="20" :stroke-width="2" class="heading-icon" /> Testing

**"Test the login flow"**
Walk through user interactions automatically.

**"Does the app work on mobile?"**
Launch emulators and test mobile-specific features.

**"Take screenshots of all pages"**
Generate visual documentation or regression testing baselines.

### <Activity :size="20" :stroke-width="2" class="heading-icon" /> Monitoring

**"What IPC calls happen during startup?"**
Understand your app's communication patterns.

**"Is the backend responding correctly?"**
Monitor state and debug backend issues.

## How It Works

Behind the scenes, the MCP server connects your AI assistant to your Tauri app through:

- **Native IPC (WebSocket)** - For UI automation and visual testing
- **MCP Bridge Plugin** - For direct access to IPC and backend state

You don't need to understand this to use it - just talk to your AI naturally!

## Next Steps

- Browse the [detailed tool reference](/api/project-management) if you want to know exactly what's available
- Check out the [Getting Started Guide](/guides/getting-started) for setup instructions
- Just start asking your AI for help with your Tauri app!
