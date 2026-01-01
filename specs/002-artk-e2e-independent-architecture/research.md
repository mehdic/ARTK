# Research: ARTK E2E Independent Architecture

**Feature**: 002-artk-e2e-independent-architecture
**Date**: 2025-12-30

## Research Topics

### 1. Frontend Detection Heuristics

**Context**: `/init` needs to automatically detect frontend applications in a monorepo.

**Decision**: Use a multi-signal detection approach with confidence scoring.

**Rationale**: Single-signal detection (e.g., just checking for `react` in package.json) produces too many false positives. A weighted scoring system with multiple signals provides better accuracy while remaining fast.

**Detection Signals (by weight)**:
| Signal | Weight | Confidence |
|--------|--------|------------|
| `package.json` with react/vue/angular/svelte | 30 | High |
| `package.json` with next/nuxt/gatsby | 35 | High |
| `package.json` with vite/webpack | 20 | Medium |
| Directory name: frontend, web, app, client, ui | 15 | Medium |
| Entry file: src/App.tsx, src/main.ts, pages/ | 20 | Medium |
| index.html in root or public/ | 10 | Low |

**Threshold**: Score ≥40 = high confidence, 20-39 = medium, <20 = low

**Alternatives Considered**:
- Simple regex on package.json: Rejected (too many false positives)
- User-always-specifies: Rejected (poor UX, defeats automation goal)
- Machine learning classifier: Rejected (overkill, requires training data)

---

### 2. Git Submodule Detection

**Context**: Need to identify uninitialized submodules and warn users.

**Decision**: Check for `.gitmodules` file and compare with actual directory contents.

**Rationale**: Git stores submodule configuration in `.gitmodules`. If a path is listed there but the directory is empty or contains only `.git` file, the submodule is uninitialized.

**Implementation**:
```typescript
function checkSubmodules(rootPath: string): SubmoduleStatus[] {
  const gitmodules = path.join(rootPath, '.gitmodules');
  if (!existsSync(gitmodules)) return [];

  const content = readFileSync(gitmodules, 'utf-8');
  const paths = parseGitmodulesPaths(content);

  return paths.map(p => ({
    path: p,
    initialized: isDirectoryWithContent(path.join(rootPath, p))
  }));
}
```

**Alternatives Considered**:
- Run `git submodule status`: Rejected (requires git CLI, slower)
- Ignore submodules: Rejected (user confusion when paths don't exist)

---

### 3. Windows Path Handling

**Context**: Full Windows support requires proper path handling throughout.

**Decision**: Use Node.js `path` module consistently, avoid bash-specific path syntax.

**Rationale**: Node.js `path` module automatically handles platform-specific separators. PowerShell scripts needed for Windows install.

**Key Considerations**:
- Use `path.join()` instead of string concatenation
- Use `path.relative()` for relative paths
- Normalize paths before comparison: `path.normalize()`
- Avoid hardcoded `/` separators in TypeScript
- Create `install-to-project.ps1` for Windows users

**Alternatives Considered**:
- WSL-only support: Rejected (not all Windows users have WSL)
- Cross-platform bash (Git Bash): Rejected (unreliable, inconsistent behavior)

---

### 4. Config Schema Versioning

**Context**: Need to evolve artk.config.yml schema while maintaining backward compatibility.

**Decision**: Use explicit `schemaVersion` field with migration support.

**Rationale**: Explicit versioning allows detection of old configs and automatic migration.

**Schema Evolution Strategy**:
```yaml
# v1 (legacy - single target)
app:
  name: My App
  baseUrl: http://localhost:3000

# v2 (new - multi-target)
schemaVersion: "2.0"
project:
  name: My Project
targets:
  - name: default
    path: ../frontend
    environments:
      local: http://localhost:3000
```

**Migration Path**:
1. Detect missing `schemaVersion` → v1
2. Auto-migrate v1 to v2 on first access
3. Write migrated config back with `schemaVersion: "2.0"`

**Alternatives Considered**:
- No versioning: Rejected (breaking changes would fail silently)
- Separate config files per version: Rejected (unnecessary complexity)

---

### 5. Context.json Schema Design

**Context**: Need stable schema for inter-prompt communication.

**Decision**: Use a minimal, forward-compatible schema with explicit version.

**Rationale**: Context should contain only essential data that prompts need. Keeping it minimal reduces coupling and maintenance burden.

**Schema**:
```typescript
interface ArtkContext {
  version: "1.0";
  initialized_at: string; // ISO8601
  project: {
    name: string;
    root: string; // Relative to artk-e2e/
  };
  targets: Array<{
    name: string;
    path: string; // Relative to artk-e2e/
    type: 'react-spa' | 'vue-spa' | 'angular' | 'next' | 'nuxt' | 'other';
    detected_by: string[]; // Signals that identified this target
  }>;
  install: {
    artk_core_version: string;
    playwright_version: string;
    script_path: string; // Path to install script used
  };
}
```

**Alternatives Considered**:
- Store full config copy: Rejected (duplication, sync issues)
- No context file (re-detect each time): Rejected (slow, inconsistent)

---

### 6. Auth State Isolation

**Context**: Multiple targets may have different auth states that shouldn't conflict.

**Decision**: Per-target subdirectories under `.auth-states/`.

**Rationale**: Complete isolation prevents credential cross-contamination. Each target's auth states are managed independently.

**Structure**:
```
.auth-states/
├── user-portal/
│   ├── standard-user.json
│   └── admin.json
└── admin-portal/
    ├── admin.json
    └── super-admin.json
```

**Implementation**:
- `storageStatePath` computed as `.auth-states/{target}/{role}.json`
- Auth provider receives target context
- Storage state directories created on first auth

**Alternatives Considered**:
- Flat structure with prefixes: Rejected (harder to manage, namespace collisions)
- Single auth state for all targets: Rejected (credentials differ per app)

---

### 7. CI/CD Integration Patterns

**Context**: Need to document reliable CI integration patterns.

**Decision**: Provide GitHub Actions and GitLab CI templates with health checks.

**Rationale**: Most projects use one of these two. Health checks prevent flaky test starts.

**GitHub Actions Pattern**:
```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./artk-e2e
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: 'recursive'  # Important for monorepos

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: artk-e2e/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Wait for deployment
        run: npx wait-on ${{ secrets.STAGING_URL }} --timeout 60000

      - name: Run E2E tests
        run: npm test
        env:
          ARTK_ENV: staging

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: artk-e2e/playwright-report/
```

**Alternatives Considered**:
- Custom health check script: Rejected (wait-on is battle-tested)
- No health check: Rejected (causes flaky test starts)

---

## Summary

All research topics have been resolved with decisions documented. No NEEDS CLARIFICATION items remain from Technical Context.

| Topic | Decision | Impact |
|-------|----------|--------|
| Frontend Detection | Multi-signal scoring | High accuracy, fast |
| Git Submodules | Parse .gitmodules | Warn on uninitialized |
| Windows Paths | path module + PowerShell | Full Windows support |
| Config Versioning | schemaVersion field | Backward compatible |
| Context Schema | Minimal, versioned | Stable inter-prompt |
| Auth Isolation | Per-target dirs | No credential conflicts |
| CI Integration | Templates + wait-on | Reliable pipelines |
