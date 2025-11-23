# MCP Server Tauri - LLM Configuration Guide

## Project Overview

This is a **Model Context Protocol (MCP) server** that provides comprehensive tooling for Tauri v2 application development. It exposes a collection of tools through the MCP protocol that enable LLMs to interact with and manage Tauri applications, particularly focusing on mobile development, native automation, configuration management, and debugging.

**Key Capabilities:**

- Tauri CLI command execution
- Configuration file reading/writing with validation
- Mobile device/emulator management (Android & iOS)
- Native UI automation via Tauri IPC
- Log monitoring and debugging
- Native capability management
- Documentation retrieval

## Architecture

### Entry Point

- **[src/index.ts](../src/index.ts)**: Main MCP server implementation
  - Initializes the MCP server with stdio transport
  - Registers all available tools with their schemas
  - Routes tool calls to appropriate handler functions
  - Uses Zod schemas for input validation

### Module Organization

The codebase is organized into logical modules under `src/`:

#### 1. **Manager Module** (`src/manager/`)

Handles Tauri project management and configuration:

- `cli.ts` - Executes Tauri CLI commands (init, dev, build, etc.)
- `config.ts` - Reads/writes Tauri configuration files with JSON validation
- `mobile.ts` - Lists devices, launches Android AVDs and iOS Simulators
- `capabilities.ts` - Adds native capabilities (camera, location, etc.) to mobile manifests
- `docs.ts` - Retrieves Tauri documentation for detected project versions

#### 2. **Driver Module** (`src/driver/`)

Native automation and webview interaction:

- `session-manager.ts` - Manages automation sessions and app connections
- `webview-executor.ts` - Executes scripts and interactions in the webview
- `app-discovery.ts` - Discovers and connects to running Tauri apps

#### 3. **Monitor Module** (`src/monitor/`)

Observability and debugging:

- `logs.ts` - Reads logs from Android (logcat) or system logs

### Test Infrastructure

#### Test App (`test-app/`)

A complete Tauri v2 application used for integration testing:

- Vanilla TypeScript + Tauri v2
- Used as the target application for E2E tests
- Contains typical Tauri project structure (src-tauri/, src/, etc.)

#### E2E Tests (`tests/e2e/`)

Comprehensive end-to-end tests that verify MCP server functionality:

- Launch the actual `test-app` in dev mode
- Connect to the running app via WebSocket
- Test all MCP server tools in realistic scenarios
- Located in `tests/e2e/*.test.ts`

## Development Patterns

### 1. Tool Implementation Pattern

Each MCP tool follows this pattern:

```typescript
// 1. Define Zod schema for input validation
export const ToolNameSchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

// 2. Export type from schema
export type ToolNameInput = z.infer<typeof ToolNameSchema>;

// 3. Implement handler function
export async function toolName(param1: string, param2?: number): Promise<string> {
  // Implementation
  return "result";
}

// 4. Register in src/index.ts:
//    - Add to ListToolsRequestSchema handler
//    - Add to CallToolRequestSchema handler
//    - Use zodToJsonSchema for schema conversion
```

### 2. Session Management

- Single global session managed via WebSocket connections
- Must call `tauri_driver_session` with action 'start' before using driver tools
- Always call `tauri_driver_session` with action 'stop' to clean up
- Session persists across tool calls until explicitly stopped

### 3. Configuration Handling

- Tauri configs are read as JSON with optional flattening
- Write operations validate JSON structure
- Supports both `tauri.conf.json` and platform-specific configs

### 4. Error Handling

- All tool implementations should return user-friendly error messages
- Errors are caught in the main request handler and returned with `isError: true`
- Use try-catch blocks with descriptive error messages

## Code Style & Conventions

### TypeScript

- **Strict mode enabled**: All TypeScript strict checks are enforced
- **Module system**: ESM (NodeNext) with `.js` extensions in imports
- **Target**: ES2022
- **File structure**: Each module exports schemas and implementation functions

### Naming Conventions

- **Tool names**: `tauri_<category>_<action>` (e.g., `tauri_driver_click`)
- **Schemas**: `<ActionName>Schema` (e.g., `ClickElementSchema`)
- **Functions**: camelCase matching the action (e.g., `clickElement`)

### Dependencies

#### Production Dependencies

- **Core**: `@modelcontextprotocol/sdk` - MCP server implementation and protocol handling
- **Validation**: `zod` - Runtime schema validation for tool inputs
- **Schema Conversion**: `zod-to-json-schema` - Converts Zod schemas to JSON Schema for MCP tool registration (runtime dependency)
- **Execution**: `execa` - Spawning and executing CLI commands
- **Automation**: Direct WebSocket communication with Tauri plugin
- **WebSocket**: `ws` - WebSocket communication

#### Development Dependencies

- **TypeScript**: `typescript` - TypeScript compiler and type checking
- **Testing**: `vitest` - Fast unit and E2E test runner
- **Type Definitions**: `@types/node`, `@types/ws` - TypeScript type definitions

## Testing Guidelines

### E2E Test Structure

Tests should:

1. Launch the test app using `tauri dev`
2. Start an automation session
3. Perform test actions
4. Assert expected outcomes
5. Clean up (stop session, terminate app)

### Running Tests

```bash
npm run build       # Compile TypeScript first
npm test           # Run all tests with Vitest (vitest run)
```

**Note**: Always build before testing since E2E tests require the compiled `dist/` output.

## Key Concepts for LLMs

### When Working on This Codebase:

1. **Adding New Tools**:

   - Create handler function in appropriate module
   - Define Zod schema
   - Register in both tool list and call handler in `src/index.ts`
   - Add E2E test in `tests/e2e/`

2. **Modifying Existing Tools**:

   - Update schema if input parameters change
   - Update implementation function
   - Update tests to cover new behavior

3. **Testing Changes**:

   - Always compile with `npm run build` before testing
   - E2E tests require the compiled `dist/` output
   - Test app must be in a valid state (dependencies installed)

4. **Automation Considerations**:

   - WebSocket port is automatically allocated (9223-9322 range)
   - Default port is 9223 when registry unavailable
   - Session management is critical - always clean up

5. **Mobile Development**:
   - Android tools require Android SDK and platform-tools
   - iOS tools require Xcode and simctl (macOS only)
   - Device lists are fetched via CLI commands to external tools

## Common Pitfalls

1. **Forgetting to register tools**: New tools must be added to BOTH the list handler and call handler
2. **Schema mismatches**: Ensure Zod schema matches function parameters
3. **Session lifecycle**: Not stopping sessions causes connection issues
4. **Path handling**: Always use absolute paths for project directories
5. **Async/await**: All tool handlers are async - don't forget to await

## Build & Distribution

- **Build output**: `dist/` directory (TypeScript compiled to JavaScript)
- **Binary**: `dist/index.js` (executable with shebang `#!/usr/bin/env node`)
- **Package type**: ESM module
- **Entry point**: `dist/index.js` specified in `package.json` bin field

## Future Extensibility

The architecture supports easy addition of:

- New Tauri CLI commands
- Additional mobile platforms
- More automation capabilities
- Enhanced monitoring capabilities
- Additional documentation sources

When extending, follow the established patterns for consistency and maintainability.

## Rules

### General

- Look around and use existing patterns and code if possible.
  - Look at similar components and use their patterns
  - Look for library code you can reuse
- If you see a pattern that is not used, consider adding it, but carefully and judiciously
- Do considerable online research when:
  - you are unsure about something
  - deciding between multiple approaches
  - deciding on a new technology or library to use

### General Code Style & Formatting

- Use English for all code and documentation
- Avoid using any
- Create necessary types
- Use JSDoc to document public classes and methods

### Git Commits

- Follow the rules here: https://raw.githubusercontent.com/silvermine/standardization/refs/heads/master/commitlint.js

### Naming Conventions

- Use PascalCase for classes
- Use camelCase for variables, functions, and methods
- Use kebab-case for file and directory names
- Use UPPERCASE for environment variables
- Avoid magic numbers and define constants
- When it has an acronym or initialism, use all lowercase or all caps, never mixed-case:
  - url or URL, _never_ Url
  - id or ID, _never_ Id

## Functions & Logic

- Avoid deeply nested blocks by:
  - Using early returns
  - Extracting logic into utility functions
- Use higher-order functions (map, filter, reduce) to simplify logic
- Use arrow functions for simple cases (<3 instructions), named functions otherwise
- Use default parameter values instead of null/undefined checks
- Use RO-RO (Receive Object, Return Object) for passing and returning multiple parameters

### Data Handling

- Avoid excessive use of primitive types; encapsulate data in composite types
- Prefer immutability for data:
  - Use readonly for immutable properties
  - Use as const for literals that never change

### Front-End Development

- Pay attention to the current version of the component, and use a similar pattern as set by
  existing elements
- Consider accessibility / a11y

### Vue.js

- Assume Vue version 3.5+ unless you see otherwise in package.json
- Use Vue 3 composition API, SFCs
- Prefer composition using slots over props when it makes sense
- Be aware of the different kinds of components: Page-level, layout, UI components that
  contain no business logic, and business-logic-level components
- When implementing/adjusting pages/views/higher-level components, prefer reusing existing
  lower-level components instead of adding new code when possible. Stop and ask yourself if a new component is needed, whether a new component can be composed of existing components, an existing component needs a variant/prop, etc., or whether the new code really does need to be specific to _this_ page/component
- Use SCSS
- For styling:
  - If using a component library, prefer using the component's existing
    props etc. over custom styling
  - If none is available, prefer pre-existing utility classes over custom styling
  - Avoid custom CSS unless necessary
  - Use BEM or other similar naming conventions for custom CSS
  - Use CSS variables for theme-able values
  - Use scoped styles
  - Consider adding a custom utility class to the global CSS/SCSS if it seems
    necessary/used in multiple places, but don't go overboard

### CLI

- Always use `npm` instead of `pnpm` or `yarn`

### NPM Dependencies

- Always use the --save-exact flag when installing a dependency

### Testing

- When writing tests, prefer practical e2e tests over unit tests, but definitely add unit
  tests when it makes sense
