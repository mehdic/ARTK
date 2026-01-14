# Implementation Plan: AG Grid Helper Module

**Branch**: `005-ag-grid-helper` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ag-grid-helper/spec.md`

## Summary

Add a comprehensive AG Grid helper module to @artk/core that provides locators, assertions, actions, and wait utilities for testing AG Grid components in Playwright tests. The module will handle virtualization, enterprise features, custom cell renderers, and integrate with ARTK's existing detection system for auto-discovery.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18.0.0+)
**Primary Dependencies**: @playwright/test ^1.57.0, @artk/core (internal)
**Storage**: N/A (stateless helper library)
**Testing**: Vitest (aligned with existing @artk/core tests)
**Target Platform**: Node.js (Playwright test environment)
**Project Type**: Single library module (extends @artk/core)
**Performance Goals**: Grid operations complete within Playwright's default timeout (30s); scroll operations use 50ms intervals
**Constraints**: Must work with AG Grid 30.x-33.x; no runtime dependencies beyond Playwright
**Scale/Scope**: ~15 source files, ~40 exported functions, ~500 unit tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Journey-First | N/A | This is infrastructure, not a test Journey |
| II. Modular Architecture | PASS | Module follows layered pattern (locators → actions → assertions) |
| III. Config-Driven Environments | PASS | No hardcoded values; grid selectors passed by caller |
| IV. Stability-First Testing | PASS | Uses Playwright auto-wait; explicit wait utilities provided |
| V. Full Traceability | N/A | Infrastructure module, not a Journey implementation |
| VI. Auto-Generated Artifacts | PASS | Detection integration auto-updates discovery reports |
| VII. Maintenance-Integrated | PASS | Designed for version stability across AG Grid updates |

**Gate Status**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/005-ag-grid-helper/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
core/typescript/
├── grid/                        # NEW: Grid helper module
│   ├── index.ts                 # Public exports
│   ├── types.ts                 # TypeScript interfaces
│   ├── ag-grid/
│   │   ├── index.ts             # AG Grid main export
│   │   ├── locators.ts          # Element location strategies
│   │   ├── assertions.ts        # Grid assertions
│   │   ├── actions.ts           # Grid interactions
│   │   ├── wait.ts              # Wait utilities
│   │   ├── scroll.ts            # Virtualization handling
│   │   ├── cell-renderers.ts    # Custom renderer support
│   │   └── enterprise/
│   │       ├── index.ts         # Enterprise feature exports
│   │       ├── grouping.ts      # Row grouping helpers
│   │       ├── tree-data.ts     # Tree data helpers
│   │       └── master-detail.ts # Master/detail helpers
│   └── __tests__/
│       ├── ag-grid.test.ts
│       ├── locators.test.ts
│       ├── assertions.test.ts
│       ├── actions.test.ts
│       ├── scroll.test.ts
│       └── fixtures/            # Test HTML fixtures
│           ├── basic-grid.html
│           ├── grouped-grid.html
│           └── virtualized-grid.html
│
├── detection/
│   └── signals.ts               # MODIFY: Add AG Grid detection signals
│
├── types/
│   └── context.ts               # MODIFY: Add uiComponents.grids field
│
├── index.ts                     # MODIFY: Export grid module
└── package.json                 # MODIFY: Add ./grid export path
```

**Structure Decision**: Single module within existing @artk/core package. The grid/ directory mirrors the pattern of existing modules (assertions/, locators/, auth/) with its own __tests__/ subdirectory.

## Complexity Tracking

> No constitution violations requiring justification.

| Item | Decision | Rationale |
|------|----------|-----------|
| Enterprise submodule | Separate enterprise/ directory | Keeps core module lightweight; enterprise features optional |
| Scroll handling | Dedicated scroll.ts file | Virtualization logic is complex enough to warrant isolation |
