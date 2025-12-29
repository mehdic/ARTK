<!--
SYNC IMPACT REPORT
==================
Version change: N/A (initial) → 1.0.0
Modified principles: N/A (new document)
Added sections:
  - Core Principles (7 principles)
  - Quality Standards
  - Development Workflow
  - Governance
Removed sections: N/A (new document)
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md: ✅ Compatible (requirements section aligns)
  - .specify/templates/tasks-template.md: ✅ Compatible (phase structure aligns)
Follow-up TODOs: None
-->

# ARTK Constitution

## Core Principles

### I. Journey-First

Every regression scenario MUST begin as a Journey before implementation.
Journeys are durable, text-based contracts that define:
- Business intent (what/why), not implementation details
- Acceptance criteria (measurable outcomes)
- Module dependencies (foundation + feature)

Tests implement Journeys; Journeys are the unit of coverage discussion.
A Journey without linked tests is not implemented.

### II. Modular Architecture

All test code MUST follow the layered architecture:
- **Page Objects**: Locators + low-level UI actions for a page/area
- **Flows**: Business actions composed from Page Objects (reusable steps)
- **Tests**: Composition of flows + assertions implementing Journeys

Foundation modules (auth, config, navigation) MUST be built before feature modules.
Feature modules are created as Journeys demand, not speculatively.

### III. Config-Driven Environments

No hardcoded URLs, credentials, or environment-specific values in test code.
All environment configuration MUST flow through the config loader:
- baseURL resolved from configuration
- Environment name (intg/ctlq/prod) from configuration
- Credentials NEVER in code; storage state managed via auth harness

Tests MUST be environment-agnostic and portable across environments.

### IV. Stability-First Testing

No brittle waits or arbitrary timeouts in test code.
- `page.waitForTimeout()` is forbidden except with documented justification
- Prefer Playwright auto-wait and assertion-based waits
- Explicit completion signals over timing assumptions
- Async behavior MUST have deterministic completion detection

Flaky tests are treated as serious failures requiring immediate action.

### V. Full Traceability

Every test MUST be traceable to its source Journey:
- Tests tagged with `@JRN-####` matching Journey ID
- Journey frontmatter `tests[]` array links to test file paths
- Acceptance criteria mapped to assertions via `test.step` markers

Orphan tests (no Journey reference) and orphan Journeys (no linked tests) are violations.

### VI. Auto-Generated Artifacts

The following artifacts are generated and MUST NOT be manually edited:
- `journeys/BACKLOG.md`: Checkbox list derived from Journey status and tests[]
- `journeys/index.json`: Machine index consumed by ARTK commands
- Module registry: Auto-updated by implementation commands

Source of truth is always the canonical Journey files.
Any command that modifies Journeys MUST regenerate dependent artifacts.

### VII. Maintenance-Integrated

Suite maintenance is an explicit workflow, not an afterthought:
- `/journey-maintain` runs from day one
- Flaky/broken tests MUST be quarantined, not ignored
- Deprecated Journeys MUST have documented statusReason
- Drift detection (missing tests, orphan references) is automated

Broken tests blocking development are escalated immediately with explicit ownership.

## Quality Standards

All ARTK implementations MUST satisfy these quality gates:

**Static Validation (`/journey-validate`)**:
- No hardcoded URLs or environment values
- No `page.waitForTimeout()` without exception policy
- No `.only` or interactive pauses committed
- Correct harness fixture usage (import from harness)
- Tags present and consistent (@JRN-####, tier, scope)
- Module registry updated for new dependencies
- Each acceptance criterion covered by assertion marker

**Runtime Verification (`/journey-verify`)**:
- Tests run deterministically (single-worker, fail-fast)
- Artifacts captured on failure (trace/screenshots per policy)
- Optional stability check passes (repeat run, flake detection)
- Only after verify passes can Journey status be `implemented`

**Compliance Constraints**:
- PII handling in screenshots/traces follows documented policy
- Test data namespaced by run ID to avoid collisions
- Cleanup strategy documented and enforced

## Development Workflow

ARTK follows a defined slash-command pipeline:

**Repo Bootstrap (MANDATORY)**:
1. `/init` - Scaffold ARTK structure and configuration
2. `/playbook` - Generate permanent guardrails (Copilot instructions)
3. `/journey-system` - Install Journey system from ARTK Core
4. `/foundation-build` - Create Playwright harness and foundation modules

**Discovery & Planning (RECOMMENDED)**:
5. `/discover` - Analyze routes, features, auth, testability
6. `/journey-propose` - Auto-propose Journeys from discovery

**Journey Authoring (REQUIRED per Journey)**:
7. `/journey-define` - Create/promote Journey to canonical structure
8. `/journey-clarify` - Add deterministic execution detail

**Implementation & Gates (REQUIRED)**:
9. `/journey-implement` - Generate Playwright tests and modules
10. `/journey-validate` - Static validation gate
11. `/journey-verify` - Runtime verification gate

**Ongoing (RECOMMENDED)**:
12. `/journey-maintain` - Quarantine flaky, deprecate obsolete

Skipping mandatory commands violates the constitution.
Status transitions (proposed → defined → clarified → implemented) enforce the workflow.

## Governance

This constitution supersedes all other ARTK practices and conventions.

**Amendment Process**:
1. Proposed amendments MUST be documented with rationale
2. Amendments require review and explicit approval
3. Migration plan required for breaking changes
4. All dependent templates updated synchronously

**Versioning Policy**:
- MAJOR: Backward incompatible principle changes or removals
- MINOR: New principles, materially expanded guidance
- PATCH: Clarifications, wording, non-semantic refinements

**Compliance Review**:
- All PRs affecting `e2e/` or `journeys/` MUST verify constitution compliance
- Complexity exceeding principles MUST be justified in Complexity Tracking
- Use `.specify/` artifacts for development guidance

**Version**: 1.0.0 | **Ratified**: 2025-12-29 | **Last Amended**: 2025-12-29
