# Tasks: ARTK Multi-Variant Build System

**Input**: Design documents from `/specs/006-multi-variant-builds/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: No explicit test requests in specification. Build system should pass existing ~2,100 tests on all 4 variants.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1-US6 map to spec.md stories)

## Path Conventions

Based on plan.md project structure:
- `core/typescript/` - @artk/core package
- `core/typescript/autogen/` - @artk/core-autogen package
- `cli/src/` - CLI source
- `scripts/` - Bootstrap scripts

---

## Phase 1: Setup (Build Infrastructure)

**Purpose**: Create TypeScript configurations and build scripts for all 4 variants

- [X] T001 Create tsconfig.cjs.json for modern-cjs variant in core/typescript/tsconfig.cjs.json
- [X] T002 [P] Create tsconfig.legacy-16.json for Node 16 variant in core/typescript/tsconfig.legacy-16.json
- [X] T003 [P] Create tsconfig.legacy-14.json for Node 14 variant in core/typescript/tsconfig.legacy-14.json
- [X] T004 [P] Create package-legacy-16.json with Playwright 1.49.x in core/typescript/package-legacy-16.json
- [X] T005 [P] Create package-legacy-14.json with Playwright 1.33.x in core/typescript/package-legacy-14.json
- [X] T006 Update package.json with conditional exports for ESM/CJS in core/typescript/package.json
- [X] T007 [P] Create autogen tsconfig.cjs.json in core/typescript/autogen/tsconfig.cjs.json
- [X] T008 [P] Create autogen tsconfig.legacy-16.json in core/typescript/autogen/tsconfig.legacy-16.json
- [X] T009 [P] Create autogen tsconfig.legacy-14.json in core/typescript/autogen/tsconfig.legacy-14.json
- [X] T010 [P] Create autogen package-legacy-16.json in core/typescript/autogen/package-legacy-16.json
- [X] T011 [P] Create autogen package-legacy-14.json in core/typescript/autogen/package-legacy-14.json
- [X] T012 Create build-variants.sh script in core/typescript/scripts/build-variants.sh
- [X] T013 [P] Create build-variants.ps1 script in core/typescript/scripts/build-variants.ps1
- [X] T014 Add npm scripts for variant builds in core/typescript/package.json

**Checkpoint**: Build configurations ready for all 4 variants ✓

---

## Phase 2: Foundational (Core Detection & Utilities)

**Purpose**: Implement variant detection logic and shared utilities - BLOCKS all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T015 Create VariantId and ModuleSystem type definitions in cli/src/utils/variant-types.ts
- [X] T016 Implement variant detection logic (Node version + module system) in cli/src/utils/variant-detector.ts
- [X] T017 Create Zod schemas for Context and LockFile validation in cli/src/utils/variant-schemas.ts
- [X] T018 Implement install logger utility (append-only log) in cli/src/utils/install-logger.ts
- [X] T019 Implement lock file manager (acquire/release/check stale) in cli/src/utils/lock-manager.ts
- [X] T020 Create VARIANT_DEFINITIONS constant mapping all 4 variants in cli/src/utils/variant-definitions.ts
- [X] T021 Build all 4 variants using build-variants.sh and verify dist directories created

**Checkpoint**: Foundation ready - variant detection and utilities available for CLI/bootstrap integration ✓

---

## Phase 3: User Story 1 - Install on Modern Project (Priority: P1) 🎯 MVP

**Goal**: Auto-detect Node 18+ ESM/CJS environment and install correct modern variant

**Independent Test**: Run `npx @artk/cli init` on Node 20 ESM project → modern-esm installed, imports work

### Implementation for User Story 1

- [X] T022 [US1] Update init command to detect Node version in cli/src/commands/init.ts
- [X] T023 [US1] Update init command to detect module system from package.json in cli/src/commands/init.ts
- [X] T024 [US1] Add variant selection logic based on detection in cli/src/commands/init.ts
- [X] T025 [US1] Implement variant file copying (dist → vendor) in cli/src/commands/init.ts
- [X] T026 [US1] Create .artk/context.json with variant metadata on install in cli/src/commands/init.ts
- [X] T027 [US1] Add logging to .artk/install.log during installation in cli/src/commands/init.ts
- [X] T028 [US1] Update bootstrap.sh to use variant detector in scripts/bootstrap.sh
- [X] T029 [P] [US1] Update bootstrap.ps1 to use variant detector in scripts/bootstrap.ps1

**Checkpoint**: Modern project installation works - Node 18+ auto-detects and installs modern-esm or modern-cjs ✓

---

## Phase 4: User Story 4 - Prevent AI Agent Modifications (Priority: P1)

**Goal**: AI agents read immutability markers and do NOT modify vendor files

**Independent Test**: Check vendor directory has READONLY.md and .ai-ignore; AI suggests reinstall instead of code changes

### Implementation for User Story 4

- [X] T030 [US4] Create READONLY.md template with variant info placeholders in cli/src/templates/READONLY.md
- [X] T031 [P] [US4] Create .ai-ignore template in cli/src/templates/ai-ignore
- [X] T032 [US4] Generate READONLY.md with variant info during install in cli/src/commands/init.ts
- [X] T033 [US4] Copy .ai-ignore to vendor directories during install in cli/src/commands/init.ts
- [X] T034 [US4] Create variant-features.json template per variant in cli/src/templates/variant-features/
- [X] T035 [US4] Copy variant-features.json to vendor during install in cli/src/commands/init.ts
- [X] T036 [US4] Add AI protection guidance to generated Copilot instructions in cli/src/templates/copilot-instructions.md

**Checkpoint**: Vendor directories have all AI protection markers; Copilot instructions include variant-aware guidance ✓

---

## Phase 5: User Story 2 - Install on Legacy Node 16 Project (Priority: P2)

**Goal**: Auto-detect Node 16 and install legacy-16 variant with Playwright 1.49.x

**Independent Test**: Run installation on Node 16 → legacy-16 variant installed, tests run with Playwright 1.49

### Implementation for User Story 2

- [X] T037 [US2] Add Node 16 detection branch to variant selection in cli/src/utils/variant-detector.ts
- [X] T038 [US2] Create variant-features-legacy-16.json with feature availability in cli/src/templates/variant-features/legacy-16.json
- [X] T039 [US2] Ensure legacy-16 dist directory is included in package distribution in core/typescript/package.json
- [X] T040 [US2] Add LLM substitution guidance for legacy-16 in Copilot instructions in cli/src/templates/copilot-instructions.md

**Checkpoint**: Node 16 installation works - legacy-16 variant with Playwright 1.49.x ✓

---

## Phase 6: User Story 3 - Install on Legacy Node 14 Project (Priority: P3)

**Goal**: Auto-detect Node 14 and install legacy-14 variant with Playwright 1.33.x

**Independent Test**: Run installation on Node 14 → legacy-14 variant installed, basic tests pass

### Implementation for User Story 3

- [X] T041 [US3] Add Node 14 detection branch to variant selection in cli/src/utils/variant-detector.ts
- [X] T042 [US3] Create variant-features-legacy-14.json with feature availability and alternatives in cli/src/templates/variant-features/legacy-14.json
- [X] T043 [US3] Ensure legacy-14 dist directory is included in package distribution in core/typescript/package.json
- [X] T044 [US3] Add comprehensive LLM substitution guidance for legacy-14 features in cli/src/templates/copilot-instructions.md

**Checkpoint**: Node 14 installation works - legacy-14 variant with Playwright 1.33.x and clear feature limitations ✓

---

## Phase 7: User Story 5 - Override Variant Selection (Priority: P3)

**Goal**: Users can force a specific variant via --variant flag

**Independent Test**: Run `artk init --variant legacy-16` on Node 20 → legacy-16 installed despite detection

### Implementation for User Story 5

- [X] T045 [US5] Add --variant CLI option to init command in cli/src/commands/init.ts
- [X] T046 [US5] Validate --variant against valid variant IDs in cli/src/commands/init.ts
- [X] T047 [US5] Display available variants on invalid --variant input in cli/src/commands/init.ts
- [X] T048 [US5] Set overrideUsed: true in context.json when --variant used in cli/src/commands/init.ts
- [X] T049 [P] [US5] Add --variant option to bootstrap.sh in scripts/bootstrap.sh
- [X] T050 [P] [US5] Add --variant option to bootstrap.ps1 in scripts/bootstrap.ps1

**Checkpoint**: Manual variant override works via CLI and bootstrap scripts ✓

---

## Phase 8: User Story 6 - Upgrade Existing Installation (Priority: P2)

**Goal**: Upgrade command detects Node version change and migrates to appropriate variant

**Independent Test**: Install legacy-16, change to Node 20, run upgrade → modern variant installed, config preserved

### Implementation for User Story 6

- [X] T051 [US6] Update doctor command to detect variant mismatch in cli/src/commands/doctor.ts
- [X] T052 [US6] Update upgrade command to re-detect environment in cli/src/commands/upgrade.ts
- [X] T053 [US6] Implement variant migration (preserve config, replace vendor) in cli/src/commands/upgrade.ts
- [X] T054 [US6] Add previousVariant and upgradeHistory to context.json on upgrade in cli/src/commands/upgrade.ts
- [X] T055 [US6] Log variant migration to install.log in cli/src/commands/upgrade.ts

**Checkpoint**: Upgrade flow works - detects environment changes, migrates variant, preserves user config ✓

---

## Phase 9: Error Handling & Concurrency

**Purpose**: Implement rollback, lock file, and error handling per spec requirements

- [X] T056 Implement full rollback on partial installation failure in cli/src/utils/rollback.ts
- [X] T057 Integrate lock file acquisition at start of init command in cli/src/commands/init.ts
- [X] T058 Add lock file check and clear error message for concurrent installs in cli/src/commands/init.ts
- [X] T059 Ensure lock file released on success and failure (including rollback) in cli/src/commands/init.ts
- [X] T060 Add Node <14 version check with clear error message in cli/src/utils/variant-detector.ts
- [X] T061 Add missing variant build files check with error message in cli/src/commands/init.ts

**Checkpoint**: Error handling complete - rollback, locking, and clear error messages ✓

---

## Phase 10: CI/CD & Verification

**Purpose**: Create CI pipeline for multi-Node testing and variant verification

- [X] T062 Create build-variants.yml GitHub Actions workflow in .github/workflows/build-variants.yml
- [X] T063 Add test matrix for Node 14, 16, 18, 20, 22 in workflow
- [X] T064 [P] Create test-variants.sh script for local cross-version testing in core/typescript/scripts/test-variants.sh
- [X] T065 [P] Create Dockerfile for each Node version for local testing in core/typescript/docker/
- [X] T066 Run existing test suite on all 4 variants and verify ~2,100 tests pass

**Checkpoint**: CI/CD pipeline verifies all variants on all supported Node versions ✓

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and final quality improvements

- [X] T067 [P] Update CLAUDE.md with multi-variant build instructions
- [X] T068 [P] Update CLI --help text with variant options
- [X] T069 Validate quickstart.md examples work with variant system
- [X] T070 Performance test: verify all 4 variants build in under 5 minutes
- [X] T071 Performance test: verify installation completes in under 2 minutes
- [X] T072 Final review: ensure all functional requirements FR-001 through FR-028 are met
- [X] T073 Verify FR-004 build reproducibility: run build twice, compare dist directory hashes to confirm identical output

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - creates build configs
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1 - Modern)**: Depends on Phase 2 - MVP milestone
- **Phase 4 (US4 - AI Protection)**: Depends on Phase 2, can parallel with US1
- **Phase 5 (US2 - Legacy 16)**: Depends on Phase 2
- **Phase 6 (US3 - Legacy 14)**: Depends on Phase 2
- **Phase 7 (US5 - Override)**: Depends on Phase 3 (extends init command)
- **Phase 8 (US6 - Upgrade)**: Depends on Phase 3
- **Phase 9 (Error Handling)**: Can start after Phase 2, integrate into Phase 3+
- **Phase 10 (CI/CD)**: Can start after Phase 1 (build scripts ready)
- **Phase 11 (Polish)**: Depends on all user stories complete

### User Story Independence

| Story | Can Start After | Independent Of | Integrates With |
|-------|-----------------|----------------|-----------------|
| US1 (Modern) | Phase 2 | All | - |
| US4 (AI Protection) | Phase 2 | US2, US3, US5, US6 | US1 (same install flow) |
| US2 (Legacy 16) | Phase 2 | US3, US5, US6 | US1 detection logic |
| US3 (Legacy 14) | Phase 2 | US2, US5, US6 | US1 detection logic |
| US5 (Override) | Phase 3 | US2, US3, US6 | US1 init command |
| US6 (Upgrade) | Phase 3 | US2, US3, US5 | US1 context.json |

### Parallel Opportunities

Within Phase 1:
```
Task: T002 (tsconfig.legacy-16) || T003 (tsconfig.legacy-14) || T004 (package-legacy-16) || T005 (package-legacy-14)
Task: T007-T011 (autogen configs) - all parallel
Task: T012 (build-variants.sh) || T013 (build-variants.ps1)
```

Within Phase 3-4 (US1 + US4):
```
Task: T028 (bootstrap.sh) || T029 (bootstrap.ps1)
Task: T030 (READONLY.md) || T031 (.ai-ignore)
```

Cross-phase (if team allows):
```
Phase 10 CI/CD can start after Phase 1 completes (parallel with user story work)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Build infrastructure
2. Complete Phase 2: Detection utilities (BLOCKS everything)
3. Complete Phase 3: US1 - Modern project installation
4. Complete Phase 4: US4 - AI protection markers
5. **STOP and VALIDATE**: Modern ESM/CJS installation works with AI protection
6. Deploy CLI v1.0 with modern variant support

### Full Delivery

1. MVP (Phases 1-4) → Test on Node 18, 20, 22
2. Add Phase 5: US2 - Legacy 16 support → Test on Node 16
3. Add Phase 6: US3 - Legacy 14 support → Test on Node 14
4. Add Phase 7: US5 - Variant override → Test override scenarios
5. Add Phase 8: US6 - Upgrade flow → Test migration scenarios
6. Add Phase 9: Error handling hardening
7. Add Phase 10: CI/CD for all Node versions
8. Add Phase 11: Polish and verification

### Critical Path

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 7 (US5) → Phase 8 (US6)
                  ↘ Phase 4 (US4) (parallel with US1)
                  ↘ Phase 5 (US2) (after US1)
                  ↘ Phase 6 (US3) (after US1)
```

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps to spec.md user stories for traceability
- US1 and US4 are both P1 priority and should be MVP scope
- All existing ~2,100 tests must pass on all 4 variants (T066)
- Total tasks: 73
- Performance requirements: build <5 min, install <2 min
- Avoid modifying existing test files; variants should be transparent
