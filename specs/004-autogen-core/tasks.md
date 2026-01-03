# Tasks: ARTK AutoGen Core Integration

**Input**: Design documents from `/specs/004-autogen-core/`
**Prerequisites**: plan.md, spec.md, research/2026-01-02_autogen-refined-plan.md (MUST be used for implementation)

**Tests**: Unit tests with vitest for core engine; Playwright integration tests for verification. Tests included per user story as the spec emphasizes validation gates.

**Organization**: Tasks grouped by user story to enable independent implementation and testing. Milestones A-F from detailed spec mapped to user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Package location**: `core/typescript/autogen/`
- **Source code**: `core/typescript/autogen/src/`
- **Tests**: `core/typescript/autogen/tests/`
- **Prompts**: `prompts/`
- **Copilot instructions**: `.github/copilot-instructions.md`

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize the @artk/core-autogen package structure

- [x] T001 Create package structure at core/typescript/autogen/ per plan.md project structure
- [x] T002 Initialize TypeScript project with package.json in core/typescript/autogen/package.json
- [x] T003 [P] Configure tsconfig.json for Node.js 18+ in core/typescript/autogen/tsconfig.json
- [x] T004 [P] Add dependencies (ts-morph, yaml, zod, fast-glob) in core/typescript/autogen/package.json
- [x] T005 [P] Add dev dependencies (vitest, @types/node) in core/typescript/autogen/package.json
- [x] T006 [P] Configure ESLint with eslint-plugin-playwright in core/typescript/autogen/eslint.config.js
- [x] T007 Create source directory structure per detailed spec Section 23 in core/typescript/autogen/src/

**Checkpoint**: Package structure ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**Critical**: No user story work can begin until this phase is complete

- [x] T008 Define Zod schema for autogen.config.yml in core/typescript/autogen/src/config/schema.ts
- [x] T009 Implement config loader for artk/autogen.config.yml in core/typescript/autogen/src/config/loader.ts
- [x] T010 Define all IR types (IRPrimitive, LocatorSpec, ValueSpec, IRStep, IRJourney) per detailed spec Section 9 in core/typescript/autogen/src/ir/types.ts
- [x] T011 Create IR builder utility in core/typescript/autogen/src/ir/builder.ts
- [x] T012 Create IR serializer for debugging in core/typescript/autogen/src/ir/serialize.ts
- [x] T013 Define Journey frontmatter Zod schema per detailed spec Section 8 in core/typescript/autogen/src/journey/schema.ts
- [x] T014 Implement Journey parser (YAML frontmatter + markdown body) in core/typescript/autogen/src/journey/parseJourney.ts
- [x] T015 Implement Journey normalizer to extract steps in core/typescript/autogen/src/journey/normalize.ts
- [x] T016 Add unit tests for IR types and builder in core/typescript/autogen/tests/ir/builder.test.ts
- [x] T017 [P] Add unit tests for config loader in core/typescript/autogen/tests/config/loader.test.ts
- [x] T018 [P] Add unit tests for Journey parser in core/typescript/autogen/tests/journey/parser.test.ts

**Checkpoint**: Foundation ready - IR, config, and Journey parsing complete. User story implementation can begin.

---

## Phase 3: User Story 1 - Developer Generates Tests from Journey (Priority: P1) - MVP

**Goal**: Given a clarified Journey, generate working Playwright tests following ARTK conventions

**Independent Test**: Run `generateJourneyTests({journeyId: 'JRN-0001'})` on a sample Journey and verify test file is created with proper imports, tagging, and module calls

**Milestone A from detailed spec**: Core Skeleton (Generation)

### Tests for User Story 1

- [ ] T019 [P] [US1] Create test Journey fixture (JRN-0001.md) in core/typescript/autogen/tests/fixtures/journeys/JRN-0001.md
- [ ] T020 [P] [US1] Unit test for step mapper in core/typescript/autogen/tests/mapping/stepMapper.test.ts
- [ ] T021 [P] [US1] Unit test for test generator in core/typescript/autogen/tests/codegen/generateTest.test.ts
- [ ] T022 [P] [US1] Unit test for module generator in core/typescript/autogen/tests/codegen/generateModule.test.ts
- [ ] T023 [US1] Integration test for full generation pipeline in core/typescript/autogen/tests/integration/generate.test.ts

### Implementation for User Story 1

- [ ] T024 [P] [US1] Implement step mapping patterns (regex) per detailed spec Section 10 in core/typescript/autogen/src/mapping/patterns.ts
- [ ] T025 [P] [US1] Implement glossary loader for synonym resolution in core/typescript/autogen/src/mapping/glossary.ts
- [ ] T026 [US1] Implement step mapper (text → IR) in core/typescript/autogen/src/mapping/stepMapper.ts
- [ ] T027 [P] [US1] Implement selector priority logic per detailed spec Section 11 in core/typescript/autogen/src/selectors/priority.ts
- [ ] T028 [P] [US1] Implement selector inference from step text in core/typescript/autogen/src/selectors/infer.ts
- [ ] T029 [US1] Create test file EJS template per detailed spec Section 12 in core/typescript/autogen/src/codegen/templates/test.ejs
- [ ] T030 [US1] Create module file EJS template in core/typescript/autogen/src/codegen/templates/module.ejs
- [ ] T031 [US1] Implement test generator (IR → Playwright code) in core/typescript/autogen/src/codegen/generateTest.ts
- [ ] T032 [US1] Implement module generator (create/update feature modules) in core/typescript/autogen/src/codegen/generateModule.ts
- [ ] T033 [US1] Implement AST-based editing with ts-morph for idempotent updates in core/typescript/autogen/src/codegen/astEdit.ts
- [ ] T034 [US1] Implement module registry updater in core/typescript/autogen/src/codegen/registry.ts
- [ ] T035 [US1] Export generateJourneyTests API function in core/typescript/autogen/src/index.ts

**Checkpoint**: User Story 1 complete - generateJourneyTests() works end-to-end

---

## Phase 4: User Story 2 - Developer Validates Generated Tests (Priority: P1)

**Goal**: Static validation catches issues before running tests - forbidden patterns, incorrect tags, missing awaits

**Independent Test**: Run `validateJourney({journeyId: 'JRN-0001'})` on generated tests and verify pass/fail with specific issues listed

**Milestone B from detailed spec**: Validation Gate

### Tests for User Story 2

- [ ] T036 [P] [US2] Unit test for forbidden pattern scanner in core/typescript/autogen/tests/validate/patterns.test.ts
- [ ] T037 [P] [US2] Unit test for ESLint integration in core/typescript/autogen/tests/validate/lint.test.ts
- [ ] T038 [US2] Integration test for validation pipeline in core/typescript/autogen/tests/integration/validate.test.ts

### Implementation for User Story 2

- [ ] T039 [P] [US2] Implement Journey schema validation (status=clarified check) in core/typescript/autogen/src/validate/journey.ts
- [ ] T040 [P] [US2] Implement forbidden pattern scanner (waitForTimeout, force:true, etc.) in core/typescript/autogen/src/validate/patterns.ts
- [ ] T041 [US2] Implement ESLint integration with eslint-plugin-playwright in core/typescript/autogen/src/validate/lint.ts
- [ ] T042 [US2] Implement tag validation (required @JRN-####, @tier-*, @scope-*) in core/typescript/autogen/src/validate/tags.ts
- [ ] T043 [US2] Implement AC→test.step mapping completeness check in core/typescript/autogen/src/validate/coverage.ts
- [ ] T044 [US2] Implement generated code validator (aggregates all checks) in core/typescript/autogen/src/validate/code.ts
- [ ] T045 [US2] Export validateJourney API function in core/typescript/autogen/src/index.ts

**Checkpoint**: User Story 2 complete - validateJourney() provides actionable validation results

---

## Phase 5: User Story 3 - Developer Verifies Tests Actually Work (Priority: P1)

**Goal**: Run generated tests against actual application and produce structured pass/fail result with evidence

**Independent Test**: Run `verifyJourney({journeyId: 'JRN-0001'})` and verify test execution, JSON report parsing, failure classification

**Milestone C from detailed spec**: Verification Gate

### Tests for User Story 3

- [ ] T046 [P] [US3] Unit test for Playwright runner wrapper in core/typescript/autogen/tests/verify/runner.test.ts
- [ ] T047 [P] [US3] Unit test for JSON report parser in core/typescript/autogen/tests/verify/parser.test.ts
- [ ] T048 [P] [US3] Unit test for failure classifier in core/typescript/autogen/tests/verify/classifier.test.ts
- [ ] T049 [US3] Integration test for verification pipeline in core/typescript/autogen/tests/integration/verify.test.ts

### Implementation for User Story 3

- [ ] T050 [P] [US3] Implement Playwright CLI runner wrapper in core/typescript/autogen/src/verify/runner.ts
- [ ] T051 [P] [US3] Implement JSON report parser for test results in core/typescript/autogen/src/verify/parser.ts
- [ ] T052 [US3] Implement failure classifier (selector, timing, navigation, data, auth, env) in core/typescript/autogen/src/verify/classifier.ts
- [ ] T053 [US3] Implement stability gate (--repeat-each, --fail-on-flaky-tests) in core/typescript/autogen/src/verify/stability.ts
- [ ] T054 [US3] Implement ARIA snapshot capture helper in core/typescript/autogen/src/verify/evidence.ts
- [ ] T055 [US3] Implement verify summary JSON generator in core/typescript/autogen/src/verify/summary.ts
- [ ] T056 [US3] Export verifyJourney API function in core/typescript/autogen/src/index.ts

**Checkpoint**: User Story 3 complete - verifyJourney() runs tests and produces structured results with evidence

---

## Phase 6: User Story 4 - Developer Heals Failing Tests Safely (Priority: P2)

**Goal**: Bounded healing loop that fixes selector/timing issues without compromising test integrity

**Independent Test**: Given a test failing due to CSS selector, run healing and verify selector upgraded to role/label without adding sleeps

**Milestone D from detailed spec**: Healing v1

### Tests for User Story 4

- [ ] T057 [P] [US4] Unit test for healing rules (allowed/forbidden) in core/typescript/autogen/tests/heal/rules.test.ts
- [ ] T058 [P] [US4] Unit test for selector fix strategy in core/typescript/autogen/tests/heal/fixes/selector.test.ts
- [ ] T059 [P] [US4] Unit test for navigation wait fix in core/typescript/autogen/tests/heal/fixes/navigation.test.ts
- [ ] T060 [US4] Integration test for healing loop in core/typescript/autogen/tests/integration/heal.test.ts

### Implementation for User Story 4

- [ ] T061 [P] [US4] Define healing rules (allowed/forbidden fixes) per detailed spec Section 16 in core/typescript/autogen/src/heal/rules.ts
- [ ] T062 [P] [US4] Implement selector refinement fix (CSS → role/label/testid) in core/typescript/autogen/src/heal/fixes/selector.ts
- [ ] T063 [P] [US4] Implement navigation wait fix in core/typescript/autogen/src/heal/fixes/navigation.ts
- [ ] T064 [P] [US4] Implement timing/async fix in core/typescript/autogen/src/heal/fixes/timing.ts
- [ ] T065 [P] [US4] Implement data isolation fix (runId namespace) in core/typescript/autogen/src/heal/fixes/data.ts
- [ ] T066 [US4] Implement healing attempt logger (heal-log.json) in core/typescript/autogen/src/heal/logger.ts
- [ ] T067 [US4] Implement bounded healing loop controller in core/typescript/autogen/src/heal/loop.ts
- [ ] T068 [US4] Add heal option to verifyJourney API in core/typescript/autogen/src/index.ts

**Checkpoint**: User Story 4 complete - Healing fixes common failures safely with logged evidence

---

## Phase 7: User Story 5 - Developer Uses Machine Hints in Journeys (Priority: P2)

**Goal**: Optional machine hints in Journey steps improve mapping accuracy

**Independent Test**: Journey with `(role=button, exact=true)` hint generates exact role-based locator

### Tests for User Story 5

- [ ] T069 [P] [US5] Unit test for machine hint parser in core/typescript/autogen/tests/journey/hints.test.ts
- [ ] T070 [US5] Integration test for hint-based generation in core/typescript/autogen/tests/integration/hints.test.ts

### Implementation for User Story 5

- [ ] T071 [P] [US5] Define machine hint syntax regex patterns in core/typescript/autogen/src/journey/hintPatterns.ts
- [ ] T072 [US5] Implement machine hint parser (extract role, testid, label, signal hints) in core/typescript/autogen/src/journey/parseHints.ts
- [ ] T073 [US5] Update step mapper to prioritize explicit hints over inference in core/typescript/autogen/src/mapping/stepMapper.ts
- [ ] T074 [US5] Create test Journey with machine hints fixture in core/typescript/autogen/tests/fixtures/journeys/JRN-0002-hints.md

**Checkpoint**: User Story 5 complete - Machine hints override default selector inference

---

## Phase 8: User Story 6 - Developer Uses Updated Prompts (Priority: P1)

**Goal**: ARTK prompts leverage AutoGen Core for generation, validation, verification

**Independent Test**: Run `/journey-implement` on a clarified Journey and verify it uses AutoGen Core (not manual generation)

**Milestone E from detailed spec**: Prompt Integration

### Implementation for User Story 6

- [ ] T075 [US6] Update /discover-foundation prompt (eslint-plugin-playwright config, selector catalog generation, ARIA snapshot helper) in prompts/artk.discover-foundation.md
- [ ] T076 [US6] Update /journey-implement prompt to orchestrate via AutoGen Core in prompts/artk.journey-implement.md
- [ ] T077 [US6] Update /journey-validate prompt to include lint + AC mapping checks in prompts/artk.journey-validate.md
- [ ] T078 [US6] Update /journey-verify prompt to add ARIA capture + bounded healing in prompts/artk.journey-verify.md

**Checkpoint**: User Story 6 complete - All 4 prompts updated to use AutoGen Core

---

## Phase 9: User Story 7 - Copilot Follows AutoGen Rules (Priority: P2)

**Goal**: Copilot suggestions in ARTK test files follow selector priority and avoid forbidden patterns

**Independent Test**: Copilot suggests code in test file that uses role-based locators, not CSS

### Implementation for User Story 7

- [ ] T079 [US7] Add AutoGen rules to Copilot instructions (selector priority, forbidden patterns, module-first rules) in .github/copilot-instructions.md

**Checkpoint**: User Story 7 complete - Copilot instructions include AutoGen rules

---

## Phase 10: User Story 8 - Developer Configures Glossary for Synonyms (Priority: P3)

**Goal**: Common terms in Journeys map to consistent module methods via glossary

**Independent Test**: Journey step "log in" maps to `auth.login()` per glossary config

### Tests for User Story 8

- [ ] T080 [P] [US8] Unit test for synonym resolution in core/typescript/autogen/tests/mapping/glossary.test.ts
- [ ] T081 [US8] Integration test for glossary-based mapping in core/typescript/autogen/tests/integration/glossary.test.ts

### Implementation for User Story 8

- [ ] T082 [US8] Extend glossary schema for labelAliases per detailed spec Part 5.2 in core/typescript/autogen/src/mapping/glossary.ts
- [ ] T083 [US8] Implement synonym resolution in step mapper in core/typescript/autogen/src/mapping/stepMapper.ts
- [ ] T084 [US8] Implement label alias matching in selector inference in core/typescript/autogen/src/selectors/infer.ts
- [ ] T085 [US8] Document glossary configuration in README in core/typescript/autogen/README.md

**Checkpoint**: User Story 8 complete - Glossary synonyms resolve correctly

---

## Phase 11: Selector Catalog (Cross-Cutting)

**Goal**: Repo-local selector catalog replaces MCP for selector discovery

**Referenced by**: US1 (generation), US4 (healing)

### Tests for Selector Catalog

- [ ] T086 [P] Unit test for catalog schema in core/typescript/autogen/tests/selectors/catalog.test.ts
- [ ] T087 [P] Unit test for testid scanner in core/typescript/autogen/tests/selectors/scanner.test.ts

### Implementation for Selector Catalog

- [ ] T088 [P] Define selector catalog JSON schema per detailed spec Part 2.1 in core/typescript/autogen/src/selectors/catalogSchema.ts
- [ ] T089 [P] Implement catalog loader in core/typescript/autogen/src/selectors/catalog.ts
- [ ] T090 Implement testid scanner (scan data-testid usage) in core/typescript/autogen/src/selectors/scanner.ts
- [ ] T091 Implement catalog generator CLI command in core/typescript/autogen/src/cli/catalogGenerate.ts
- [ ] T092 Integrate catalog querying into selector inference in core/typescript/autogen/src/selectors/infer.ts
- [ ] T093 [P] Implement selector debt tracker (records CSS usage, generates debt report) per FR-028 in core/typescript/autogen/src/selectors/debt.ts

**Checkpoint**: Selector catalog provides stable selectors for generation and healing

### Requirements Traceability (Phase 11)

| Task | Implements | User Story Impact |
|------|-----------|-------------------|
| T088 | FR-025 | US1 (generation queries catalog) |
| T089 | FR-025 | US1, US4 (both load catalog) |
| T090 | FR-026 | US6 (/discover-foundation generates) |
| T091 | FR-026 | US6 (CLI for manual generation) |
| T092 | FR-027 | US1, US4 (query during inference) |
| T093 | FR-028 | US1 (debt tracking on CSS usage) |

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, CLI, and final integration

### CLI and Package Export

- [ ] T094 [P] Create CLI entry point for generation in core/typescript/autogen/src/cli/generate.ts
- [ ] T095 [P] Create CLI entry point for validation in core/typescript/autogen/src/cli/validate.ts
- [ ] T096 [P] Create CLI entry point for verification in core/typescript/autogen/src/cli/verify.ts
- [ ] T097 Add bin scripts to package.json in core/typescript/autogen/package.json
- [ ] T098 Export all public APIs from index.ts in core/typescript/autogen/src/index.ts

### Documentation

- [ ] T099 [P] Create README.md with quickstart guide in core/typescript/autogen/README.md
- [ ] T100 [P] Document error codes per detailed spec Section 20 in core/typescript/autogen/docs/errors.md
- [ ] T101 [P] Document healing rules in core/typescript/autogen/docs/healing.md
- [ ] T102 Update PLAYBOOK.md with autogen section in docs/PLAYBOOK.md
- [ ] T103 Update CLAUDE.md with autogen commands in CLAUDE.md

### End-to-End Testing

- [ ] T104 Create E2E test scenario on ITSS project in core/typescript/autogen/tests/e2e/itss.test.ts
- [ ] T105 Run full generation → validation → verification → healing cycle in core/typescript/autogen/tests/e2e/full-cycle.test.ts
- [ ] T106 Verify no regression in existing @artk/core tests

**Checkpoint**: @artk/core-autogen is complete, documented, and tested

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1-8 (Phases 3-10)**: All depend on Foundational phase completion
- **Selector Catalog (Phase 11)**: Can run parallel with user stories after Foundational
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Core generation
- **User Story 2 (P1)**: Can start after Foundational - Validation (parallel with US1)
- **User Story 3 (P1)**: Can start after Foundational - Verification (parallel with US1, US2)
- **User Story 4 (P2)**: Depends on US3 (verification needed for healing loop)
- **User Story 5 (P2)**: Can start after Foundational - Machine hints (parallel with US1-3)
- **User Story 6 (P1)**: Depends on US1-4 (prompts orchestrate existing functionality)
- **User Story 7 (P2)**: Can start independently (Copilot instructions)
- **User Story 8 (P3)**: Can start after T027 (glossary loader exists)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Foundation types before services
- Services before codegen
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- User Stories 1, 2, 3, 5, 7, 8 can start in parallel after Foundational
- Within each story, tasks marked [P] can run in parallel
- Selector Catalog phase can run parallel with User Stories

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create test Journey fixture (JRN-0001.md)" [T019]
Task: "Unit test for step mapper" [T020]
Task: "Unit test for test generator" [T021]
Task: "Unit test for module generator" [T022]

# Then launch model/pattern tasks together:
Task: "Implement step mapping patterns" [T024]
Task: "Implement glossary loader" [T025]
Task: "Implement selector priority logic" [T027]
Task: "Implement selector inference" [T028]
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Generation
4. Complete Phase 4: User Story 2 - Validation
5. Complete Phase 5: User Story 3 - Verification
6. **STOP and VALIDATE**: Test generate → validate → verify pipeline
7. Deploy/demo if ready - basic AutoGen Core functional

### Incremental Delivery

1. MVP (US1-3) → Core generation + validation + verification
2. Add User Story 4 → Healing capability
3. Add User Story 6 → Prompt integration (production ready)
4. Add User Stories 5, 7, 8 → Polish and refinements
5. Complete Phase 11-12 → Full feature complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1, 4 (generation, healing)
   - Developer B: User Stories 2, 3 (validation, verification)
   - Developer C: User Stories 5, 8 (hints, glossary)
   - Developer D: User Stories 6, 7 (prompts, copilot)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **CRITICAL**: Reference `research/2026-01-02_autogen-refined-plan.md` for detailed implementation specs

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Tasks** | 106 |
| **Setup Phase** | 7 |
| **Foundational Phase** | 11 |
| **User Story 1 (P1)** | 17 |
| **User Story 2 (P1)** | 10 |
| **User Story 3 (P1)** | 11 |
| **User Story 4 (P2)** | 12 |
| **User Story 5 (P2)** | 6 |
| **User Story 6 (P1)** | 4 |
| **User Story 7 (P2)** | 1 |
| **User Story 8 (P3)** | 6 |
| **Selector Catalog** | 8 |
| **Polish Phase** | 13 |
| **Parallelizable [P]** | 45 (42%) |

**MVP Scope (US1-3)**: 56 tasks (53% of total)
**P1 Stories Complete**: 60 tasks (57% of total)
