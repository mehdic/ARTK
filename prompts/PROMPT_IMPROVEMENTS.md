# Prompt Improvements - Identified During ITSS Pilot

**Date**: 2026-01-01
**Source**: ARTK Pilot Launch on IT Service Shop (ITSS)
**Reference**: specs/003-artk-pilot-launch/PILOT_RETROSPECTIVE.md

---

## Improvement 1: /init-playbook - Add Test Infrastructure Scaffolding

**File**: `artk.init.md`

**Current Behavior**: Creates config files only (artk.config.yml, playwright.config.ts)

**Proposed Enhancement**:
- Generate `tests/` directory structure
- Create sample test file (boot.spec.ts or equivalent)
- Generate tsconfig.json for TypeScript tests
- Create auth.setup.ts template if auth is configured

**Rationale**: Reduces manual setup steps documented in pilot Phase 14. Teams spent time creating these files manually.

---

## Improvement 2: /discover-foundation - Add Feature Flag Detection

**File**: `artk.discover.md`

**Current Behavior**: Detects routes, auth patterns, and UI components

**Proposed Enhancement**:
- Scan for feature flag patterns in source code:
  - `process.env.FEATURE_*`
  - LaunchDarkly SDK usage
  - Custom config toggles
  - React feature flag hooks
- Include detected flags in DISCOVERY.md output

**Rationale**: Feature flags (REQUEST_FEATURE, HR_MOVEMENT_FEATURE) were discovered manually during ITSS pilot. These significantly affect test flow.

---

## Improvement 3: /journey-implement - Generate Auth Setup Files

**File**: `artk.journey-implement.md`

**Current Behavior**: Generates only the test file (*.spec.ts)

**Proposed Enhancement**:
- Detect if `authenticatedPage` fixture is used
- If yes, generate `tests/auth.setup.ts` if not exists
- Include storage state path configuration

**Rationale**: Storage state generation is a critical dependency. Forgetting auth.setup.ts causes test failures.

---

## Improvement 4: /journey-propose - Respect Feature Flags

**File**: `artk.journey-propose.md`

**Current Behavior**: Proposes journeys for all discovered routes

**Proposed Enhancement**:
- Add `featureFlags[]` field to journey frontmatter schema
- Mark journeys requiring feature flags in proposals
- Add flag check in test preconditions

**Rationale**: Tests should skip gracefully when feature is disabled. Current workaround is manual test.skip() logic.

---

## Improvement 5: Add /journey-scaffold Command (proposed, not implemented)

**New File**: `artk.journey-scaffold.md`

**Proposed Command**:
```
/journey-scaffold
```

**Purpose**: Generate complete test infrastructure for a selected journey set

**Output**:
- package.json with @artk/core dependency
- playwright.config.ts with ARTK harness
- tsconfig.json for TypeScript
- artk.config.yml with detected settings
- tests/auth.setup.ts if auth configured
- Directory structure (tests/, .auth-states/)

**Rationale**: Bridges gap between MVP selection (Phase 12) and first implementation (Phase 14). Currently requires manual file creation.

---

## Implementation Priority

| Improvement | Priority | Effort | Impact |
|-------------|----------|--------|--------|
| /init-playbook scaffolding | HIGH | Medium | High |
| /journey-scaffold | HIGH | High | High |
| /discover-foundation flags | MEDIUM | Low | Medium |
| /journey-implement auth | MEDIUM | Low | Medium |
| /journey-propose flags | LOW | Low | Low |

---

## Tracking

These improvements should be considered for ARTK v1.1 or as separate enhancement specs.
