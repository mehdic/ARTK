# ARTK Module Architecture

This document explains how ARTK handles JavaScript module systems (ESM vs CommonJS) and the architecture decisions made for reliable cross-project compatibility.

## Overview

ARTK consists of two main parts:

1. **@artk/core** - The reusable library (supports both ESM and CommonJS)
2. **artk-e2e** - The scaffolded test project installed in client repos

```
Client Project (any module system)
├── src/                    ← Client's code (ESM or CommonJS)
├── package.json            ← Client's settings
│
└── artk-e2e/               ← ISOLATED npm package
    ├── package.json        ← Own dependencies
    ├── tsconfig.json       ← Own TypeScript config
    ├── playwright.config.ts
    ├── tests/
    └── vendor/
        └── artk-core/      ← @artk/core (dual ESM/CJS)
```

**Key insight:** The `artk-e2e` folder is a **separate npm package** from the client project. Its configuration is independent of the client's module system.

## @artk/core: Dual Module Support

The `@artk/core` package exports both ESM and CommonJS formats:

```json
// core/typescript/package.json (simplified)
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "import": "./dist/config/index.js",
      "require": "./dist/config/index.js"
    },
    "./harness": {
      "import": "./dist/harness/index.js",
      "require": "./dist/harness/index.js"
    }
  }
}
```

This means `@artk/core` works regardless of whether the consuming project uses ESM or CommonJS.

## artk-e2e: Why CommonJS?

The scaffolded `artk-e2e` project uses CommonJS in its tsconfig:

```json
// artk-e2e/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node"
  }
}
```

**Why not NodeNext/ESM?**

Playwright's test runner internally transforms TypeScript before execution. It works best with CommonJS-style resolution. Using `NodeNext` causes issues:

| Issue | NodeNext Behavior | Problem |
|-------|-------------------|---------|
| `import.meta.url` | Required for ESM | Playwright doesn't support it |
| File extensions | Must use `.js` in imports | Easy to forget, causes runtime errors |
| Dynamic imports | Need explicit paths | Fragile, error-prone |

**This is isolated from the client project.** The client can use ESM, CommonJS, or any module system they prefer - `artk-e2e` is its own package.

## The file: Dependency Problem

When `@artk/core` is installed via `file:` protocol (vendored):

```json
// artk-e2e/package.json
{
  "dependencies": {
    "@artk/core": "file:./vendor/artk-core"
  }
}
```

Node.js doesn't always honor the `exports` field in package.json for `file:` dependencies. This means subpath imports can fail:

```typescript
// These may fail with file: dependencies
import { loadConfig } from '@artk/core/config';     // ❌ Subpath may not resolve
import { createPlaywrightConfig } from '@artk/core/harness';  // ❌ Same issue
```

### Solution: Inline Config Loading

The `playwright.config.ts` uses inline YAML loading instead of `@artk/core` imports:

```typescript
// playwright.config.ts - loads config directly
import * as fs from 'fs';
import * as path from 'path';

function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  const yaml = require('yaml');
  return yaml.parse(fs.readFileSync(configPath, 'utf8'));
}
```

**Important:** This workaround is ONLY for `playwright.config.ts`. All other code (tests, modules, fixtures) can and should use `@artk/core` normally:

```typescript
// tests/*.spec.ts - use @artk/core normally
import { artkTest, expect } from '@artk/core';

// src/modules/**/*.ts - use @artk/core normally
import { StorageStateManager } from '@artk/core';
```

## Architecture Summary

| Component | Module System | Uses @artk/core | Notes |
|-----------|---------------|-----------------|-------|
| `@artk/core` | Dual (ESM + CJS) | N/A | Library, supports both |
| Client project | Any | Optional | Independent of artk-e2e |
| `artk-e2e` tsconfig | CommonJS | Yes | For Playwright compatibility |
| `playwright.config.ts` | N/A | No (inline) | Workaround for file: deps |
| Test files | CommonJS | Yes | Normal imports work |
| Foundation modules | CommonJS | Yes | Normal imports work |

## When Does This Matter?

**For ARTK developers:**
- When modifying bootstrap scripts, maintain the CommonJS config for artk-e2e
- When adding new @artk/core exports, ensure they work with file: dependencies
- Test with both ESM and CommonJS client projects

**For ARTK users:**
- Your project's module system doesn't affect artk-e2e
- The artk-e2e folder is self-contained
- No configuration needed - bootstrap handles everything

## Troubleshooting

### "Cannot find module '@artk/core/config'"

This happens when subpath exports fail with file: dependencies.

**Solution:** The bootstrap script already handles this. If you see this error:
1. Re-run the bootstrap script to regenerate playwright.config.ts
2. Or manually update playwright.config.ts to use inline config loading

### "import.meta.url is not defined"

This happens when using ESM syntax in a CommonJS context.

**Solution:** Ensure artk-e2e/tsconfig.json uses:
```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node"
  }
}
```

### Tests work but TypeScript shows errors

The tsconfig paths may not be resolving correctly.

**Solution:** Ensure these paths are in tsconfig.json:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@artk/core": ["./vendor/artk-core/dist"],
      "@artk/core/*": ["./vendor/artk-core/dist/*"]
    }
  }
}
```

## Related Documentation

- [ARTK Core v1 Specification](./ARTK_Core_v1_Specification.md)
- [ARTK Master Launch Document](./ARTK_Master_Launch_Document_v0.7.md)
