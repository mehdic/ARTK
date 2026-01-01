# Research: ARTK Pilot Launch

**Date**: 2026-01-01
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

---

## Research Task 1: ITSS Project Structure

**Question**: Document ITSS frontend location, framework, auth config

### Findings

**Location**: `ignore/req-apps-it-service-shop/iss-frontend/`

**Framework Stack**:
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.3.1 |
| Build Tool | Vite | 5.0.10 |
| Language | TypeScript | 5.0.2 |
| UI Library | Ant Design | 5.16.5 |
| State/Data | Axios | 1.12.2 |
| Routing | react-router-dom | 6.14.2 |

**Auth Configuration**:
- **Method**: OIDC with PKCE flow
- **Library**: `react-oauth2-code-pkce` (v1.16.0)
- **Provider**: Keycloak
- **Realm**: `REQ` (from `tools/keycloak/init/REQ-realm.json`)

**Keycloak Roles** (from realm config):
| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 00007A3H | ROLE_ADMIN | Administrator |
| 00007A3I | ROLE_HR_MANAGER | HR Manager |
| 00007A3J | ROLE_PRODUCT_MANAGER | Product Manager |

**Token Settings**:
- Access Token Lifespan: 300 seconds (5 minutes)
- SSO Session Idle: 1800 seconds (30 minutes)
- SSO Session Max: 36000 seconds (10 hours)

### Decision

**Use ITSS as pilot with these parameters:**
- Frontend path: `iss-frontend/`
- Auth: OIDC PKCE with Keycloak
- Create test accounts for each role (ADMIN, HR_MANAGER, PRODUCT_MANAGER)
- TOTP not required in current config (MFA disabled in realm)

**Rationale**: ITSS is a production-like React SPA with realistic auth complexity, making it ideal for validating ARTK's capabilities.

---

## Research Task 1b: Complete ITSS Structure (T024-T029)

**Date**: 2026-01-01
**Purpose**: Complete documentation of ITSS project for pilot validation

### T024-T025: Detailed Framework Analysis

**package.json Analysis** (`iss-frontend/package.json`):

| Category | Package | Version | Notes |
|----------|---------|---------|-------|
| **Core Framework** | react | ^18.3.1 | Main UI library |
| | react-dom | ^18.3.1 | DOM rendering |
| **Build Tool** | vite | ^5.0.10 | Fast bundler |
| | @vitejs/plugin-react | ^4.2.1 | React HMR |
| **Language** | typescript | ^5.0.2 | Type safety |
| **UI Components** | antd | 5.16.5 | Ant Design |
| | @ant-design/icons | ^5.1.4 | Icon library |
| **Routing** | react-router-dom | ^6.14.2 | Client routing |
| **HTTP** | axios | ^1.12.2 | API calls |
| **Auth** | react-oauth2-code-pkce | ^1.16.0 | OIDC PKCE |
| | react-native-pkce-challenge | ^5.3.1 | Challenge generator |
| **Grid** | ag-grid-react | ^33.2.1 | Data grid |
| | ag-grid-enterprise | ^33.2.1 | Enterprise features |
| **Testing** | vitest | ^1.4.0 | Unit tests |
| | @testing-library/react | ^14.2.2 | React testing |

**Dev Server**:
- **Default Port**: 5173 (Vite default, no custom config)
- **Start Command**: `npm run start` → `vite -d`
- **Path Alias**: `@serviceshop` → `./src`

### T026-T027: Keycloak Configuration

**REQ Realm Configuration** (`tools/keycloak/init/REQ-realm.json`):

| Setting | Value | Notes |
|---------|-------|-------|
| Realm ID | REQ | Primary realm |
| Display Name | IT Service Shop | UI title |
| SSL Required | none | Dev only |
| Login with Email | true | Email-based login |
| Registration | false | No self-registration |
| Remember Me | false | No persistent login |
| Brute Force | false | Dev convenience |

**Application Roles**:

| Role Name (ID) | Description | UUID |
|----------------|-------------|------|
| 00007A3H | ROLE_ADMIN | 92dc784f-7506-4520-bcbe-665c76c027b0 |
| 00007A3I | ROLE_HR_MANAGER | 7f4a7a57-c5fe-457f-ac5c-776bc039014a |
| 00007A3J | ROLE_PRODUCT_MANAGER | 8322330b-ec50-46cf-9812-7d2544159dd7 |

**Token Lifetimes**:

| Token | Lifespan | Human Readable |
|-------|----------|----------------|
| Access Token | 300s | 5 minutes |
| SSO Session Idle | 1800s | 30 minutes |
| SSO Session Max | 36000s | 10 hours |
| Access Code | 60s | 1 minute |
| Refresh Token Max Reuse | 0 | No reuse limit |

### T028: Environment URLs

**ITSS Environments**:

| Environment | Frontend URL | Backend API | Keycloak |
|-------------|--------------|-------------|----------|
| Local (dev) | http://localhost:5173 | http://localhost:8085/api | http://localhost:8080 |
| Staging | TBD | TBD | TBD |

**Auth Configuration Flow**:
1. Frontend fetches `/api/config` from backend
2. Config returns OIDC endpoints dynamically
3. Frontend uses `react-oauth2-code-pkce` with PKCE challenge
4. Auth redirects to Keycloak login page
5. After login, callback returns to `redirectUri`

**Expected Config Response** (from backend `/api/config`):
```json
{
  "oauthEnabled": true,
  "clientId": "<keycloak-client-id>",
  "redirectUri": "http://localhost:5173/",
  "authorizationEndpoint": "http://localhost:8080/realms/REQ/protocol/openid-connect/auth",
  "tokenEndpoint": "http://localhost:8080/realms/REQ/protocol/openid-connect/token",
  "scope": ["openid"]
}
```

### T029: Expected Detection Baseline

**ARTK Frontend Detection Should Identify**:

| Detection Category | Expected Value | Confidence |
|--------------------|----------------|------------|
| Framework | react-spa | High |
| Build Tool | vite | High |
| Language | typescript | High |
| Entry Point | src/main.tsx | High |
| Package Manager | npm | Medium |
| Router | react-router-dom | High |
| UI Library | antd | Medium |
| Auth Pattern | OIDC PKCE | High |

**Detection Signals** (per `core/typescript/detection/signals.ts`):
- `package.json:react` → +50 (react dependency)
- `package.json:@vitejs/plugin-react` → +30 (vite-react)
- `src/main.tsx` → +40 (React entry point)
- `package.json:react-router-dom` → +20 (SPA routing)
- `package.json:react-oauth2-code-pkce` → +30 (OIDC pattern)

**Expected Total Score**: 170+ (High confidence threshold: 100)

**Directory Structure for Detection**:
```
iss-frontend/
├── package.json          # Detection signal: dependencies
├── vite.config.ts        # Detection signal: vite build
├── src/
│   ├── main.tsx          # Detection signal: React entry
│   ├── App.tsx           # Main component
│   └── app/
│       └── shared/
│           ├── model/    # TypeScript models
│           └── services/ # API services
└── index.html            # SPA shell
```

---

## Research Task 2: 002 Task Audit

**Question**: Identify which tasks from 002 spec were completed in 001

### Findings

Analyzed `specs/002-artk-e2e-independent-architecture/tasks.md` (79 tasks) against actual implementation in `core/typescript/`.

**Tasks COMPLETED in 001** (mapped to 002 task IDs):

| Phase | Tasks | Status | Evidence |
|-------|-------|--------|----------|
| Phase 1: Setup | T001-T006 | ✅ DONE | Directory structure exists |
| Phase 2: Foundational | T007-T016 | ✅ DONE | All types in `types/`, schemas in `schemas/` |
| Phase 3: US1 (Init) | T017-T028 | ✅ DONE | `detection/` module complete |
| Phase 4: US2 (Install) | T029-T036 | ✅ DONE | `install/` module + scripts |
| Phase 5: US3 (Multi-Target) | T037-T046 | ✅ DONE | `config/` module complete |
| Phase 6: US4 (Discover) | T047-T049 | ⚠️ PARTIAL | Prompts exist, need ITSS testing |
| Phase 7: US5 (Journey Target) | T050-T052 | ⚠️ PARTIAL | Schema exists, prompts need update |
| Phase 8: US6 (Environment) | T053-T056 | ✅ DONE | Environment resolver in config |
| Phase 9: US7 (Context) | T057-T063 | ⚠️ PARTIAL | Context exists, prompts need update |
| Phase 10: US8 (Docs) | T064-T065 | ❌ TODO | Doc structure needed |
| Phase 11: US9 (Upgrade) | T066-T068 | ⚠️ PARTIAL | Version tracking exists |
| Phase 12: US10 (CI/CD) | T069-T072 | ❌ TODO | Templates needed |
| Phase 13: Polish | T073-T079 | ⚠️ PARTIAL | README done, others pending |

**Summary**:
- **Completed**: ~60 tasks (76%)
- **Partial**: ~12 tasks (15%)
- **Remaining**: ~7 tasks (9%)

**Key Modules Built in 001**:
```
core/typescript/
├── detection/          # ✅ Frontend detection (signals, entry, package, directory, submodule)
├── install/            # ✅ Generators (package, gitignore, playwright-config)
├── config/             # ✅ Config loading, validation, environment resolver
├── auth/               # ✅ OIDC, Form, Token auth providers
├── fixtures/           # ✅ Playwright test fixtures
├── locators/           # ✅ Accessibility-first locators
├── assertions/         # ✅ UI assertion helpers
├── data/               # ✅ Test data and cleanup
├── reporters/          # ✅ Custom reporters with journey mapping
├── harness/            # ✅ Playwright config generation
└── scripts/install-to-project.sh  # ✅ Bash install script
```

### Decision

**Remaining 002 work for 003**:
1. ❌ PowerShell install script (`install-to-project.ps1`) - US2
2. ⚠️ Update prompts to use context.json - US4, US5, US7
3. ❌ CI/CD templates (GitHub Actions, GitLab CI) - US10
4. ⚠️ Cross-platform path validation - US7
5. ⚠️ Journey `target:` field validation - US5

**Rationale**: ~80% of 002 infrastructure exists. Focus 003 on integration testing and prompt refinement rather than rebuilding.

---

## Research Task 2b: Detailed 002 Task Audit (T020-T022)

**Date**: 2026-01-01
**Purpose**: Cross-reference 002 spec tasks against actual file structure

### Phase 1: Setup (T001-T006) - 100% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T001 | Directory structure | `core/typescript/{detection,config,targets}/` | ✅ |
| T002 | Detection index.ts | `core/typescript/detection/index.ts` | ✅ |
| T003 | Config index.ts | `core/typescript/config/index.ts` | ✅ |
| T004 | Targets index.ts | `core/typescript/targets/index.ts` | ✅ |
| T005 | yaml, zod deps | `core/typescript/package.json:88-90` | ✅ |
| T006 | Test structure | `*/__tests__/` pattern used | ✅ |

**Note**: Structure differs from spec (`__tests__/` not `tests/unit/`) but functionally equivalent.

### Phase 2: Foundational (T007-T016) - 100% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T007 | ArtkTarget type | `core/typescript/types/target.ts` | ✅ |
| T008 | ArtkContext type | `core/typescript/types/context.ts:49-137` | ✅ |
| T009 | ArtkConfig type | `core/typescript/types/config.ts` | ✅ |
| T010 | ArtkConfigTarget | `core/typescript/types/config.ts` | ✅ |
| T011 | ArtkAuthConfig | `core/typescript/types/auth.ts` | ✅ |
| T012 | DetectionResult | `core/typescript/types/detection.ts` | ✅ |
| T013 | SubmoduleStatus | `core/typescript/types/submodule.ts` | ✅ |
| T014 | Zod ArtkContext | `core/typescript/types/context.ts:286-379` | ✅ |
| T015 | Zod ArtkConfig | `core/typescript/types/schemas.ts` | ✅ |
| T016 | Export types | `core/typescript/types/index.ts` | ✅ |

**Note**: Zod schemas merged into type files rather than separate `schemas/` dir.

### Phase 3: US1 Init (T017-T028) - 100% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T017 | frontend-detector.test | `detection/__tests__/frontend-detector.test.ts` | ✅ |
| T018 | submodule-checker.test | `detection/__tests__/submodule-checker.test.ts` | ✅ |
| T019 | scoring.test | `detection/__tests__/signals.test.ts` | ✅ |
| T020 | init-flow integration | See T028 prompt | ⚠️ Partial |
| T021 | signals.ts | `detection/signals.ts` | ✅ |
| T022 | package-scanner.ts | `detection/package-scanner.ts` | ✅ |
| T023 | entry-detector.ts | `detection/entry-detector.ts` | ✅ |
| T024 | directory-heuristics.ts | `detection/directory-heuristics.ts` | ✅ |
| T025 | frontend-detector.ts | `detection/frontend-detector.ts` | ✅ |
| T026 | submodule-checker.ts | `detection/submodule-checker.ts` | ✅ |
| T027 | Export detection | `detection/index.ts` | ✅ |
| T028 | Update /init prompt | `prompts/artk.init.md` | ✅ |

### Phase 4: US2 Install (T029-T036) - 100% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T029 | package-generator.test | `install/__tests__/package-generator.test.ts` | ✅ |
| T030 | gitignore-generator.test | `install/__tests__/gitignore-generator.test.ts` | ✅ |
| T031 | install-to-project.sh | `core/typescript/scripts/install-to-project.sh` | ✅ |
| T032 | install-to-project.ps1 | `scripts/install-to-project.ps1` | ✅ (003 Phase 2) |
| T033 | package-generator.ts | `install/package-generator.ts` | ✅ |
| T034 | gitignore-generator.ts | `install/gitignore-generator.ts` | ✅ |
| T035 | playwright-config-generator.ts | `install/playwright-config-generator.ts` | ✅ |
| T036 | Export install | `install/index.ts` | ✅ |

### Phase 5: US3 Multi-Target (T037-T046) - 90% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T037 | config-loader.test | `config/__tests__/loader.test.ts` | ✅ |
| T038 | config-validator.test | `config/__tests__/schema.test.ts` | ✅ |
| T039 | target-resolver.test | `targets/__tests__/target-resolver.test.ts` | ✅ |
| T040 | config-loader.ts | `config/loader.ts` | ✅ |
| T041 | config-validator.ts | `config/schema.ts` | ✅ |
| T042 | schema-v2.ts | Merged into `config/schema.ts` | ✅ |
| T043 | config-migrator.ts | NOT FOUND | ❌ |
| T044 | target-resolver.ts | `targets/target-resolver.ts` | ✅ |
| T045 | Export config | `config/index.ts` | ✅ |
| T046 | Export targets | `targets/index.ts` | ✅ |

**Gap**: Config migration (v1 → v2) not implemented.

### Phase 6: US4 Discover (T047-T049) - 67% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T047 | Update /discover prompt | `prompts/artk.discover.md:100-119` | ✅ (003 Phase 2) |
| T048 | Target-aware discovery | In prompt | ✅ |
| T049 | discovery-format.md | NOT FOUND | ❌ |

**Gap**: Documentation not created.

### Phase 7: US5 Journey Target (T050-T052) - 0% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T050 | Journey schema `target:` | NOT FOUND | ❌ |
| T051 | Update /journey-implement | NOT FOUND | ❌ |
| T052 | target-awareness.md | NOT FOUND | ❌ |

**Gap**: Journey target awareness not implemented.

### Phase 8: US6 Environment (T053-T056) - 75% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T053 | environment-resolver.test | `config/__tests__/env.test.ts` | ✅ |
| T054 | environment-resolver.ts | `config/env.ts` | ✅ |
| T055 | Update playwright-config | `install/playwright-config-generator.ts` | ✅ |
| T056 | environments.md | NOT FOUND | ❌ |

**Gap**: Documentation not created.

### Phase 9: US7 Context (T057-T063) - 57% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T057 | context-writer.test | NOT FOUND | ❌ |
| T058 | context-reader.test | NOT FOUND | ❌ |
| T059 | path-normalizer.test | NOT FOUND | ❌ |
| T060-61 | context.ts | `types/context.ts` | ✅ |
| T062 | path-normalizer.ts | NOT FOUND | ❌ |
| T063 | Update all prompts | `prompts/artk.{init,discover,journey-propose}.md` | ✅ (003 Phase 2) |

**Gap**: Dedicated tests and path normalizer missing.

### Phase 10: US8 Docs (T064-T065) - 0% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T064 | Update prompts for docs | NOT VERIFIED | ❌ |
| T065 | generated-docs.md | NOT FOUND | ❌ |

### Phase 11: US9 Upgrade (T066-T068) - 33% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T066 | Upgrade detection | NOT FOUND | ❌ |
| T067 | Version in context | `core/typescript/version.json` exists | ⚠️ Partial |
| T068 | upgrading.md | NOT FOUND | ❌ |

### Phase 12: US10 CI/CD (T069-T072) - 0% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T069 | GitHub Actions template | NOT FOUND | ❌ |
| T070 | GitLab CI template | NOT FOUND | ❌ |
| T071 | CI README | NOT FOUND | ❌ |
| T072 | health-checks.md | NOT FOUND | ❌ |

### Phase 13: Polish (T073-T079) - 43% COMPLETE

| Task | Description | Evidence Path | Status |
|------|-------------|---------------|--------|
| T073 | Update README | `core/typescript/README.md` | ⚠️ Basic |
| T074 | JSDoc comments | Throughout source | ⚠️ Partial |
| T075 | Cross-platform review | PowerShell script added | ✅ |
| T076 | Error messages | `errors/*.ts` modules | ✅ |
| T077 | CHANGELOG.md | NOT FOUND | ❌ |
| T078 | Quickstart validation | NOT DONE | ❌ |
| T079 | Performance validation | NOT DONE | ❌ |

---

### Summary by Task Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Completed | 58 | 73.4% |
| ⚠️ Partial | 6 | 7.6% |
| ❌ Not Done | 15 | 19.0% |
| **Total** | **79** | **100%** |

### Priority Gaps (for 003 Pilot)

**High Priority** (blocks pilot validation):
1. T050-T052: Journey target awareness (US5)
2. T057-T059, T062: Context persistence tests + path normalizer (US7)

**Medium Priority** (documentation gaps):
3. T049: discovery-format.md
4. T056: environments.md
5. T068: upgrading.md
6. T077: CHANGELOG.md

**Low Priority** (CI/CD templates):
7. T069-T072: CI/CD templates for GitHub/GitLab

---

## Research Task 3: Cross-Platform Install Script

**Question**: Best practices for Bash + PowerShell parity

### Findings

**Current State**:
- Bash script exists: `core/typescript/scripts/install-to-project.sh`
- PowerShell script: NOT IMPLEMENTED (T032 from 002 spec)

**Best Practices for Parity**:

1. **Use Shared Data Files**
   ```bash
   # Both scripts read from the same JSON/YAML
   # package-template.json, gitignore-template.txt
   ```

2. **Equivalent Commands**
   | Bash | PowerShell |
   |------|------------|
   | `mkdir -p` | `New-Item -ItemType Directory -Force` |
   | `cp -r` | `Copy-Item -Recurse` |
   | `test -f` | `Test-Path -PathType Leaf` |
   | `$()` | `$()` (same!) |
   | `source` | `. (dot-source)` |

3. **Cross-Platform Paths**
   ```powershell
   # Use Join-Path instead of string concatenation
   $targetPath = Join-Path $projectRoot "artk-e2e"
   ```

4. **Error Handling**
   ```bash
   # Bash
   set -euo pipefail

   # PowerShell
   $ErrorActionPreference = "Stop"
   ```

### Decision

**Implementation approach**:
- Port existing Bash script to PowerShell (T032)
- Keep both scripts feature-equivalent
- Use same template files for both
- Test on Windows 10/11 with PowerShell 7+

**Rationale**: Native PowerShell provides better Windows integration than WSL/Git Bash.

---

## Research Task 4: Keycloak OIDC Integration

**Question**: ITSS-specific auth flow and TOTP handling

### Findings

**ITSS Auth Flow** (from `react-oauth2-code-pkce` usage):

```
1. User visits app → Redirect to Keycloak login
2. Keycloak authenticates → Returns auth code
3. Frontend exchanges code for tokens (PKCE)
4. Access token stored in browser
5. Token refreshed before expiry
```

**Key Configuration** (from realm JSON):
- SSL Required: `none` (dev only)
- Login with email: `true`
- Registration: `false`
- Password reset: `false`
- Brute force protection: `false`

**TOTP Status**:
- Currently NOT configured in realm
- If enabled, would require `otplib` for code generation

**Playwright Auth Strategy** (per CLR-001):
```typescript
// 1. Authenticate via browser
await page.goto(keycloakLoginUrl);
await page.fill('[name=username]', credentials.username);
await page.fill('[name=password]', credentials.password);
await page.click('[type=submit]');

// 2. Wait for redirect and token
await page.waitForURL(appUrl);

// 3. Save storage state
await context.storageState({ path: storageStatePath });

// 4. On failure: retry once, then fail with actionable message (CLR-001)
```

### Decision

**Auth implementation for ITSS pilot**:
1. Use `OIDCAuthProvider` from @artk/core with PKCE
2. Storage state path: `.auth-states/{role}.json`
3. Create fixture with auto-refresh before token expiry
4. If auth fails: retry once, then fail per CLR-001
5. Test accounts needed: admin@test, hr@test, pm@test

**Rationale**: PKCE flow matches ITSS's production auth pattern; storage state enables session reuse across tests.

---

## Research Task 5: Playwright Stability Patterns

**Question**: Best practices for 3-pass verification (CLR-002)

### Findings

**CLR-002 Requirement**: 3 consecutive passes required for test stability

**Industry Patterns**:

1. **Playwright's Built-in Retry**
   ```typescript
   // playwright.config.ts
   retries: 2,  // Total attempts = 3

   // But this retries FAILURES, not validates stability
   ```

2. **Multi-Run Validation** (recommended approach)
   ```bash
   # Run same test 3 times, all must pass
   for i in 1 2 3; do
     npx playwright test tests/journey-001.spec.ts || exit 1
   done
   ```

3. **Custom Test Runner**
   ```typescript
   // stability-check.ts
   async function validateStability(testPath: string, passes = 3) {
     for (let i = 0; i < passes; i++) {
       const result = await runPlaywright(testPath);
       if (result.failed > 0) {
         throw new Error(`Failed on pass ${i + 1}/${passes}`);
       }
     }
     return true;
   }
   ```

4. **Sharding for Speed**
   ```bash
   # Run 3 times in parallel on different shards
   npx playwright test --shard=1/3 &
   npx playwright test --shard=2/3 &
   npx playwright test --shard=3/3 &
   wait
   ```

**Anti-Patterns to Avoid**:
- ❌ `waitForTimeout()` - Brittle timing
- ❌ Arbitrary retries without logging
- ❌ Ignoring flaky tests (quarantine instead)

### Decision

**Stability verification approach**:
1. **Level 1 (Per-Test)**: Playwright `retries: 2` for transient failures
2. **Level 2 (Per-Journey)**: `/journey-verify` runs test 3x consecutively
3. **Level 3 (Suite)**: CI pipeline runs full suite, tracks flaky rate over time

**Implementation**:
```typescript
// In journey-verify flow
const STABILITY_PASSES = 3;
for (let pass = 1; pass <= STABILITY_PASSES; pass++) {
  console.log(`Stability pass ${pass}/${STABILITY_PASSES}`);
  const result = await runTest(journeyTestPath);
  if (result.status !== 'passed') {
    throw new Error(`Failed stability check on pass ${pass}`);
  }
}
console.log('Journey passed stability verification');
```

**Rationale**: Three consecutive passes catches intermittent failures without over-testing stable journeys.

---

## Summary

| Research Task | Decision | Confidence |
|---------------|----------|------------|
| ITSS Structure | React 18 + Vite + Ant Design at `iss-frontend/` | High |
| 002 Audit | ~80% complete, focus on integration | High |
| Cross-Platform | Port Bash to PowerShell, use same templates | Medium |
| Keycloak OIDC | PKCE flow with storage state persistence | High |
| Stability Patterns | 3-pass verification in /journey-verify | High |

---

*Research completed for Phase 0. Ready to proceed to Phase 1 (Design Artifacts).*
