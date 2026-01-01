# Implementation Plan: ARTK Pilot Launch

**Branch**: `003-artk-pilot-launch` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-artk-pilot-launch/spec.md`

## Summary

Complete the ARTK E2E independent architecture (remaining 002 tasks) and validate the entire ARTK workflow on the ITSS pilot project. This includes implementing the install script, running all slash commands (/init through /journey-maintain), implementing 5+ MVP journeys, and documenting learnings for multi-product rollout.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18.0.0+) + Bash/PowerShell scripts
**Primary Dependencies**: Playwright 1.40+, @artk/core (built in 001), Zod, yaml, otplib
**Storage**: File-based (artk.config.yml, .auth-states/*.json, .artk/context.json)
**Testing**: Playwright Test + Manual workflow validation (prompts executed against ITSS)
**Target Platform**: Cross-platform (macOS, Linux, Windows - per US2)
**Project Type**: Single (CLI scripts + prompts + validation harness)
**Performance Goals**: N/A (pilot validation, not production workload)
**Constraints**: ITSS access required, test accounts required, Keycloak available
**Scale/Scope**: 1 pilot project (ITSS), 5+ MVP journeys, 16 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Journey-First | ✅ PASS | US9-US14 implement full journey lifecycle on ITSS |
| II. Modular Architecture | ✅ PASS | Page Objects → Flows → Tests structure in spec (lines 437-442) |
| III. Config-Driven | ✅ PASS | artk.config.yml required, FR-003/FR-004, no hardcoded URLs (FR-010) |
| IV. Stability-First | ✅ PASS | CLR-002: 3-pass stability gate, no waitForTimeout (FR-010) |
| V. Full Traceability | ✅ PASS | @JRN-#### tags required, tests[] linkage (FR-008, FR-009) |
| VI. Auto-Generated | ✅ PASS | BACKLOG.md generated (line 434), US15 drift detection |
| VII. Maintenance-Integrated | ✅ PASS | US15 validates /journey-maintain from day one |

**Gate Result**: ✅ ALL PASS - No violations, no justifications required.

## Project Structure

### Documentation (this feature)

```text
specs/003-artk-pilot-launch/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal - this is validation work)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# ARTK Repository (this repo)
core/typescript/                    # @artk/core library (001 - COMPLETE)
├── src/
│   ├── types/                      # ArtkTarget, ArtkContext, ArtkConfig
│   ├── detection/                  # signals.ts, entry-detector.ts, etc.
│   ├── config/                     # Config loader
│   ├── harness/                    # Auth harness, fixtures
│   └── ...

scripts/                            # NEW: Install and setup scripts
├── install-to-project.sh           # Cross-platform install script (US2)
├── install-to-project.ps1          # Windows PowerShell version
└── generate-config.ts              # Config generator (US3)

prompts/                            # Slash command prompts
├── artk.init.md                    # /init (UPDATE for US4)
├── artk.discover.md                # /discover
├── artk.journey-propose.md         # /journey-propose
├── artk.journey-define.md          # /journey-define
├── artk.journey-clarify.md         # /journey-clarify
├── artk.journey-implement.md       # /journey-implement
├── artk.journey-validate.md        # /journey-validate
├── artk.journey-verify.md          # /journey-verify
└── artk.journey-maintain.md        # /journey-maintain

# ITSS Pilot Project (ignore/req-apps-it-service-shop/)
ignore/req-apps-it-service-shop/
├── (existing ITSS code)
└── artk-e2e/                       # Created by /init (US6)
    ├── package.json
    ├── vendor/artk-core/           # Vendored @artk/core
    ├── artk.config.yml
    ├── playwright.config.ts
    ├── .artk/context.json
    ├── journeys/
    │   ├── proposed/               # From /journey-propose
    │   ├── defined/                # From /journey-define
    │   ├── clarified/              # From /journey-clarify
    │   └── BACKLOG.md              # Auto-generated
    ├── tests/                      # From /journey-implement
    ├── src/
    │   ├── pages/                  # Page Objects
    │   └── flows/                  # Business Flows
    ├── docs/
    │   ├── discovery/              # From /discover
    │   └── playbook.md
    ├── .auth-states/               # gitignored
    └── test-results/               # gitignored

docs/
└── PILOT_RETROSPECTIVE.md          # NEW: Pilot learnings (US16)
```

**Structure Decision**: Hybrid - ARTK tools live in this repo, pilot artifacts created in ITSS project (gitignored). Scripts in `/scripts/`, prompts in `/prompts/`, pilot output in `ignore/*/artk-e2e/`.

## Complexity Tracking

> No violations to justify - all Constitution gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Phase 0: Research Tasks

Based on Technical Context, the following require research:

1. **ITSS Project Structure** - Document frontend location, framework, auth config
2. **002 Task Audit** - Identify which tasks from 002 spec were completed in 001
3. **Cross-Platform Install Script** - Best practices for Bash + PowerShell parity
4. **Keycloak OIDC Integration** - ITSS-specific auth flow and TOTP handling
5. **Playwright Stability Patterns** - Best practices for 3-pass verification

## Phase 1: Design Artifacts

1. **data-model.md**: Journey lifecycle states, detection result schema, config schema
2. **contracts/**: Minimal - validation project, not API. Include artk.config.yml schema reference.
3. **quickstart.md**: Step-by-step for running pilot on ITSS

---

*Plan generated by /speckit.plan. Next: Generate research.md (Phase 0).*
