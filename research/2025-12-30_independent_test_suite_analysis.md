# Independent Test Suite Architecture Analysis

**Date:** 2025-12-30
**Topic:** Should ARTK tests be integrated into the target project or run as an independent submodule?

---

## Executive Summary

**The independent submodule approach is superior for E2E testing.**

E2E tests are fundamentally different from unit tests - they test a running application via HTTP/browser, not internal code. Integrating them into the application's `package.json` creates unnecessary coupling and dependency conflicts (as we just experienced with react-native/Font Awesome).

**Recommendation:** ARTK test suites should be self-contained directories with their own `package.json`, completely isolated from the target application's dependencies.

---

## The Problem We Just Experienced

```
npm error ERESOLVE could not resolve
npm error While resolving: react-native@0.82.1
npm error peerOptional @types/react@"^19.1.1" from react-native@0.82.1
...
npm error code E401 (Font Awesome private registry)
```

This happened because we tried to add `@artk/core` to the **same** `package.json` as a React Native web application. The dependency resolver tried to reconcile:
- React 18 (application)
- React Native 0.82 (application)
- Playwright 1.57+ (ARTK)
- Font Awesome Pro (application, private registry)

**These have nothing to do with each other.** E2E tests don't need React. They need a browser.

---

## Two Architectural Approaches

### Approach A: Integrated (Current)

```
my-app/
├── src/                    # Application code
├── package.json            # App + Test dependencies mixed
├── node_modules/           # Everything together (conflicts!)
├── playwright.config.ts    # Playwright config
└── tests/
    └── e2e/               # E2E tests
```

**How it works:**
- `@artk/core` added to app's `devDependencies`
- Tests share `node_modules` with application
- Single `npm install` for everything

### Approach B: Independent Submodule (Proposed)

```
my-app/
├── src/                    # Application code
├── package.json            # App dependencies ONLY
├── node_modules/           # App dependencies ONLY
└── e2e/                    # COMPLETELY INDEPENDENT
    ├── package.json        # Only test dependencies
    ├── node_modules/       # Isolated (no conflicts!)
    ├── artk.config.yml     # ARTK configuration
    ├── playwright.config.ts
    └── tests/
        └── journeys/       # Journey test files
```

**How it works:**
- `e2e/` is a self-contained project
- Has its own `package.json` with only: `@artk/core`, `@playwright/test`
- Runs independently: `cd e2e && npm test`
- Zero interaction with application's dependencies

---

## Detailed Comparison

| Aspect | Integrated | Independent |
|--------|------------|-------------|
| **Dependency conflicts** | Common (React versions, peer deps) | None - isolated |
| **npm install time** | Slower (resolves everything) | Fast (minimal deps) |
| **Maintenance** | Coupled to app upgrades | Independent lifecycle |
| **CI complexity** | Single pipeline | Can be separate |
| **Type sharing** | Easy (same project) | Requires explicit sharing |
| **Team ownership** | Dev team | QA team possible |
| **Playwright version** | Must match app constraints | Always latest |
| **Node version** | Must match app | Can differ |
| **Private registries** | Must authenticate | Not needed |

---

## Why E2E Tests Are Fundamentally Different

### Unit Tests (Should be integrated)
```typescript
// Testing internal code - needs access to source
import { calculateTotal } from '../src/utils/cart';

test('calculates total', () => {
  expect(calculateTotal([{price: 10}, {price: 20}])).toBe(30);
});
```
→ **Must** be in same project - imports source code directly.

### E2E Tests (Should be independent)
```typescript
// Testing running application - no source access needed
test('user can checkout', async ({ page }) => {
  await page.goto('https://my-app.com/cart');
  await page.click('button:text("Checkout")');
  await expect(page.locator('.confirmation')).toBeVisible();
});
```
→ **No imports from application** - tests via HTTP/browser only.

**Key insight:** E2E tests interact with the application the same way a user does - through the UI. They don't need `react`, `lodash`, or any application dependency. They need `playwright`.

---

## What ARTK Core Actually Needs

```json
{
  "dependencies": {
    "@playwright/test": "^1.57.0",
    "zod": "^3.22.4",
    "yaml": "^2.3.4",
    "otplib": "^12.0.1"
  }
}
```

That's it. **15 MB total.** No React, no build tools, no application framework.

Compare to a typical React app's `node_modules`: **500+ MB**.

---

## Proposed Architecture

### Directory Structure

```
my-app/
├── [application files...]
└── artk-e2e/                      # OR: e2e/, tests/, playwright/
    ├── package.json               # Minimal dependencies
    ├── package-lock.json
    ├── node_modules/              # ~15 MB, isolated
    ├── artk.config.yml            # ARTK configuration
    ├── playwright.config.ts       # Generated by ARTK
    ├── .auth-states/              # Storage states
    ├── journeys/                  # Journey markdown files
    │   ├── JRN-0001-login.md
    │   └── JRN-0002-checkout.md
    └── tests/                     # Generated Playwright tests
        ├── login.spec.ts
        └── checkout.spec.ts
```

### Minimal package.json

```json
{
  "name": "my-app-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@artk/core": "file:../vendor/artk-core",
    "@playwright/test": "^1.57.0"
  }
}
```

### Installation Script (Updated Approach)

```bash
#!/bin/bash
# Creates independent e2e directory in target project

TARGET="$1"
E2E_DIR="$TARGET/artk-e2e"

mkdir -p "$E2E_DIR"
cp -r "$ARTK_CORE/dist" "$E2E_DIR/vendor/artk-core/"
cp "$ARTK_CORE/package.json" "$E2E_DIR/vendor/artk-core/"

cat > "$E2E_DIR/package.json" << 'EOF'
{
  "name": "artk-e2e-tests",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@playwright/test": "^1.57.0"
  }
}
EOF

cd "$E2E_DIR"
npm install  # No conflicts - only 2 dependencies!
npx playwright install chromium
```

---

## CI/CD Integration

### Option 1: Separate Job (Recommended)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup E2E
        working-directory: ./artk-e2e
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Run E2E Tests
        working-directory: ./artk-e2e
        run: npm test
        env:
          APP_BASE_URL: ${{ secrets.STAGING_URL }}
          APP_USER: ${{ secrets.TEST_USER }}
          APP_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

### Option 2: Same Pipeline, Different Stage

```yaml
jobs:
  build:
    # ... build and deploy to staging

  e2e:
    needs: build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./artk-e2e  # Isolated directory
    steps:
      - run: npm ci && npm test
```

---

## Sharing Types (If Needed)

If tests need application types (rare for E2E), export them:

### In Application
```typescript
// src/types/index.ts - exported types only
export interface User {
  id: string;
  email: string;
}
```

### In E2E Tests
```typescript
// artk-e2e/tests/helpers/types.ts
// Copy or reference the few types needed
// OR: npm install ../app/dist/types (if published)
```

**In practice:** E2E tests rarely need application types. They work with:
- Locators (CSS selectors, roles, test IDs)
- URLs
- User credentials
- Expected text/values

---

## Migration Path

### For Existing Projects (iss-frontend)

1. **Create independent directory:**
   ```bash
   mkdir -p artk-e2e
   cd artk-e2e
   ```

2. **Initialize with minimal deps:**
   ```bash
   npm init -y
   npm install @playwright/test --save-dev
   # Install @artk/core via vendor script
   ```

3. **Move/create config:**
   ```bash
   mv ../artk.config.yml .
   mv ../playwright.config.ts .
   ```

4. **Update CI to run from `artk-e2e/`**

5. **Remove @artk/core from main package.json** (if it was added)

---

## Benefits Summary

### For Developers
- ✅ No dependency conflicts ever
- ✅ Faster `npm install` in main project
- ✅ Clear separation of concerns
- ✅ Can update Playwright independently

### For QA Teams
- ✅ Own the test suite without touching app code
- ✅ Don't need app development environment
- ✅ Can test multiple environments easily

### For CI/CD
- ✅ Parallel execution (tests while deploying)
- ✅ Smaller Docker images for test runners
- ✅ No private registry auth needed for tests

### For ARTK Core
- ✅ Simpler installation (no conflict resolution)
- ✅ Works with any project regardless of stack
- ✅ Can test multiple apps from one suite

---

## Conclusion

**The independent submodule approach is the correct architecture for E2E testing.**

The integration approach (adding to app's `package.json`) was a mistake born from treating E2E tests like unit tests. They're not. E2E tests are a **separate application** that interacts with your app through public interfaces.

**Action items:**
1. Update `install-to-project.sh` to create independent `artk-e2e/` directory
2. Update documentation to reflect this architecture
3. Test with iss-frontend using the new approach

---

## Appendix: When Integration Makes Sense

Integration **might** be appropriate when:
- Application has zero dependency conflicts (rare)
- Team explicitly wants single `package.json`
- Tests import significant application code (anti-pattern for E2E)
- Monorepo with proper workspace isolation

Even then, workspace isolation (`npm workspaces`, `pnpm`, `yarn workspaces`) effectively creates the same separation.
