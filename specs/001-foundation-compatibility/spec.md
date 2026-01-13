# Feature Specification: Foundation Module System Compatibility

**Feature Branch**: `001-foundation-compatibility`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "create the full spec and implmentation plan for the complete solution; and include also an envirenment detection to know which one to use"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Environment Detection (Priority: P1)

When a developer runs the ARTK bootstrap or `/discover-foundation` command on a new project, the system automatically detects the project's module system (CommonJS or ESM), Node.js version, and TypeScript configuration. The system then generates foundation modules that are compatible with the detected environment without requiring any manual configuration or troubleshooting.

**Why this priority**: This is the foundational capability that prevents the 15-file-edit problem observed in the incident. Without automatic detection, all other compatibility features are reactive fixes rather than proactive solutions. This delivers immediate value by eliminating the most common installation failure mode.

**Independent Test**: Can be fully tested by running bootstrap on projects with different environments (Node 18 CommonJS, Node 20 ESM, TypeScript 5 CommonJS, etc.) and verifying that generated code compiles and runs without errors. Delivers immediate value by enabling successful first-run installations.

**Acceptance Scenarios**:

1. **Given** a project with Node 18.12.1 and no "type" field in package.json, **When** developer runs bootstrap, **Then** system detects CommonJS environment and generates modules without `import.meta.url` or ESM-only syntax
2. **Given** a project with Node 20.x and "type": "module" in package.json, **When** developer runs bootstrap, **Then** system detects ESM environment and generates modules using ESM syntax
3. **Given** a project with TypeScript 5.x and "module": "commonjs" in tsconfig.json, **When** developer runs bootstrap, **Then** system respects TypeScript module setting and generates compatible code
4. **Given** detection completes, **When** results are stored in `.artk/context.json`, **Then** subsequent commands reuse detection results without re-scanning
5. **Given** a project environment that cannot be reliably detected, **When** bootstrap runs, **Then** system falls back to safest option (CommonJS for Node < 20, ESM for Node >= 20) and warns user with instructions to override

---

### User Story 2 - Cross-Environment Compatibility Layer (Priority: P2)

Developers working on ARTK-enabled projects can run foundation modules and tests in any supported Node.js environment (18.0.0+) without encountering module system errors or import failures. The compatibility layer abstracts environment-specific APIs (like `__dirname` vs `import.meta.url`) so that foundation code works identically across CommonJS and ESM setups.

**Why this priority**: This enables the "write once, run anywhere" promise for ARTK foundation modules. While P1 prevents initial setup failures, this ensures ongoing compatibility as projects evolve or as team members work on different Node versions. This is the second-highest priority because it directly supports the P1 detection by providing the abstraction layer needed for dual-environment support.

**Independent Test**: Can be fully tested by running the same foundation test suite in both CommonJS and ESM environments and verifying identical behavior. Delivers value by eliminating environment-specific bugs and reducing maintenance burden.

**Acceptance Scenarios**:

1. **Given** foundation modules use the compatibility layer's `getDirname()` function, **When** code runs in CommonJS environment, **Then** it returns correct directory path using `__dirname`
2. **Given** foundation modules use the compatibility layer's `getDirname()` function, **When** code runs in ESM environment, **Then** it returns correct directory path using `import.meta.url` and `fileURLToPath`
3. **Given** foundation modules need to resolve project root, **When** using `resolveProjectRoot()`, **Then** it correctly resolves path in both module systems
4. **Given** foundation modules need dynamic imports, **When** using compatibility layer's `dynamicImport()`, **Then** it works in both CommonJS (using `require`) and ESM (using `import()`)
5. **Given** developers update Node.js from 18 to 20 and enable ESM, **When** running existing foundation tests, **Then** all tests pass without code changes

---

### User Story 3 - Pre-Generation Validation Gate (Priority: P3)

After generating foundation modules, the system automatically validates that generated code matches the detected environment, imports are correct, dependencies are compatible, and no environment-specific APIs are used incorrectly. If validation fails, the system reports specific issues with actionable error messages before the developer attempts to run tests.

**Why this priority**: This is the defensive layer that catches issues before they reach the user. While P1 and P2 should prevent most issues, this validation ensures quality and provides fast feedback when edge cases occur. It's P3 because the system should ideally never need this if P1/P2 work correctly, but it's valuable insurance.

**Independent Test**: Can be fully tested by intentionally misconfiguring the generator to create incompatible code and verifying that validation catches the issues before test execution. Delivers value by shortening the feedback loop from "test failure" to "generation warning."

**Acceptance Scenarios**:

1. **Given** foundation modules are generated with ESM syntax but environment is CommonJS, **When** validation runs, **Then** it detects incompatibility and reports specific files with `import.meta` usage
2. **Given** foundation modules contain relative imports with incorrect path depth, **When** validation runs, **Then** it detects broken imports and reports affected files
3. **Given** package.json contains ESM-only dependencies in a CommonJS project, **When** validation runs, **Then** it warns about incompatible dependencies (e.g., nanoid v5)
4. **Given** validation completes successfully, **When** developer runs foundation tests, **Then** tests execute without import or module system errors
5. **Given** validation detects issues, **When** reporting errors, **Then** each error includes file path, line number, issue description, and suggested fix

---

### User Story 4 - Dual Template System (Priority: P4)

ARTK maintains separate template sets optimized for CommonJS and ESM environments. When generating foundation modules, the system selects the appropriate template set based on detected environment, ensuring generated code follows best practices for that module system without compatibility hacks or abstraction overhead.

**Why this priority**: This is the "gold standard" solution that provides optimal code generation for each environment. It's P4 because the compatibility layer (P2) already enables dual-environment support, but this improves generated code quality by eliminating abstraction calls when not needed. This is valuable for long-term maintainability but not critical for initial deployment.

**Independent Test**: Can be fully tested by comparing generated code from CommonJS and ESM templates and verifying that each uses environment-native patterns. Delivers value by improving code readability and reducing runtime overhead.

**Acceptance Scenarios**:

1. **Given** environment is detected as CommonJS, **When** generating auth modules, **Then** system uses `templates/commonjs/auth/` templates with `__dirname` and `require`
2. **Given** environment is detected as ESM, **When** generating auth modules, **Then** system uses `templates/esm/auth/` templates with `import.meta.url` and `import`
3. **Given** a shared type definition exists, **When** generating modules, **Then** system uses `templates/shared/` for environment-agnostic code
4. **Given** templates are updated, **When** regenerating foundation, **Then** system uses updated templates for the detected environment
5. **Given** manual template override is specified in `.artk/context.json`, **When** generating modules, **Then** system respects override and uses specified template variant

---

### Edge Cases

- What happens when Node.js version is too old (< 18.0.0) to support either module system properly?
  - System detects unsupported version and fails fast with error message directing user to upgrade Node

- What happens when package.json and tsconfig.json have conflicting module system settings?
  - System prioritizes TypeScript config for `.ts` files, warns about mismatch, and generates code compatible with TypeScript setting

- What happens when a project uses a hybrid setup (both .js ESM and .ts CommonJS)?
  - System detects hybrid mode, generates foundation in TypeScript-compatible mode, and documents the configuration in `.artk/context.json`

- What happens when environment detection takes too long or hangs?
  - System times out detection after 5 seconds, falls back to safest default (CommonJS for Node < 20), and continues with warning

- What happens when a developer manually switches module systems after initial setup?
  - Foundation modules continue working via compatibility layer (P2), but developer can run bootstrap with `--force-detect` to regenerate with new environment settings

- What happens when dependencies conflict with detected module system (e.g., nanoid v5 in CommonJS)?
  - Validation (P3) detects the conflict and suggests compatible alternatives or configuration changes

- What happens when foundation modules are transferred to a different environment (e.g., CI/CD with different Node version)?
  - Compatibility layer ensures modules work in both environments; validation can optionally run in CI to verify compatibility

- What happens when local template overrides in `artk-e2e/templates/` are incomplete or have syntax errors?
  - System validates template files before generation; if local overrides are invalid, system warns user and falls back to bundled templates from @artk/core

- What happens if rollback itself fails (e.g., file permissions prevent deletion)?
  - System reports rollback failure with specific file errors, lists which files remain, and provides manual cleanup instructions

## Requirements *(mandatory)*

### Functional Requirements

#### Environment Detection (P1)

- **FR-001**: System MUST detect Node.js version from `process.version` before generating foundation modules
- **FR-002**: System MUST detect module system from package.json "type" field (absent/"commonjs" = CommonJS, "module" = ESM)
- **FR-003**: System MUST detect TypeScript module setting from tsconfig.json "compilerOptions.module" field
- **FR-004**: System MUST determine ESM compatibility based on Node version (18.0.0+ has basic ESM support, 20.0.0+ has full ESM support)
- **FR-005**: System MUST store detection results in `.artk/context.json` with fields: `moduleSystem`, `nodeVersion`, `tsModule`, `supportsImportMeta`
- **FR-006**: System MUST reuse cached detection results from `.artk/context.json` for subsequent commands unless `--force-detect` flag is provided
- **FR-007**: System MUST provide detection override mechanism via `.artk/context.json` manual edit for edge cases
- **FR-008**: System MUST warn users when detection confidence is low (conflicting signals) and document the chosen configuration
- **FR-009**: System MUST fail fast with actionable error message when Node version is below 18.0.0
- **FR-010**: System MUST detect hybrid module setups (mixed .js ESM and .ts CommonJS) and prioritize TypeScript configuration for generated code

#### Compatibility Layer (P2)

- **FR-011**: System MUST provide `@artk/core/compat` module with environment-agnostic utility functions
- **FR-012**: Compatibility module MUST export `getDirname()` function that returns current directory path in both CommonJS and ESM
- **FR-013**: Compatibility module MUST export `resolveProjectRoot()` function that resolves project root from any foundation module depth
- **FR-014**: Compatibility module MUST export `dynamicImport()` function that loads modules dynamically in both module systems
- **FR-015**: Compatibility layer MUST detect environment at runtime and call appropriate native API (`__dirname` for CommonJS, `import.meta.url` for ESM)
- **FR-016**: Compatibility layer MUST throw descriptive error if environment cannot be determined (neither `__dirname` nor `import.meta` available)
- **FR-017**: Generated foundation modules MUST use compatibility layer functions instead of direct `__dirname` or `import.meta.url` calls
- **FR-018**: Compatibility layer MUST have zero external dependencies to avoid version conflicts
- **FR-019**: Compatibility layer MUST be unit-tested in both CommonJS and ESM environments
- **FR-020**: Compatibility layer documentation MUST include examples for each supported environment

#### Validation Gate (P3)

- **FR-021**: System MUST validate generated foundation modules after generation and before test execution
- **FR-022**: Validation MUST check for environment-specific API usage (`import.meta`, `__dirname`) that violates detected environment
- **FR-023**: Validation MUST verify all import paths resolve correctly from each module location
- **FR-024**: Validation MUST detect ESM-only dependencies (like nanoid v5) in CommonJS environments
- **FR-025**: Validation MUST verify package.json dependencies match required module system compatibility
- **FR-026**: Validation MUST check that TypeScript configuration is compatible with generated module syntax
- **FR-027**: Validation MUST report failures with file path, line number, issue description, and suggested fix
- **FR-028**: Validation MUST have configurable strictness levels (error/warning/ignore for each rule type)
- **FR-029**: Validation MUST complete within 10 seconds or fail with timeout error
- **FR-030**: Validation MUST be skippable via `--skip-validation` flag for advanced users
- **FR-031**: Validation MUST persist results to `.artk/validation-results.json` with timestamp, status, rules checked, errors, warnings, and validatedFiles for audit trail and debugging
- **FR-032**: System MUST track all generated files during foundation generation for potential rollback
- **FR-033**: System MUST automatically rollback (delete) all generated files when validation fails with status "failed"
- **FR-034**: System MUST preserve `.artk/validation-results.json` during rollback to allow developers to diagnose failure causes
- **FR-035**: System MUST display rollback confirmation message listing removed files and location of preserved validation results

#### Dual Template System (P4)

- **FR-036**: System MUST bundle templates with @artk/core npm package in `node_modules/@artk/core/templates/` containing separate directories: `commonjs/`, `esm/`, `shared/`
- **FR-037**: System MUST support local template overrides in target project's `artk-e2e/templates/` directory that take precedence over bundled templates
- **FR-038**: System MUST resolve templates in this order: 1) `artk-e2e/templates/` (local overrides), 2) `node_modules/@artk/core/templates/` (bundled defaults)
- **FR-039**: System MUST select template directory based on detected module system before generation
- **FR-040**: CommonJS templates MUST use `require()`, `__dirname`, `.ts`/`.js` extensions without distinction
- **FR-041**: ESM templates MUST use `import`, `import.meta.url`, and explicit `.js` extensions for relative imports
- **FR-042**: Shared templates MUST contain only environment-agnostic code (types, interfaces, constants)
- **FR-043**: System MUST allow manual template variant override via `.artk/context.json` field: `templateVariant: "commonjs" | "esm"`
- **FR-044**: System MUST validate that selected template variant matches detected environment or warn if mismatched
- **FR-045**: System MUST provide migration script to convert existing foundation from one template variant to another
- **FR-046**: Template selection logic MUST be documented in generated `.artk/context.json` file including source location (bundled vs local override)
- **FR-047**: Both template variants MUST generate functionally identical foundation modules (same APIs, same behavior)

### Key Entities

- **Environment Context**: Represents detected project environment with attributes:
  - moduleSystem: "commonjs" | "esm"
  - nodeVersion: semantic version string (e.g., "18.12.1")
  - tsModule: TypeScript module setting from tsconfig (e.g., "commonjs", "esnext")
  - supportsImportMeta: boolean indicating if environment can use import.meta
  - templateVariant: which template set was used for generation
  - detectionTimestamp: when detection last ran
  - detectionConfidence: "high" | "medium" | "low" based on signal consistency

- **Validation Result**: Represents outcome of foundation validation, persisted to `.artk/validation-results.json` with attributes:
  - timestamp: when validation ran
  - status: "passed" | "failed" | "warnings"
  - rules: array of rule results (rule ID, pass/fail, affected files)
  - errors: array of critical issues that must be fixed
  - warnings: array of non-critical issues for developer awareness
  - executionTime: milliseconds taken to validate
  - validatedFiles: list of files checked during validation

- **Compatibility Shim**: Abstraction layer for environment-specific APIs with methods:
  - getDirname(): returns current directory path
  - resolveProjectRoot(): returns absolute path to project root
  - dynamicImport(specifier): loads module dynamically
  - getModuleSystem(): returns current runtime module system
  - isESM(): boolean indicating if running in ESM context

## Clarifications

### Session 2026-01-13

- Q: Should validation results be persisted for debugging, auditing, or CI/CD pipeline integration? → A: Store in `.artk/validation-results.json` with timestamp, status, and detailed findings for audit trail
- Q: Where should the foundation generation templates be stored and maintained? → A: Both locations - ARTK Core has defaults, target project can override with local templates if present; AND templates bundled with @artk/core npm package
- Q: When validation or generation fails, what should the rollback behavior be? → A: Automatic rollback on validation failure - generated files removed, but `.artk/validation-results.json` preserved for debugging

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can successfully run ARTK bootstrap on any Node 18+ project without encountering module system errors in 95% of cases
- **SC-002**: Foundation module generation completes in under 30 seconds including environment detection and validation
- **SC-003**: Zero manual file edits required to fix module system compatibility issues after bootstrap (down from 15 average edits in current state)
- **SC-004**: Foundation test suite passes in both CommonJS (Node 18) and ESM (Node 20+) environments without code changes
- **SC-005**: Validation gate catches 100% of module system mismatches before test execution (no false negatives)
- **SC-006**: Environment detection accuracy is 98% or higher (correct module system chosen for detected environment)
- **SC-007**: Compatibility layer adds less than 5% runtime overhead compared to native module system calls
- **SC-008**: New ARTK installations complete successfully on first attempt in 90% of cases (up from current ~60% estimated)
- **SC-009**: Support requests related to module system issues decrease by 80% within 2 weeks of deployment
- **SC-010**: Developers can switch between Node versions (18 vs 20+) without regenerating foundation modules

## Assumptions

1. **Node Version Range**: Projects will use Node.js 18.0.0 or higher (earlier versions lack stable ESM support)
2. **Standard Project Structure**: Projects follow conventional Node.js structure with package.json at root
3. **TypeScript Usage**: Projects using TypeScript have valid tsconfig.json in standard location
4. **File System Access**: Bootstrap process has read/write access to project directory and can create `.artk/` directory
5. **Package Manager**: npm is available and functional for dependency installation
6. **Network Access**: Not required for environment detection or validation (offline-safe)
7. **Monorepo Support**: Single-package projects are primary target; monorepo support is future enhancement
8. **Dependency Versions**: Generated code will specify minimum compatible versions (e.g., "nanoid": "^3.0.0" for CommonJS)
9. **Rollback Strategy**: If validation fails after generation, system automatically removes all generated files while preserving `.artk/validation-results.json` for debugging
10. **Documentation Availability**: Developers have access to CLAUDE.md and generated README.md for troubleshooting

## Dependencies

1. **ARTK Core Library**: Foundation generation relies on `@artk/core` structure and exports; templates bundled in npm package at `node_modules/@artk/core/templates/`
2. **Playwright Version**: Foundation modules must be compatible with Playwright 1.57.0+ API
3. **TypeScript Compiler**: Validation may invoke `tsc --noEmit` to check generated code compilation
4. **Existing Bootstrap Script**: Environment detection integrates with current `scripts/bootstrap.sh` and `scripts/bootstrap.ps1`
5. **Template System**: Foundation templates bundled with @artk/core; target projects can optionally create `artk-e2e/templates/` for local overrides (separate from `.specify/templates/` for spec/plan templates)
6. **Context Storage**: Relies on `.artk/context.json` format established in earlier ARTK versions

## Out of Scope

1. **Automatic Module System Migration**: Converting existing projects from CommonJS to ESM (or vice versa) is user responsibility
2. **Runtime Module System Switching**: Dynamically changing module system during test execution is not supported
3. **Browser Environment**: Compatibility layer targets Node.js only; browser compatibility is separate concern
4. **Webpack/Bundler Configuration**: Generated code assumes native Node.js module resolution; bundler configs are user responsibility
5. **Monorepo Workspaces**: Detection and generation for multi-package monorepos requires separate feature
6. **Legacy Node Versions**: Node.js versions below 18.0.0 are explicitly unsupported
7. **Third-Party Test Runners**: Compatibility validated only with Playwright's test runner (not Jest, Mocha, etc.)
8. **Custom Module Loaders**: Projects using custom ESM loaders or require hooks may need manual configuration
