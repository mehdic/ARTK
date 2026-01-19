# Implementation Plan: ARTK Multi-Variant Build System

**Branch**: `006-multi-variant-builds` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-multi-variant-builds/spec.md`

**Reference Document**: Before implementation, review `research/2026-01-19_multi-variant-implementation-plan.md` for detailed code examples.

## Summary

Build a multi-variant system for ARTK that produces four pre-built distributions (modern-esm, modern-cjs, legacy-16, legacy-14) targeting Node.js 14-22 and ESM/CommonJS module systems. The system automatically detects the target environment and installs the appropriate variant, preventing runtime compatibility errors and AI agent modifications to vendor code.

## Technical Context

**Language/Version**: TypeScript 5.x targeting multiple ES versions (ES2022, ES2021, ES2020)
**Primary Dependencies**: @playwright/test (1.57.x, 1.49.x, 1.33.x), tsup, tsc, zod, yaml, otplib
**Storage**: File-based (`.artk/context.json`, `.artk/install.log`, `variant-features.json`)
**Testing**: Vitest for unit tests, Playwright for E2E, Docker for cross-Node testing
**Target Platform**: Node.js 14, 16, 18, 20, 22 on Linux/macOS/Windows
**Project Type**: Library (monorepo with core + autogen + CLI packages)
**Performance Goals**: Build all 4 variants in under 5 minutes; installation completes in under 2 minutes
**Constraints**: No runtime variant switching; single variant per project; immutable vendor directories
**Scale/Scope**: ~2,100 existing tests must pass on all 4 variants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Journey-First | N/A | This is build infrastructure, not test code |
| II. Modular Architecture | ✅ PASS | Variants are modular distributions |
| III. Config-Driven Environments | ✅ PASS | Variant selection via config/detection |
| IV. Stability-First Testing | ✅ PASS | All variants tested deterministically |
| V. Full Traceability | ✅ PASS | Variant info logged in context.json |
| VI. Auto-Generated Artifacts | ✅ PASS | Variants are built, not manually edited |
| VII. Maintenance-Integrated | ✅ PASS | Upgrade command handles variant migration |

**Gate Status**: ✅ PASSED - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-multi-variant-builds/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── variant-features.schema.json
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
core/typescript/
├── src/                           # Source code (unchanged)
├── dist/                          # Modern ESM variant output
├── dist-cjs/                      # Modern CJS variant output
├── dist-legacy-16/                # Legacy Node 16 variant output
├── dist-legacy-14/                # Legacy Node 14 variant output
├── tsconfig.json                  # Modern ESM config (existing)
├── tsconfig.cjs.json              # Modern CJS config (NEW)
├── tsconfig.legacy-16.json        # Legacy 16 config (NEW)
├── tsconfig.legacy-14.json        # Legacy 14 config (NEW)
├── package.json                   # Updated with conditional exports
├── package-legacy-16.json         # Variant package.json (NEW)
├── package-legacy-14.json         # Variant package.json (NEW)
└── scripts/
    ├── build-variants.sh          # Build all variants (NEW)
    ├── build-variants.ps1         # Windows version (NEW)
    └── test-variants.sh           # Test all variants (NEW)

core/typescript/autogen/
├── dist/                          # Modern ESM variant
├── dist-cjs/                      # Modern CJS variant
├── dist-legacy-16/                # Legacy 16 variant
├── dist-legacy-14/                # Legacy 14 variant
├── tsconfig.cjs.json              # (NEW)
├── tsconfig.legacy-16.json        # (NEW)
├── tsconfig.legacy-14.json        # (NEW)
├── package-legacy-16.json         # (NEW)
└── package-legacy-14.json         # (NEW)

cli/src/
├── commands/
│   ├── init.ts                    # Updated with variant selection
│   ├── doctor.ts                  # Updated with variant check
│   └── upgrade.ts                 # Updated with variant migration
└── utils/
    └── variant-detector.ts        # NEW - detection logic

scripts/
├── bootstrap.sh                   # Updated with variant selection
└── bootstrap.ps1                  # Updated with variant selection

.github/workflows/
└── build-variants.yml             # NEW - CI for all Node versions
```

**Structure Decision**: Library with monorepo structure. Core and autogen packages both produce 4 variants. Bootstrap scripts and CLI handle variant selection at install time.

## Complexity Tracking

> No violations identified. All components follow standard build/distribution patterns.

| Component | Complexity Level | Justification |
|-----------|-----------------|---------------|
| 4 build variants | Standard | One-time build, no runtime complexity |
| Variant detection | Low | Simple version check + package.json parse |
| Lock file | Low | Standard concurrency pattern |
| AI markers | Low | Static files, no code |

---

## Phase 0: Research Output

See [research.md](./research.md) for detailed findings.

## Phase 1: Design Output

See:
- [data-model.md](./data-model.md) - Entity definitions
- [contracts/](./contracts/) - API schemas
- [quickstart.md](./quickstart.md) - Getting started guide
