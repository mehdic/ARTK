# Implementation Plan: ARTK Core v1 Infrastructure Library

**Branch**: `001-artk-core-v1` | **Date**: 2025-12-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-artk-core-v1/spec.md`

## Summary

ARTK Core v1 is a vendorable Playwright infrastructure library providing config-driven setup (single YAML file), OIDC authentication with storage state management, pre-built fixtures (`authenticatedPage`, `apiContext`, `testData`, `runId`), accessibility-first locator utilities, common assertion helpers, test data namespacing/cleanup, and journey-aware reporting. The library is copied (vendored) into target projects rather than npm-installed, enabling full control and offline operation.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18.0.0+)
**Primary Dependencies**: Playwright 1.57.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation)
**Storage**: File system (storage states in `.auth-states/`, config in `artk.config.yml`)
**Testing**: Vitest (unit tests), Playwright Test (integration/e2e)
**Target Platform**: Node.js (vendorable library for Playwright projects)
**Project Type**: Library (single project, vendored into target repos at `artk/.core/`)
**Performance Goals**: Config loading <100ms, storage state validation <50ms, auth flow <45s (with MFA)
**Constraints**: No npm publishing required, must work in air-gapped environments, OIDC providers must be accessible from test environment
**Scale/Scope**: Support up to 16 parallel test workers, multiple roles (admin, standardUser, etc.), 8 core modules (config, harness, auth, fixtures, locators, assertions, data, reporters)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Journey-First | ✅ PASS | Core provides Journey system integration (FR-029, reporters map to @JRN-#### tags) |
| II. Modular Architecture | ✅ PASS | 8 distinct modules (config, harness, auth, fixtures, locators, assertions, data, reporters) with clear dependencies |
| III. Config-Driven | ✅ PASS | Single `artk.config.yml` drives all behavior (FR-001 to FR-005), env var resolution supported |
| IV. Stability-First | ✅ PASS | Auto-wait via Playwright assertions, no arbitrary timeouts, loading state assertions (FR-024) |
| V. Full Traceability | ✅ PASS | @JRN-#### tags mapped to tests (FR-029), ARTK reporter with journey mapping (FR-031) |
| VI. Auto-Generated Artifacts | ✅ PASS | Backlog/index.json generated, storage states managed, reports auto-generated |
| VII. Maintenance-Integrated | ✅ PASS | Storage state cleanup policy (NFR-007/008), cleanup on failure (FR-027/028), retry with backoff (NFR-010-012) |

## Project Structure

### Documentation (this feature)

```text
specs/001-artk-core-v1/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
core/
└── typescript/                       # TypeScript implementation (v1)
    ├── config/                       # Config System module
    │   ├── index.ts                  # Main exports
    │   ├── loader.ts                 # YAML loading and validation
    │   ├── schema.ts                 # Zod schema definitions
    │   ├── types.ts                  # TypeScript interfaces
    │   ├── env.ts                    # Environment variable handling
    │   ├── defaults.ts               # Default values
    │   └── __tests__/                # Unit tests
    │
    ├── harness/                      # Playwright Harness module
    │   ├── index.ts
    │   ├── playwright.config.base.ts
    │   ├── projects.ts
    │   ├── reporters.ts
    │   └── __tests__/
    │
    ├── auth/                         # Auth System module
    │   ├── index.ts
    │   ├── types.ts
    │   ├── storage-state.ts
    │   ├── credentials.ts
    │   ├── setup-factory.ts
    │   ├── providers/
    │   │   ├── base.ts
    │   │   ├── oidc.ts
    │   │   ├── form.ts
    │   │   ├── token.ts
    │   │   └── custom.ts
    │   ├── oidc/
    │   │   ├── flow.ts
    │   │   ├── token-refresh.ts
    │   │   ├── discovery.ts
    │   │   └── providers/
    │   │       ├── generic.ts
    │   │       ├── azure-ad.ts
    │   │       ├── okta.ts
    │   │       └── keycloak.ts
    │   └── __tests__/
    │
    ├── fixtures/                     # Fixtures module
    │   ├── index.ts
    │   ├── base.ts
    │   ├── auth.ts
    │   ├── api.ts
    │   ├── data.ts
    │   ├── types.ts
    │   └── __tests__/
    │
    ├── locators/                     # Locators module
    │   ├── index.ts
    │   ├── factory.ts
    │   ├── strategies.ts
    │   ├── testid.ts
    │   ├── aria.ts
    │   └── __tests__/
    │
    ├── assertions/                   # Assertions module
    │   ├── index.ts
    │   ├── toast.ts
    │   ├── table.ts
    │   ├── form.ts
    │   ├── loading.ts
    │   ├── url.ts
    │   ├── api.ts
    │   └── __tests__/
    │
    ├── data/                         # Data Harness module
    │   ├── index.ts
    │   ├── namespace.ts
    │   ├── cleanup.ts
    │   ├── builders.ts
    │   ├── api-client.ts
    │   └── __tests__/
    │
    ├── reporters/                    # Reporters module
    │   ├── index.ts
    │   ├── artk-reporter.ts
    │   ├── journey-reporter.ts
    │   ├── artifacts.ts
    │   ├── masking.ts
    │   └── __tests__/
    │
    ├── journeys/                     # Journey system (existing, to be integrated)
    │   ├── schema/
    │   ├── templates/
    │   └── tools/
    │
    ├── index.ts                      # Main entry point
    ├── version.json                  # Version tracking
    └── package.json                  # Dependencies

tests/
├── unit/                             # Vitest unit tests (per-module __tests__/)
├── integration/                      # Cross-module integration tests
│   ├── auth-flow.test.ts
│   ├── config-to-harness.test.ts
│   └── fixtures.test.ts
└── e2e/                              # Real project E2E tests
    └── itss/
        ├── smoke.test.ts
        └── auth.test.ts

prompts/                              # ARTK Prompt Files (to be updated)
├── init.prompt.md                    # Install core, generate config
├── foundation-build.prompt.md        # Configure core, not regenerate
├── journey-implement.prompt.md       # Import from core, generate project code
├── journey-validate.prompt.md        # Validate against core APIs
└── journey-verify.prompt.md          # Use core fixtures for execution
```

**Structure Decision**: Single library project with 8 core modules. TypeScript implementation under `core/typescript/`. Each module has its own `__tests__/` directory for unit tests. Integration tests in `tests/integration/`, E2E tests against ITSS in `tests/e2e/itss/`. Prompts in `prompts/` will be updated to reference core modules.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
