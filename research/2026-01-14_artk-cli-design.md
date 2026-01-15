# ARTK CLI Design: spec-kit-style Distribution

**Date:** 2026-01-14
**Topic:** Design a CLI tool similar to spec-kit for installing ARTK to any client project

---

## Executive Summary

This document analyzes how to transform ARTK's current shell-script-based bootstrap into a proper CLI tool that can be installed globally and used from any location, similar to GitHub's spec-kit project.

**Key Decision:** Use Python + `uv` (like spec-kit) rather than Node.js/npm for the CLI wrapper, while keeping the TypeScript @artk/core library as the payload.

---

## Part 1: spec-kit Architecture Analysis

### How spec-kit Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      spec-kit Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Installation:                                                   │
│    uv tool install specify-cli \                                │
│      --from git+https://github.com/github/spec-kit.git          │
│                                                                  │
│  One-time usage:                                                 │
│    uvx --from git+https://github.com/github/spec-kit.git \      │
│      specify init <PROJECT_NAME>                                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Commands:                                                       │
│    specify init <project>  -- Bootstrap new project              │
│    specify check           -- Verify installed tools             │
│                                                                  │
│  Post-init slash commands (via AI agents):                       │
│    /speckit.constitution   -- Establish governance               │
│    /speckit.specify        -- Define requirements                │
│    /speckit.plan           -- Create implementation strategy     │
│    /speckit.tasks          -- Generate task lists                │
│    /speckit.implement      -- Execute tasks                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### spec-kit Design Patterns

| Pattern | Description | ARTK Equivalent |
|---------|-------------|-----------------|
| **uv/uvx** | Fast Python package manager (10-100x faster than pip) | Could use uv or npm/npx |
| **Git-based install** | Install directly from GitHub repo | Already supported |
| **Agent-agnostic** | Works with 16+ AI coding agents | Already works with Copilot + Claude |
| **Slash commands** | Post-init AI agent commands | Already has `/artk.*` prompts |
| **Minimal footprint** | Just installs prompts + templates | ARTK also vendors @artk/core |

---

## Part 2: Current ARTK Bootstrap Analysis

### What the Bootstrap Script Does (7 Steps)

```
Step 1: Build @artk/core (if not built)
        └── npm install && npm run build in core/typescript/

Step 2: Create artk-e2e/ directory structure
        └── 15+ directories (vendor, src/modules, tests/*, config, etc.)

Step 3: Copy @artk/core + @artk/core-autogen to vendor/
        └── dist/, package.json, README.md, version.json

Step 4: Install prompts to .github/prompts/
        └── artk.*.md → artk.*.prompt.md (11 files)

Step 5: Create configuration files
        └── package.json, playwright.config.ts, tsconfig.json, artk.config.yml
        └── Foundation module stubs
        └── .artk/context.json

Step 5.5: Generate foundation modules (via templates)
        └── Runs generate-foundation.ts with detected variant (ESM/CommonJS)

Step 6: Run npm install
        └── PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps

Step 7: Configure browsers
        └── Download from release cache OR bundled install OR detect system browsers
```

### Current Script Metrics

| Script | Lines | Size | Complexity |
|--------|-------|------|------------|
| `bootstrap.ps1` | 1,026 | 38KB | High (browser detection, config generation) |
| `bootstrap.sh` | 1,193 | 42KB | High (same + POSIX compatibility) |
| **Total** | 2,219 | 80KB | Duplicated logic across platforms |

### Pain Points

1. **Duplication**: Same logic in .sh and .ps1
2. **No central distribution**: Must clone ARTK repo to get bootstrap
3. **No version management**: Can't easily upgrade ARTK in existing projects
4. **Path dependencies**: Scripts assume ARTK repo structure exists

---

## Part 3: CLI Design Options

### Option A: Python CLI with uv (spec-kit style)

```
┌─────────────────────────────────────────────────────────────────┐
│                   Option A: Python + uv                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Installation:                                                   │
│    uv tool install artk-cli \                                   │
│      --from git+https://github.com/yourorg/ARTK.git             │
│                                                                  │
│  One-time:                                                       │
│    uvx --from git+https://github.com/yourorg/ARTK.git \         │
│      artk init /path/to/project                                  │
│                                                                  │
│  Commands:                                                       │
│    artk init <path>          -- Full bootstrap                   │
│    artk upgrade <path>       -- Upgrade @artk/core               │
│    artk check                -- Verify prerequisites             │
│    artk doctor               -- Diagnose issues                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Pros:                                                           │
│    + Proven pattern (spec-kit uses this)                        │
│    + uv is extremely fast                                        │
│    + Cross-platform (Python handles OS differences)              │
│    + Single codebase (no .sh/.ps1 duplication)                  │
│    + Easy to add subcommands                                     │
│                                                                  │
│  Cons:                                                           │
│    - Requires Python + uv (extra dependency)                     │
│    - Must bundle TypeScript artifacts in Python package          │
│    - Different language from @artk/core (TypeScript)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Option B: Node.js CLI with npm/npx

```
┌─────────────────────────────────────────────────────────────────┐
│                   Option B: Node.js + npm                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Installation:                                                   │
│    npm install -g @artk/cli                                      │
│                                                                  │
│  One-time:                                                       │
│    npx @artk/cli init /path/to/project                          │
│                                                                  │
│  Commands:                                                       │
│    artk init <path>          -- Full bootstrap                   │
│    artk upgrade <path>       -- Upgrade @artk/core               │
│    artk check                -- Verify prerequisites             │
│    artk doctor               -- Diagnose issues                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Pros:                                                           │
│    + Same language as @artk/core (TypeScript)                    │
│    + Users already have Node.js (it's required for Playwright)   │
│    + Direct import of @artk/core modules                         │
│    + npm is universally available                                │
│                                                                  │
│  Cons:                                                           │
│    - npx is slower than uvx                                      │
│    - npm global installs can conflict with project deps          │
│    - Cross-platform file operations are verbose in Node.js       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Option C: Rust CLI (compiled binary)

```
┌─────────────────────────────────────────────────────────────────┐
│                   Option C: Rust Binary                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Installation:                                                   │
│    cargo install artk-cli                                        │
│    # or download pre-built binary from releases                  │
│                                                                  │
│  Commands:                                                       │
│    artk init <path>          -- Full bootstrap                   │
│    artk upgrade <path>       -- Upgrade @artk/core               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Pros:                                                           │
│    + Single static binary (no runtime dependencies)              │
│    + Extremely fast startup                                      │
│    + Can embed @artk/core artifacts in binary                    │
│                                                                  │
│  Cons:                                                           │
│    - Different language (Rust vs TypeScript)                     │
│    - Steeper learning curve for contributors                     │
│    - Must cross-compile for each platform                        │
│    - Embedded artifacts increase binary size                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Recommendation: **Option B (Node.js CLI)** with npm/npx

**Rationale:**
1. **Users already need Node.js** for Playwright, so no new runtime dependency
2. **Same language** as @artk/core enables code sharing
3. **npm is ubiquitous** and well-understood by the target audience
4. **Direct TypeScript development** with existing toolchain
5. **Simpler packaging** - just publish to npm

---

## Part 4: Detailed Architecture

### Package Structure

```
@artk/cli/                          # NEW: CLI package
├── package.json                    # bin: { "artk": "./dist/cli.js" }
├── tsconfig.json
├── src/
│   ├── cli.ts                      # Entry point (commander-based)
│   ├── commands/
│   │   ├── init.ts                 # artk init <path>
│   │   ├── upgrade.ts              # artk upgrade <path>
│   │   ├── check.ts                # artk check
│   │   ├── doctor.ts               # artk doctor
│   │   └── uninstall.ts            # artk uninstall <path>
│   ├── lib/
│   │   ├── bootstrap.ts            # Core bootstrap logic (unified)
│   │   ├── browser-resolver.ts     # Browser detection & install
│   │   ├── config-generator.ts     # Config file generation
│   │   ├── environment.ts          # Environment detection
│   │   ├── prompts-installer.ts    # Copy prompts to target
│   │   ├── vendor-installer.ts     # Copy @artk/core to vendor
│   │   └── logger.ts               # Colorful console output
│   └── assets/                     # Bundled artifacts
│       ├── prompts/                # Embedded prompt files
│       └── templates/              # Config templates
├── dist/                           # Built output
└── README.md

@artk/core/                         # EXISTING: Core library (unchanged)
├── dist/
├── templates/
└── package.json

@artk/core-autogen/                 # EXISTING: Autogen library (unchanged)
├── dist/
└── package.json
```

### CLI Command Design

```typescript
// src/cli.ts
import { program } from 'commander';

program
  .name('artk')
  .description('ARTK - Automatic Regression Testing Kit')
  .version('1.0.0');

program
  .command('init <path>')
  .description('Initialize ARTK in a project')
  .option('--skip-npm', 'Skip npm install')
  .option('--skip-browsers', 'Skip browser installation')
  .option('--force', 'Overwrite existing installation')
  .option('--variant <type>', 'Module system: commonjs or esm')
  .action(async (path, options) => {
    await initCommand(path, options);
  });

program
  .command('upgrade <path>')
  .description('Upgrade @artk/core in an existing installation')
  .option('--check', 'Check for updates without applying')
  .action(async (path, options) => {
    await upgradeCommand(path, options);
  });

program
  .command('check')
  .description('Verify prerequisites (Node.js, npm, browsers)')
  .action(async () => {
    await checkCommand();
  });

program
  .command('doctor')
  .description('Diagnose and fix common issues')
  .action(async () => {
    await doctorCommand();
  });

program
  .command('uninstall <path>')
  .description('Remove ARTK from a project')
  .option('--keep-tests', 'Keep test files')
  .action(async (path, options) => {
    await uninstallCommand(path, options);
  });

program.parse();
```

### Key Module: Bootstrap Logic

```typescript
// src/lib/bootstrap.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { Logger } from './logger';
import { detectEnvironment } from './environment';
import { installVendor } from './vendor-installer';
import { installPrompts } from './prompts-installer';
import { generateConfigs } from './config-generator';
import { resolveBrowser } from './browser-resolver';

export interface BootstrapOptions {
  skipNpm?: boolean;
  skipBrowsers?: boolean;
  force?: boolean;
  variant?: 'commonjs' | 'esm' | 'auto';
}

export async function bootstrap(
  targetPath: string,
  options: BootstrapOptions = {}
): Promise<void> {
  const logger = new Logger();
  const resolvedPath = path.resolve(targetPath);

  logger.header('ARTK Bootstrap Installation');
  logger.info(`Target: ${resolvedPath}`);

  // Step 1: Validate target
  await validateTarget(resolvedPath, options.force);

  // Step 2: Detect environment
  const env = await detectEnvironment(resolvedPath);
  const variant = options.variant === 'auto' ? env.moduleSystem : options.variant;
  logger.step(1, 7, `Environment: ${variant}`);

  // Step 3: Create directory structure
  logger.step(2, 7, 'Creating artk-e2e/ structure');
  await createDirectoryStructure(resolvedPath);

  // Step 4: Install @artk/core to vendor
  logger.step(3, 7, 'Installing @artk/core to vendor/');
  await installVendor(resolvedPath);

  // Step 5: Install prompts
  logger.step(4, 7, 'Installing prompts to .github/prompts/');
  await installPrompts(resolvedPath);

  // Step 6: Generate configuration files
  logger.step(5, 7, 'Creating configuration files');
  await generateConfigs(resolvedPath, { variant, projectName: path.basename(resolvedPath) });

  // Step 7: npm install
  if (!options.skipNpm) {
    logger.step(6, 7, 'Running npm install');
    await runNpmInstall(resolvedPath);
  }

  // Step 8: Browser configuration
  if (!options.skipBrowsers && !options.skipNpm) {
    logger.step(7, 7, 'Configuring browsers');
    await resolveBrowser(resolvedPath);
  }

  logger.success('ARTK Installation Complete!');
  logger.nextSteps([
    'cd artk-e2e',
    'Open VS Code and use /artk.init-playbook in Copilot Chat',
  ]);
}
```

---

## Part 5: Distribution Strategy

### npm Publishing

```json
// package.json for @artk/cli
{
  "name": "@artk/cli",
  "version": "1.0.0",
  "description": "ARTK CLI - Bootstrap Playwright test suites with AI-assisted workflows",
  "bin": {
    "artk": "./dist/cli.js"
  },
  "files": [
    "dist",
    "assets"
  ],
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "fs-extra": "^11.2.0",
    "yaml": "^2.3.4",
    "zod": "^3.22.4"
  },
  "peerDependencies": {
    "@artk/core": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Installation Methods

```bash
# Global installation (recommended for frequent use)
npm install -g @artk/cli
artk init /path/to/project

# One-time use (no global install)
npx @artk/cli init /path/to/project

# From GitHub directly (bleeding edge)
npx github:yourorg/ARTK/packages/cli init /path/to/project
```

### Bundling Strategy

The CLI needs to embed certain assets that aren't available via npm dependencies:

```
@artk/cli/
└── assets/
    ├── prompts/                    # Copied from ARTK/prompts/
    │   ├── artk.init-playbook.md
    │   ├── artk.discover-foundation.md
    │   ├── artk.journey-implement.md
    │   └── ... (11 files)
    ├── templates/                  # Config templates
    │   ├── playwright.config.ts.template
    │   ├── tsconfig.json.template
    │   └── package.json.template
    └── core/                       # Pre-built @artk/core (optional)
        ├── dist/
        └── package.json
```

**Build script** copies these from the monorepo during `npm run build`:

```typescript
// scripts/bundle-assets.ts
import * as fs from 'fs-extra';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_ASSETS = path.resolve(__dirname, '../assets');

async function bundleAssets() {
  // Copy prompts
  await fs.copy(
    path.join(REPO_ROOT, 'prompts'),
    path.join(CLI_ASSETS, 'prompts'),
    { filter: (src) => src.endsWith('.md') || fs.statSync(src).isDirectory() }
  );

  // Copy pre-built @artk/core (for offline install)
  await fs.copy(
    path.join(REPO_ROOT, 'core/typescript/dist'),
    path.join(CLI_ASSETS, 'core/dist')
  );
  await fs.copy(
    path.join(REPO_ROOT, 'core/typescript/package.json'),
    path.join(CLI_ASSETS, 'core/package.json')
  );
  await fs.copy(
    path.join(REPO_ROOT, 'core/typescript/templates'),
    path.join(CLI_ASSETS, 'core/templates')
  );
}
```

---

## Part 6: Implementation Plan

### Phase 1: CLI Scaffolding (1-2 days)

**Tasks:**
1. Create `packages/cli/` directory in ARTK repo
2. Set up TypeScript + commander + build tooling
3. Implement basic `artk init` with hardcoded paths
4. Add `artk check` for prerequisite validation

**Deliverables:**
- Working CLI that can init a project from within ARTK repo
- `artk check` validates Node.js 18+, npm, git

### Phase 2: Core Bootstrap Logic (2-3 days)

**Tasks:**
1. Port `bootstrap.sh` logic to TypeScript in `src/lib/bootstrap.ts`
2. Implement cross-platform file operations (no shell scripts)
3. Add environment detection (ESM vs CommonJS)
4. Implement config generation from templates

**Deliverables:**
- `artk init` creates complete artk-e2e structure
- Works identically on Windows, macOS, Linux

### Phase 3: Browser Resolution (1-2 days)

**Tasks:**
1. Port browser detection logic to TypeScript
2. Implement Playwright browser download with fallback chain
3. Add system browser detection (Edge, Chrome)
4. Store browser metadata in `.artk/context.json`

**Deliverables:**
- Browsers work on first run
- Graceful fallback on restricted networks

### Phase 4: npm Publishing (1 day)

**Tasks:**
1. Set up npm publishing workflow
2. Create asset bundling script
3. Configure package.json for distribution
4. Test `npx @artk/cli` flow

**Deliverables:**
- Published to npm registry
- Works with `npx @artk/cli init`

### Phase 5: Upgrade & Doctor Commands (1-2 days)

**Tasks:**
1. Implement `artk upgrade` to update @artk/core
2. Implement `artk doctor` for troubleshooting
3. Add `artk uninstall` for clean removal
4. Add version checking

**Deliverables:**
- Full lifecycle management commands

### Phase 6: Documentation & Polish (1 day)

**Tasks:**
1. Update CLAUDE.md with CLI usage
2. Add CLI-specific documentation
3. Create migration guide from shell scripts
4. Add shell completion scripts (optional)

**Deliverables:**
- Complete documentation
- Deprecation notice for shell scripts

---

## Part 7: Migration Path

### Deprecation Strategy

```
Phase 1 (v1.0): CLI available, scripts still work
  - Add deprecation warning to shell scripts
  - Document CLI as preferred method

Phase 2 (v1.1): CLI is primary, scripts emit warnings
  - Shell scripts print warning on every run
  - All docs reference CLI

Phase 3 (v2.0): Remove shell scripts
  - Delete bootstrap.sh and bootstrap.ps1
  - CLI is only method
```

### Backward Compatibility

The CLI will produce identical output to the shell scripts:

```bash
# These should produce identical results:
./scripts/bootstrap.sh /path/to/project
artk init /path/to/project

# Same options:
./scripts/bootstrap.sh /path/to/project --skip-npm
artk init /path/to/project --skip-npm
```

---

## Part 8: Comparison Table

| Feature | Current (Scripts) | CLI (Proposed) | spec-kit |
|---------|-------------------|----------------|----------|
| Installation | Clone repo | `npm install -g @artk/cli` | `uv tool install` |
| One-time use | N/A | `npx @artk/cli` | `uvx` |
| Cross-platform | Separate scripts | Single codebase | Single codebase |
| Upgrade | Re-clone repo | `artk upgrade` | `uv tool install --force` |
| Prerequisites | Manual | `artk check` | `specify check` |
| Diagnostics | Manual | `artk doctor` | N/A |
| Uninstall | Manual | `artk uninstall` | N/A |
| Lines of code | 2,219 (duplicated) | ~1,000 (unified) | ~500 |
| Runtime | Bash + PowerShell | Node.js | Python |

---

## Part 9: Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| npm package conflicts | Medium | Medium | Use peerDependencies, test with common setups |
| Browser install failures | High | High | Keep fallback chain from scripts, add `--skip-browsers` |
| ESM/CommonJS detection wrong | Medium | Medium | Allow `--variant` override, improve heuristics |
| Large package size | Low | Low | Don't bundle browsers, use lazy loading |

### Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users prefer scripts | Medium | Low | Keep scripts for transition period |
| npx too slow | Low | Low | Recommend global install for frequent users |
| Windows path issues | Medium | Medium | Use path.normalize(), extensive Windows testing |

---

## Part 10: Future Enhancements

### Phase 2+ Features

1. **Interactive mode**: `artk init` with prompts for configuration
2. **Plugin system**: Extend CLI with custom commands
3. **Template marketplace**: Download additional prompt templates
4. **CI/CD integration**: Generate GitHub Actions / Azure DevOps pipelines
5. **Project templates**: `artk init --template=nextjs`
6. **Telemetry** (opt-in): Track common errors to improve CLI

### Long-term Vision

```
artk init /path/to/project              # Basic setup
artk init /path/to/project --template=react-spa  # Template-based
artk plugin add @artk/plugin-ci         # Add CI/CD generation
artk doctor                             # Fix common issues
artk sync                               # Sync with ARTK updates
```

---

## Conclusion

Creating an `@artk/cli` package using Node.js and npm is the recommended approach because:

1. **No new dependencies**: Users already have Node.js for Playwright
2. **Single codebase**: Eliminates .sh/.ps1 duplication
3. **Better UX**: `npx @artk/cli init` is cleaner than cloning a repo
4. **Upgrade path**: `artk upgrade` enables version management
5. **Extensibility**: Easy to add new commands as ARTK evolves

The implementation can be completed in approximately **1-2 weeks** of focused development, with the CLI providing identical functionality to the current shell scripts while enabling future enhancements.

---

## Appendix: File Inventory for CLI Package

### Files to Embed in CLI Package

```
assets/
├── prompts/                          # From ARTK/prompts/
│   ├── artk.init-playbook.md         # 58K
│   ├── artk.discover-foundation.md   # 33K
│   ├── artk.journey-implement.md     # 21K
│   ├── artk.journey-propose.md       # 21K
│   ├── artk.journey-verify.md        # 17K
│   ├── artk.journey-validate.md      # 14K
│   ├── artk.journey-clarify.md       # 12K
│   ├── artk.testid-audit.md          # 12K
│   ├── artk.journey-define.md        # 9.9K
│   ├── artk.journey-maintain.md      # 8K
│   └── artk.uninstall.md             # 23K
│   Total: ~239K
│
├── core/                             # From ARTK/core/typescript/
│   ├── dist/                         # Pre-built @artk/core (~1.2M)
│   ├── templates/                    # Foundation templates (~54K)
│   │   ├── commonjs/
│   │   └── esm/
│   └── package.json
│   Total: ~1.3M
│
├── autogen/                          # From ARTK/core/typescript/autogen/
│   ├── dist/                         # Pre-built @artk/core-autogen (~500K)
│   └── package.json
│   Total: ~500K
│
└── templates/                        # Config templates (~10K)
    ├── playwright.config.ts.ejs
    ├── tsconfig.json.ejs
    ├── package.json.ejs
    └── artk.config.yml.ejs

Total embedded assets: ~2.1M (compressed: ~800K)
```

### Estimated Package Size

| Component | Uncompressed | Compressed |
|-----------|--------------|------------|
| CLI code (dist/) | 50K | 15K |
| Prompts | 239K | 80K |
| @artk/core (dist + templates) | 1.3M | 400K |
| @artk/core-autogen | 500K | 150K |
| Config templates | 10K | 3K |
| Dependencies (node_modules) | N/A (not bundled) | N/A |
| **Total** | **~2.1M** | **~650K** |

The CLI will be a lightweight ~650KB download that vendors everything needed for installation.
