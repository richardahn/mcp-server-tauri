# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 1. Test Suite (`test.yml`)

   * **Triggers**: Push to main/develop branches, Pull requests
   * **Purpose**: Runs comprehensive tests for all packages
   * **Jobs**:
      * Test tauri-plugin-mcp-bridge (Rust + TypeScript)
      * Test @hypothesi/tauri-mcp-server (Node.js)
      * Build test-app (Tauri application)
      * Lint and standards checks (ESLint)
   * **Matrix Testing**: Tests across multiple OS (Ubuntu, Windows, macOS) and Node.js versions (20, 24)

### 2. Release (`release.yml`)

   * **Triggers**: Push tags matching:
      * `v*` - Release all packages with the same version
      * `tauri-plugin-mcp-bridge/v*` - Release only the plugin
      * `mcp-server/v*` - Release only the server
   * **Purpose**: Unified release workflow for all packages
   * **Features**:
      * Smart package detection based on tag format
      * Can release individual packages or all packages
      * Comprehensive testing before release
      * Automatic version updates
      * NPM provenance attestation for supply chain security
   * **Process**:

1. Determine which packages to release based on tag
2. Run tests across all platforms
3. Update package versions
4. Build TypeScript and/or Rust components
5. Publish to npm (with provenance)
6. Publish to crates.io (if plugin)
7. Create GitHub release with changelog

## Required Secrets

Before using the release workflows, configure these secrets in your GitHub repository settings:

1. **NPM_TOKEN**: Authentication token for npm registry

   * Get from: <https://www.npmjs.com/settings/[username]/tokens>
   * Required for: Publishing npm packages

2. **CARGO_REGISTRY_TOKEN**: Authentication token for crates.io
   * Get from: <https://crates.io/settings/tokens>
   * Required for: Publishing Rust crates

## Tag Formats

The release workflow supports three tag patterns:

   * **All packages** (same version): `v0.1.0`
      * Releases both packages with version 0.1.0
      * Use for coordinated releases or major versions

   * **Plugin only**: `tauri-plugin-mcp-bridge/v0.1.0`
      * Releases only the Tauri plugin
      * Updates version to 0.1.0

   * **Server only**: `mcp-server/v0.1.0`
      * Releases only the MCP server
      * Updates version to 0.1.0

## Usage Examples

### Running Tests Locally

```bash
# Run all tests
npm test

# Run specific package tests
cd packages/mcp-server && npm test
cd packages/tauri-plugin-mcp-bridge && cargo test

# Run linting
npm run standards
```

### Creating a Release

1. Update version in package files:

   ```bash
   # For plugin
   cd packages/tauri-plugin-mcp-bridge
   # Update version in Cargo.toml and package.json

   # For server
   cd packages/mcp-server
   # Update version in package.json
   ```

2. Update CHANGELOG.md files

3. Commit and push changes

4. Create and push a tag:

   ```bash
   # For individual package
   git tag tauri-plugin-mcp-bridge/v0.1.0
   git tag mcp-server/v0.1.0

   # For all packages
   git tag v0.1.0

   # Push tag
   git push origin --tags
   ```

The workflows will automatically:

   * Run comprehensive tests
   * Build packages
   * Publish to registries
   * Create GitHub releases

## Workflow Permissions

The workflows require the following permissions:

   * `contents: write` - For creating releases
   * `id-token: write` - For npm provenance

## Best Practices

1. Always run tests locally before pushing
2. Update CHANGELOG.md before releases
3. Use semantic versioning
4. Test workflows in a fork first if making changes
5. Monitor workflow runs for any failures
