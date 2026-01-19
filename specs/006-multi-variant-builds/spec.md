# Feature Specification: ARTK Multi-Variant Build System

**Feature Branch**: `006-multi-variant-builds`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "ARTK Multi-Variant Build System for Node.js version compatibility"

---

## Reference Document

**IMPORTANT FOR IMPLEMENTERS**: Before creating an implementation plan, you MUST review the comprehensive implementation plan at:

> **`research/2026-01-19_multi-variant-implementation-plan.md`**

This reference document contains:
- Detailed code examples for all build configurations
- File structures and directory layouts
- Bootstrap script implementation details
- CLI update specifications
- CI/CD pipeline configurations
- Testing matrix and Docker configurations

**This specification defines the WHAT and WHY. The reference document provides the HOW with implementation details that should be incorporated into any planning phase.**

---

## Clarifications

### Session 2026-01-19

- Q: What recovery behavior for partial installation failure? → A: Full rollback to clean pre-install state (remove all ARTK files)
- Q: How to handle legacy variant feature limitations? → A: Provide LLM instructions for variant-specific features; LLM should auto-substitute unsupported features with equivalent supported alternatives
- Q: Format for LLM feature compatibility instructions? → A: Both prose summary in Copilot instructions AND structured JSON/YAML file for programmatic access
- Q: Should installation emit logs for troubleshooting? → A: Verbose logging to `.artk/install.log` file
- Q: Handle concurrent installation processes? → A: Lock file (`.artk/install.lock`) - second process fails with clear message

---

## Problem Statement

ARTK currently ships a single build variant that attempts to work across all Node.js versions (14-22) and module systems (ESM/CommonJS). This "one size fits all" approach causes:

1. **Runtime compatibility failures**: Users encounter `ERR_REQUIRE_ESM` errors, import resolution failures, and module system conflicts
2. **AI agent code modifications**: When compatibility issues occur, AI assistants (GitHub Copilot, Claude) modify the vendor packages to "fix" issues, breaking immutability guarantees
3. **Cascading failures**: Each manual fix causes new issues, creating a "whack-a-mole" debugging experience
4. **Enterprise adoption barriers**: Organizations with legacy Node.js environments cannot adopt ARTK

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install ARTK on Modern Project (Priority: P1)

A developer installs ARTK on a new project using Node.js 20 with ESM modules. The installation automatically detects the environment and installs the correct variant without any manual configuration.

**Why this priority**: This is the most common scenario - new projects on modern Node.js. If this doesn't work seamlessly, adoption fails.

**Independent Test**: Can be fully tested by running the installation command on a Node 20 ESM project and verifying the installed variant works without modifications.

**Acceptance Scenarios**:

1. **Given** a project with Node.js 20 and `"type": "module"` in package.json, **When** the user runs the installation command, **Then** the modern-esm variant is installed and all imports work without errors
2. **Given** a project with Node.js 18 and no `"type"` field in package.json, **When** the user runs the installation command, **Then** the modern-cjs variant is installed with CommonJS exports
3. **Given** a successful installation, **When** the user runs their first test, **Then** the test executes without module resolution errors

---

### User Story 2 - Install ARTK on Legacy Node 16 Project (Priority: P2)

A developer at an enterprise organization needs to install ARTK on a project locked to Node.js 16 due to infrastructure constraints. The system automatically provides a compatible variant with an older Playwright version.

**Why this priority**: Enterprise adoption requires supporting older Node.js versions. Node 16 is still common in corporate environments.

**Independent Test**: Can be fully tested by running the installation command on a Node 16 project and verifying tests run successfully.

**Acceptance Scenarios**:

1. **Given** a project running Node.js 16, **When** the user runs the installation command, **Then** the legacy-16 variant is installed with Playwright 1.49.x
2. **Given** a legacy-16 installation, **When** the user writes tests using ARTK fixtures, **Then** all core ARTK features work correctly
3. **Given** a legacy-16 installation, **When** the LLM generates tests, **Then** it uses only features available in Playwright 1.49.x or auto-substitutes with supported equivalents

---

### User Story 3 - Install ARTK on Legacy Node 14 Project (Priority: P3)

A developer needs to install ARTK on a very old project running Node.js 14 that cannot be upgraded. The system provides maximum backward compatibility while clearly communicating any feature limitations.

**Why this priority**: While less common, some legacy systems are locked to Node 14. Supporting this expands adoption to older enterprise environments.

**Independent Test**: Can be fully tested by running the installation command on a Node 14 project and verifying basic test execution works.

**Acceptance Scenarios**:

1. **Given** a project running Node.js 14, **When** the user runs the installation command, **Then** the legacy-14 variant is installed with Playwright 1.33.x
2. **Given** a legacy-14 installation, **When** the LLM attempts to use a feature not available in Playwright 1.33, **Then** the LLM auto-substitutes with an equivalent supported feature based on variant instructions
3. **Given** a legacy-14 installation, **When** running basic Playwright tests, **Then** core testing functionality works correctly

---

### User Story 4 - Prevent AI Agent Modifications (Priority: P1)

When an AI assistant (GitHub Copilot, Claude, etc.) encounters a compatibility error in an ARTK installation, it reads the immutability markers and does NOT modify vendor package files. Instead, it guides the user to reinstall with the correct variant.

**Why this priority**: Critical for system integrity. AI modifications to vendor code cause cascading failures and break the variant guarantee.

**Independent Test**: Can be tested by simulating an AI agent encountering an error in a vendor directory and verifying it respects the READONLY markers.

**Acceptance Scenarios**:

1. **Given** an installed ARTK with READONLY.md markers, **When** an AI assistant encounters an import error in vendor code, **Then** the AI does NOT modify any files in the vendor directory
2. **Given** an AI assistant reading a vendor directory, **When** it encounters the .ai-ignore file, **Then** it suggests re-running installation instead of patching code
3. **Given** a mismatch between Node version and installed variant, **When** an AI assistant is asked to fix it, **Then** it recommends reinstalling with the correct variant instead of code changes

---

### User Story 5 - Override Variant Selection (Priority: P3)

A developer needs to force a specific variant installation regardless of auto-detection (for testing, CI environments, or special requirements). The system provides a clear override mechanism.

**Why this priority**: Power users and CI systems need explicit control over variant selection.

**Independent Test**: Can be tested by running installation with a variant override flag on a Node 20 machine and verifying the specified legacy variant is installed.

**Acceptance Scenarios**:

1. **Given** a Node 20 environment, **When** the user runs installation with variant override for legacy-16, **Then** the legacy-16 variant is installed instead of modern
2. **Given** an invalid variant name, **When** the user attempts installation with that variant, **Then** the system displays available variants and exits with an error
3. **Given** a forced variant installation, **When** the user checks the context file, **Then** it shows the manually selected variant

---

### User Story 6 - Upgrade Existing Installation (Priority: P2)

A developer with an existing ARTK installation upgrades their Node.js version from 16 to 20. Running the upgrade command detects the environment change and installs the appropriate new variant.

**Why this priority**: Projects evolve and upgrade Node versions. The variant system must handle this gracefully.

**Independent Test**: Can be tested by installing legacy-16 variant, changing Node version, and running upgrade.

**Acceptance Scenarios**:

1. **Given** an existing legacy-16 installation on a project that upgraded to Node 20, **When** the user runs the upgrade command, **Then** the modern variant replaces the legacy variant
2. **Given** an upgrade scenario, **When** variant changes, **Then** user configuration and test files are preserved
3. **Given** an upgrade scenario, **When** the upgrade completes, **Then** the context file reflects the new variant information

---

### Edge Cases

- What happens when Node.js version is below 14? → System displays clear error: "Node.js 14+ required" and exits
- What happens when detection cannot determine module type? → System defaults to CommonJS variant for safety
- What happens when variant build files are missing? → System displays error directing user to build variants first
- What happens when both @artk/core and @artk/core-autogen need different variants? → Both packages MUST use the same variant - system enforces this
- What happens during partial installation failure? → System performs full rollback to clean pre-install state, removing all ARTK files to prevent partial/corrupt installations
- What happens when two installations run simultaneously? → Second process fails immediately with clear error message; lock file (`.artk/install.lock`) prevents concurrent modifications

---

## Requirements *(mandatory)*

### Functional Requirements

**Build System**

- **FR-001**: System MUST produce four distinct build variants: modern-esm, modern-cjs, legacy-16, and legacy-14
- **FR-002**: System MUST build all variants from the same source code without manual code modifications
- **FR-003**: Each variant MUST include both @artk/core and @artk/core-autogen packages with matching configurations
- **FR-004**: Build process MUST be reproducible - same source produces identical variants

**Variant Detection & Installation**

- **FR-005**: Installation MUST automatically detect the target project's Node.js version
- **FR-006**: Installation MUST automatically detect the target project's module system (ESM vs CommonJS)
- **FR-007**: System MUST select the appropriate variant based on detection results
- **FR-008**: System MUST support manual variant override via command-line option
- **FR-009**: System MUST store variant metadata in the project's context file

**Compatibility Matrix**

- **FR-010**: Modern variant MUST work with Node.js 18, 20, and 22
- **FR-011**: Legacy-16 variant MUST work with Node.js 16, 18, and 20
- **FR-012**: Legacy-14 variant MUST work with Node.js 14, 16, and 18
- **FR-013**: Each variant MUST use a compatible Playwright version (1.57.x, 1.49.x, 1.33.x respectively)

**AI Protection & LLM Guidance**

- **FR-014**: System MUST create READONLY.md marker files in vendor directories
- **FR-015**: System MUST create .ai-ignore files to signal AI agents not to modify vendor code
- **FR-016**: Marker files MUST include variant information and troubleshooting instructions
- **FR-017**: AI protection instructions MUST be included in generated Copilot instructions
- **FR-021**: System MUST provide feature compatibility instructions per variant in dual format: prose summary in Copilot instructions AND structured JSON/YAML file (e.g., `variant-features.json`) for programmatic LLM access
- **FR-022**: LLM instructions MUST include guidance to auto-substitute unsupported features with equivalent supported alternatives rather than failing
- **FR-023**: Structured feature file MUST list available/unavailable Playwright APIs per variant with suggested alternatives for unavailable features

**Concurrency Control**

- **FR-026**: Installation MUST acquire a lock file (`.artk/install.lock`) before making any changes
- **FR-027**: If lock file exists and is held by another process, installation MUST fail immediately with clear error message indicating another installation is in progress
- **FR-028**: Lock file MUST be released (deleted) upon installation completion or failure (including rollback scenarios)

**Observability**

- **FR-024**: Installation MUST emit verbose logs to `.artk/install.log` including: detected Node version, detected module system, selected variant, files copied, and any errors encountered
- **FR-025**: Log file MUST be appended (not overwritten) to preserve installation history for troubleshooting

**Upgrade & Migration**

- **FR-018**: Upgrade command MUST detect Node version changes and offer variant migration
- **FR-019**: System MUST preserve user configuration during variant changes
- **FR-020**: System MUST log variant changes to `.artk/install.log` for audit purposes

### Key Entities

- **Variant**: A pre-built distribution of ARTK packages targeting specific Node.js versions and module systems. Key attributes: ID (modern-esm, modern-cjs, legacy-16, legacy-14), Node range, Playwright version, module system
- **Context**: Installation metadata stored in `.artk/context.json`. Contains: variant ID, installation timestamp, Node version at install time, detected module system
- **Marker Files**: READONLY.md and .ai-ignore files that signal immutability to AI agents and human developers
- **Feature Compatibility File**: Structured JSON/YAML file (`variant-features.json`) listing available/unavailable Playwright APIs per variant with suggested alternatives. Used by LLMs for programmatic feature checking.
- **Install Log**: Append-only log file (`.artk/install.log`) recording all installation and upgrade operations with timestamps, detected environment, selected variant, and any errors for troubleshooting.
- **Lock File**: Temporary file (`.artk/install.lock`) that prevents concurrent installation processes. Created at start, deleted on completion/failure.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Installation succeeds on first attempt for 100% of supported Node.js versions (14, 16, 18, 20, 22) without manual intervention
- **SC-002**: Zero runtime module resolution errors (`ERR_REQUIRE_ESM`, `ERR_MODULE_NOT_FOUND`) when correct variant is installed
- **SC-003**: AI agents respect immutability markers in 100% of encounters (no vendor file modifications when markers present)
- **SC-004**: Variant detection correctly identifies Node version and module system in 100% of test cases
- **SC-005**: Build process produces all four variants in under 5 minutes on standard development hardware
- **SC-006**: All existing ARTK tests pass on all four variants
- **SC-007**: User can complete installation and run first test within 10 minutes on any supported Node version

---

## Assumptions

1. **Node.js versions**: Node 12 and earlier are explicitly not supported due to missing language features and Playwright incompatibility
2. **Module detection**: If package.json has `"type": "module"`, the project uses ESM; otherwise CommonJS is assumed
3. **Playwright versions**: Legacy variants use older Playwright versions which may lack some features - this is acceptable for compatibility
4. **Single variant per project**: A project uses exactly one variant - mixing variants is not supported
5. **AI agent behavior**: AI agents will read and respect file markers like READONLY.md and .ai-ignore

---

## Out of Scope

- Node.js 12 and earlier support
- Runtime variant switching (variant is fixed at install time)
- Automatic Node.js version upgrades
- Playwright feature polyfills for older versions
- Browser installation management per variant

---

## Dependencies

- TypeScript compiler for building variants
- Playwright packages at specific versions (1.57.x, 1.49.x, 1.33.x)
- Node.js version detection mechanism
- Existing ARTK CLI and bootstrap scripts
