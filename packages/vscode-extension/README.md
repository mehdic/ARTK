# ARTK - VS Code Extension

Visual tools for ARTK (Automatic Regression Testing Kit) test automation with Playwright.

## Features

### Installation Wizard

Initialize ARTK in your project with a guided setup wizard:
- Automatic environment detection (Node.js version, module system)
- Variant selection (modern-esm, modern-cjs, legacy)
- Component selection (npm, LLKB, browsers, prompts)

### ARTK Explorer

The sidebar provides:

**Status View**
- Installation status and version info
- Configuration overview
- Quick actions (Doctor, Check, Upgrade)

**Journeys View**
- Browse journeys by status or tier
- Click to open journey files
- Run tests directly from the UI

**LLKB View** (when enabled)
- Lessons and components overview
- Health check and statistics
- Export for AutoGen

### Status Bar

Quick status indicator showing:
- Installation state
- ARTK version
- LLKB status

Click to open the dashboard.

## Commands

| Command | Description |
|---------|-------------|
| `ARTK: Initialize Project` | Run the installation wizard |
| `ARTK: Check Prerequisites` | Verify Node.js, npm, browsers |
| `ARTK: Run Doctor` | Diagnose and fix issues |
| `ARTK: Upgrade Core` | Update @artk/core |
| `ARTK: Open Configuration` | Open artk.config.yml |
| `ARTK: LLKB Health Check` | Check LLKB status |
| `ARTK: LLKB Statistics` | View LLKB metrics |
| `ARTK: Export LLKB for AutoGen` | Generate AutoGen config |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `artk.autoRefresh` | `true` | Auto-refresh views on file changes |
| `artk.refreshInterval` | `30000` | Status refresh interval (ms) |
| `artk.showStatusBar` | `true` | Show status bar item |
| `artk.cliPath` | `""` | Custom CLI path (uses npx by default) |
| `artk.llkb.showInExplorer` | `true` | Show LLKB view |

## Requirements

- VS Code 1.85.0 or later
- Node.js 14.0.0 or later
- npm or yarn

## Installation

### From VS Code Marketplace

Search for "ARTK" in the Extensions view and click Install.

### From VSIX

1. Download the `.vsix` file
2. In VS Code, run `Extensions: Install from VSIX...`
3. Select the downloaded file

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Package
npm run package
```

## License

MIT
