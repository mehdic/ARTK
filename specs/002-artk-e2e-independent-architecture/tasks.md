# Tasks: ARTK E2E Independent Architecture

**Input**: Design documents from `/specs/002-artk-e2e-independent-architecture/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit tests included for detection and config logic (per plan.md: "Vitest for unit tests of detection/config logic")

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- Detection logic: `core/typescript/src/detection/`
- Config logic: `core/typescript/src/config/`
- Target logic: `core/typescript/src/targets/`
- Install scripts: `core/typescript/scripts/`
- Prompts: `prompts/`
- Unit tests: `core/typescript/tests/unit/`
- Integration tests: `core/typescript/tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create directory structure per plan.md: `core/typescript/src/detection/`, `core/typescript/src/config/`, `core/typescript/src/targets/`
- [ ] T002 [P] Create index.ts barrel exports in `core/typescript/src/detection/index.ts`
- [ ] T003 [P] Create index.ts barrel exports in `core/typescript/src/config/index.ts`
- [ ] T004 [P] Create index.ts barrel exports in `core/typescript/src/targets/index.ts`
- [ ] T005 Add new dependencies to `core/typescript/package.json`: yaml, zod (if not already present)
- [ ] T006 [P] Create test directory structure: `core/typescript/tests/unit/detection/`, `core/typescript/tests/unit/config/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Implement ArtkTarget type definitions in `core/typescript/src/types/target.ts`
- [ ] T008 [P] Implement ArtkContext type definitions in `core/typescript/src/types/context.ts`
- [ ] T009 [P] Implement ArtkConfig type definitions in `core/typescript/src/types/config.ts`
- [ ] T010 Implement ArtkConfigTarget type with environment URLs in `core/typescript/src/types/config.ts`
- [ ] T011 [P] Implement ArtkAuthConfig and ArtkRole types in `core/typescript/src/types/auth.ts`
- [ ] T012 [P] Implement DetectionResult type in `core/typescript/src/types/detection.ts`
- [ ] T013 [P] Implement SubmoduleStatus type in `core/typescript/src/types/submodule.ts`
- [ ] T014 Create Zod schemas for ArtkContext validation in `core/typescript/src/schemas/context.schema.ts`
- [ ] T015 [P] Create Zod schemas for ArtkConfig validation in `core/typescript/src/schemas/config.schema.ts`
- [ ] T016 Export all types from `core/typescript/src/types/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize ARTK in Monorepo (Priority: P1) 🎯 MVP

**Goal**: `/init` detects git root, scans for frontends, creates `artk-e2e/` directory with config

**Independent Test**: Run `/init` in a test monorepo, verify `artk-e2e/` created with correct config

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Unit test for frontend-detector in `core/typescript/tests/unit/detection/frontend-detector.test.ts`
- [ ] T018 [P] [US1] Unit test for submodule-checker in `core/typescript/tests/unit/detection/submodule-checker.test.ts`
- [ ] T019 [P] [US1] Unit test for signal scoring in `core/typescript/tests/unit/detection/scoring.test.ts`
- [ ] T020 [P] [US1] Integration test for init flow in `core/typescript/tests/integration/init-flow/init.test.ts`

### Implementation for User Story 1

- [ ] T021 [P] [US1] Implement signal scoring constants in `core/typescript/src/detection/signals.ts` (weights from research.md)
- [ ] T022 [P] [US1] Implement package.json dependency scanner in `core/typescript/src/detection/package-scanner.ts`
- [ ] T023 [P] [US1] Implement entry file detector (App.tsx, main.ts, pages/) in `core/typescript/src/detection/entry-detector.ts`
- [ ] T024 [P] [US1] Implement directory name heuristics in `core/typescript/src/detection/directory-heuristics.ts`
- [ ] T025 [US1] Implement FrontendDetector class in `core/typescript/src/detection/frontend-detector.ts` (combines T021-T024)
- [ ] T026 [US1] Implement SubmoduleChecker class in `core/typescript/src/detection/submodule-checker.ts` (parse .gitmodules)
- [ ] T027 [US1] Export detection module from `core/typescript/src/detection/index.ts`
- [ ] T028 [US1] Update `/init` prompt in `prompts/init.prompt.md` with detection and multi-target flow

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Install Without Conflicts (Priority: P2)

**Goal**: Install script creates isolated `artk-e2e/` with vendored @artk/core, no npm conflicts

**Independent Test**: Run install script on project with conflicting deps, verify isolated install succeeds

### Tests for User Story 2

- [ ] T029 [P] [US2] Unit test for package.json generation in `core/typescript/tests/unit/install/package-generator.test.ts`
- [ ] T030 [P] [US2] Unit test for gitignore generation in `core/typescript/tests/unit/install/gitignore-generator.test.ts`

### Implementation for User Story 2

- [ ] T031 [P] [US2] Update install-to-project.sh with full artk-e2e/ structure in `core/typescript/scripts/install-to-project.sh`
- [ ] T032 [P] [US2] Create PowerShell version for Windows in `core/typescript/scripts/install-to-project.ps1`
- [ ] T033 [US2] Implement package.json generator with minimal deps in `core/typescript/src/install/package-generator.ts`
- [ ] T034 [US2] Implement .gitignore generator in `core/typescript/src/install/gitignore-generator.ts`
- [ ] T035 [US2] Implement playwright.config.ts generator in `core/typescript/src/install/playwright-config-generator.ts`
- [ ] T036 [US2] Export install module from `core/typescript/src/install/index.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Configure Multiple Targets (Priority: P3)

**Goal**: `artk.config.yml` supports targets[] array with per-environment URLs

**Independent Test**: Create config with 3 targets, verify each target resolves correctly

### Tests for User Story 3

- [ ] T037 [P] [US3] Unit test for config loader in `core/typescript/tests/unit/config/config-loader.test.ts`
- [ ] T038 [P] [US3] Unit test for config validation in `core/typescript/tests/unit/config/config-validator.test.ts`
- [ ] T039 [P] [US3] Unit test for target resolver in `core/typescript/tests/unit/targets/target-resolver.test.ts`

### Implementation for User Story 3

- [ ] T040 [P] [US3] Implement config loader (YAML parsing) in `core/typescript/src/config/config-loader.ts`
- [ ] T041 [US3] Implement config validator (Zod validation) in `core/typescript/src/config/config-validator.ts`
- [ ] T042 [US3] Implement schema-v2 with targets support in `core/typescript/src/config/schema-v2.ts`
- [ ] T043 [US3] Implement config migration (v1 → v2) in `core/typescript/src/config/config-migrator.ts`
- [ ] T044 [US3] Implement target resolver (resolve target by name) in `core/typescript/src/targets/target-resolver.ts`
- [ ] T045 [US3] Export config module from `core/typescript/src/config/index.ts`
- [ ] T046 [US3] Export targets module from `core/typescript/src/targets/index.ts`

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Project Discovery (Priority: P4)

**Goal**: `/discover` reads targets from context.json and analyzes each frontend

**Independent Test**: Run `/discover` with 2 targets, verify separate discovery files created

### Implementation for User Story 4

- [ ] T047 [US4] Update `/discover` prompt to read context.json in `prompts/discover.prompt.md`
- [ ] T048 [US4] Add target-aware discovery output format in `prompts/discover.prompt.md`
- [ ] T049 [US4] Document discovery file per-target structure in `docs/discovery-format.md`

**Checkpoint**: Discovery works for multi-target projects

---

## Phase 7: User Story 5 - Journey Target Awareness (Priority: P5)

**Goal**: Journey frontmatter supports `target:` field, tests organized by target

**Independent Test**: Create journey with target, verify test generated in correct directory

### Implementation for User Story 5

- [ ] T050 [US5] Update Journey schema to include optional `target:` field in `core/artk-core-journeys/journeys/schema/frontmatter.schema.json`
- [ ] T051 [US5] Update `/journey-implement` to respect target in `prompts/journey-implement.prompt.md`
- [ ] T052 [US5] Document target-aware journey structure in `docs/journeys/target-awareness.md`

**Checkpoint**: Journeys can specify and resolve targets

---

## Phase 8: User Story 6 - Environment-Aware Execution (Priority: P6)

**Goal**: Tests run against environment specified by ARTK_ENV or --env flag

**Independent Test**: Run tests with ARTK_ENV=staging, verify correct URLs used

### Tests for User Story 6

- [ ] T053 [P] [US6] Unit test for environment resolver in `core/typescript/tests/unit/config/environment-resolver.test.ts`

### Implementation for User Story 6

- [ ] T054 [US6] Implement environment resolver in `core/typescript/src/config/environment-resolver.ts`
- [ ] T055 [US6] Update playwright.config.ts generator to use ARTK_ENV in `core/typescript/src/install/playwright-config-generator.ts`
- [ ] T056 [US6] Document environment configuration in `docs/environments.md`

**Checkpoint**: Environment-aware test execution works

---

## Phase 9: User Story 7 - Context Persistence (Priority: P7)

**Goal**: `.artk/context.json` persists between prompts, uses relative paths

**Independent Test**: Run `/init`, verify context.json created with relative paths, run `/discover` to verify it reads context

### Tests for User Story 7

- [ ] T057 [P] [US7] Unit test for context writer in `core/typescript/tests/unit/config/context-writer.test.ts`
- [ ] T058 [P] [US7] Unit test for context reader in `core/typescript/tests/unit/config/context-reader.test.ts`
- [ ] T059 [P] [US7] Unit test for path normalization in `core/typescript/tests/unit/config/path-normalizer.test.ts`

### Implementation for User Story 7

- [ ] T060 [US7] Implement context writer (JSON serialization) in `core/typescript/src/config/context.ts`
- [ ] T061 [US7] Implement context reader (JSON parsing + validation) in `core/typescript/src/config/context.ts`
- [ ] T062 [US7] Implement path normalizer (relative paths, cross-platform) in `core/typescript/src/config/path-normalizer.ts`
- [ ] T063 [US7] Update all prompts to read context.json at start in relevant `prompts/*.prompt.md` files

**Checkpoint**: Context persistence works across all prompts

---

## Phase 10: User Story 8 - Documentation Generation (Priority: P8)

**Goal**: All generated docs live in `artk-e2e/docs/`, organized by target

**Independent Test**: Run full workflow, verify docs structure matches spec

### Implementation for User Story 8

- [ ] T064 [US8] Update prompts to output to `artk-e2e/docs/` structure
- [ ] T065 [US8] Document expected directory structure in `docs/generated-docs.md`

**Checkpoint**: Documentation follows standardized structure

---

## Phase 11: User Story 9 - Upgrade ARTK Core (Priority: P9)

**Goal**: Re-running install script updates vendor/ while preserving config

**Independent Test**: Install v1, run tests, upgrade to v2, verify config preserved and tests still run

### Implementation for User Story 9

- [ ] T066 [US9] Implement upgrade detection in install script `core/typescript/scripts/install-to-project.sh`
- [ ] T067 [US9] Add version tracking to context.json in `core/typescript/src/config/context.ts`
- [ ] T068 [US9] Document upgrade process in `docs/upgrading.md`

**Checkpoint**: Upgrades work without breaking existing setup

---

## Phase 12: User Story 10 - CI/CD Integration (Priority: P10)

**Goal**: Documentation and templates for GitHub Actions and GitLab CI

**Independent Test**: Copy template to test repo, verify CI runs successfully

### Implementation for User Story 10

- [ ] T069 [P] [US10] Create GitHub Actions template in `docs/ci/github-actions.yml`
- [ ] T070 [P] [US10] Create GitLab CI template in `docs/ci/.gitlab-ci.yml`
- [ ] T071 [US10] Document CI/CD integration patterns in `docs/ci/README.md`
- [ ] T072 [US10] Add wait-on health check documentation in `docs/ci/health-checks.md`

**Checkpoint**: CI/CD templates ready for use

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T073 [P] Update main README.md with new multi-target architecture
- [ ] T074 [P] Add JSDoc comments to all public APIs
- [ ] T075 Code review for cross-platform path handling (Windows support)
- [ ] T076 [P] Add error messages for common failure scenarios
- [ ] T077 [P] Create CHANGELOG.md entry for this feature
- [ ] T078 Run quickstart.md validation (follow guide, verify it works)
- [ ] T079 Performance validation: verify `/init` completes in <30s, detection <5s

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-12)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3...)
  - Or in parallel if staffed
- **Polish (Phase 13)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Run In Parallel With |
|-------|------------|-------------------------|
| US1 (Init) | Foundational | - |
| US2 (Install) | Foundational | US1 |
| US3 (Multi-Target) | Foundational | US1, US2 |
| US4 (Discover) | US1, US7 | US2, US3 |
| US5 (Journey Target) | US3 | US4, US6 |
| US6 (Environment) | US3 | US4, US5 |
| US7 (Context) | Foundational | US1, US2, US3 |
| US8 (Docs) | US4 | US5, US6, US9 |
| US9 (Upgrade) | US2 | US5, US6, US8 |
| US10 (CI/CD) | US2, US6 | US8, US9 |

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Types before implementations
- Core logic before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- All type definitions (T007-T013) can run in parallel
- Schema definitions (T014-T015) can run in parallel after types

**Within Phase 3 (US1)**:
- All test tasks (T017-T020) can run in parallel
- All scanner/detector tasks (T021-T024) can run in parallel
- T025 depends on T021-T024

**Within Phase 5 (US3)**:
- All test tasks (T037-T039) can run in parallel
- T040 is independent; T041-T044 are sequential

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for frontend-detector in core/typescript/tests/unit/detection/frontend-detector.test.ts"
Task: "Unit test for submodule-checker in core/typescript/tests/unit/detection/submodule-checker.test.ts"
Task: "Unit test for signal scoring in core/typescript/tests/unit/detection/scoring.test.ts"

# Launch all detector components together:
Task: "Implement signal scoring constants in core/typescript/src/detection/signals.ts"
Task: "Implement package.json dependency scanner in core/typescript/src/detection/package-scanner.ts"
Task: "Implement entry file detector in core/typescript/src/detection/entry-detector.ts"
Task: "Implement directory name heuristics in core/typescript/src/detection/directory-heuristics.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Init with detection)
4. **STOP and VALIDATE**: Test `/init` in a real monorepo
5. Deploy/demo if ready - basic init works!

### Incremental Delivery

1. **Setup + Foundational** → Foundation ready
2. **Add US1 (Init)** → Can detect frontends → Demo!
3. **Add US2 (Install)** → Isolated install works → Demo!
4. **Add US3 (Multi-Target)** → Multi-target config → Demo!
5. **Add US7 (Context)** → Prompts share state → Demo!
6. **Add remaining stories** → Full feature complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (1-2 days)
2. Once Foundational is done:
   - Developer A: US1 (Init) + US4 (Discover)
   - Developer B: US2 (Install) + US9 (Upgrade)
   - Developer C: US3 (Multi-Target) + US6 (Environment)
   - Developer D: US7 (Context) + US5 (Journey Target)
3. US8 (Docs) + US10 (CI/CD) after dependencies complete
4. Polish phase after all stories

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 79 |
| **Setup Tasks** | 6 |
| **Foundational Tasks** | 10 |
| **User Story Tasks** | 56 |
| **Polish Tasks** | 7 |
| **Parallelizable Tasks** | 42 (53%) |
| **Test Tasks** | 14 |

### Tasks Per User Story

| Story | Task Count | Has Tests |
|-------|------------|-----------|
| US1: Init | 12 | Yes (4) |
| US2: Install | 6 | Yes (2) |
| US3: Multi-Target | 10 | Yes (3) |
| US4: Discover | 3 | No |
| US5: Journey Target | 3 | No |
| US6: Environment | 4 | Yes (1) |
| US7: Context | 7 | Yes (3) |
| US8: Docs | 2 | No |
| US9: Upgrade | 3 | No |
| US10: CI/CD | 4 | No |

### Suggested MVP Scope

**Minimum Viable Product**: Phases 1-3 (Setup + Foundational + US1)
- 28 tasks total
- Delivers: Frontend detection, project discovery, artk-e2e/ structure creation
- Can demo: `/init` working in a monorepo

### Format Validation

✅ All 79 tasks follow the checklist format:
- Checkbox prefix: `- [ ]`
- Task ID: T001-T079
- [P] marker where applicable
- [Story] label for user story tasks (US1-US10)
- File paths included in descriptions

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
