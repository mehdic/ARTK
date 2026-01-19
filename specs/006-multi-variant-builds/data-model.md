# Data Model: ARTK Multi-Variant Build System

**Feature**: 006-multi-variant-builds
**Date**: 2026-01-19

---

## Entities

### 1. Variant

A pre-built distribution of ARTK packages targeting specific Node.js versions and module systems.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | enum | Yes | `modern-esm` \| `modern-cjs` \| `legacy-16` \| `legacy-14` |
| displayName | string | Yes | Human-readable name (e.g., "Modern ESM") |
| nodeRange | string[] | Yes | Supported Node.js major versions (e.g., ["18", "20", "22"]) |
| playwrightVersion | string | Yes | Playwright version (e.g., "1.57.x") |
| moduleSystem | enum | Yes | `esm` \| `cjs` |
| tsTarget | string | Yes | TypeScript target (e.g., "ES2022") |
| distDirectory | string | Yes | Output directory name (e.g., "dist", "dist-legacy-16") |

**Validation Rules**:
- `id` must be one of the four defined variants
- `nodeRange` must contain at least one valid Node.js major version (14-22)
- `playwrightVersion` must match pattern `^\d+\.\d+\.x$`

**State Transitions**: None (Variant is immutable after build)

---

### 2. Context

Installation metadata stored in the target project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| variant | string | Yes | Installed variant ID |
| variantInstalledAt | ISO8601 | Yes | Timestamp of installation |
| nodeVersion | number | Yes | Node.js major version at install time |
| moduleSystem | enum | Yes | Detected module system |
| playwrightVersion | string | Yes | Playwright version in installed variant |
| artkVersion | string | Yes | ARTK version installed |
| installMethod | enum | Yes | `cli` \| `bootstrap` \| `manual` |
| overrideUsed | boolean | No | True if `--variant` override was used |

**Storage Location**: `.artk/context.json`

**Validation Rules**:
- `variant` must match one of the four valid variant IDs
- `nodeVersion` must be >= 14
- `variantInstalledAt` must be valid ISO8601 timestamp

**State Transitions**:
```
Empty → Created (on first install)
Created → Updated (on upgrade/reinstall)
```

---

### 3. InstallLog

Append-only log of installation operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | ISO8601 | Yes | When the log entry was created |
| level | enum | Yes | `INFO` \| `WARN` \| `ERROR` |
| operation | enum | Yes | `install` \| `upgrade` \| `rollback` \| `detect` |
| message | string | Yes | Log message |
| details | object | No | Additional structured data |

**Storage Location**: `.artk/install.log`

**Validation Rules**:
- Entries are append-only (no modification or deletion)
- `timestamp` must be ISO8601 format
- File should not exceed 10MB (rotate if needed)

---

### 4. LockFile

Temporary file preventing concurrent installations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pid | number | Yes | Process ID holding the lock |
| startedAt | ISO8601 | Yes | When lock was acquired |
| operation | enum | Yes | `install` \| `upgrade` |

**Storage Location**: `.artk/install.lock`

**Lifecycle**:
```
Not Exists → Created (lock acquired)
Created → Deleted (on success)
Created → Deleted (on failure/rollback)
Created → Stale (process crashed - check PID validity)
```

**Validation Rules**:
- Lock is stale if PID no longer exists
- Lock older than 10 minutes should be considered stale

---

### 5. FeatureCompatibility

Structured documentation of Playwright feature availability per variant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| variant | string | Yes | Variant ID |
| playwrightVersion | string | Yes | Playwright version |
| features | object | Yes | Map of feature name → availability info |

**Feature Entry Structure**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| available | boolean | Yes | Whether feature is available |
| alternative | string | No | Suggested alternative if unavailable |
| notes | string | No | Additional context |

**Storage Location**: `variant-features.json` (in vendor directory)

**Example**:
```json
{
  "variant": "legacy-14",
  "playwrightVersion": "1.33.x",
  "features": {
    "aria_snapshots": {
      "available": false,
      "alternative": "Use page.evaluate() to query ARIA attributes"
    },
    "clock_api": {
      "available": false,
      "alternative": "Use page.evaluate() with Date.now mocking"
    },
    "route_from_har": {
      "available": true
    }
  }
}
```

---

### 6. MarkerFile

Files signaling immutability to AI agents and developers.

**Types**:

| File | Purpose | Location |
|------|---------|----------|
| READONLY.md | Human and AI readable warning | `vendor/artk-core/READONLY.md` |
| .ai-ignore | Machine-readable ignore directive | `vendor/artk-core/.ai-ignore` |

**READONLY.md Structure**:
```markdown
# ⚠️ DO NOT MODIFY THIS DIRECTORY

[Warning text]

## Variant Information
- Variant: {variant}
- Node.js range: {nodeRange}
- Playwright: {playwrightVersion}
- Installed: {timestamp}

## If You Encounter Issues
[Troubleshooting steps]
```

**.ai-ignore Structure**:
```
# AI agents must not modify this directory
*
```

---

## Relationships

```
┌─────────────────┐
│     Variant     │
│  (build-time)   │
└────────┬────────┘
         │ produces
         ▼
┌─────────────────┐     ┌─────────────────┐
│     Context     │────▶│   InstallLog    │
│  (runtime)      │     │  (append-only)  │
└────────┬────────┘     └─────────────────┘
         │
         │ references
         ▼
┌─────────────────┐     ┌─────────────────┐
│  FeatureCompat  │     │   MarkerFile    │
│  (per-variant)  │     │  (per-vendor)   │
└─────────────────┘     └─────────────────┘
         │
         │ protects against
         ▼
┌─────────────────┐
│    LockFile     │
│  (temporary)    │
└─────────────────┘
```

---

## Type Definitions (TypeScript)

```typescript
// Variant ID enum
export type VariantId = 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';

// Module system enum
export type ModuleSystem = 'esm' | 'cjs';

// Variant definition
export interface Variant {
  id: VariantId;
  displayName: string;
  nodeRange: string[];
  playwrightVersion: string;
  moduleSystem: ModuleSystem;
  tsTarget: string;
  distDirectory: string;
}

// Installation context
export interface ArtkContext {
  variant: VariantId;
  variantInstalledAt: string; // ISO8601
  nodeVersion: number;
  moduleSystem: ModuleSystem;
  playwrightVersion: string;
  artkVersion: string;
  installMethod: 'cli' | 'bootstrap' | 'manual';
  overrideUsed?: boolean;
}

// Log entry
export interface InstallLogEntry {
  timestamp: string; // ISO8601
  level: 'INFO' | 'WARN' | 'ERROR';
  operation: 'install' | 'upgrade' | 'rollback' | 'detect';
  message: string;
  details?: Record<string, unknown>;
}

// Lock file
export interface LockFile {
  pid: number;
  startedAt: string; // ISO8601
  operation: 'install' | 'upgrade';
}

// Feature compatibility
export interface FeatureEntry {
  available: boolean;
  alternative?: string;
  notes?: string;
}

export interface FeatureCompatibility {
  variant: VariantId;
  playwrightVersion: string;
  features: Record<string, FeatureEntry>;
}
```

---

## Validation with Zod

```typescript
import { z } from 'zod';

export const VariantIdSchema = z.enum([
  'modern-esm',
  'modern-cjs',
  'legacy-16',
  'legacy-14'
]);

export const ArtkContextSchema = z.object({
  variant: VariantIdSchema,
  variantInstalledAt: z.string().datetime(),
  nodeVersion: z.number().int().min(14).max(30),
  moduleSystem: z.enum(['esm', 'cjs']),
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  artkVersion: z.string(),
  installMethod: z.enum(['cli', 'bootstrap', 'manual']),
  overrideUsed: z.boolean().optional()
});

export const LockFileSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.string().datetime(),
  operation: z.enum(['install', 'upgrade'])
});
```
