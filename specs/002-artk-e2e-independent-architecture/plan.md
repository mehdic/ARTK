# Implementation Plan: ARTK E2E Independent Architecture

**Branch**: `002-artk-e2e-independent-architecture` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-artk-e2e-independent-architecture/spec.md`

## Summary

Create ARTK E2E test suites as independent, self-contained directories at the project root level, completely isolated from application dependencies. This includes:
- New `/init` prompt with project discovery and multi-target support
- Install script that creates isolated `artk-e2e/` directory with vendored @artk/core
- Configuration schema supporting 1-5 frontend targets with per-environment URLs
- Context persistence via `.artk/context.json` for inter-prompt communication
- Full Windows, macOS, and Linux platform support

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18.0.0+) for scripts; Bash for install scripts (with PowerShell parity for Windows)
**Primary Dependencies**: @artk/core 1.0.0+, @playwright/test 1.40.0+, yaml (config parsing), zod (schema validation)
**Storage**: File-based (YAML config, JSON context, Markdown journeys)
**Testing**: Playwright Test for E2E, Vitest for unit tests of detection/config logic
**Target Platform**: macOS (primary), Linux (CI), Windows (full support - releases blocked on Windows failures)
**Project Type**: CLI tool + prompt system (single project structure)
**Performance Goals**: `/init` completes in <30s, frontend detection <5s for 10 subdirectories
**Constraints**: Max 5 frontend targets, relative paths only for portability, no interaction with parent `.npmrc`
**Scale/Scope**: Monorepos with up to 5 frontend submodules, teams of 1-20 developers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Journey-First | ✅ PASS | Feature extends Journey system with target awareness (US-005) |
| II. Modular Architecture | ✅ PASS | Maintains Page Objects → Flows → Tests layering |
| III. Config-Driven Environments | ✅ PASS | Multi-environment support per target (US-006) |
| IV. Stability-First Testing | ✅ PASS | No changes to test execution model |
| V. Full Traceability | ✅ PASS | Tests organized by target, Journey tagging preserved |
| VI. Auto-Generated Artifacts | ✅ PASS | Context.json and config are generated, not manually edited |
| VII. Maintenance-Integrated | ✅ PASS | `/journey-maintain` workflow unchanged |

**Gate Status**: ✅ PASSED - No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/002-artk-e2e-independent-architecture/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (config schemas)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Primary: CLI scripts and prompts
core/typescript/
├── scripts/
│   └── install-to-project.sh    # Updated install script (US-002)
└── ...existing @artk/core

prompts/
├── init.prompt.md               # Updated /init prompt (US-001)
├── discover.prompt.md           # Updated /discover (US-004)
└── ...other prompts updated for multi-target

# New: Detection and config logic
core/typescript/
├── src/
│   ├── detection/               # Frontend detection heuristics (US-001)
│   │   ├── index.ts
│   │   ├── frontend-detector.ts
│   │   └── submodule-checker.ts
│   ├── config/
│   │   ├── schema-v2.ts         # Extended config schema (US-003)
│   │   └── context.ts           # Context.json management (US-007)
│   └── targets/                 # Multi-target support (US-003, US-005)
│       ├── index.ts
│       └── target-resolver.ts
└── tests/
    ├── unit/
    │   ├── detection/
    │   └── config/
    └── integration/
        └── init-flow/

# Generated in target projects (artk-e2e/)
artk-e2e/                        # Created by install script
├── package.json
├── vendor/artk-core/
├── artk.config.yml
├── playwright.config.ts
├── .artk/context.json
├── journeys/{target}/
├── tests/{target}/
├── docs/discovery/
└── .auth-states/{target}/
```

**Structure Decision**: Single project structure with new modules for detection, config v2, and multi-target support. The generated `artk-e2e/` directory structure is documented but lives in target projects, not this repo.

## Complexity Tracking

> No violations detected - no justification required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase Completion Status

| Phase | Status | Artifacts |
|-------|--------|-----------|
| Phase 0: Research | ✅ Complete | [research.md](./research.md) |
| Phase 1: Design | ✅ Complete | [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md) |
| Phase 2: Tasks | ⏳ Pending | Run `/speckit.tasks` to generate |

### Generated Artifacts

**Phase 0 (Research):**
- `research.md` - 7 research topics resolved (detection heuristics, submodules, Windows paths, config versioning, context schema, auth isolation, CI patterns)

**Phase 1 (Design):**
- `data-model.md` - 8 entities defined (ArtkContext, ArtkTarget, ArtkConfig, ArtkConfigTarget, ArtkAuthConfig, ArtkRole, DetectionResult, SubmoduleStatus)
- `contracts/context.schema.json` - JSON Schema for `.artk/context.json`
- `contracts/config.schema.json` - JSON Schema for `artk.config.yml`
- `quickstart.md` - Getting started guide with CI/CD integration examples

**Agent Context Updated:**
- `CLAUDE.md` - Updated with TypeScript 5.x, Playwright 1.40+, file-based storage
