# Tasks: Foundation Module System Compatibility

**Input**: Design documents from `/specs/001-foundation-compatibility/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests are included (vitest for @artk/core modules). Integration tests will validate cross-environment compatibility.

**Organization**: Tasks are grouped by user story (P1-P4) to enable independent implementation and testing of each priority level.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with core package at `core/typescript/`:
- TypeScript source: `core/typescript/src/`
- Unit tests: `core/typescript/tests/`
- Templates: `core/typescript/templates/`
- Bootstrap scripts: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [x] T001 Install `strip-json-comments@^5.0.3` dependency in core/typescript/package.json
- [x] T002 [P] Create directory structure: core/typescript/detection/, core/typescript/compat/, core/typescript/validation/
- [x] T003 [P] Create test directory structure: core/typescript/tests/detection/, core/typescript/tests/compat/, core/typescript/tests/validation/
- [x] T004 [P] Create template directory structure: core/typescript/templates/commonjs/, core/typescript/templates/esm/, core/typescript/templates/shared/
- [x] T005 Update core/typescript/package.json "files" array to include ["dist", "templates"]
- [x] T006 [P] Add package.json "exports" field with template access: "./templates/*": "./templates/*"

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and schemas that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create EnvironmentContext interface in core/typescript/types/environment-context.ts matching contracts/environment-context.schema.json
- [x] T008 [P] Create ValidationResult interfaces in core/typescript/types/validation-result.ts matching contracts/validation-result.schema.json
- [x] T009 [P] Create Zod schemas for EnvironmentContext in core/typescript/schemas/environment-context.schema.ts
- [x] T010 [P] Create Zod schemas for ValidationResult in core/typescript/schemas/validation-result.schema.ts
- [x] T011 Update core/typescript/types/index.ts to export types and schemas (updated existing module)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Environment Detection (Priority: P1) 🎯 MVP

**Goal**: Detect Node version, module system (CommonJS/ESM), and TypeScript config before generation to select appropriate templates

**Independent Test**: Run detection on test projects with different environments (Node 18 CommonJS, Node 20 ESM) and verify correct moduleSystem detected in < 5 seconds

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Unit test for node-version parsing in core/typescript/tests/detection/node-version.test.ts (18 tests)
- [x] T013 [P] [US1] Unit test for package.json module detection in core/typescript/tests/detection/module-system.test.ts (14 tests)
- [x] T014 [P] [US1] Unit test for tsconfig.json parsing in core/typescript/tests/detection/typescript-config.test.ts (18 tests)
- [x] T015 [P] [US1] Unit test for confidence scoring in core/typescript/tests/detection/confidence.test.ts (12 tests)
- [x] T016 [US1] Integration test for full detection workflow in core/typescript/tests/detection/env-detection.test.ts (13 tests)

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement getNodeVersion() in core/typescript/detection/env/node-version.ts (parse process.version, FR-001)
- [x] T018 [P] [US1] Implement detectModuleSystem() in core/typescript/detection/env/module-system.ts (parse package.json "type" field, FR-002)
- [x] T019 [P] [US1] Implement detectTypeScriptModule() in core/typescript/detection/env/typescript-config.ts (use strip-json-comments, parse tsconfig.json, FR-003)
- [x] T020 [US1] Implement determineESMCompatibility() in core/typescript/detection/env/node-version.ts (check Node >= 18 for basic ESM, >= 20 for full ESM, FR-004)
- [x] T021 [US1] Implement calculateConfidence() in core/typescript/detection/env/confidence.ts (high/medium/low based on signal consistency, FR-008)
- [x] T022 [US1] Implement detectEnvironment() main function in core/typescript/detection/env/index.ts (orchestrates all detection, returns EnvironmentContext)
- [x] T023 [US1] Add timeout handling (5 second limit) in core/typescript/detection/env/index.ts (FR-094 timeout requirement, Edge Case)
- [x] T024 [US1] Add fallback logic for conflicting signals in core/typescript/detection/env/index.ts (prioritize TypeScript config for .ts files, Edge Case)
- [x] T025 [US1] Add Node version validation (fail fast if < 18.0.0) in core/typescript/detection/env/node-version.ts (FR-009)
- [x] T026 [US1] Implement caching logic: write EnvironmentContext to .artk/context.json in core/typescript/detection/env/index.ts (FR-005, FR-006)
- [x] T027 [US1] Add --force-detect flag support to bypass cache in core/typescript/detection/env/index.ts (FR-006)
- [x] T028 [US1] Export all detection functions from core/typescript/detection/env/index.ts

**Checkpoint**: At this point, environment detection should be fully functional, tested, and usable by bootstrap scripts

---

## Phase 4: User Story 2 - Cross-Environment Compatibility Layer (Priority: P2)

**Goal**: Provide runtime abstraction for __dirname vs import.meta.url so foundation code runs identically in CommonJS and ESM

**Independent Test**: Run same foundation test suite in both Node 18 (CommonJS) and Node 20+ (ESM) and verify identical behavior with < 5% overhead

### Tests for User Story 2

- [x] T029 [P] [US2] Unit test for getDirname() in CommonJS environment in core/typescript/tests/compat/dirname.test.ts (combined with ESM tests)
- [x] T030 [P] [US2] Unit test for getDirname() in ESM environment in core/typescript/tests/compat/dirname.test.ts (combined with CJS tests)
- [x] T031 [P] [US2] Unit test for resolveProjectRoot() in core/typescript/tests/compat/project-root.test.ts
- [x] T032 [P] [US2] Unit test for dynamicImport() in core/typescript/tests/compat/dynamic-import.test.ts
- [x] T033 [P] [US2] Unit test for getModuleSystem() in core/typescript/tests/compat/detect-env.test.ts
- [x] T034 [US2] Integration test for full compat layer in both environments in core/typescript/tests/compat/index.test.ts

### Implementation for User Story 2

- [x] T035 [P] [US2] Implement getModuleSystem() in core/typescript/compat/detect-env.ts (check __dirname vs import.meta, FR-015)
- [x] T036 [P] [US2] Implement isESM() helper in core/typescript/compat/detect-env.ts (convenience wrapper)
- [x] T037 [US2] Implement getDirname() in core/typescript/compat/dirname.ts (Node 20.11+ import.meta.dirname, Node 18+ fileURLToPath, CommonJS __dirname, FR-012)
- [x] T038 [US2] Add error handling to getDirname() for unsupported environments in core/typescript/compat/dirname.ts (FR-016)
- [x] T039 [US2] Implement resolveProjectRoot() in core/typescript/compat/project-root.ts (walk up directories finding package.json, FR-013)
- [x] T040 [US2] Implement dynamicImport() in core/typescript/compat/dynamic-import.ts (try import(), fallback to require(), FR-014)
- [x] T041 [US2] Add result caching for getModuleSystem() in core/typescript/compat/detect-env.ts (performance optimization)
- [x] T042 [US2] Export all compat functions from core/typescript/compat/index.ts (FR-011, FR-018 zero dependencies)
- [x] T043 [US2] Add JSDoc documentation with examples to all compat functions in core/typescript/compat/index.ts (FR-020)
- [x] T044 [US2] Update existing foundation modules to use compat layer: N/A - auth modules already environment-agnostic (no __dirname usage)
- [x] T045 [US2] Update existing foundation modules to use compat layer: N/A - config modules already environment-agnostic (no import.meta.url usage)

**Checkpoint**: At this point, compat layer should work in both CommonJS and ESM, foundation modules should use it

---

## Phase 5: User Story 3 - Pre-Generation Validation Gate (Priority: P3)

**Goal**: Validate generated code matches detected environment, auto-rollback on failure to prevent "15-file fix" problem

**Independent Test**: Intentionally generate incompatible code (ESM syntax in CommonJS env), verify validation catches it before test execution, rollback succeeds, validation-results.json preserved

### Tests for User Story 3

- [ ] T046 [P] [US3] Unit test for import-meta-usage rule in core/typescript/tests/validation/rules/import-meta-usage.test.ts
- [ ] T047 [P] [US3] Unit test for dirname-usage rule in core/typescript/tests/validation/rules/dirname-usage.test.ts
- [ ] T048 [P] [US3] Unit test for import-paths rule in core/typescript/tests/validation/rules/import-paths.test.ts
- [ ] T049 [P] [US3] Unit test for dependency-compat rule in core/typescript/tests/validation/rules/dependency-compat.test.ts
- [ ] T050 [P] [US3] Unit test for rollback transaction in core/typescript/tests/validation/rollback.test.ts
- [ ] T051 [US3] Integration test for validation + rollback workflow in core/typescript/tests/validation/runner.test.ts

### Implementation for User Story 3

- [ ] T052 [P] [US3] Create ValidationRule interface in core/typescript/src/validation/types.ts
- [ ] T053 [P] [US3] Implement import-meta-usage rule (regex check) in core/typescript/src/validation/rules/import-meta-usage.ts (FR-022)
- [ ] T054 [P] [US3] Implement dirname-usage rule (regex check) in core/typescript/src/validation/rules/dirname-usage.ts (FR-022)
- [ ] T055 [P] [US3] Implement import-paths rule (resolve check) in core/typescript/src/validation/rules/import-paths.ts (FR-023)
- [ ] T056 [P] [US3] Implement dependency-compat rule (package.json check) in core/typescript/src/validation/rules/dependency-compat.ts (FR-024, FR-025)
- [ ] T057 [US3] Implement ValidationRunner in core/typescript/src/validation/runner.ts (orchestrates all rules, FR-021)
- [ ] T058 [US3] Add 10-second timeout to validation in core/typescript/src/validation/runner.ts (FR-029)
- [ ] T059 [US3] Implement file tracking during generation in core/typescript/src/validation/runner.ts (track all generated files, FR-032)
- [ ] T060 [US3] Implement rollback transaction logic in core/typescript/src/validation/rollback.ts (write-to-temp-then-rename pattern, FR-033)
- [ ] T061 [US3] Add .artk/validation-results.json persistence in core/typescript/src/validation/runner.ts (preserve during rollback, FR-031, FR-034)
- [ ] T062 [US3] Add rollback confirmation message with file list in core/typescript/src/validation/rollback.ts (FR-035)
- [ ] T063 [US3] Add --skip-validation flag support in core/typescript/src/validation/runner.ts (FR-030)
- [ ] T064 [US3] Add configurable strictness levels (error/warning/ignore) in core/typescript/src/validation/runner.ts (FR-028)
- [ ] T065 [US3] Add detailed error reporting (file, line, message, suggestedFix) in core/typescript/src/validation/runner.ts (FR-027)
- [ ] T066 [US3] Export validateFoundation() from core/typescript/src/validation/index.ts

**Checkpoint**: At this point, validation gate should catch all module system mismatches, rollback should work, validation history should be preserved

---

## Phase 6: User Story 4 - Dual Template System (Priority: P4)

**Goal**: Maintain separate optimized templates for CommonJS and ESM, support local overrides in target projects

**Independent Test**: Compare generated code from CommonJS and ESM templates, verify each uses environment-native patterns, test local override precedence

### Tests for User Story 4

- [ ] T067 [P] [US4] Unit test for template resolution (bundled vs local) in core/typescript/tests/templates/resolution.test.ts
- [ ] T068 [P] [US4] Integration test for CommonJS template generation in core/typescript/tests/templates/commonjs.test.ts
- [ ] T069 [P] [US4] Integration test for ESM template generation in core/typescript/tests/templates/esm.test.ts
- [ ] T070 [US4] Integration test for local override precedence in core/typescript/tests/templates/override.test.ts

### Implementation for User Story 4

- [ ] T071 [P] [US4] Create CommonJS auth/login template in core/typescript/templates/commonjs/auth/login.ts (use __dirname, require(), FR-034, FR-036)
- [ ] T072 [P] [US4] Create CommonJS config/env template in core/typescript/templates/commonjs/config/env.ts (use __dirname, require(), FR-034, FR-036)
- [ ] T073 [P] [US4] Create CommonJS navigation/nav template in core/typescript/templates/commonjs/navigation/nav.ts (use __dirname, require(), FR-034, FR-036)
- [ ] T074 [P] [US4] Create ESM auth/login template in core/typescript/templates/esm/auth/login.ts (use import.meta.url, import, .js extensions, FR-035, FR-037)
- [ ] T075 [P] [US4] Create ESM config/env template in core/typescript/templates/esm/config/env.ts (use import.meta.url, import, .js extensions, FR-035, FR-037)
- [ ] T076 [P] [US4] Create ESM navigation/nav template in core/typescript/templates/esm/navigation/nav.ts (use import.meta.url, import, .js extensions, FR-035, FR-037)
- [ ] T077 [P] [US4] Create shared types template in core/typescript/templates/shared/types/index.ts (environment-agnostic, FR-038)
- [ ] T078 [US4] Implement resolveTemplate() in core/typescript/src/templates/resolver.ts (check local override → bundled, FR-034, FR-035)
- [ ] T079 [US4] Add template validation for local overrides in core/typescript/src/templates/resolver.ts (Edge Case: incomplete/syntax errors)
- [ ] T080 [US4] Implement selectTemplateVariant() in core/typescript/src/templates/selector.ts (based on moduleSystem, FR-036)
- [ ] T081 [US4] Add manual override support from .artk/context.json in core/typescript/src/templates/selector.ts (templateVariant field, FR-039)
- [ ] T082 [US4] Add template variant validation (warn if mismatch) in core/typescript/src/templates/selector.ts (FR-040)
- [ ] T083 [US4] Document template selection in .artk/context.json (templateVariant, templateSource, FR-042)
- [ ] T084 [US4] Implement template migration script in scripts/migrate-template-variant.sh (convert CommonJS ↔ ESM, FR-041)
- [ ] T085 [US4] Export template functions from core/typescript/src/templates/index.ts

**Checkpoint**: All user stories should now be independently functional, templates optimized per environment, local overrides supported

---

## Phase 7: Bootstrap Integration

**Purpose**: Integrate all user stories into bootstrap scripts

- [ ] T086 Create detection script for Unix in scripts/lib/detect-environment.sh (calls @artk/core/detection, outputs JSON)
- [ ] T087 [P] Create detection script for Windows in scripts/lib/detect-environment.ps1 (calls @artk/core/detection, outputs JSON)
- [ ] T088 Create validation script for Unix in scripts/validation/validate-foundation.sh (calls @artk/core/validation, parses result)
- [ ] T089 [P] Create validation script for Windows in scripts/validation/validate-foundation.ps1 (calls @artk/core/validation, parses result)
- [ ] T090 Update scripts/bootstrap.sh to call detect-environment.sh before generation (US1 integration)
- [ ] T091 Update scripts/bootstrap.ps1 to call detect-environment.ps1 before generation (US1 integration)
- [ ] T092 Update scripts/bootstrap.sh to use template resolver based on detection (US4 integration)
- [ ] T093 Update scripts/bootstrap.ps1 to use template resolver based on detection (US4 integration)
- [ ] T094 Update scripts/bootstrap.sh to call validate-foundation.sh after generation (US3 integration)
- [ ] T095 Update scripts/bootstrap.ps1 to call validate-foundation.ps1 after generation (US3 integration)
- [ ] T096 Add --force-detect flag handling in scripts/bootstrap.sh and bootstrap.ps1 (US1 feature)
- [ ] T097 [P] Add --skip-validation flag handling in scripts/bootstrap.sh and bootstrap.ps1 (US3 feature)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T098 [P] Update CLAUDE.md with module system compatibility documentation
- [ ] T099 [P] Create troubleshooting guide in specs/001-foundation-compatibility/docs/troubleshooting.md
- [ ] T100 [P] Add performance benchmarks to verify < 5% overhead (SC-007) in core/typescript/tests/benchmarks/
- [ ] T101 Run full test suite in both CommonJS (Node 18) and ESM (Node 20+) environments
- [ ] T102 Verify detection accuracy on 10 test projects (Node 18 CJS, Node 20 ESM, hybrid setups) → target 98% accuracy (SC-006)
- [ ] T103 Verify zero manual file edits required after bootstrap (SC-003)
- [ ] T104 Measure total bootstrap time (detection + generation + validation) → target < 30 seconds (SC-002)
- [ ] T105 [P] Add example projects to specs/001-foundation-compatibility/examples/ (CommonJS and ESM samples)
- [ ] T106 Code cleanup: Remove deprecated __dirname usage from all @artk/core modules
- [ ] T107 Security review: Verify no secrets in detection logic, .artk/ files have correct permissions
- [ ] T108 Run quickstart.md validation: Follow all workflows, verify commands work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Detection is prerequisite for other stories
- **User Story 2 (Phase 4)**: Depends on Foundational - Can start in parallel with US1 (different modules)
- **User Story 3 (Phase 5)**: Depends on US1 (needs EnvironmentContext) - Can start in parallel with US2
- **User Story 4 (Phase 6)**: Depends on US1 (needs moduleSystem detection) - Can start in parallel with US2/US3
- **Bootstrap Integration (Phase 7)**: Depends on ALL user stories (US1, US2, US3, US4)
- **Polish (Phase 8)**: Depends on Bootstrap Integration

### User Story Dependencies

- **User Story 1 (P1 - Detection)**: Can start after Foundational - No dependencies on other stories ✅ MVP
- **User Story 2 (P2 - Compat Layer)**: Can start after Foundational - Completely independent from US1
- **User Story 3 (P3 - Validation)**: Depends on US1 (needs EnvironmentContext type) - Independent from US2/US4
- **User Story 4 (P4 - Templates)**: Depends on US1 (needs moduleSystem) - Independent from US2/US3

### Critical Path

```
Setup (T001-T006)
  ↓
Foundational (T007-T011) [BLOCKS ALL]
  ↓
[US1 Detection (T012-T028)] ← START HERE for MVP
  ↓
[US2 Compat (T029-T045)] [P] | [US3 Validation (T046-T066)] | [US4 Templates (T067-T085)]
  ↓
Bootstrap Integration (T086-T097)
  ↓
Polish (T098-T108)
```

### Within Each User Story

- **US1**: Tests → Node version → Module system → TypeScript config → Confidence → Main orchestration → Caching
- **US2**: Tests → Runtime detection → getDirname → resolveProjectRoot → dynamicImport → Update existing code
- **US3**: Tests → Rules (all parallel) → Runner → Rollback → Persistence → Flags
- **US4**: Tests → Templates (all parallel) → Resolver → Selector → Migration script

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T002 (detection dir) + T003 (test dir) + T004 (template dir) can run together
- T006 (package.json exports) after T005 (files array)

**Within Foundational (Phase 2)**:
- T008 (ValidationResult types) + T009 (EnvironmentContext schema) + T010 (ValidationResult schema) can run together

**Within US1 (Detection)**:
- T012 + T013 + T014 + T015 (all test files) can run together
- T017 + T018 + T019 (node-version, module-system, typescript-config) can run together

**Within US2 (Compat Layer)**:
- T029 + T030 + T031 + T032 + T033 (all test files) can run together
- T035 + T036 + T037 (detect-env files) can run together
- T044 + T045 (updating existing modules) can run together

**Within US3 (Validation)**:
- T046 + T047 + T048 + T049 (all rule tests) can run together
- T053 + T054 + T055 + T056 (all rule implementations) can run together

**Within US4 (Templates)**:
- T067 + T068 + T069 + T070 (all test files) can run together
- T071 + T072 + T073 (CommonJS templates) can run together
- T074 + T075 + T076 (ESM templates) can run together
- T077 (shared types) independent

**Across User Stories (after Foundational complete)**:
- US2 (T029-T045) fully independent from US1
- US3 (T046-T066) and US4 (T067-T085) can start once US1 (T012-T028) provides EnvironmentContext

**Within Bootstrap Integration**:
- T086 + T087 (detection scripts) can run together
- T088 + T089 (validation scripts) can run together
- T090 + T091 (bootstrap detection integration) can run together after T086-T087
- T092 + T093 (bootstrap template integration) can run together
- T094 + T095 (bootstrap validation integration) can run together after T088-T089
- T096 + T097 (flag handling) can run together

**Within Polish**:
- T098 + T099 + T100 + T105 (documentation/benchmarks) can run together
- T101-T104 (validation tests) sequential
- T106 + T107 (cleanup/security) can run together

---

## Parallel Example: User Story 1 (Detection)

```bash
# Launch all test files together:
Task: "Unit test for node-version parsing in core/typescript/tests/detection/node-version.test.ts"
Task: "Unit test for package.json module detection in core/typescript/tests/detection/module-system.test.ts"
Task: "Unit test for tsconfig.json parsing in core/typescript/tests/detection/typescript-config.test.ts"
Task: "Unit test for confidence scoring in core/typescript/tests/detection/confidence.test.ts"

# Launch all core detection modules together:
Task: "Implement getNodeVersion() in core/typescript/src/detection/node-version.ts"
Task: "Implement detectModuleSystem() in core/typescript/src/detection/module-system.ts"
Task: "Implement detectTypeScriptModule() in core/typescript/src/detection/typescript-config.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006) → ~30 minutes
2. Complete Phase 2: Foundational (T007-T011) → ~1 hour
3. Complete Phase 3: User Story 1 Detection (T012-T028) → ~2-3 hours
4. **STOP and VALIDATE**: Test detection on real projects (ITSS), verify < 5 second detection
5. Minimal bootstrap integration: Just call detection, store result
6. **MVP COMPLETE**: Environment detection working end-to-end

### Incremental Delivery

1. MVP (US1 Detection) → Can detect environment, cache results → **SHIP IT** ✅
2. Add US2 (Compat Layer) → Foundation modules work in both environments → **SHIP IT** ✅
3. Add US3 (Validation) → Auto-rollback prevents broken state → **SHIP IT** ✅
4. Add US4 (Templates) → Optimized code generation per environment → **SHIP IT** ✅
5. Each addition provides value without breaking previous features

### Parallel Team Strategy

With 3 developers:

1. All: Complete Setup + Foundational together (~1.5 hours)
2. Once Foundational done:
   - Developer A: User Story 1 (Detection) - CRITICAL PATH
   - Developer B: User Story 2 (Compat Layer) - Independent
   - Developer C: User Story 4 (Templates) - Waits for US1 EnvironmentContext
3. Developer C switches to US3 (Validation) once US1 provides EnvironmentContext
4. All converge on Bootstrap Integration once their stories complete

**Estimated Timeline**:
- Setup + Foundational: 1.5 hours (all devs)
- US1: 2-3 hours (Dev A)
- US2: 8-10 hours (Dev B)
- US3: 6-8 hours (Dev C, starts after US1 done at ~3 hours)
- US4: 4-6 hours (Dev C, after US3 if time, or Dev A after US1)
- Bootstrap Integration: 2-3 hours (Dev A leads, all help)
- Polish: 2-3 hours (all devs)

**Total Parallel**: ~13-16 hours (vs 23-27 hours sequential)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are written first (TDD approach) to ensure they fail before implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- FR references map to Functional Requirements in spec.md
- Edge Case references map to Edge Cases section in spec.md
- Success Criteria (SC) references map to success criteria in spec.md
