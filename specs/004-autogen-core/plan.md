# Implementation Plan: ARTK AutoGen Core Integration

**Branch**: `004-autogen-core` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-autogen-core/spec.md`
**Detailed Reference**: `research/2026-01-02_autogen-refined-plan.md` (MUST be used for implementation)

## Summary

Build `@artk/core-autogen` - a deterministic test generation engine that transforms clarified Journeys into Playwright E2E tests. The system includes:
- **IR-based generation** (Journey → IR → Code)
- **Module-first architecture** (tests call modules; modules own locators)
- **Static validation** (eslint-plugin-playwright + forbidden patterns)
- **Runtime verification** (Playwright CLI wrapper with evidence capture)
- **Bounded healing** (fix selectors/waits without weakening assertions)
- **Prompt updates** (integrate with 4 existing ARTK prompts)
- **Copilot instructions** (rules for generated code)

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18.0.0+)
**Primary Dependencies**:
- @artk/core 1.0.0+ (existing foundation)
- ts-morph (AST manipulation)
- yaml (config parsing)
- zod (schema validation)
- eslint-plugin-playwright (static rules)
- @playwright/test 1.57.0+

**Storage**: File-based (YAML config, JSON catalog/registry, Markdown journeys)
**Testing**: vitest for unit tests, Playwright for integration tests
**Target Platform**: Node.js CLI + GitHub Copilot prompts
**Project Type**: Library package + prompt files
**Performance Goals**: Generate test from Journey in <5 seconds
**Constraints**: NO MCP (Model Context Protocol) - company policy
**Scale/Scope**: Support 100+ Journeys per repo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Journey-First | ✅ PASS | AutoGen generates FROM Journeys; Journeys remain source of truth |
| II. Modular Architecture | ✅ PASS | Module-first generation: tests call modules, modules own locators |
| III. Config-Driven Environments | ✅ PASS | All URLs from config; no hardcoded values; artk.config.yml |
| IV. Stability-First Testing | ✅ PASS | No sleeps policy enforced; web-first assertions; healing rules forbid waitForTimeout |
| V. Full Traceability | ✅ PASS | Tests tagged with @JRN-####; Journey frontmatter updated with tests[] |
| VI. Auto-Generated Artifacts | ✅ PASS | Registry, index, backlog regenerated; tests generated not manually written |
| VII. Maintenance-Integrated | ✅ PASS | Healing loop handles drift; blocked issues escalated with recommendations |

**Gate Result**: ✅ ALL PRINCIPLES SATISFIED

## Architecture Mapping: Constitution Principle II

AutoGen Core implements Constitution Principle II (Modular Architecture) using a **Module pattern** that combines Page Objects and Flows into a unified construct while maintaining logical separation.

### Terminology Mapping

| Constitution Term | AutoGen Term | Implementation |
|-------------------|--------------|----------------|
| Page Objects | Module `locators` object | Encapsulated locator functions |
| Low-level actions | Module primitive methods | `click()`, `fill()` wrappers |
| Flows | Module semantic methods | `createInvoice()`, `login()` |
| Tests | Journey test files | Compose module methods + assert |

### Why This Satisfies the Constitution

1. **Locator Encapsulation**: All locators live in module's `locators` object, never in tests
2. **Action Abstraction**: Tests call semantic methods (`invoices.createInvoice()`), not raw Playwright APIs
3. **Reusability**: Modules are imported and reused across tests
4. **Composition**: Tests compose module methods and add Journey-specific assertions

### Module Structure Convention

```typescript
export const [moduleName] = {
  // Tier 1: Locators (Constitution "Page Objects")
  locators: {
    element: (page) => page.getByRole(...),
  },

  // Tier 2: Semantic Methods (Constitution "Flows")
  async businessAction(page, data) {
    // Composes locator interactions
  },

  // Assertion Helpers (reusable expectations)
  async expectState(page) {
    await expect(...).toBeVisible();
  },
};
```

This pattern is explicitly endorsed by Playwright documentation and satisfies the constitution's intent while reducing indirection. See `research/2026-01-02_autogen-constitution-mapping.md` for full analysis.

## Project Structure

### Documentation (this feature)

```text
specs/004-autogen-core/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (IR types)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API interfaces)
│   └── autogen-api.ts   # TypeScript interfaces
├── checklists/
│   └── requirements.md  # Validation checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
core/typescript/
├── src/                    # Existing @artk/core
│   ├── config/
│   ├── fixtures/
│   ├── auth/
│   └── ...
└── autogen/                # NEW: @artk/core-autogen
    ├── src/
    │   ├── journey/
    │   │   ├── parseJourney.ts
    │   │   ├── schema.ts
    │   │   └── normalize.ts
    │   ├── ir/
    │   │   ├── types.ts
    │   │   ├── builder.ts
    │   │   └── serialize.ts
    │   ├── mapping/
    │   │   ├── stepMapper.ts
    │   │   ├── patterns.ts
    │   │   └── glossary.ts
    │   ├── selectors/
    │   │   ├── catalog.ts
    │   │   ├── infer.ts
    │   │   └── priority.ts
    │   ├── codegen/
    │   │   ├── generateTest.ts
    │   │   ├── generateModule.ts
    │   │   ├── astEdit.ts
    │   │   └── templates/
    │   ├── validate/
    │   │   ├── journey.ts
    │   │   ├── code.ts
    │   │   └── lint.ts
    │   ├── verify/
    │   │   ├── runner.ts
    │   │   ├── parser.ts
    │   │   ├── classifier.ts
    │   │   └── evidence.ts
    │   └── heal/
    │       ├── loop.ts
    │       ├── rules.ts
    │       └── fixes/
    ├── package.json
    └── tsconfig.json

prompts/                    # Updated prompts
├── artk.discover-foundation.md  # Add catalog gen, eslint setup
├── artk.journey-implement.md    # Orchestrate via AutoGen Core
├── artk.journey-validate.md     # Add lint + AC mapping checks
└── artk.journey-verify.md       # Add ARIA capture + healing

.github/
└── copilot-instructions.md      # AutoGen rules added
```

**Structure Decision**: Library package at `core/typescript/autogen/` alongside existing `@artk/core`. Prompts updated in-place. Copilot instructions added to existing file.

## Complexity Tracking

> No violations requiring justification. Architecture aligns with constitution principles.

---

## Phase 0: Research (Complete)

The detailed specification at `research/2026-01-02_autogen-refined-plan.md` already contains:
- ✅ IR type definitions (Section 9)
- ✅ Step mapping rules (Section 10)
- ✅ Selector priority (Section 11)
- ✅ Test generation patterns (Section 12)
- ✅ Module generation (Section 13)
- ✅ Validation layers (Section 14)
- ✅ Verification engine (Section 15)
- ✅ Healing rules (Section 16)
- ✅ Configuration schema (Section 7)
- ✅ API interfaces (Section 19)
- ✅ Error codes (Section 20)

**No additional research needed** - the refined plan is the research output.

---

## Phase 1: Design & Contracts

### Data Model (IR Types)

See `research/2026-01-02_autogen-refined-plan.md` Section 9 for complete IR definitions.

**Key Types:**

```typescript
// Core IR primitives
type IRPrimitive =
  | { type: 'goto'; url: string }
  | { type: 'click'; locator: LocatorSpec }
  | { type: 'fill'; locator: LocatorSpec; value: ValueSpec }
  | { type: 'expectVisible'; locator: LocatorSpec }
  | { type: 'expectText'; locator: LocatorSpec; text: string }
  | { type: 'waitForURL'; pattern: string }
  | { type: 'callModule'; module: string; method: string }
  | { type: 'blocked'; reason: string };

// Locator specification
interface LocatorSpec {
  strategy: 'role' | 'label' | 'text' | 'testid' | 'css';
  value: string;
  options?: { name?: string; exact?: boolean; level?: number };
}

// Journey IR structure
interface IRJourney {
  id: string;
  title: string;
  tier: 'smoke' | 'release' | 'regression';
  scope: string;
  actor: string;
  tags: string[];
  steps: IRStep[];
  moduleDependencies: { foundation: string[]; feature: string[] };
}
```

### API Contracts

See `research/2026-01-02_autogen-refined-plan.md` Section 19 for complete API.

**Library API:**

```typescript
// Main entry points
generateJourneyTests(opts: { journeyId: string; configPath?: string }): Promise<GenerateResult>
validateJourney(opts: { journeyId: string }): Promise<ValidateResult>
verifyJourney(opts: { journeyId: string; heal?: boolean }): Promise<VerifyResult>
installAutogenInstance(opts: { rootDir: string }): Promise<void>
upgradeAutogenInstance(opts: { rootDir: string; toVersion: string }): Promise<void>
```

### Configuration Schema

See `research/2026-01-02_autogen-refined-plan.md` Section 7 for complete config.

File: `artk/autogen.config.yml`

```yaml
version: 1
paths:
  testDir: "tests"
  journeyTestDir: "tests/journeys"
  modulesDir: "tests/modules"
  registryFile: "tests/modules/registry.json"
  reportsDir: "artk/reports"
selectorPolicy:
  prefer: [role, label, placeholder, text, testId, cssLastResort]
validation:
  eslint: { enabled: true }
  forbiddenPatterns: ["waitForTimeout", "force: true"]
heal:
  enabled: true
  maxAttempts: 3
  allowedFixes: ["selector-refine", "missing-await", "navigation-wait"]
  forbiddenFixes: ["add-sleep", "remove-assertion", "weaken-assertion"]
```

---

## Implementation Milestones

> From `research/2026-01-02_autogen-refined-plan.md` Section 23

### Milestone A: Core Skeleton
- Config loader
- Journey parser + schema validation
- IR definition + step mapper v1
- Template-based generation for test + modules
- Basic registry updates

### Milestone B: Validation Gate
- Forbidden pattern scan
- ESLint integration with eslint-plugin-playwright
- Structured validation report

### Milestone C: Verification Gate
- Runner wrapper around `npx playwright test`
- JSON reporter parsing + ARTK verify summary output
- Evidence capture conventions

### Milestone D: Healing v1
- Failure taxonomy
- Selector refinement fixes
- Navigation wait fixes
- Attempt logging
- Bounded loop

### Milestone E: Prompt Integration
- Update `/discover-foundation` prompt
- Update `/journey-implement` prompt
- Update `/journey-validate` prompt
- Update `/journey-verify` prompt
- Add Copilot instructions

### Milestone F: Testing + Docs
- End-to-end testing on ITSS project
- Update PLAYBOOK.md
- Update CLAUDE.md
- Migration guide

---

## Post-Design Constitution Re-Check

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| I. Journey-First | ✅ | ✅ | IR derived from Journey; Journey updated after generation |
| II. Modular Architecture | ✅ | ✅ | Module generator creates page-object wrappers |
| III. Config-Driven | ✅ | ✅ | autogen.config.yml for all settings |
| IV. Stability-First | ✅ | ✅ | Healing rules explicitly forbid sleeps |
| V. Traceability | ✅ | ✅ | Tests tagged; Journey.tests[] updated |
| VI. Auto-Generated | ✅ | ✅ | Registry auto-updated; tests generated |
| VII. Maintenance | ✅ | ✅ | Healing + quarantine recommendations |

**Final Gate Result**: ✅ ALL PRINCIPLES SATISFIED

---

## Next Steps

1. Run `/speckit.tasks` to generate task breakdown
2. Implementation follows milestone order (A → B → C → D → E → F)
3. Each milestone is independently testable

---

## References

- **Detailed Specification**: `research/2026-01-02_autogen-refined-plan.md`
- **OpenAI Review**: `research/2026-01-02_openai-review-autogen-plan.md`
- **Feature Spec**: `specs/004-autogen-core/spec.md`
- **ARTK Constitution**: `.specify/memory/constitution.md`
