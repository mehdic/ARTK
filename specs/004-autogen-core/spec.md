# Feature Specification: ARTK AutoGen Core Integration

**Feature Branch**: `004-autogen-core`
**Created**: 2026-01-02
**Status**: Draft
**Input**: Build deterministic test generation engine and integrate into ARTK prompts

---

## Detailed Specification Reference

> **CRITICAL**: This specification is a summary. The full detailed specification with architecture diagrams, code examples, IR types, configuration schemas, and implementation phases is located at:
>
> **`research/2026-01-02_autogen-refined-plan.md`**
>
> **ALL subsequent speckit commands (`/speckit.plan`, `/speckit.tasks`, `/speckit.implement`) MUST read and follow the detailed specification in that file.**

---

## Overview

This feature delivers the complete ARTK AutoGen system, consisting of:

1. **AutoGen Core Engine** (`@artk/core-autogen`) - Deterministic test generation, validation, verification, and healing
2. **Journey Format Extension** - Machine hints in clarified Journeys for deterministic mapping
3. **Selector Catalog** - Repo-local JSON replacing MCP for selector discovery
4. **Glossary Configuration** - Synonym resolution for step mapping
5. **Prompt Updates** - Integration with existing ARTK prompts
6. **Copilot Instructions** - New instruction file for code generation rules

### Constraint
**NO MCP** - Model Context Protocol is explicitly excluded by company policy.

### Core Principle
**Prompts orchestrate; deterministic code generates.** LLMs via prompts are used for reasoning and ambiguity resolution, but AutoGen Core provides the rails to ensure generation, validation, and healing are deterministic and predictable.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Generates Tests from Journey (Priority: P1)

A developer has a clarified Journey and wants to automatically generate working Playwright tests that follow ARTK conventions.

**Why this priority**: Core value proposition - eliminating manual test writing while ensuring consistency with the Journey contract.

**Independent Test**: Given a clarified Journey file, running the generate command produces valid Playwright test code.

**Acceptance Scenarios**:

1. **Given** a Journey with status "clarified" containing acceptance criteria and procedural steps, **When** the developer runs test generation, **Then** a complete test file is created following ARTK conventions with proper tagging (@JRN-####, @tier-*, @scope-*)
2. **Given** a Journey requiring new feature modules, **When** generation runs, **Then** both the test file AND required feature module(s) are created with selectors encapsulated in modules
3. **Given** a Journey step that cannot be deterministically mapped, **When** generation runs, **Then** a "blocked" marker is inserted with clear explanation

---

### User Story 2 - Developer Validates Generated Tests (Priority: P1)

A developer wants to verify that generated tests follow ARTK best practices before running them.

**Why this priority**: Static validation catches issues early, preventing "green but garbage" tests.

**Independent Test**: Running validation produces a pass/fail result with specific issues listed.

**Acceptance Scenarios**:

1. **Given** generated test code, **When** validation runs, **Then** forbidden patterns (waitForTimeout, force:true, hardcoded URLs) are detected and reported
2. **Given** generated test code, **When** validation runs, **Then** missing or incorrect tags are detected
3. **Given** test code passing validation, **When** ESLint with playwright plugin runs, **Then** zero errors are reported

---

### User Story 3 - Developer Verifies Tests Actually Work (Priority: P1)

A developer wants to run generated tests against the actual application to confirm they pass.

**Why this priority**: Verification proves the Journey contract is satisfied.

**Independent Test**: Running verification executes tests and produces a pass/fail result with evidence.

**Acceptance Scenarios**:

1. **Given** valid generated tests, **When** verification runs, **Then** tests execute and produce a structured result (pass/fail with evidence)
2. **Given** tests that pass once, **When** stability gate runs (repeat-each), **Then** flaky tests are detected
3. **Given** failing tests, **When** verification completes, **Then** failure classification is provided (selector, timing, navigation, data, auth, environment)

---

### User Story 4 - Developer Heals Failing Tests Safely (Priority: P2)

A developer has tests failing due to minor issues (selector changes, timing) and wants automatic fixes that don't compromise test integrity.

**Why this priority**: UI changes frequently; healing prevents constant manual maintenance while maintaining strict guardrails.

**Independent Test**: A test failing due to selector change is automatically fixed by upgrading to a more resilient selector.

**Acceptance Scenarios**:

1. **Given** a test failing due to CSS selector breaking, **When** healing runs, **Then** the selector is upgraded to role/label/testid without adding sleeps or force-clicks
2. **Given** healing attempting a forbidden fix (delete assertion, add sleep), **When** the fix is evaluated, **Then** it is rejected and the test remains unchanged
3. **Given** a test that cannot be healed after max attempts, **When** healing loop completes, **Then** it is marked as "blocked" with recommended action

---

### User Story 5 - Developer Uses Machine Hints in Journeys (Priority: P2)

A developer writing clarified Journeys wants to add optional machine hints that improve mapping accuracy.

**Why this priority**: Machine hints reduce ambiguity and improve generation quality without requiring changes to the natural language contract.

**Independent Test**: A Journey with machine hints generates more accurate selectors than one without.

**Acceptance Scenarios**:

1. **Given** a Journey step with a role hint like `(role=button, exact=true)`, **When** generation runs, **Then** the generated locator uses exactly that strategy
2. **Given** a Journey step with a testid hint like `(testid=add-item)`, **When** generation runs, **Then** the generated locator uses getByTestId
3. **Given** a Journey step without hints, **When** generation runs, **Then** the system infers the best locator from context

---

### User Story 6 - Developer Uses Updated Prompts (Priority: P1)

A developer uses the existing ARTK prompts (`/journey-implement`, `/journey-validate`, `/journey-verify`) and they now leverage AutoGen Core.

**Why this priority**: Prompts are how developers interact with ARTK - they must be updated to use the new engine.

**Independent Test**: Running `/journey-implement` uses AutoGen Core to generate tests instead of manual prompt-based generation.

**Acceptance Scenarios**:

1. **Given** `/discover-foundation` is run, **When** it completes, **Then** eslint-plugin-playwright is configured AND selector catalog is generated AND ARIA snapshot helper is installed
2. **Given** `/journey-implement` is run on a clarified Journey, **When** it completes, **Then** tests are generated via AutoGen Core IR (not direct prompt generation)
3. **Given** `/journey-validate` is run, **When** it completes, **Then** it includes eslint checks AND AC→test.step mapping validation
4. **Given** `/journey-verify` is run, **When** it fails, **Then** ARIA snapshots are captured AND bounded healing is attempted

---

### User Story 7 - Copilot Follows AutoGen Rules (Priority: P2)

When Copilot assists with ARTK test code, it follows the AutoGen rules automatically via instruction files.

**Why this priority**: Ensures Copilot doesn't generate code that violates ARTK conventions.

**Independent Test**: Copilot suggestions in test files follow selector priority rules and avoid forbidden patterns.

**Acceptance Scenarios**:

1. **Given** a developer is editing test code in `artk-e2e/`, **When** Copilot suggests code, **Then** suggestions follow selector priority (role > label > testId > CSS)
2. **Given** Copilot suggests a locator, **When** it's in a test file, **Then** it suggests calling a module method instead of inline locators

---

### User Story 8 - Developer Configures Glossary for Synonyms (Priority: P3)

A developer wants common terms in Journeys to map to consistent module methods.

**Why this priority**: Glossary reduces ambiguity when different Journeys use different terms for the same action.

**Independent Test**: "log in" and "sign in" both map to `auth.login` module method.

**Acceptance Scenarios**:

1. **Given** glossary defines `"log in": auth.login`, **When** a Journey says "log in", **Then** generation calls `auth.login()`
2. **Given** glossary defines label aliases, **When** a Journey says "Submit", **Then** it matches "Submit", "Save", or "Continue" buttons

---

### Edge Cases

- What happens when a Journey step references a non-existent module?
  - AutoGen creates the module scaffold with TODO markers
- What happens when the same Journey is regenerated?
  - AST-based updates preserve human modifications outside managed blocks
- What happens when healing encounters an environment/auth issue?
  - Healing stops immediately and marks as "blocked - environment" without making changes
- What happens when verification runs against an unreachable baseURL?
  - Quick detection, classified as environment failure, not treated as flaky
- What happens when glossary has conflicting synonyms?
  - First match wins; warning logged for ambiguity

---

## Requirements *(mandatory)*

### Functional Requirements

**AutoGen Core Engine**

- **FR-001**: System MUST parse Journey YAML frontmatter and extract all required fields
- **FR-002**: System MUST validate that Journey status is "clarified" before generation
- **FR-003**: System MUST convert all Journey steps to Intermediate Representation (IR) before code generation
- **FR-004**: System MUST support IR primitives: goto, click, fill, select, check, uncheck, upload, press, hover, expect*, wait*, callModule, blocked
- **FR-005**: System MUST generate IR with locator hints following priority: role > label > placeholder > text > testId > CSS
- **FR-006**: System MUST generate test files with proper imports from @artk/core/fixtures
- **FR-007**: System MUST generate feature module files that encapsulate all selectors (tests do NOT own locators)
- **FR-008**: System MUST tag all tests with @JRN-####, @tier-*, and @scope-*
- **FR-009**: System MUST support idempotent regeneration using AST-based updates or managed block markers

**Static Validation**

- **FR-010**: System MUST scan for forbidden patterns: waitForTimeout, force:true, networkidle, hardcoded URLs
- **FR-011**: System MUST validate correct tagging format and completeness
- **FR-012**: System MUST integrate with eslint-plugin-playwright for additional checks
- **FR-013**: System MUST verify AC→test.step mapping completeness

**Runtime Verification**

- **FR-014**: System MUST run tests using Playwright CLI with --grep filtering
- **FR-015**: System MUST capture evidence: traces, ARIA snapshots, JSON reports
- **FR-016**: System MUST classify failures into categories: selector, timing, navigation, data, auth, environment
- **FR-017**: System MUST support stability gate using --repeat-each and --fail-on-flaky-tests

**Healing Engine**

- **FR-018**: System MUST implement bounded healing loop with configurable max attempts (default: 3)
- **FR-019**: System MUST implement allowed fixes: selector upgrades, explicit waits, data isolation, timeout increases
- **FR-020**: System MUST block forbidden fixes: add sleep, remove assertion, weaken assertion, add force:true
- **FR-021**: System MUST log all healing attempts with evidence

**Journey Format Extension**

- **FR-022**: System MUST support optional machine hints in Journey steps: `(role=button)`, `(testid=xyz)`, `(label)`, `(signal=toast.success)`
- **FR-023**: System MUST parse hints without breaking human readability of Journey text
- **FR-024**: System MUST use hints to override default selector inference when present

**Selector Catalog**

- **FR-025**: System MUST support selector catalog at `artifacts/selectors.catalog.json`
- **FR-026**: System MUST generate catalog by scanning data-testid usage, router paths, and existing tests
- **FR-027**: System MUST query catalog during generation to find stable selectors
- **FR-028**: System MUST track "selector debt" when forced to use CSS selectors

**Glossary Configuration**

- **FR-029**: System MUST support glossary in `journeys/journeys.config.yml`
- **FR-030**: System MUST resolve synonyms (e.g., "log in" → auth.login)
- **FR-031**: System MUST support label aliases for flexible matching
- **FR-032**: System MUST support default locator preference configuration

**Prompt Updates**

- **FR-033**: `/discover-foundation` MUST add eslint-plugin-playwright config, trace defaults, ARIA snapshot helper, and selector catalog generation
- **FR-034**: `/journey-implement` MUST orchestrate generate → validate → verify → heal via AutoGen Core
- **FR-035**: `/journey-validate` MUST include lint checks and AC→test.step mapping validation
- **FR-036**: `/journey-verify` MUST capture ARIA snapshots and integrate bounded healing

**Copilot Instructions**

- **FR-037**: System MUST add AutoGen rules to Copilot instructions (either `.github/copilot-instructions.md` for repo-wide, or path-scoped file if needed)
- **FR-038**: Instructions MUST cover ARTK test code patterns
- **FR-039**: Instructions MUST specify selector priority, forbidden patterns, and module-first generation rules

### Key Entities

- **Journey**: The source of truth contract defining what a user can do and what success means
- **Intermediate Representation (IR)**: The deterministic mapping between Journey steps and Playwright actions
- **Module**: A page-object-style wrapper that owns selectors and provides semantic methods
- **Selector Catalog**: A repo-local JSON file mapping UI elements to stable selector strategies
- **Glossary**: Configuration mapping synonyms and aliases for consistent step interpretation
- **Machine Hint**: Optional annotation in Journey steps providing explicit locator guidance

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Generation Quality**

- **SC-001**: 90% or more of clarified Journey steps successfully map to valid IR primitives
- **SC-002**: Generated tests pass static validation on first generation 95% of the time
- **SC-003**: 80% or more of generated selectors use role/label/testId (not CSS)
- **SC-004**: Zero instances of waitForTimeout in generated code

**Healing Effectiveness**

- **SC-005**: Healing loop successfully fixes 70% or more of selector-related failures
- **SC-006**: Zero instances of forbidden patterns introduced by healing
- **SC-007**: All healing attempts are logged with evidence for debugging

**Prompt Integration**

- **SC-008**: All 4 updated prompts (`/discover-foundation`, `/journey-implement`, `/journey-validate`, `/journey-verify`) function correctly with AutoGen Core
- **SC-009**: Copilot suggestions in ARTK test files follow AutoGen rules 90% of the time
- **SC-010**: Glossary correctly resolves synonyms for common actions (login, logout, submit, cancel)

**Stability**

- **SC-011**: Generated tests pass stability gate (repeat-each=2) 90% of the time
- **SC-012**: Flaky tests are detected and flagged for quarantine
- **SC-013**: Zero regressions in existing test suites when AutoGen is added

**Developer Experience**

- **SC-014**: Developers can generate, validate, and verify a Journey in a single command workflow
- **SC-015**: Error messages provide actionable next steps

---

## Assumptions

- ARTK Core foundation harness is already installed in target repos
- Playwright 1.57+ is installed with browsers available
- Target repos use TypeScript
- Journey files follow ARTK Journey schema
- GitHub Copilot is available and instruction files are supported

## Dependencies

- @artk/core - Foundation fixtures and utilities
- ts-morph - AST manipulation for idempotent code generation
- yaml - YAML parsing for Journey frontmatter and config
- zod - Schema validation
- eslint-plugin-playwright - Static analysis rules

## Out of Scope

- MCP-based automation (explicitly excluded by company policy)
- CI/CD integration (separate phase)
- Visual regression testing
- API-only testing utilities
- Mobile/native app testing

---

## Implementation Phases (from Detailed Spec)

> **See `research/2026-01-02_autogen-refined-plan.md` for full implementation details**

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| 1 | IR + Step Mapping | IR types, step mapper, glossary loader |
| 2 | Codegen + Modules | Module generator, test generator, AST editing |
| 3 | Selector Catalog | Catalog schema, testid scanner, catalog queries |
| 4 | Verify + Heal | Runner wrapper, failure classifier, healing loop |
| 5 | Prompt Integration | Update 4 prompts, create instruction file |
| 6 | Testing + Docs | E2E testing, PLAYBOOK update, migration guide |
