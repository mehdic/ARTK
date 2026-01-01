# Quickstart: ARTK Pilot on ITSS

**Date**: 2026-01-01
**Time to complete**: ~60 minutes

---

## Prerequisites

1. **ITSS project cloned** at `ignore/req-apps-it-service-shop/`
2. **ARTK Core built** (`core/typescript/` contains compiled dist/)
3. **Node.js 18+** installed
4. **ITSS backend running** (Docker Compose or local)
5. **Keycloak running** with REQ realm configured

### Verify Prerequisites

```bash
# Check ITSS location
ls -la ignore/req-apps-it-service-shop/iss-frontend/package.json

# Check ARTK Core
ls -la core/typescript/dist/

# Check Node version
node --version  # Should be >= 18.0.0

# Check Keycloak (should respond)
curl -s http://localhost:8080/realms/REQ/.well-known/openid-configuration | head -5
```

---

## Step 1: Initialize ARTK in ITSS (US1-US6)

Navigate to the ITSS project root and run `/init`:

```bash
cd ignore/req-apps-it-service-shop

# Run ARTK init (via GitHub Copilot or Claude)
# This creates: artk-e2e/ directory structure
```

**Expected Output**:
```
artk-e2e/
├── package.json           # Isolated dependencies
├── playwright.config.ts   # Playwright configuration
├── artk.config.yml        # ARTK configuration
├── .artk/context.json     # Command state persistence
├── vendor/artk-core/      # Vendored @artk/core
├── tests/                 # Test files (empty initially)
├── src/
│   ├── pages/             # Page Objects
│   └── flows/             # Business Flows
├── docs/
│   ├── discovery/         # Discovery reports
│   └── playbook.md        # Test guardrails
├── journeys/
│   ├── proposed/          # Proposed journeys
│   ├── defined/           # Defined journeys
│   ├── clarified/         # Clarified journeys
│   └── BACKLOG.md         # Auto-generated backlog
├── .auth-states/          # Storage states (gitignored)
└── test-results/          # Test outputs (gitignored)
```

---

## Step 2: Configure Auth

Edit `artk-e2e/artk.config.yml`:

```yaml
schema: "2.0"

project:
  name: "ITSS"
  description: "IT Service Shop E2E Tests"

targets:
  - name: "iss-frontend"
    path: "../iss-frontend"
    type: "react-spa"
    environments:
      local:
        baseUrl: "http://localhost:5173"
      dev:
        baseUrl: "https://iss-dev.example.com"

auth:
  type: "oidc"
  provider: "keycloak"
  keycloak:
    realm: "REQ"
    clientId: "iss-frontend"
    authServerUrl: "http://localhost:8080"
  roles:
    - id: "admin"
      username: "${ARTK_ADMIN_USER}"
      password: "${ARTK_ADMIN_PASS}"
      keycloakRole: "00007A3H"
    - id: "hr_manager"
      username: "${ARTK_HR_USER}"
      password: "${ARTK_HR_PASS}"
      keycloakRole: "00007A3I"

test:
  tier: "release"
  stabilityPasses: 3
  authRetryOnce: true
```

Set environment variables (or use `.env` file):

```bash
export ARTK_ADMIN_USER="admin@test.local"
export ARTK_ADMIN_PASS="admin123"
export ARTK_HR_USER="hr@test.local"
export ARTK_HR_PASS="hr123"
```

---

## Step 3: Run Discovery (US7)

```bash
cd artk-e2e

# Run ARTK discover (via GitHub Copilot or Claude)
# Analyzes ITSS routes, components, and auth patterns
```

**Expected Output**: `docs/discovery/iss-frontend.md`

```markdown
# ITSS Frontend Discovery

## Routes Discovered
- /dashboard (auth required)
- /requests (auth required)
- /requests/:id (auth required)
- /admin (admin role required)

## Components
- RequestTable: data-testid="request-table"
- CreateRequestModal: data-testid="create-request-modal"
- RequestForm: data-testid="request-form"

## Auth Analysis
- Type: OIDC (Keycloak)
- Library: react-oauth2-code-pkce
- Token storage: localStorage
```

---

## Step 4: Propose Journeys (US8)

```bash
# Run ARTK journey-propose
# Generates MVP journey proposals based on discovery
```

**Expected Output**: `journeys/proposed/` contains 5+ files:

```
journeys/proposed/
├── JRN-ITSS-001-login-as-admin.md
├── JRN-ITSS-002-view-dashboard.md
├── JRN-ITSS-003-create-request.md
├── JRN-ITSS-004-view-request-details.md
└── JRN-ITSS-005-approve-request-as-hr.md
```

---

## Step 5: Define and Clarify Journeys (US9-US10)

For each proposed journey:

```bash
# Promote to defined (adds structure)
# Run: ARTK journey-define JRN-ITSS-001

# Add execution details (makes deterministic)
# Run: ARTK journey-clarify JRN-ITSS-001
```

**Example Clarified Journey** (`journeys/clarified/JRN-ITSS-001-login-as-admin.md`):

```yaml
---
id: JRN-ITSS-001
title: "Login as Admin"
status: clarified
tier: smoke
actor: admin
scope: auth
target: iss-frontend
keycloakRole: "00007A3H"
tests: []
---

# Login as Admin

## Purpose
Verify admin user can authenticate via Keycloak and access dashboard.

## Preconditions
- Keycloak is running
- Admin test account exists
- ITSS frontend is accessible

## Steps
1. Navigate to application root
2. System redirects to Keycloak login
3. Enter admin credentials
4. Submit login form
5. Wait for redirect to dashboard

## Expected Outcome
- User lands on /dashboard
- User info shows admin role
- No error toasts displayed

## Test Data
- Username: ${ARTK_ADMIN_USER}
- Password: ${ARTK_ADMIN_PASS}
```

---

## Step 6: Implement Journeys (US11)

```bash
# Generate Playwright tests from clarified journeys
# Run: ARTK journey-implement JRN-ITSS-001
```

**Expected Output**: `tests/auth/JRN-ITSS-001.spec.ts`

```typescript
import { test, expect } from '@artk/core/fixtures';
import { locate } from '@artk/core/locators';

/**
 * @journey JRN-ITSS-001
 * @title Login as Admin
 * @tier smoke
 */
test.describe('JRN-ITSS-001: Login as Admin', () => {
  test('admin can login and access dashboard', async ({ page, auth }) => {
    // Step 1-2: Navigate (auth fixture handles Keycloak redirect)
    await page.goto('/');

    // Step 3-4: Auth fixture handles login
    // (uses storage state from .auth-states/admin.json)

    // Step 5: Verify dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Step 6: Verify user info
    await expect(locate.byTestId('user-info')).toContainText('Admin');

    // No error toasts
    await expect(locate.byRole('alert')).not.toBeVisible();
  });
});
```

---

## Step 7: Validate Journeys (US12)

```bash
# Static validation (schema, linkage)
# Run: ARTK journey-validate JRN-ITSS-001
```

**Checks**:
- Journey frontmatter is valid
- Test file exists and has correct annotations
- No hardcoded URLs or credentials
- Uses ARTK locator patterns

---

## Step 8: Verify Journeys (US13)

```bash
# Runtime verification with stability check
# Run: ARTK journey-verify JRN-ITSS-001
```

**Process (per CLR-002)**:
1. Run test 3 times consecutively
2. All 3 must pass
3. On any failure: mark as not verified

**Expected Output**:
```
Running JRN-ITSS-001: Login as Admin
  Pass 1/3: ✓ (2.3s)
  Pass 2/3: ✓ (2.1s)
  Pass 3/3: ✓ (2.2s)

✓ Journey JRN-ITSS-001 verified (3/3 passes)
  Status updated: clarified → implemented
```

---

## Step 9: Document Learnings (US16)

Create `docs/PILOT_RETROSPECTIVE.md` with:

- What worked well
- Friction points
- Prompt improvements needed
- Gaps in @artk/core

---

## Troubleshooting

### Auth Failure (CLR-001)

If auth fails:
1. Check Keycloak is running: `curl http://localhost:8080/health`
2. Verify credentials: `cat artk.config.yml | grep username`
3. Check token expiry: Auth should retry once automatically
4. If retry fails: Clear `.auth-states/` and retry

### Test Instability (CLR-002)

If test fails stability check:
1. Run manually: `npx playwright test tests/auth/JRN-ITSS-001.spec.ts`
2. Check for timing issues (no `waitForTimeout`!)
3. Use explicit waits: `await expect(element).toBeVisible()`
4. If flaky: `/journey-maintain` to quarantine

### Frontend Detection Failed (CLR-003)

If `/init` can't detect framework:
1. Check `iss-frontend/package.json` exists
2. Verify React is in dependencies
3. Use interactive prompt to confirm/correct

---

## Next Steps

After completing pilot on ITSS:

1. **Document findings** in `PILOT_RETROSPECTIVE.md`
2. **Update prompts** based on friction points
3. **Prepare for rollout** to additional projects

---

*Quickstart complete. Run each step in sequence, validating output before proceeding.*
