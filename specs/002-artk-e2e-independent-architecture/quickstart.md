# Quickstart: ARTK E2E Independent Architecture

**Feature**: 002-artk-e2e-independent-architecture | **Time**: ~10 minutes

## Prerequisites

- Node.js 18.0.0+
- Git
- A monorepo with at least one frontend application (React, Vue, Angular, Next.js, Nuxt)

---

## Step 1: Initialize ARTK

From your project root:

```bash
/init --install-script /path/to/install-to-project.sh
```

ARTK will:
1. Detect your git root directory
2. Scan for frontend submodules using heuristics
3. Present discovered frontends for confirmation
4. Create `artk-e2e/` directory structure

**Example output:**
```
🔍 Scanning for frontends...

Detected frontends:
  1. iss-frontend/ (react-spa) [HIGH confidence]
     Signals: package.json:react, file:src/App.tsx

  2. iss-admin/ (react-spa) [HIGH confidence]
     Signals: package.json:react, dirname:admin

Include these as targets? (Y/n): y

✅ Created artk-e2e/
✅ Generated artk.config.yml
✅ Installed dependencies
✅ Installed Playwright browsers

Next: Run /discover to analyze your applications
```

---

## Step 2: Review Configuration

Open `artk-e2e/artk.config.yml` and customize:

```yaml
schemaVersion: "2.0"

project:
  name: my-project
  description: E2E tests for my project

targets:
  - name: user-portal
    path: ../iss-frontend
    type: react-spa
    environments:
      local:
        baseUrl: http://localhost:3000
      staging:
        baseUrl: https://staging.example.com

defaults:
  target: user-portal
  environment: local
```

**Key customizations:**
- Add staging/production URLs
- Configure authentication (see below)
- Adjust timeouts if needed

---

## Step 3: Configure Authentication (Optional)

If your app requires login, add auth configuration:

```yaml
auth:
  provider: oidc
  idpType: keycloak
  storageStateDir: .auth-states

  environments:
    local:
      loginUrl: http://localhost:8080/auth/realms/app/protocol/openid-connect/auth
    staging:
      loginUrl: https://auth.staging.example.com/realms/app/protocol/openid-connect/auth

  roles:
    standard-user:
      credentialsEnv:
        username: APP_USER
        password: APP_PASSWORD
    admin:
      credentialsEnv:
        username: APP_ADMIN
        password: APP_ADMIN_PASSWORD
```

Set environment variables:
```bash
export APP_USER="testuser@example.com"
export APP_PASSWORD="testpass123"
```

---

## Step 4: Discover Your Application

```bash
/discover
```

This analyzes your frontends and creates:
- `artk-e2e/docs/discovery/user-portal.md`
- Routes, components, auth flows
- Testability recommendations

---

## Step 5: Create Your First Journey

```bash
/journey-propose --target user-portal
```

Or create manually at `artk-e2e/journeys/user-portal/JRN-0001-login.md`:

```markdown
---
id: JRN-0001
title: User can log in successfully
target: user-portal
tier: smoke
status: defined
actor: standard-user
---

## Acceptance Criteria

- [ ] User sees login form
- [ ] User enters valid credentials
- [ ] User is redirected to dashboard
- [ ] User name is displayed in header

## Steps

1. Navigate to login page
2. Enter username and password
3. Click "Sign In"
4. Verify dashboard loads
5. Verify user name in header
```

---

## Step 6: Implement the Journey

```bash
/journey-implement JRN-0001
```

This generates `artk-e2e/tests/user-portal/jrn-0001-login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loadConfig, getAuthenticatedContext } from '@artk/core';

test.describe('JRN-0001: User can log in successfully', () => {
  test('login flow', async ({ page }) => {
    const config = loadConfig();
    await page.goto(config.getBaseUrl('user-portal'));

    // Test implementation...
  });
});
```

---

## Step 7: Run Tests

```bash
cd artk-e2e

# Run all tests
npm test

# Run tests for specific target
npm test -- --grep @user-portal

# Run against staging
ARTK_ENV=staging npm test

# Run in headed mode (visible browser)
npm run test:headed

# Open Playwright UI
npm run test:ui
```

---

## Directory Structure

After setup, your project looks like:

```
project-root/
├── iss-frontend/               # Your frontend (untouched)
├── iss-admin/                  # Another frontend (untouched)
└── artk-e2e/                   # Independent E2E suite
    ├── package.json            # Minimal deps
    ├── artk.config.yml         # Main configuration
    ├── playwright.config.ts    # Generated
    ├── .artk/
    │   └── context.json        # Inter-prompt context (committed)
    ├── journeys/
    │   └── user-portal/        # Journey definitions
    ├── tests/
    │   └── user-portal/        # Generated tests
    ├── docs/
    │   └── discovery/          # Discovery output
    └── .auth-states/           # Storage states (gitignored)
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./artk-e2e
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: 'recursive'

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
          APP_USER: ${{ secrets.TEST_USER }}
          APP_PASSWORD: ${{ secrets.TEST_PASSWORD }}

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: artk-e2e/playwright-report/
```

---

## Multiple Targets

Testing multiple frontends? Use the `--target` flag:

```bash
# Test specific target
npm test -- --grep @admin-portal

# Test all targets
npm test
```

In journeys, specify the target:

```yaml
---
id: JRN-0042
title: Admin can view user list
target: admin-portal  # <-- This Journey tests admin portal
tier: smoke
---
```

---

## Troubleshooting

### Detection didn't find my frontend

Provide the path manually during `/init`:
```
No frontends found. Enter path to frontend: ./my-app
```

### npm install fails

The artk-e2e directory is isolated from your main project. If npm fails:
```bash
cd artk-e2e
rm -rf node_modules package-lock.json
npm install
```

### Auth states conflict between targets

Auth states are stored per-target:
```
.auth-states/
├── user-portal/
│   └── standard-user.json
└── admin-portal/
    └── admin.json
```

### Windows path issues

ARTK uses Node.js `path` module for cross-platform compatibility. If you encounter issues:
1. Use forward slashes in config files
2. Run install script with PowerShell: `install-to-project.ps1`

---

## Next Steps

1. **Run `/discover`** to analyze your application
2. **Create journeys** for critical user flows
3. **Implement tests** with `/journey-implement`
4. **Add to CI/CD** with the GitHub Actions example above
5. **Set up auth** if your app requires login

For detailed documentation, see:
- `specs/002-artk-e2e-independent-architecture/spec.md`
- `specs/002-artk-e2e-independent-architecture/data-model.md`
