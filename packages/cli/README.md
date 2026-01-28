# @artk/cli

Command-line interface for ARTK (Automatic Regression Testing Kit).

Bootstrap Playwright test suites with AI-assisted workflows.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @artk/cli
```

### One-time Usage

```bash
npx @artk/cli init /path/to/project
```

## Commands

### `artk init <path>`

Initialize ARTK in a project.

```bash
# Initialize in current directory
artk init .

# Initialize in a specific directory
artk init /path/to/project

# Skip npm install (useful for CI)
artk init . --skip-npm

# Skip browser installation
artk init . --skip-browsers

# Force overwrite existing installation
artk init . --force

# Specify module system variant
artk init . --variant=esm    # or commonjs, auto (default)

# Skip AI prompts installation
artk init . --no-prompts
```

### `artk check`

Verify prerequisites (Node.js, npm, browsers).

```bash
artk check
```

### `artk upgrade [path]`

Upgrade @artk/core in an existing installation.

```bash
# Upgrade in current directory
artk upgrade

# Check for updates without applying
artk upgrade --check

# Force upgrade even if versions match
artk upgrade --force
```

### `artk doctor [path]`

Diagnose and fix common issues.

```bash
# Diagnose issues
artk doctor

# Attempt automatic fixes
artk doctor --fix

# Show verbose output
artk doctor --verbose
```

### `artk uninstall <path>`

Remove ARTK from a project.

```bash
# Uninstall
artk uninstall .

# Keep test files
artk uninstall . --keep-tests

# Keep AI prompts
artk uninstall . --keep-prompts

# Skip confirmation prompt
artk uninstall . --force
```

## What Gets Installed

When you run `artk init`, the following is created:

```
your-project/
├── artk-e2e/                         # E2E test workspace
│   ├── vendor/
│   │   ├── artk-core/                # @artk/core (vendored)
│   │   └── artk-core-autogen/        # @artk/core-autogen (vendored)
│   ├── src/
│   │   └── modules/
│   │       ├── foundation/           # Foundation modules (auth, nav, etc.)
│   │       └── features/             # Feature-specific page objects
│   ├── tests/
│   │   ├── setup/                    # Auth setup tests
│   │   ├── smoke/                    # Smoke tests
│   │   ├── release/                  # Release tests
│   │   └── regression/               # Regression tests
│   ├── config/
│   ├── journeys/
│   ├── package.json
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   └── artk.config.yml
├── .github/
│   └── prompts/                      # AI agent prompts
│       ├── artk.init-playbook.prompt.md
│       ├── artk.discover-foundation.prompt.md
│       └── ...
└── .artk/
    ├── context.json                  # ARTK metadata
    └── browsers/                     # Playwright browser cache
```

## Next Steps After Init

1. Navigate to the artk-e2e directory:
   ```bash
   cd artk-e2e
   ```

2. Open VS Code and launch GitHub Copilot Chat

3. Run the init playbook:
   ```
   /artk.init-playbook
   ```

4. Follow the AI-guided workflow to discover your app and create tests

## Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git (recommended)

## Browser Support

ARTK automatically configures browsers with this fallback chain:

1. **Release cache**: Pre-built browsers from GitHub releases (fastest)
2. **Bundled install**: Playwright's npx playwright install (default)
3. **System browsers**: Microsoft Edge or Google Chrome (fallback)

## Configuration

The main configuration file is `artk-e2e/artk.config.yml`:

```yaml
version: 1

app:
  name: "your-project"
  type: web

environments:
  local:
    baseUrl: http://localhost:3000
  intg:
    baseUrl: https://intg.example.com

auth:
  provider: oidc
  storageStateDir: ./.auth-states

browsers:
  channel: bundled  # or msedge, chrome
  strategy: auto
```

## LLKB Commands (Lessons Learned Knowledge Base)

ARTK includes LLKB (Lessons Learned Knowledge Base) for continuous learning and improvement of test generation. LLKB commands are integrated into `@artk/cli` as subcommands.

### Export for AutoGen

Export LLKB knowledge to AutoGen-compatible format:

```bash
# Basic export
artk llkb export --for-autogen --output artk-e2e/

# With confidence threshold
artk llkb export --for-autogen --output artk-e2e/ --min-confidence 0.8

# Dry run (preview only)
artk llkb export --for-autogen --output artk-e2e/ --dry-run

# Generate only glossary or config
artk llkb export --for-autogen --output artk-e2e/ --glossary-only
artk llkb export --for-autogen --output artk-e2e/ --config-only
```

### Version Management

Check and update tests to use latest LLKB knowledge:

```bash
# Check which tests need updates
artk llkb check-updates --tests-dir artk-e2e/tests/

# Update a single test
artk llkb update-test --test artk-e2e/tests/login.spec.ts

# Dry run (preview changes)
artk llkb update-test --test artk-e2e/tests/login.spec.ts --dry-run

# Batch update all outdated tests
artk llkb update-tests --tests-dir artk-e2e/tests/
artk llkb update-tests --tests-dir artk-e2e/tests/ --dry-run
```

### Learning Events

Record learning events to improve LLKB:

```bash
# Record component usage
artk llkb learn --type component --id COMP012 --journey JRN-0001 --success

# Record lesson application
artk llkb learn --type lesson --id L042 --journey JRN-0001 --success --context "Applied ag-grid pattern"

# Record pattern learned
artk llkb learn --type pattern --journey JRN-0001 --success \
  --context "Save button" \
  --selector-strategy testid \
  --selector-value btn-save
```

### Health & Maintenance

Monitor and maintain LLKB health:

```bash
# Health check
artk llkb health

# Statistics
artk llkb stats

# Prune old history files (keep 90 days)
artk llkb prune --history-retention-days 90

# Archive inactive components (unused for 180+ days)
artk llkb prune --archive-inactive-components --inactive-days 180
```

**See also:**
- `CLAUDE.md` - LLKB-AutoGen Integration section for architecture details
- `research/2026-01-23_llkb-autogen-integration-specification.md` - Full technical specification

## Architecture & Implementation Details

For detailed architecture documentation and implementation notes, see:

- **[CLI Architecture Review](../../research/2026-01-14_cli_critical_review.md)** - Critical analysis of the CLI implementation, known issues, and recommendations
- **[CLI Design Research](../../research/2026-01-10_spec_kit_style_cli.md)** - Original design document based on spec-kit patterns

### Implementation Modules

| Module | Purpose |
|--------|---------|
| `src/lib/bootstrap.ts` | Core installation logic (calls @artk/core generator) |
| `src/lib/environment.ts` | Environment detection (ESM/CommonJS) |
| `src/lib/browser-resolver.ts` | Browser fallback chain with logging |
| `src/lib/config-validator.ts` | Zod-based artk.config.yml validation |
| `src/lib/prompts.ts` | Interactive CLI prompts with TTY detection |
| `src/lib/logger.ts` | Structured console output |

### Resolved Issues (v1.0.1)

The following issues from the [architecture review](../../research/2026-01-14_cli_critical_review.md) have been resolved:

1. ~~**Template Generator Duplication**~~ - **FIXED**: CLI now calls @artk/core's `generate-foundation.ts` script directly, ensuring feature parity with the shell script bootstrap
2. ~~**Browser Installation**~~ - **FIXED**: CLI now explicitly runs `npx playwright install chromium` after npm install when using bundled browsers, with automatic fallback to system browsers if installation fails

## License

MIT
