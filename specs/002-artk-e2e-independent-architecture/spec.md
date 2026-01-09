# ARTK E2E Independent Architecture

**Spec ID:** 002-artk-e2e-independent-architecture
**Version:** 1.0.0
**Status:** Draft
**Created:** 2025-12-30
**Author:** Claude Code + User

---

## 1. Overview

### 1.1 Problem Statement

ARTK currently attempts to install `@artk/core` as a dependency in the target application's `package.json`. This causes:

1. **Dependency conflicts** - E2E testing deps (Playwright) conflict with app deps (React Native, private registries)
2. **Authentication failures** - Private registries (Font Awesome) block npm install
3. **Tight coupling** - E2E tests become entangled with application lifecycle
4. **Monorepo blindness** - Current approach doesn't understand that frontends may be submodules

### 1.2 Proposed Solution

Create ARTK E2E test suites as **independent, self-contained directories** at the project root level, completely isolated from application dependencies.

### 1.3 Goals

1. Zero dependency conflicts between E2E tests and application
2. Support monorepo structures with multiple frontends
3. Portable configuration (relative paths, shareable across team)
4. Self-contained test suite that can be owned by QA team
5. Clear separation: ARTK Core (library) vs ARTK Instance (per-project)

### 1.4 Non-Goals

1. Unit test integration (out of scope - different paradigm)
2. Visual regression testing (future enhancement)
3. API contract testing (separate tool)
4. Mobile native testing (Playwright limitation)

---

## Clarifications

### Session 2025-12-30

- Q: Should `.artk/context.json` be gitignored or committed? → A: Commit with relative paths only (enables team collaboration and CI without regeneration)
- Q: How should /init handle uninitialized git submodules? → A: Warn and continue (note uninitialized submodules, proceed with available paths)
- Q: What is the Windows platform support level? → A: Full support (test on Windows, block release on Windows failures)
- Q: How should auth states be organized for multiple targets? → A: Per-target subdirectories (`.auth-states/user-portal/`, `.auth-states/admin-portal/`)
- Q: What is the maximum number of frontend targets? → A: Up to 5 (hard limit for maintainability)

---

## 2. User Stories

### US-001: Initialize ARTK in Monorepo

**As a** developer with a monorepo containing multiple submodules
**I want to** run `/init` and have ARTK automatically discover my project structure
**So that** I can set up E2E testing without manual configuration

**Acceptance Criteria:**
- [ ] `/init` detects git root directory
- [ ] `/init` scans for frontend submodules using heuristics
- [ ] `/init` presents discovered frontends for user confirmation
- [ ] `/init` allows manual path override if detection fails
- [ ] `/init` creates `artk-e2e/` at project root
- [ ] `/init` generates `artk.config.yml` with relative paths
- [ ] `/init` saves context to `.artk/context.json` for other prompts

**Scenarios:**

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Single frontend | `project/frontend/` | Detected, confirmed, configured |
| Multiple frontends | `project/web/`, `project/admin/` | List shown, user selects targets |
| No frontend found | Empty project | Prompt for manual path |
| Frontend at root | `project/` (no submodules) | Detect, create `artk-e2e/` alongside |
| Existing `e2e/` folder | `project/e2e/` exists | Warn, ask: merge/rename/abort |

---

### US-002: Install ARTK Core Without Conflicts

**As a** developer
**I want to** install @artk/core without affecting my application's dependencies
**So that** I can avoid npm peer dependency conflicts and private registry issues

**Acceptance Criteria:**
- [ ] Install script creates `artk-e2e/` directory structure
- [ ] Install script copies @artk/core to `vendor/artk-core/`
- [ ] Install script generates minimal `package.json` (only @artk/core + @playwright/test)
- [ ] `npm install` runs successfully in isolation
- [ ] Playwright browsers are installed
- [ ] No interaction with parent project's `node_modules/`
- [ ] No interaction with parent project's `.npmrc` (private registries)

**Scenarios:**

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Clean install | New project | artk-e2e/ created, deps installed |
| Existing artk-e2e/ | Re-run script | Update vendor/, preserve config |
| Parent has .npmrc | Private registry configured | Ignored, uses public npm |
| No network | Offline install | Vendor copy works, playwright fails (expected) |

---

### US-003: Configure Multiple Frontend Targets

**As a** developer with multiple frontend applications
**I want to** configure ARTK to test multiple frontends
**So that** I can maintain a single E2E test suite for all my applications

**Acceptance Criteria:**
- [ ] `artk.config.yml` supports `targets[]` array
- [ ] Each target has: name, path, type, baseUrl per environment
- [ ] Journeys can specify which target they test via `target:` frontmatter
- [ ] Tests can be filtered by target: `npm test -- --target=admin`
- [ ] Default target is used when not specified

**Config Example:**
```yaml
targets:
  - name: user-portal
    path: ../iss-frontend
    type: react-spa
    environments:
      local: http://localhost:3000
      staging: https://staging.iss.example.com

  - name: admin-portal
    path: ../iss-admin
    type: react-spa
    environments:
      local: http://localhost:3001
      staging: https://admin.staging.iss.example.com

defaultTarget: user-portal
```

---

### US-004: Project Discovery and Analysis

**As a** developer running `/discover`
**I want to** ARTK to analyze my frontend applications
**So that** it can understand routes, auth flows, and testability

**Acceptance Criteria:**
- [ ] `/discover` reads target paths from `.artk/context.json`
- [ ] `/discover` analyzes each configured frontend
- [ ] Discovery results saved to `artk-e2e/docs/discovery/`
- [ ] Separate discovery file per target: `discovery-user-portal.md`
- [ ] Discovery includes: routes, auth patterns, selectors, API endpoints

---

### US-005: Journey System with Target Awareness

**As a** test author
**I want to** specify which frontend a Journey tests
**So that** tests run against the correct application

**Acceptance Criteria:**
- [ ] Journey frontmatter supports `target:` field
- [ ] If target omitted, uses `defaultTarget` from config
- [ ] `/journey-implement` generates tests with correct baseUrl
- [ ] Test files organized by target: `tests/user-portal/`, `tests/admin-portal/`

**Journey Example:**
```yaml
---
id: JRN-0042
title: Admin can view user list
target: admin-portal      # <-- Target specification
tier: smoke
---
```

---

### US-006: Environment-Aware Test Execution

**As a** CI/CD pipeline
**I want to** run tests against different environments
**So that** I can test staging before production

**Acceptance Criteria:**
- [ ] Environment selectable via `ARTK_ENV` environment variable
- [ ] Environment selectable via CLI: `npm test -- --env=staging`
- [ ] Each target has environment-specific URLs
- [ ] Credentials can be environment-specific
- [ ] Default environment configurable in config

---

### US-007: Context Persistence for Prompts

**As a** user running multiple ARTK prompts
**I want to** have context automatically shared between prompts
**So that** I don't have to re-specify paths and configuration

**Acceptance Criteria:**
- [ ] `/init` creates `.artk/context.json` with project structure
- [ ] All prompts read context from `.artk/context.json`
- [ ] Context includes: targets, paths, install info, timestamps
- [ ] Context uses only relative paths and is committed to version control
- [ ] Missing context triggers re-initialization prompt

**Context Schema:**
```json
{
  "version": "1.0",
  "initialized_at": "ISO8601",
  "project": {
    "name": "string",
    "root": "relative path"
  },
  "targets": [
    {
      "name": "string",
      "path": "relative path",
      "type": "react-spa|vue-spa|angular|next|nuxt|other"
    }
  ],
  "install": {
    "artk_core_version": "semver",
    "playwright_version": "semver"
  }
}
```

---

### US-008: Documentation Generation

**As a** QA team member
**I want to** have all E2E documentation in one place
**So that** I can understand and maintain the test suite

**Acceptance Criteria:**
- [ ] All generated docs live in `artk-e2e/docs/`
- [ ] Directory structure mirrors prompt outputs:
  ```
  docs/
  ├── discovery/
  │   ├── user-portal.md
  │   └── admin-portal.md
  ├── playbook.md
  └── journeys/
      └── (journey markdown files)
  ```
- [ ] Docs are committed to version control
- [ ] Reports (runtime artifacts) are gitignored

---

### US-009: Upgrade ARTK Core

**As a** developer
**I want to** upgrade @artk/core without conflicts
**So that** I can get new features and bug fixes

**Acceptance Criteria:**
- [ ] Re-running install script updates `vendor/artk-core/`
- [ ] Existing config preserved
- [ ] Existing tests preserved
- [ ] Version tracked in `.artk/context.json`
- [ ] Breaking changes noted in release notes

---

### US-010: CI/CD Integration

**As a** DevOps engineer
**I want to** integrate ARTK E2E tests into our CI/CD pipeline
**So that** tests run automatically on deployments

**Acceptance Criteria:**
- [ ] Documentation for GitHub Actions workflow
- [ ] Documentation for GitLab CI workflow
- [ ] E2E tests can be triggered by deploy webhook
- [ ] Health check before test run (wait for app ready)
- [ ] Test results uploadable as artifacts
- [ ] Support for parallel test sharding

**Example GitHub Actions:**
```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./artk-e2e
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
        env:
          ARTK_ENV: staging
```

---

## 3. Technical Design

### 3.1 Directory Structure

```
project-root/
├── iss-frontend/               # Frontend submodule (untouched)
├── iss-backend/                # Backend submodule (untouched)
├── iss-admin/                  # Another frontend (untouched)
└── artk-e2e/                   # Independent E2E suite
    ├── package.json            # Minimal deps
    ├── package-lock.json
    ├── node_modules/           # Isolated (~15 MB)
    ├── vendor/
    │   └── artk-core/          # Copied @artk/core
    ├── artk.config.yml         # Main configuration
    ├── playwright.config.ts    # Generated
    ├── .artk/
    │   └── context.json        # Inter-prompt context
    ├── .gitignore
    ├── journeys/               # Journey definitions
    │   ├── user-portal/
    │   │   ├── JRN-0001-login.md
    │   │   └── JRN-0002-checkout.md
    │   └── admin-portal/
    │       └── JRN-0042-user-list.md
    ├── tests/                  # Generated tests
    │   ├── user-portal/
    │   │   ├── jrn-0001-login.spec.ts
    │   │   └── jrn-0002-checkout.spec.ts
    │   └── admin-portal/
    │       └── jrn-0042-user-list.spec.ts
    ├── docs/                   # Generated documentation
    │   ├── discovery/
    │   ├── playbook.md
    │   └── journeys/
    ├── .auth-states/           # Storage states (gitignored)
    │   ├── user-portal/        # Auth states for user-portal target
    │   └── admin-portal/       # Auth states for admin-portal target
    ├── test-results/           # Playwright output (gitignored)
    └── playwright-report/      # HTML report (gitignored)
```

### 3.2 Configuration Schema

```yaml
# artk-e2e/artk.config.yml

# Schema version
schemaVersion: "2.0"

# Project metadata
project:
  name: req-apps-it-service-shop
  description: IT Service Shop E2E Tests

# Frontend targets (can be multiple)
targets:
  - name: user-portal
    path: ../iss-frontend        # Relative to artk-e2e/
    type: react-spa
    description: Main user-facing application
    environments:
      local:
        baseUrl: http://localhost:3000
      staging:
        baseUrl: https://staging.iss.example.com
      production:
        baseUrl: https://iss.example.com

  - name: admin-portal
    path: ../iss-admin
    type: react-spa
    description: Admin dashboard
    environments:
      local:
        baseUrl: http://localhost:3001
      staging:
        baseUrl: https://admin.staging.iss.example.com

# Default settings
defaults:
  target: user-portal
  environment: local

# Authentication
auth:
  provider: oidc
  idpType: keycloak
  storageStateDir: .auth-states

  # Per-environment auth URLs
  environments:
    local:
      loginUrl: http://localhost:8080/auth/realms/iss/protocol/openid-connect/auth
    staging:
      loginUrl: https://auth.staging.example.com/realms/iss/protocol/openid-connect/auth

  # Roles (credentials from env vars)
  roles:
    standard-user:
      credentialsEnv:
        username: ISS_USER
        password: ISS_PASSWORD
    admin:
      credentialsEnv:
        username: ISS_ADMIN
        password: ISS_ADMIN_PASSWORD

# Browser settings
browsers:
  enabled:
    - chromium
  headless: true

# Timeouts
timeouts:
  default: 30000
  navigation: 60000
  auth: 120000
```

### 3.3 Install Script Flow

```bash
#!/bin/bash
# install-to-project.sh <target-project-root>

TARGET_ROOT="$1"
ARTK_E2E="$TARGET_ROOT/artk-e2e"

# 1. Create directory structure
mkdir -p "$ARTK_E2E"/{vendor/artk-core,journeys,tests,docs,.artk,.auth-states}

# 2. Copy @artk/core
cp -r "$ARTK_CORE_SOURCE/dist" "$ARTK_E2E/vendor/artk-core/"
cp "$ARTK_CORE_SOURCE/package.json" "$ARTK_E2E/vendor/artk-core/"
cp "$ARTK_CORE_SOURCE/version.json" "$ARTK_E2E/vendor/artk-core/"

# 3. Generate package.json
cat > "$ARTK_E2E/package.json" << 'EOF'
{
  "name": "artk-e2e",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@playwright/test": "^1.57.0"
  }
}
EOF

# 4. Generate .gitignore
cat > "$ARTK_E2E/.gitignore" << 'EOF'
node_modules/
.auth-states/
test-results/
playwright-report/
*.local.yml
EOF

# 5. Install dependencies (isolated, no conflicts)
cd "$ARTK_E2E"
npm install

# 6. Install Playwright browsers
npx playwright install chromium

echo "✅ ARTK E2E installed at $ARTK_E2E"
```

### 3.4 /init Prompt Flow

```
INPUT: --install-script <path>

STEP 1: DISCOVER
├── git rev-parse --show-toplevel → project root
├── Scan for frontends:
│   ├── Look for */package.json with react/vue/angular
│   ├── Look for */src/App.tsx or */src/main.ts
│   ├── Look for common names: frontend, web, app, client
│   └── Build candidate list
└── Scan for existing e2e setup

STEP 2: CONFIRM
├── Display discovered frontends
├── Ask user to confirm or modify
├── If multiple: ask which to include as targets
└── If existing e2e/: ask how to handle

STEP 3: EXECUTE
├── Run install script
├── Generate artk.config.yml from user input
├── Generate playwright.config.ts
└── Write .artk/context.json

STEP 4: OUTPUT
├── Summary of created files
├── Next steps instructions
└── "Run /discover to analyze your applications"
```

### 3.5 Frontend Detection Heuristics

```typescript
interface DetectionResult {
  path: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'react-spa' | 'vue-spa' | 'angular' | 'next' | 'nuxt' | 'other';
  signals: string[];
}

function detectFrontends(rootPath: string): DetectionResult[] {
  const candidates: DetectionResult[] = [];

  // Scan subdirectories
  for (const dir of getSubdirectories(rootPath)) {
    const signals: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let type: string = 'other';

    const pkgJson = readPackageJson(dir);
    if (!pkgJson) continue;

    // Check dependencies
    if (pkgJson.dependencies?.react || pkgJson.devDependencies?.react) {
      signals.push('package.json:react');
      type = 'react-spa';
      confidence = 'high';
    }
    if (pkgJson.dependencies?.vue) {
      signals.push('package.json:vue');
      type = 'vue-spa';
      confidence = 'high';
    }
    if (pkgJson.dependencies?.['@angular/core']) {
      signals.push('package.json:angular');
      type = 'angular';
      confidence = 'high';
    }
    if (pkgJson.dependencies?.next) {
      signals.push('package.json:next');
      type = 'next';
      confidence = 'high';
    }

    // Check directory name
    if (['frontend', 'web', 'app', 'client', 'ui'].includes(path.basename(dir))) {
      signals.push(`dirname:${path.basename(dir)}`);
      if (confidence === 'low') confidence = 'medium';
    }

    // Check for entry files
    if (existsSync(path.join(dir, 'src/App.tsx'))) {
      signals.push('file:src/App.tsx');
    }
    if (existsSync(path.join(dir, 'src/main.ts'))) {
      signals.push('file:src/main.ts');
    }

    if (signals.length > 0) {
      candidates.push({ path: dir, confidence, type, signals });
    }
  }

  // Sort by confidence
  return candidates.sort((a, b) =>
    confidenceScore(b.confidence) - confidenceScore(a.confidence)
  );
}
```

---

## 4. Edge Cases and Error Handling

### 4.1 Detection Failures

| Scenario | Detection | User Action | System Response |
|----------|-----------|-------------|-----------------|
| No frontends found | Empty list | Must provide path | Prompt for manual input |
| Low confidence only | Show with warning | Confirm or override | Proceed with confirmation |
| Multiple high confidence | Show all | Select which to include | Add all selected to targets |
| Frontend at root | Detect root as candidate | Confirm | Create artk-e2e/ alongside |
| Uninitialized submodule | Path exists but empty | Optional: run `git submodule update --init` | Warn, skip path, continue with available |

### 4.2 File System Issues

| Scenario | Error | Recovery |
|----------|-------|----------|
| No write permission | EACCES | "Cannot create artk-e2e/. Check permissions." |
| Disk full | ENOSPC | "Insufficient disk space. Need ~50MB." |
| Path too long (Windows) | ENAMETOOLONG | Use shorter project path |
| Existing artk-e2e/ | Directory exists | Ask: update/reinit/abort |

### 4.3 Network Issues

| Scenario | Error | Recovery |
|----------|-------|----------|
| npm install fails | ENETUNREACH | Vendor copy complete, retry npm later |
| Playwright install fails | Network error | "Run `npx playwright install` when online" |

### 4.4 Configuration Errors

| Scenario | Error | Recovery |
|----------|-------|----------|
| Invalid YAML | Parse error | Show line number, suggest fix |
| Missing required field | Validation error | Show missing fields |
| Invalid target path | Path not found | Warn, allow proceed (may be git submodule) |
| Too many targets | >5 targets configured | Error: "Maximum 5 targets supported. Remove extras." |

---

## 5. Migration Path

### 5.1 From Integrated to Independent

For projects that already have @artk/core in their main package.json:

1. Run `/init` with new architecture
2. Move existing journeys to `artk-e2e/journeys/`
3. Move existing tests to `artk-e2e/tests/`
4. Move `artk.config.yml` to `artk-e2e/`
5. Remove @artk/core from main package.json
6. Update CI/CD to run from `artk-e2e/`

### 5.2 From Scratch

1. Run `/init --install-script /path/to/script`
2. Follow prompts
3. Run `/discover`
4. Run `/journey-propose`
5. Implement journeys

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Install success rate | >95% | No dependency conflicts |
| Time to first test | <10 min | From /init to passing test |
| Config portability | 100% | Works when repo cloned elsewhere |
| Multi-frontend support | 1-5 targets | Tested with 3 frontends, hard limit of 5 |
| CI integration | <5 min setup | Time to add to pipeline |

---

## 7. Dependencies

- Node.js 18.0.0+
- @playwright/test 1.57.0+
- @artk/core 1.0.0+
- Git (for root detection)

**Supported Platforms:**
- macOS (primary development)
- Linux (CI/CD)
- Windows (full support - tested on Windows CI, releases blocked on Windows failures)

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Detection heuristics fail | Medium | Medium | Always confirm with user |
| Breaking changes in Playwright | Low | High | Pin versions, test upgrades |
| Config schema changes | Medium | Medium | Schema versioning |
| Large test suites slow CI | Medium | Medium | Sharding documentation |
| Auth state conflicts between targets | Low | Medium | Separate .auth-states per target |

---

## 9. Future Enhancements

1. **Visual regression testing** - Screenshot comparison
2. **API testing integration** - Backend contract tests
3. **Performance testing** - Lighthouse integration
4. **Accessibility testing** - axe-core integration
5. **Test generation AI** - Generate tests from user flows
6. **Dashboard** - Web UI for test management

---

## 10. Appendix

### A. Glossary

- **ARTK Core**: The reusable library (`@artk/core`)
- **ARTK Instance**: Per-project configuration and tests (`artk-e2e/`)
- **Target**: A frontend application to test
- **Journey**: A test specification in markdown
- **Environment**: A deployment (local, staging, production)

### B. Related Documents

- `research/2025-12-30_independent_test_suite_analysis.md`
- `research/2025-12-30_artk_e2e_architecture_deep_dive.md`
- `specs/001-artk-core-v1/spec.md`

### C. Command Reference

```bash
# Initialize ARTK in project
/init --install-script /path/to/install-to-project.sh

# Discover frontends
/discover

# Propose journeys
/journey-propose --target user-portal

# Implement journey
/journey-implement JRN-0001

# Run tests
cd artk-e2e && npm test

# Run tests for specific target
npm test -- --grep @user-portal

# Run tests against staging
ARTK_ENV=staging npm test
```
