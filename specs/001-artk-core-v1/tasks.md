# Tasks: ARTK Core v1 Infrastructure Library

**Input**: Design documents from `/specs/001-artk-core-v1/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included (Vitest for unit, Playwright Test for integration/e2e as specified in plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All source code under `core/typescript/` as specified in plan.md:
- Modules: `core/typescript/{module}/`
- Tests: `core/typescript/{module}/__tests__/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/itss/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per plan.md in core/typescript/
- [x] T002 Initialize TypeScript project with package.json in core/typescript/package.json
- [x] T003 [P] Configure TypeScript compiler with tsconfig.json in core/typescript/tsconfig.json
- [x] T004 [P] Install core dependencies (playwright, zod, yaml, otplib) via package.json
- [x] T005 [P] Install dev dependencies (vitest, typescript, tsup) via package.json
- [x] T006 [P] Configure Vitest for unit testing in core/typescript/vitest.config.ts
- [x] T007 [P] Configure ESLint and Prettier in core/typescript/.eslintrc.js and .prettierrc
- [x] T008 Create version.json with version tracking in core/typescript/version.json
- [x] T009 Create main entry point barrel export in core/typescript/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: US1 (Config) is foundational - all other modules depend on it

- [x] T010 Create shared types index in core/typescript/types/index.ts
- [x] T011 [P] Create ARTKConfigError class in core/typescript/errors/config-error.ts
- [x] T012 [P] Create ARTKAuthError class in core/typescript/errors/auth-error.ts
- [x] T013 [P] Create ARTKStorageStateError class in core/typescript/errors/storage-state-error.ts
- [x] T014 Create errors barrel export in core/typescript/errors/index.ts
- [x] T015 [P] Create structured logger utility in core/typescript/utils/logger.ts (NFR-001 to NFR-003)
- [x] T016 [P] Create retry utility with exponential backoff in core/typescript/utils/retry.ts (NFR-010 to NFR-012)
- [x] T017 Create utils barrel export in core/typescript/utils/index.ts

**Checkpoint**: Foundation ready - User Story 1 can now begin

---

## Phase 3: User Story 1 - Config-Driven Test Setup (Priority: P1)

**Goal**: Enable test engineers to configure the entire Playwright test infrastructure through a single YAML file

**Independent Test**: Create a valid `artk.config.yml` file and verify the system loads, validates, and provides typed access to all configuration sections

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create TypeScript interfaces for all config sections in core/typescript/config/types.ts
- [ ] T019 [P] [US1] Create default values for optional config fields in core/typescript/config/defaults.ts
- [ ] T020 [US1] Create Zod validation schemas for config in core/typescript/config/schema.ts
- [ ] T021 [US1] Implement environment variable resolver (${VAR:-default} syntax) in core/typescript/config/env.ts
- [ ] T022 [US1] Implement YAML config loader with validation in core/typescript/config/loader.ts
- [ ] T023 [US1] Create config accessor functions (getAuthConfig, getSelectorsConfig, etc.) in core/typescript/config/loader.ts
- [ ] T024 [US1] Create config module barrel export in core/typescript/config/index.ts
- [ ] T025 [US1] Write unit tests for env variable resolution in core/typescript/config/__tests__/env.test.ts
- [ ] T026 [US1] Write unit tests for schema validation in core/typescript/config/__tests__/schema.test.ts
- [ ] T027 [US1] Write unit tests for config loader in core/typescript/config/__tests__/loader.test.ts

**Checkpoint**: Config system complete - can load artk.config.yml, validate, and provide typed access

---

## Phase 4: User Story 2 - OIDC Authentication with Storage State (Priority: P1)

**Goal**: Provide automated OIDC login that persists authentication state across test runs

**Independent Test**: Run auth setup project that logs into OIDC-protected app and saves storage state, verify reuse without re-authenticating

**Dependencies**: Requires US1 (Config) complete

### Implementation for User Story 2

- [ ] T028 [P] [US2] Create auth types and interfaces in core/typescript/auth/types.ts
- [ ] T029 [P] [US2] Create Credentials type and getCredentials function in core/typescript/auth/credentials.ts
- [ ] T030 [P] [US2] Create base AuthProvider abstract class in core/typescript/auth/providers/base.ts
- [ ] T031 [US2] Implement storage state save/load/validate functions in core/typescript/auth/storage-state.ts
- [ ] T032 [US2] Implement expired storage state cleanup (24h) in core/typescript/auth/storage-state.ts
- [ ] T033 [US2] Implement generic OIDC flow handler in core/typescript/auth/oidc/flow.ts
- [ ] T034 [P] [US2] Implement Keycloak IdP handler in core/typescript/auth/oidc/providers/keycloak.ts
- [ ] T035 [P] [US2] Implement Azure AD IdP handler in core/typescript/auth/oidc/providers/azure-ad.ts
- [ ] T036 [P] [US2] Implement Okta IdP handler in core/typescript/auth/oidc/providers/okta.ts
- [ ] T037 [P] [US2] Implement generic OIDC IdP handler in core/typescript/auth/oidc/providers/generic.ts
- [ ] T038 [US2] Implement TOTP code generation for MFA in core/typescript/auth/oidc/flow.ts
- [ ] T039 [US2] Implement OIDCAuthProvider class with retry logic in core/typescript/auth/providers/oidc.ts
- [ ] T040 [P] [US2] Implement FormAuthProvider class in core/typescript/auth/providers/form.ts
- [ ] T041 [P] [US2] Implement TokenAuthProvider class in core/typescript/auth/providers/token.ts
- [ ] T042 [P] [US2] Create CustomAuthProvider abstract base in core/typescript/auth/providers/custom.ts
- [ ] T043 [US2] Create auth setup project factory in core/typescript/auth/setup-factory.ts
- [ ] T044 [US2] Create auth module barrel export in core/typescript/auth/index.ts
- [ ] T045 [US2] Write unit tests for credentials loading in core/typescript/auth/__tests__/credentials.test.ts
- [ ] T046 [US2] Write unit tests for storage state management in core/typescript/auth/__tests__/storage-state.test.ts
- [ ] T047 [US2] Write unit tests for OIDC flow in core/typescript/auth/__tests__/oidc-flow.test.ts

**Checkpoint**: Auth system complete - can authenticate via OIDC, save/reuse storage state, handle MFA

---

## Phase 5: User Story 3 - Pre-Built Test Fixtures (Priority: P2)

**Goal**: Provide pre-configured Playwright fixtures for authenticated pages, API contexts, and test data

**Independent Test**: Write test using authenticatedPage, apiContext, testData fixtures and verify each provides expected functionality

**Dependencies**: Requires US1 (Config) and US2 (Auth) complete

### Implementation for User Story 3

- [ ] T048 [P] [US3] Create fixture type definitions in core/typescript/fixtures/types.ts
- [ ] T049 [US3] Create base test fixture with config in core/typescript/fixtures/base.ts
- [ ] T050 [US3] Implement authenticatedPage fixture in core/typescript/fixtures/auth.ts
- [ ] T051 [US3] Implement dynamic role-specific page fixtures (adminPage, userPage) in core/typescript/fixtures/auth.ts
- [ ] T052 [US3] Implement apiContext fixture with auth headers in core/typescript/fixtures/api.ts
- [ ] T053 [US3] Implement runId fixture for test isolation in core/typescript/fixtures/data.ts
- [ ] T054 [US3] Implement testData fixture with cleanup registration in core/typescript/fixtures/data.ts
- [ ] T055 [US3] Create fixtures module barrel export (test, expect) in core/typescript/fixtures/index.ts
- [ ] T056 [US3] Write unit tests for fixture composition in core/typescript/fixtures/__tests__/fixtures.test.ts

**Checkpoint**: Fixtures complete - tests can use authenticatedPage, apiContext, testData, runId

---

## Phase 6: User Story 4 - Accessibility-First Locator Utilities (Priority: P2)

**Goal**: Provide locator utilities that prioritize accessibility selectors over CSS selectors

**Independent Test**: Use locator utilities to find elements by role, label, test-id, verify strategy order is respected

**Dependencies**: Requires US1 (Config) complete

### Implementation for User Story 4

- [ ] T057 [P] [US4] Create locator types and ByRoleOptions in core/typescript/locators/types.ts
- [ ] T058 [US4] Implement testIdAttribute configuration in core/typescript/locators/testid.ts
- [ ] T059 [US4] Implement byRole, byLabel, byPlaceholder, byText functions in core/typescript/locators/strategies.ts
- [ ] T060 [US4] Implement byTestId with custom attribute support in core/typescript/locators/testid.ts
- [ ] T061 [US4] Implement ARIA/accessibility helpers in core/typescript/locators/aria.ts
- [ ] T062 [US4] Implement withinForm scoped locator in core/typescript/locators/factory.ts
- [ ] T063 [US4] Implement withinTable scoped locator in core/typescript/locators/factory.ts
- [ ] T064 [US4] Implement withinSection scoped locator in core/typescript/locators/factory.ts
- [ ] T065 [US4] Implement locate() with strategy chain in core/typescript/locators/factory.ts
- [ ] T066 [US4] Create locators module barrel export in core/typescript/locators/index.ts
- [ ] T067 [US4] Write unit tests for locator strategies in core/typescript/locators/__tests__/strategies.test.ts
- [ ] T068 [US4] Write unit tests for scoped locators in core/typescript/locators/__tests__/factory.test.ts

**Checkpoint**: Locators complete - can find elements by role, label, testid with configurable strategy

---

## Phase 7: User Story 5 - Common Assertion Helpers (Priority: P3)

**Goal**: Provide pre-built assertions for toast, table, form, and loading state patterns

**Independent Test**: Create UI scenarios with toasts, tables, loading states, verify assertion helpers pass/fail correctly

**Dependencies**: Requires US1 (Config) complete

### Implementation for User Story 5

- [ ] T069 [P] [US5] Create assertion types in core/typescript/assertions/types.ts
- [ ] T070 [P] [US5] Implement expectToast and expectNoToast in core/typescript/assertions/toast.ts
- [ ] T071 [P] [US5] Implement expectTableToContainRow and expectTableRowCount in core/typescript/assertions/table.ts
- [ ] T072 [P] [US5] Implement expectFormFieldError and expectFormValid in core/typescript/assertions/form.ts
- [ ] T073 [P] [US5] Implement expectLoading, expectNotLoading, waitForLoadingComplete in core/typescript/assertions/loading.ts
- [ ] T074 [P] [US5] Implement URL assertions (expectUrlContains, expectUrlMatches) in core/typescript/assertions/url.ts
- [ ] T075 [P] [US5] Implement API response assertions in core/typescript/assertions/api.ts
- [ ] T076 [US5] Create assertions module barrel export in core/typescript/assertions/index.ts
- [ ] T077 [US5] Write unit tests for toast assertions in core/typescript/assertions/__tests__/toast.test.ts
- [ ] T078 [US5] Write unit tests for table assertions in core/typescript/assertions/__tests__/table.test.ts
- [ ] T079 [US5] Write unit tests for loading assertions in core/typescript/assertions/__tests__/loading.test.ts

**Checkpoint**: Assertions complete - can assert toast, table, form, loading states

---

## Phase 8: User Story 6 - Test Data Isolation and Cleanup (Priority: P3)

**Goal**: Provide automatic test data namespacing and cleanup for parallel test execution

**Independent Test**: Run multiple tests in parallel with namespaced data, verify no conflicts and cleanup runs

**Dependencies**: Requires US1 (Config) complete

### Implementation for User Story 6

- [x] T080 [P] [US6] Create data types in core/typescript/data/types.ts
- [x] T081 [US6] Implement generateRunId function in core/typescript/data/namespace.ts
- [x] T082 [US6] Implement namespace() and parseNamespace() functions in core/typescript/data/namespace.ts
- [x] T083 [US6] Implement CleanupManager class in core/typescript/data/cleanup.ts
- [x] T084 [US6] Implement abstract DataBuilder base class in core/typescript/data/builders.ts
- [x] T085 [US6] Implement DataApiClient for data operations in core/typescript/data/api-client.ts
- [x] T086 [US6] Implement createFactory and createSequencedFactory utilities in core/typescript/data/factories.ts
- [x] T087 [US6] Create data module barrel export in core/typescript/data/index.ts
- [x] T088 [US6] Write unit tests for namespace functions in core/typescript/data/__tests__/namespace.test.ts
- [x] T089 [US6] Write unit tests for CleanupManager in core/typescript/data/__tests__/cleanup.test.ts
- [x] T090 [US6] Write unit tests for DataBuilder in core/typescript/data/__tests__/builders.test.ts

**Checkpoint**: Data harness complete - can namespace data, register cleanup, run cleanup on failure

---

## Phase 9: User Story 7 - Journey-Aware Reporting (Priority: P4)

**Goal**: Provide test reports that map results back to Journey definitions

**Independent Test**: Run tests tagged with Journey IDs, verify ARTK reporter output includes journey mapping

**Dependencies**: Requires US1 (Config) complete

### Implementation for User Story 7

- [ ] T091 [P] [US7] Create reporter types in core/typescript/reporters/types.ts
- [ ] T092 [US7] Implement mapTestToJourney and groupTestsByJourney in core/typescript/reporters/journey-reporter.ts
- [ ] T093 [US7] Implement calculateJourneyStatus in core/typescript/reporters/journey-reporter.ts
- [ ] T094 [US7] Implement ARTKReporter class in core/typescript/reporters/artk-reporter.ts
- [ ] T095 [US7] Implement saveScreenshot with PII masking option in core/typescript/reporters/artifacts.ts
- [ ] T096 [US7] Implement maskPiiInScreenshot function in core/typescript/reporters/masking.ts
- [ ] T097 [US7] Implement generateARTKReport and writeARTKReport in core/typescript/reporters/artk-reporter.ts
- [ ] T098 [US7] Create reporters module barrel export in core/typescript/reporters/index.ts
- [ ] T099 [US7] Write unit tests for journey mapping in core/typescript/reporters/__tests__/journey-reporter.test.ts
- [ ] T100 [US7] Write unit tests for PII masking in core/typescript/reporters/__tests__/masking.test.ts

**Checkpoint**: Reporters complete - can generate ARTK reports with journey mapping and PII masking

---

## Phase 10: Playwright Harness Integration

**Goal**: Provide Playwright configuration factory that integrates all modules

**Dependencies**: Requires US1-US7 foundational components

### Implementation

- [ ] T101 Create harness types in core/typescript/harness/types.ts
- [ ] T102 Implement createPlaywrightConfig factory in core/typescript/harness/playwright.config.base.ts
- [ ] T103 Implement createAuthSetupProject and createBrowserProjects in core/typescript/harness/projects.ts
- [ ] T104 Implement getReporterConfig in core/typescript/harness/reporters.ts
- [ ] T105 Implement getTierSettings and getUseOptions in core/typescript/harness/playwright.config.base.ts
- [ ] T106 Create harness module barrel export in core/typescript/harness/index.ts
- [ ] T107 Write unit tests for config factory in core/typescript/harness/__tests__/config.test.ts

**Checkpoint**: Harness complete - can generate complete Playwright config from artk.config.yml

---

## Phase 11: Integration Testing

**Goal**: Verify modules work together correctly

### Integration Tests

- [ ] T108 Write config-to-harness integration test in tests/integration/config-to-harness.test.ts
- [ ] T109 Write auth flow integration test (mock IdP) in tests/integration/auth-flow.test.ts
- [ ] T110 Write fixtures composition integration test in tests/integration/fixtures.test.ts

---

## Phase 12: User Story 8 - Prompt Integration with Core (Priority: P4)

**Goal**: Update ARTK prompts to reference the new core framework so AI assistants generate code that imports from core modules

**Independent Test**: Invoke each updated prompt and verify it references core imports (e.g., `from 'artk/.core/...'`) rather than generating equivalent code

**Dependencies**: Requires core modules (US1-US7) and harness to be complete and stable

### Implementation for User Story 8

- [ ] T111 [US8] Review existing /init prompt structure in prompts/init.prompt.md
- [ ] T112 [US8] Update /init prompt to copy core to artk/.core/ and generate artk.config.yml in prompts/init.prompt.md
- [ ] T113 [US8] Review existing /foundation-build prompt in prompts/foundation-build.prompt.md
- [ ] T114 [US8] Update /foundation-build to import createPlaywrightConfig from core in prompts/foundation-build.prompt.md
- [ ] T115 [US8] Review existing /journey-implement prompt in prompts/journey-implement.prompt.md
- [ ] T116 [US8] Update /journey-implement to import fixtures, locators, assertions from core in prompts/journey-implement.prompt.md
- [ ] T117 [US8] Review existing /journey-validate prompt in prompts/journey-validate.prompt.md
- [ ] T118 [US8] Update /journey-validate to check for correct core API usage in prompts/journey-validate.prompt.md
- [ ] T119 [US8] Review existing /journey-verify prompt in prompts/journey-verify.prompt.md
- [ ] T120 [US8] Update /journey-verify to use core fixtures and harness in prompts/journey-verify.prompt.md
- [ ] T121 [US8] Create prompt testing guide documenting how to validate prompt updates in docs/PROMPT_TESTING.md

**Checkpoint**: Prompts updated - AI assistants will generate code that uses core modules

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final polish, documentation, and validation

- [ ] T122 Update main barrel export to include all modules in core/typescript/index.ts
- [ ] T123 [P] Create sample artk.config.yml for testing in core/typescript/__fixtures__/artk.config.yml
- [ ] T124 [P] Create ITSS-specific sample config in core/typescript/__fixtures__/itss.config.yml
- [ ] T125 Run all unit tests and fix any failures
- [ ] T126 Run ESLint and fix any issues
- [ ] T127 Validate against quickstart.md usage examples
- [ ] T128 [P] Build library with tsup for distribution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **US1 Config (Phase 3)**: Depends on Foundational - BLOCKS US2, US3, US5, US6, US7
- **US2 Auth (Phase 4)**: Depends on US1 - BLOCKS US3
- **US3 Fixtures (Phase 5)**: Depends on US1 and US2
- **US4 Locators (Phase 6)**: Depends on US1 only - can run parallel to US2
- **US5 Assertions (Phase 7)**: Depends on US1 only - can run parallel to US2
- **US6 Data (Phase 8)**: Depends on US1 only - can run parallel to US2
- **US7 Reporters (Phase 9)**: Depends on US1 only - can run parallel to US2
- **Harness (Phase 10)**: Depends on all US1-US7 phases
- **Integration (Phase 11)**: Depends on Harness
- **US8 Prompts (Phase 12)**: Depends on Harness being stable - can run parallel to Integration
- **Polish (Phase 13)**: Depends on Integration and US8

### User Story Dependencies

```
US1 (Config) ─────────────────────────────────────────┐
     │                                                 │
     ├──▶ US2 (Auth) ──▶ US3 (Fixtures)               │
     │                                                 │
     ├──▶ US4 (Locators) [parallel with US2]          │
     │                                                 ├──▶ Harness ──┬──▶ Integration ──┐
     ├──▶ US5 (Assertions) [parallel with US2]        │              │                   │
     │                                                 │              └──▶ US8 (Prompts)──┼──▶ Polish
     ├──▶ US6 (Data) [parallel with US2]              │                                  │
     │                                                 │                                  │
     └──▶ US7 (Reporters) [parallel with US2] ────────┘                                  │
```

### Within Each User Story

- Types/interfaces before implementations
- Core functionality before barrel exports
- Implementation before tests
- All tasks in a story complete before marking story done

### Parallel Opportunities

**Within Setup:**
- T003, T004, T005, T006, T007 can run in parallel

**Within Foundational:**
- T011, T012, T013, T015, T016 can run in parallel

**Within US1 (Config):**
- T018, T019 can run in parallel, then T020-T024 sequential

**Within US2 (Auth):**
- T028, T029, T030 can run in parallel
- T034, T035, T036, T037 (IdP handlers) can run in parallel
- T040, T041, T042 (non-OIDC providers) can run in parallel

**Within US4, US5, US6, US7:**
- Many implementation tasks marked [P] can run in parallel

**Cross-Story:**
- After US1 completes: US4, US5, US6, US7 can start in parallel
- US2 must complete before US3

---

## Parallel Example: After US1 Completes

```bash
# These can all start in parallel after US1 (Config) is done:

# Developer A: US2 (Auth)
Task: "Create auth types and interfaces in core/typescript/auth/types.ts"
Task: "Create Credentials type and getCredentials function in core/typescript/auth/credentials.ts"

# Developer B: US4 (Locators)
Task: "Create locator types and ByRoleOptions in core/typescript/locators/types.ts"
Task: "Implement byRole, byLabel, byPlaceholder, byText functions in core/typescript/locators/strategies.ts"

# Developer C: US5 (Assertions)
Task: "Implement expectToast and expectNoToast in core/typescript/assertions/toast.ts"
Task: "Implement expectTableToContainRow and expectTableRowCount in core/typescript/assertions/table.ts"

# Developer D: US6 (Data)
Task: "Implement generateRunId function in core/typescript/data/namespace.ts"
Task: "Implement CleanupManager class in core/typescript/data/cleanup.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Config)
4. Complete Phase 4: US2 (Auth)
5. **STOP and VALIDATE**: Can load config and authenticate with OIDC
6. Deploy/demo if ready - users can write basic authenticated tests

### Incremental Delivery

1. Complete Setup + Foundational + US1 → Config system works
2. Add US2 → Auth works → Deploy (MVP - authenticated tests possible)
3. Add US3 → Fixtures work → Deploy (richer test authoring)
4. Add US4 + US5 → Locators + Assertions → Deploy (better test patterns)
5. Add US6 → Data isolation → Deploy (parallel execution safe)
6. Add US7 → Reporting → Deploy (journey tracking)
7. Complete Harness + Integration → Core feature complete
8. Add US8 → Prompts updated → Full ARTK integration complete

### Parallel Team Strategy

With 4 developers after US1 completes:

1. All complete Setup + Foundational + US1 together
2. Once US1 is done:
   - Developer A: US2 (Auth) → US3 (Fixtures)
   - Developer B: US4 (Locators)
   - Developer C: US5 (Assertions)
   - Developer D: US6 (Data) → US7 (Reporters)
3. Reconvene for Harness and Integration
4. Once Harness stable: US8 (Prompts) can run parallel to Integration testing

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story has clear checkpoint where it can be tested independently
- US1 (Config) is the critical path - prioritize it
- US2 (Auth) blocks US3 (Fixtures) but not US4-US8
- US8 (Prompts) depends on stable core - can run parallel to integration testing
- Verify tests pass before marking story complete
- Commit after each task or logical group
