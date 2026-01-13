# Implementation Plan: Foundation Module System Compatibility

**Branch**: `001-foundation-compatibility` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-foundation-compatibility/spec.md`

## Summary

Implement automatic environment detection and cross-platform compatibility for ARTK foundation module generation to eliminate the 15-file manual fix problem observed during CommonJS/ESM incompatibility. The solution provides: (1) Pre-generation detection of Node version, module system, and TypeScript config; (2) Runtime compatibility layer abstracting `__dirname` vs `import.meta.url`; (3) Post-generation validation with automatic rollback on failure; (4) Dual template system with bundled defaults and local overrides.

**Technical Approach**: Extend bootstrap scripts and @artk/core with detection logic, create compatibility shim module, implement validation engine, and establish template resolution hierarchy (local overrides → bundled defaults).

## Technical Context

**Language/Version**: TypeScript 5.x targeting Node.js 18.0.0+ (both CommonJS and ESM environments)
**Primary Dependencies**:
- @artk/core (compatibility layer host)
- Node.js built-ins: `fs`, `path`, `url` (for detection and compat)
- Existing: `yaml`, `zod` (config parsing, schema validation)

**Storage**: File-based (`.artk/context.json` for detection cache, `.artk/validation-results.json` for validation history)
**Testing**:
- Unit tests: vitest (existing @artk/core test harness)
- Integration tests: Playwright test runner (foundation validation)
- Compatibility matrix: Node 18.12.1 CommonJS, Node 20.x ESM, TypeScript 5.x both modes

**Target Platform**: Node.js CLI tooling (bootstrap scripts, foundation generators)
**Project Type**: Single monorepo with multiple packages (core/typescript for @artk/core, scripts/ for bootstrap)
**Performance Goals**:
- Environment detection: <5 seconds (FR-094 timeout)
- Foundation generation + validation: <30 seconds total (SC-002)
- Compatibility layer overhead: <5% vs native calls (SC-007)

**Constraints**:
- Offline-safe: No network access required for detection/validation (Assumption #6)
- Zero external dependencies for compat layer (FR-018)
- Backward compatible with existing `.artk/context.json` format (Dependency #6)
- Must work on both Windows (PowerShell) and Unix (Bash) bootstrap scripts

**Scale/Scope**:
- 4 user stories (P1-P4)
- 47 functional requirements across 4 subsystems
- 3 key entities (Environment Context, Validation Result, Compatibility Shim)
- 10 success criteria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Applicable Principles

**II. Modular Architecture** - Partially Applicable
- ✅ This feature creates the foundation layer architecture (auth, config, navigation modules)
- ✅ Detection, validation, and compat layer are separate concerns following layered design
- ⚠️ Not directly about test code modularity, but establishes the module structure tests will use

**III. Config-Driven Environments** - Highly Applicable
- ✅ FR-001 through FR-010 enforce detection of environment configuration
- ✅ FR-005: Detection results stored in `.artk/context.json` for reuse
- ✅ Environment-specific behavior (CommonJS vs ESM) driven by detected config, not hardcoded

**VI. Auto-Generated Artifacts** - Highly Applicable
- ✅ FR-031: Validation results auto-generated to `.artk/validation-results.json`
- ✅ FR-005: `.artk/context.json` auto-generated from detection
- ✅ Foundation modules auto-generated from templates (FR-032 through FR-047)
- ✅ Source of truth: templates (bundled or local overrides), generated code must not be manually edited post-generation

### Compliance Status

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Journey-First | N/A | Infrastructure feature, not test implementation |
| II. Modular Architecture | ✅ Pass | Establishes foundation module architecture |
| III. Config-Driven | ✅ Pass | Detection-driven generation, no hardcoded env assumptions |
| IV. Stability-First | N/A | No test timing/wait logic in scope |
| V. Full Traceability | N/A | Infrastructure feature, not test implementation |
| VI. Auto-Generated Artifacts | ✅ Pass | Detection results, validation results, modules all auto-generated |
| VII. Maintenance-Integrated | N/A | No Journey maintenance in scope |

**Gate Result**: ✅ **PASS** - No violations. Feature aligns with applicable constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-compatibility/
├── spec.md                  # Feature specification (/speckit.specify output)
├── plan.md                  # This file (/speckit.plan output)
├── research.md              # Phase 0 output (generated below)
├── data-model.md            # Phase 1 output (generated below)
├── quickstart.md            # Phase 1 output (generated below)
├── contracts/               # Phase 1 output (generated below)
│   ├── environment-context.schema.json
│   ├── validation-result.schema.json
│   └── compat-api.md
├── checklists/
│   └── requirements.md      # Spec validation checklist (from /speckit.specify)
└── tasks.md                 # Phase 2 output (/speckit.tasks - NOT YET CREATED)
```

### Source Code (repository root)

```text
core/typescript/              # @artk/core package (existing)
├── src/
│   ├── compat/              # NEW: Compatibility layer (P2)
│   │   ├── index.ts         # Public exports
│   │   ├── dirname.ts       # getDirname() implementation
│   │   ├── project-root.ts  # resolveProjectRoot() implementation
│   │   ├── dynamic-import.ts # dynamicImport() implementation
│   │   └── detect-env.ts    # Runtime environment detection
│   ├── detection/           # NEW: Environment detection (P1)
│   │   ├── index.ts
│   │   ├── node-version.ts
│   │   ├── module-system.ts
│   │   ├── typescript-config.ts
│   │   └── confidence.ts    # Detection confidence scorer
│   ├── validation/          # NEW: Validation engine (P3)
│   │   ├── index.ts
│   │   ├── rules/
│   │   │   ├── import-meta-usage.ts
│   │   │   ├── dirname-usage.ts
│   │   │   ├── import-paths.ts
│   │   │   └── dependency-compat.ts
│   │   ├── runner.ts
│   │   └── rollback.ts
│   ├── templates/           # NEW: Bundled templates (P4)
│   │   ├── commonjs/
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   └── navigation/
│   │   ├── esm/
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   └── navigation/
│   │   └── shared/
│   │       └── types/
│   ├── auth/                # EXISTING: Enhanced with compat layer
│   ├── config/              # EXISTING: Enhanced with compat layer
│   └── fixtures/            # EXISTING
└── tests/
    ├── compat/              # NEW: Compatibility layer tests
    ├── detection/           # NEW: Detection tests
    ├── validation/          # NEW: Validation tests
    └── integration/         # NEW: Cross-environment integration tests

scripts/                     # Bootstrap scripts (existing)
├── bootstrap.sh             # MODIFIED: Add detection + validation calls
├── bootstrap.ps1            # MODIFIED: Add detection + validation calls
├── lib/                     # NEW: Shared detection logic
│   ├── detect-environment.sh
│   └── detect-environment.ps1
└── validation/              # NEW: Validation script integration
    ├── validate-foundation.sh
    └── validate-foundation.ps1

.artk/                       # Project metadata (existing location)
├── context.json             # MODIFIED: Add detection fields (FR-005)
└── validation-results.json  # NEW: Validation history (FR-031)
```

**Structure Decision**: Single monorepo with @artk/core as primary package. New subsystems (compat, detection, validation) added as first-class modules within `core/typescript/src/`. Templates bundled within package for npm distribution. Bootstrap scripts enhanced to call detection and validation logic before/after generation.

## Complexity Tracking

> No violations - Constitution Check passed. This section intentionally left empty.

---

## Phase 0: Research & Design Decisions

### Research Tasks

1. **Node.js Module System Detection**: Research reliable methods to detect CommonJS vs ESM environment at runtime and during bootstrap
2. **TypeScript Config Parsing**: Research safe parsing of tsconfig.json with handling for extends, comments, and JSON-with-comments format
3. **Cross-Platform Path Resolution**: Research path resolution patterns that work identically in CommonJS and ESM on Windows and Unix
4. **Template Resolution Patterns**: Research npm package template bundling strategies and local override mechanisms
5. **Validation Rule Patterns**: Research static analysis patterns for detecting environment-specific API usage in TypeScript code
6. **Rollback Transaction Patterns**: Research safe file operation rollback strategies without external dependencies

### Output

See [research.md](./research.md) (generated in Phase 0 execution below)

---

## Phase 1: Data Model & Contracts

### Entities

See [data-model.md](./data-model.md) (generated in Phase 1 execution below)

### API Contracts

See [contracts/](./contracts/) directory (generated in Phase 1 execution below)

---

## Phase 2: Task Decomposition

**Not executed by `/speckit.plan`.** Run `/speckit.tasks` after planning to generate dependency-ordered implementation tasks.

