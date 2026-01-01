# Feature Specification: ARTK Pilot Launch

**Feature Branch**: `003-artk-pilot-launch`
**Created**: 2026-01-01
**Status**: Clarified
**Clarified**: 2026-01-01
**Input**: User description: "Complete E2E architecture (002 spec), validate ARTK on ITSS pilot project, implement MVP journeys, and validate maintenance workflow"

## Overview

### Problem Statement

ARTK Core v1 has been built (116 tasks completed), providing:
- TypeScript types, Zod schemas, fixtures
- Auth harness, config loader, locators, assertions
- Detection modules for frontend discovery
- Data harness and reporter infrastructure

However, ARTK has never been:
1. **Installed** into a real project using the independent architecture
2. **Tested** end-to-end with actual journeys
3. **Validated** against a real application with real auth flows

We have a library but no proof it works in production conditions.

### Proposed Solution

Execute a complete pilot launch using the ITSS reference project (`ignore/req-apps-it-service-shop/`), validating every phase of the ARTK workflow from installation to journey maintenance.

### Non-Goals

- CI/CD integration (Phase 10 - future)
- Multi-product rollout (after pilot validation)
- Visual regression testing
- API contract testing

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit 002 Tasks Against 001 Completion (Priority: P1)

As a developer, I want to audit the 002-artk-e2e-independent-architecture tasks so that I know exactly what remains to be implemented after 001-artk-core-v1.

**Why this priority**: Cannot proceed with implementation without understanding remaining scope. This is a prerequisite for all other work.

**Independent Test**: Can be tested by reviewing `specs/002-artk-e2e-independent-architecture/tasks.md` and producing an updated document with accurate completion status.

**Acceptance Scenarios**:

1. **Given** the 002 tasks.md file exists, **When** I compare each task against 001 deliverables, **Then** I can mark tasks as done/remaining with evidence
2. **Given** some tasks were completed in 001, **When** I audit the tasks, **Then** detection modules (signals.ts, entry-detector.ts, etc.) are marked complete
3. **Given** some tasks remain, **When** I identify them, **Then** install script and config generator are clearly listed as remaining

---

### User Story 2 - Install Script Implementation (Priority: P1)

As a developer, I want to run an install script that creates an isolated ARTK E2E directory so that @artk/core doesn't conflict with application dependencies.

**Why this priority**: Core blocker - cannot validate pilot without installation mechanism. This is the primary deliverable from 002 spec.

**Independent Test**: Run `install-to-project.sh` in ITSS project and verify `artk-e2e/` directory is created with vendored @artk/core and working npm install.

**Acceptance Scenarios**:

1. **Given** a target project root, **When** I run the install script, **Then** `artk-e2e/` directory is created at project root
2. **Given** the install script runs, **When** it completes, **Then** @artk/core is copied to `artk-e2e/vendor/artk-core/`
3. **Given** the install completes, **When** I run `npm install` in `artk-e2e/`, **Then** dependencies install without conflicts from parent project
4. **Given** different OS environments, **When** I run the script, **Then** it works on macOS, Linux, and Windows

---

### User Story 3 - Config Generator Integration (Priority: P2)

As a developer, I want to have `artk.config.yml` auto-generated from detected frontends so that configuration is correct without manual editing.

**Why this priority**: Reduces manual setup effort and validates that detection modules work correctly.

**Independent Test**: Run config generator with mock detection results and verify valid YAML output that passes Zod schema validation.

**Acceptance Scenarios**:

1. **Given** detection results from @artk/core, **When** config generator runs, **Then** valid `artk.config.yml` is produced
2. **Given** multiple frontends detected, **When** config generates, **Then** all targets are included with correct relative paths
3. **Given** generated config, **When** validated against Zod schema, **Then** validation passes

---

### User Story 4 - Update /init Prompt for Independent Architecture (Priority: P2)

As a developer running /init, I want ARTK to automatically detect and scaffold the independent architecture so that I don't need to manually configure paths.

**Why this priority**: Key user experience improvement - /init is the entry point for all new ARTK adoptions.

**Independent Test**: Run /init on a test project and verify frontend detection, artk-e2e creation, and config generation all happen automatically.

**Acceptance Scenarios**:

1. **Given** a project with frontend(s), **When** I run /init, **Then** frontend detector identifies them with confidence scores (CLR-003)
2. **Given** detection confidence < 70%, **When** /init runs, **Then** user is prompted to confirm or correct results (CLR-003)
3. **Given** detected frontends, **When** /init completes, **Then** `artk-e2e/` directory exists with valid structure
4. **Given** /init runs, **When** it completes, **Then** `.artk/context.json` is created with detection results and any user corrections (CLR-003)
5. **Given** /init runs, **When** it completes, **Then** `playwright.config.ts` uses @artk/core harness

---

### User Story 5 - Validate ITSS Project Structure (Priority: P1)

As a developer, I want to understand ITSS project structure before running /init so that I can verify detection accuracy.

**Why this priority**: Establishes baseline knowledge of pilot project. Critical for validating detection accuracy.

**Independent Test**: Document ITSS structure manually and compare against automated detection results.

**Acceptance Scenarios**:

1. **Given** ITSS project exists, **When** I analyze it, **Then** I document frontend location(s) and framework
2. **Given** ITSS uses OIDC, **When** I analyze auth, **Then** I document Keycloak configuration
3. **Given** ITSS has environments, **When** I document them, **Then** local and staging URLs are recorded

---

### User Story 6 - Run /init on ITSS (Priority: P1)

As a developer, I want to run /init on the ITSS project so that ARTK is installed and configured correctly.

**Why this priority**: First real-world validation of the installation workflow.

**Independent Test**: Execute /init on ITSS and verify all expected outputs exist and work.

**Acceptance Scenarios**:

1. **Given** ITSS project, **When** I run /init, **Then** frontends are detected correctly
2. **Given** /init runs, **When** it creates artk-e2e, **Then** npm install succeeds
3. **Given** artk-e2e exists, **When** I run `npx playwright install chromium`, **Then** browser installs successfully

---

### User Story 7 - Configure Authentication (Priority: P2)

As a developer, I want to configure ARTK auth for ITSS's OIDC flow so that tests can authenticate and reuse storage state.

**Why this priority**: Auth is critical for testing protected routes, but can be initially bypassed with manual login.

**Independent Test**: Run auth setup project and verify storage state is created and can be reused by tests.

**Acceptance Scenarios**:

1. **Given** artk.config.yml with auth section, **When** auth setup runs, **Then** storage state is created
2. **Given** valid storage state, **When** a test runs with auth fixture, **Then** test accesses protected routes
3. **Given** OIDC requires TOTP, **When** auth setup runs, **Then** TOTP is handled automatically
4. **Given** auth fails on first attempt, **When** retry succeeds, **Then** test continues normally (CLR-001)
5. **Given** auth fails on both attempts, **When** error is raised, **Then** message includes specific failure reason and resolution steps (CLR-001)

---

### User Story 8 - Run /discover on ITSS (Priority: P2)

As a developer, I want to run /discover to analyze ITSS application so that I understand routes, auth flows, and testability.

**Why this priority**: Required to understand what journeys to propose. Depends on /init completion.

**Independent Test**: Execute /discover and verify discovery report is generated with expected sections.

**Acceptance Scenarios**:

1. **Given** artk-e2e initialized, **When** I run /discover, **Then** ITSS routes are analyzed
2. **Given** /discover runs, **When** it completes, **Then** auth entry points are identified
3. **Given** /discover runs, **When** it completes, **Then** selector readiness is assessed

---

### User Story 9 - Run /journey-propose on ITSS (Priority: P2)

As a developer, I want to auto-generate journey proposals from discovery so that I have a starting point for test coverage.

**Why this priority**: Automates initial journey creation. Depends on /discover completion.

**Independent Test**: Execute /journey-propose and verify at least 10 journey files are created in proposed/.

**Acceptance Scenarios**:

1. **Given** discovery results, **When** I run /journey-propose, **Then** journeys are auto-generated
2. **Given** /journey-propose runs, **When** it completes, **Then** at least 10 proposals exist
3. **Given** proposed journeys, **When** I check frontmatter, **Then** each has valid structure

---

### User Story 10 - Select MVP Journey Set (Priority: P2)

As a developer, I want to select the MVP journeys for implementation so that we focus on high-value scenarios first.

**Why this priority**: Focuses effort on most important tests. Enables incremental validation.

**Independent Test**: Select 5+ journeys and document selection rationale.

**Acceptance Scenarios**:

1. **Given** proposed journeys, **When** I select MVP set, **Then** 2-3 smoke journeys are included
2. **Given** MVP selection, **When** reviewed, **Then** 3-5 release journeys are included
3. **Given** MVP set, **When** documented, **Then** each has clear acceptance criteria

---

### User Story 11 - Journey Definition and Clarification (Priority: P2)

As a developer, I want to define and clarify MVP journeys so that they are ready for implementation.

**Why this priority**: Prepares journeys for test implementation. Critical for quality tests.

**Independent Test**: Run /journey-define and /journey-clarify on each MVP journey and verify status progression.

**Acceptance Scenarios**:

1. **Given** proposed journey, **When** I run /journey-define, **Then** status changes to defined
2. **Given** defined journey, **When** I run /journey-clarify, **Then** execution details are added
3. **Given** clarified journey, **When** reviewed, **Then** actor, preconditions, steps, and assertions are present

---

### User Story 12 - Journey Implementation (Priority: P2)

As a developer, I want to implement Playwright tests for MVP journeys so that they are executable.

**Why this priority**: Creates actual test coverage. The core deliverable of the pilot.

**Independent Test**: Run /journey-implement for each clarified journey and verify test files exist.

**Acceptance Scenarios**:

1. **Given** clarified journey, **When** I run /journey-implement, **Then** test file is created
2. **Given** test file, **When** I inspect it, **Then** it uses @artk/core fixtures
3. **Given** test file, **When** I check frontmatter, **Then** journey tests[] is updated

---

### User Story 13 - Journey Validation (Priority: P3)

As a developer, I want to validate implementations against ARTK rules so that tests are maintainable and compliant.

**Why this priority**: Ensures quality but can be done after basic implementation.

**Independent Test**: Run /journey-validate on each implemented journey and verify no violations.

**Acceptance Scenarios**:

1. **Given** implemented journey, **When** I run /journey-validate, **Then** no hardcoded URLs detected
2. **Given** validation runs, **When** it completes, **Then** no waitForTimeout violations found
3. **Given** validation runs, **When** it completes, **Then** correct fixture usage confirmed

---

### User Story 14 - Journey Verification (Priority: P2)

As a developer, I want to verify that MVP tests actually pass so that journeys can be marked implemented.

**Why this priority**: Proves tests work. Critical for pilot success.

**Independent Test**: Execute tests against ITSS and verify all pass with artifacts captured.

**Acceptance Scenarios**:

1. **Given** validated journey, **When** I run /journey-verify, **Then** tests execute against ITSS
2. **Given** tests pass 3 consecutive times, **When** verification completes, **Then** journey status is updated to implemented (CLR-002)
3. **Given** tests pass 1-2 times out of 3, **When** verification completes, **Then** journey is flagged as flaky and remains in clarified status (CLR-002)
4. **Given** verification runs, **When** any test fails, **Then** artifacts (traces, screenshots) are captured for debugging

---

### User Story 15 - Maintenance Validation (Priority: P3)

As a developer, I want to run maintenance checks on the pilot suite so that I validate the maintenance workflow.

**Why this priority**: Validates long-term sustainability. Can be done after MVP is working.

**Independent Test**: Run /journey-maintain and verify maintenance report is generated.

**Acceptance Scenarios**:

1. **Given** implemented journeys, **When** I run /journey-maintain, **Then** drift detection works
2. **Given** /journey-maintain runs, **When** it completes, **Then** backlog stays consistent
3. **Given** maintenance runs, **When** it completes, **Then** maintenance report is generated

---

### User Story 16 - Document Pilot Learnings (Priority: P3)

As a developer, I want to document everything learned during the pilot so that future projects benefit.

**Why this priority**: Captures knowledge for multi-product rollout. Can be done at any time.

**Independent Test**: Create PILOT_RETROSPECTIVE.md with all sections filled.

**Acceptance Scenarios**:

1. **Given** pilot experience, **When** I document learnings, **Then** what worked well is captured
2. **Given** pilot experience, **When** I document pain points, **Then** workarounds are noted
3. **Given** pilot experience, **When** prompts need fixes, **Then** updates are made

---

### Edge Cases

- What happens when ITSS frontend is not detected? → Interactive prompt for manual specification (CLR-003)
- How does system handle OIDC auth timeout? → Retry once, then fail with actionable message (CLR-001)
- What happens when a journey test is flaky? → Quarantine workflow via /journey-maintain; 3-pass stability gate (CLR-002)
- How does system handle missing test accounts? → Block with clear error message and resolution steps

---

## Clarifications *(from speckit.clarify)*

### CLR-001: Authentication Failure Recovery

**Question**: When ITSS OIDC authentication fails during test execution (e.g., expired token, Keycloak unavailable, invalid credentials), what should happen?

**Decision**: **Retry auth once, then fail with actionable message**

**Rationale**: This balances reliability with avoiding cascading failures. A single retry handles transient network issues without masking persistent problems.

**Implementation Details**:
- On first auth failure: Wait 2 seconds, then retry auth flow once
- On second failure: Fail immediately with actionable error message including:
  - Specific failure reason (expired token, connection refused, invalid credentials)
  - Steps to resolve (refresh credentials, check Keycloak status, verify test account)
  - Link to auth troubleshooting documentation
- All subsequent tests in the suite should be skipped (not attempted) to avoid noise
- Storage state should NOT be cached if auth fails (prevent stale state reuse)

### CLR-002: Test Stability Threshold for Journey Verification

**Question**: What defines a journey test as "stable enough" to mark as implemented?

**Decision**: **3 consecutive passes required on same environment**

**Rationale**: This provides confidence while keeping pilot velocity reasonable. 3 consecutive passes filters out most flaky tests without over-testing.

**Implementation Details**:
- /journey-verify MUST run the test 3 times consecutively
- All 3 runs must pass on the same environment (same baseURL, same browser)
- If any run fails, the journey remains in `clarified` status (not promoted to `implemented`)
- Flaky tests (1-2 passes out of 3) should be flagged for investigation before re-verification
- Test artifacts (traces, screenshots) should be captured for ALL runs, not just failures
- Browser: Use Chromium for pilot stability checks (consistent baseline)

### CLR-003: Frontend Detection Fallback Behavior

**Question**: If automatic detection fails or produces low-confidence results for ITSS, what should /init do?

**Decision**: **Prompt user to confirm/correct detected results interactively**

**Rationale**: This provides the safety net of automation while allowing human override. ITSS is a known project, so manual specification is acceptable if detection struggles.

**Implementation Details**:
- /init MUST display detected frontends with confidence scores before proceeding
- If confidence < 70%: Show warning and prompt for confirmation
- If no frontends detected: Prompt user to specify frontend path(s) manually
- User can accept detection, modify paths, or specify entirely new targets
- Interactive mode uses simple prompts (not complex wizard):
  - "Detected: React SPA at ./frontend (confidence: 85%). Correct? [Y/n/edit]"
  - If 'edit': "Enter frontend path: "
- Non-interactive mode (CI): Use `--accept-detection` flag to skip prompts, or fail if confidence < threshold
- Detection results and user corrections are logged to `.artk/context.json` for debugging

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Install script MUST create isolated `artk-e2e/` directory that doesn't conflict with parent project
- **FR-002**: Config generator MUST produce valid YAML that passes Zod schema validation
- **FR-003**: /init MUST detect frontend frameworks using @artk/core detection modules
- **FR-004**: /init MUST create `.artk/context.json` for inter-prompt communication
- **FR-005**: Auth harness MUST support OIDC with Keycloak (ITSS requirement)
- **FR-006**: Storage states MUST be organized per role in `.auth-states/` directory
- **FR-007**: /discover MUST analyze routes, auth flows, and selector readiness
- **FR-008**: /journey-propose MUST generate valid journey files with proper frontmatter
- **FR-009**: /journey-implement MUST use @artk/core fixtures (not raw Playwright imports)
- **FR-010**: /journey-validate MUST detect hardcoded URLs, waitForTimeout, and .only usage
- **FR-011**: /journey-verify MUST capture artifacts (traces, screenshots) on failure
- **FR-012**: /journey-maintain MUST detect drift between journeys and tests

### Key Entities

- **Journey**: Text-based contract for a regression scenario (YAML frontmatter + markdown body)
- **Target**: A frontend detected by @artk/core (React, Vue, Angular, Next.js, etc.)
- **Storage State**: Persisted auth session for test reuse (JSON file per role)
- **Module**: Reusable test component (page object, flow, fixture)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Install script works on ITSS without dependency conflicts (100% success rate)
- **SC-002**: Frontend detection correctly identifies ITSS structure (>90% accuracy)
- **SC-003**: Auth flow works with OIDC storage state persistence (100% success)
- **SC-004**: At least 5 MVP journeys are `status: implemented` and verified
- **SC-005**: All prompts (/init through /journey-maintain) are tested on ITSS (100% coverage)
- **SC-006**: /journey-validate passes for all MVP journeys (0 violations)
- **SC-007**: /journey-verify passes for all MVP journeys (100% pass rate)
- **SC-008**: Pilot retrospective documents at least 5 learnings and 3 prompt improvements

---

## Technical Context

### Directory Structure After Pilot

```
ARTK (this repo)
├── core/typescript/           # @artk/core library (001 - DONE)
├── prompts/                   # Slash command prompts
├── specs/
│   ├── 001-artk-core-v1/     # COMPLETED
│   ├── 002-artk-e2e-.../     # Complete during Phase 1
│   └── 003-artk-pilot.../    # This spec
└── docs/

ITSS Project (ignore/req-apps-it-service-shop/)
├── (existing ITSS code)
└── artk-e2e/                  # Created by /init
    ├── package.json
    ├── vendor/artk-core/      # Vendored @artk/core
    ├── artk.config.yml
    ├── playwright.config.ts
    ├── .artk/context.json
    ├── journeys/
    │   ├── proposed/
    │   ├── defined/
    │   ├── clarified/
    │   └── BACKLOG.md
    ├── tests/
    ├── src/
    │   ├── pages/
    │   └── flows/
    ├── docs/
    │   ├── discovery/
    │   └── playbook.md
    ├── .auth-states/          # gitignored
    └── test-results/          # gitignored
```

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| 001-artk-core-v1 | COMPLETED | 116/116 tasks done |
| Node.js 18+ | Required | Runtime |
| Playwright 1.40+ | Required | Test framework |
| ITSS project access | Required | Pilot target |
| ITSS test accounts | Required | Auth testing |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ITSS auth complexity | High | High | Start with manual login, iterate to automated |
| Detection misses ITSS | Medium | Medium | Manual override available in /init |
| Prompts have bugs | High | Medium | Fix and document as we go |
| Test flakiness | Medium | Medium | Focus on stable selectors, explicit waits |
| Time to complete | Medium | Low | Prioritize smoke journeys first |

---

## Related Documents

- `docs/ARTK_Master_Launch_Document_v0.6.md` - Master playbook
- `specs/001-artk-core-v1/` - Core library spec (COMPLETED)
- `specs/002-artk-e2e-independent-architecture/` - Architecture spec
- `research/2026-01-01_project_roadmap_analysis.md` - Roadmap analysis
