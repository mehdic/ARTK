# Playwright Migration: @playwright/test → playwright-chromium

**Date:** 2026-01-08
**Topic:** Architectural analysis of migrating from @playwright/test to playwright-chromium

---

## Executive Summary

**Proposal:** Replace `@playwright/test` (v1.40) with `playwright-chromium` (v1.57.0) which bundles Chromium browser in the package.

**Recommendation:** ⚠️ **DO NOT MIGRATE** - Multiple critical issues identified.

---

## Package Comparison

### Current: @playwright/test v1.40

**What it is:**
- Official Playwright test runner
- Browser binaries installed separately via `npx playwright install chromium`
- Supports all browsers (Chromium, Firefox, WebKit)

**Installation:**
```bash
npm install @playwright/test
npx playwright install chromium
```

**Package size:** ~2MB (test runner only, browsers separate)

### Proposed: playwright-chromium v1.57.0

**What it is:**
- Playwright library with Chromium browser bundled
- No separate browser installation needed
- Chromium only (no Firefox, WebKit)

**Installation:**
```bash
npm install playwright-chromium
```

**Package size:** ~300MB (includes Chromium browser)

---

## Critical Issues

### Issue 1: playwright-chromium is NOT a Test Runner

**The fundamental problem:**
- `playwright-chromium` is the **browser automation library**
- `@playwright/test` is the **test runner** with fixtures, assertions, reporters
- They serve different purposes

**What this means:**
```javascript
// Current code (works):
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle('Example');
});

// With playwright-chromium (BREAKS):
import { chromium } from 'playwright-chromium';
// No 'test' or 'expect' exports!
// No fixtures like { page }!
// No test runner at all!
```

**You would have to:**
1. Choose a different test runner (Jest, Mocha, etc.)
2. Manually create browser instances
3. Rewrite all tests to not use Playwright Test fixtures
4. Lose parallel execution, retries, screenshots on failure, etc.

### Issue 2: API Incompatibility

**Import paths would break:**
```javascript
// Current:
import { test, expect } from '@playwright/test';

// After migration (REQUIRED):
import { chromium } from 'playwright-chromium';
// But no test runner! Would need:
import { describe, it } from 'mocha'; // or jest
import { expect } from 'chai'; // different assertion library
```

**Every single test file would need rewriting.**

### Issue 3: Loss of Test Runner Features

**What we lose:**
- ❌ Playwright Test fixtures (`page`, `context`, `browser`)
- ❌ Built-in assertions (`expect(page).toHaveTitle()`)
- ❌ Parallel test execution
- ❌ Automatic retries on failure
- ❌ Screenshots/videos on failure
- ❌ HTML/JSON/JUnit reporters
- ❌ Test annotations (@slow, @fixme, etc.)
- ❌ Before/after hooks
- ❌ Test isolation

**These are core features ARTK relies on.**

### Issue 4: Version Upgrade Risk

**Version jump:** 1.40 → 1.57 (17 minor versions)

**Potential breaking changes:**
- API changes
- Configuration format changes
- Selector engine changes
- Deprecated methods removed

**We would need to:**
1. Review changelog for 17 releases
2. Test all existing tests
3. Update code for breaking changes
4. Update documentation

---

## Impact Analysis

### Files Requiring Changes

#### Core Library Files
```
core/typescript/package.json              # Change dependency
core/typescript/src/auth/*.ts             # Update imports
core/typescript/src/config/*.ts           # Update imports
core/typescript/src/fixtures/*.ts         # Rewrite (no fixtures in playwright-chromium)
```

#### Bootstrap Templates
```
scripts/bootstrap.sh                       # Remove 'npx playwright install'
scripts/bootstrap.ps1                      # Remove 'npx playwright install'
templates/package.json                     # Change dependency
templates/playwright.config.ts             # Rewrite config (different format)
```

#### Tests
```
core/typescript/autogen/tests/*.ts         # Rewrite all tests
ALL client project tests                   # Every test file breaks
```

#### Documentation
```
CLAUDE.md                                  # Update all references
README.md                                  # Update installation
prompts/artk.*.prompt.md                   # Update all prompts
docs/*.md                                  # Update all docs
```

**Estimated files affected:** 50+ files

---

## Alternative: What User Probably Wants

### Actual Problem (Hypothesis)

User might be trying to solve one of these:
1. **Simplify installation** - Remove separate browser download step
2. **Reduce dependencies** - One package instead of two steps
3. **Offline installation** - Bundle browser for air-gapped environments
4. **Specific Chromium version** - Lock browser version

### Better Solutions

#### Solution 1: Use @playwright/test with Bundled Browsers (Official Way)

Playwright already supports bundling browsers with the package:

```json
// package.json
{
  "dependencies": {
    "@playwright/test": "^1.57.0"
  },
  "scripts": {
    "postinstall": "npx playwright install chromium --with-deps"
  }
}
```

**Pros:**
- Keep all Playwright Test features
- Still get bundled browser (via postinstall)
- Upgrade to v1.57 (if desired)
- No code changes

**Cons:**
- Still requires separate install step (but automated)

#### Solution 2: Upgrade @playwright/test to v1.57

If the goal is just to get the latest version:

```json
{
  "dependencies": {
    "@playwright/test": "^1.57.0"
  }
}
```

**Pros:**
- Keep all existing code
- Get latest features/fixes
- Minimal migration effort

**Cons:**
- Still have separate browser installation
- May have breaking changes from 1.40 → 1.57

#### Solution 3: Docker/Containerization

For offline/air-gapped environments:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.57.0-focal
COPY . /app
WORKDIR /app
RUN npm install
```

**Pros:**
- Browser pre-installed
- Reproducible environment
- Works offline

**Cons:**
- Requires Docker
- Different workflow

---

## Migration Effort Comparison

### Option A: Migrate to playwright-chromium
**Effort:** 🔴 **MASSIVE** (40+ hours)
- Rewrite all tests (~100+ test files)
- Choose and integrate new test runner
- Rewrite fixtures and helpers
- Update all documentation
- Re-test entire suite
- Update all prompts

**Risk:** 🔴 **EXTREME**
- Breaking all existing tests
- Losing critical features
- Client projects break
- Unknown compatibility issues

**Benefit:** ⚠️ **MINIMAL**
- Simpler npm install (only benefit)
- But lose test runner features

### Option B: Upgrade @playwright/test to v1.57
**Effort:** 🟡 **MODERATE** (4-8 hours)
- Review changelog
- Test existing tests
- Fix breaking changes (if any)
- Update documentation

**Risk:** 🟡 **LOW-MODERATE**
- Version upgrade within same package
- Breaking changes documented
- Can roll back easily

**Benefit:** ✅ **HIGH**
- Latest features and fixes
- Security updates
- Better performance
- Same API

### Option C: Keep @playwright/test v1.40 + postinstall
**Effort:** 🟢 **MINIMAL** (30 minutes)
- Add postinstall script
- Update documentation

**Risk:** 🟢 **MINIMAL**
- No code changes
- Same version

**Benefit:** 🟢 **MODERATE**
- Simpler installation
- Browser auto-installed

---

## Technical Deep Dive

### Why playwright-chromium Exists

**Use case:** Browser automation library for **non-test** scenarios:
- Web scraping
- PDF generation
- Screenshot services
- Browser automation in Node.js apps

**NOT designed for:** Test frameworks

### Package Family

```
playwright              # All browsers (Chromium, Firefox, WebKit)
playwright-chromium     # Chromium only
playwright-firefox      # Firefox only
playwright-webkit       # WebKit only
@playwright/test        # Test runner (uses playwright internally)
```

### What @playwright/test Does

```javascript
// @playwright/test = playwright + test runner + fixtures + assertions

import { chromium } from 'playwright'; // Under the hood
import { test } from './test-runner';  // Adds test framework
import { expect } from './matchers';   // Adds assertions
import { fixtures } from './fixtures'; // Adds page, context, etc.
```

**You can't replace the test runner with the automation library.**

---

## Recommendation: Three-Tier Approach

### Tier 1: Immediate (Do Now)
**Simplify installation with postinstall hook**

```json
// core/typescript/package.json
{
  "scripts": {
    "postinstall": "playwright install chromium --with-deps"
  }
}
```

**Changes required:**
- ✅ One line in package.json
- ✅ Update bootstrap scripts to skip manual `npx playwright install`
- ✅ Update documentation

**Benefits:**
- ✅ Browser installs automatically with `npm install`
- ✅ No code changes
- ✅ Same version (1.40)
- ✅ Keep all features

### Tier 2: Short-term (Next Sprint)
**Upgrade @playwright/test to v1.57 (if breaking changes acceptable)**

**Steps:**
1. Review [Playwright changelog](https://github.com/microsoft/playwright/releases) from 1.40 → 1.57
2. Test in development environment
3. Fix breaking changes
4. Update dependencies
5. Update documentation

**Risk mitigation:**
- Create feature branch
- Test thoroughly before merging
- Document breaking changes
- Provide migration guide for clients

### Tier 3: Future (If Needed)
**Container/Docker approach for air-gapped environments**

Only if users request offline installation support.

---

## What User Probably Meant

Given the context, I believe the user wants:

**Goal:** Simpler installation without separate browser download step

**Misunderstanding:** Thought `playwright-chromium` was an alternative to `@playwright/test`

**Actual solution:** Use postinstall hook with `@playwright/test`

---

## Questions for User

Before proceeding, clarify:

1. **What problem are you trying to solve?**
   - Simpler installation?
   - Offline installation?
   - Specific Chromium version?
   - Reduce package count?

2. **Are you aware playwright-chromium is NOT a test runner?**
   - It doesn't include `test`, `expect`, fixtures
   - Would require rewriting all tests
   - Would need different test framework (Jest/Mocha)

3. **Would postinstall hook solve your problem?**
   - Browser installs automatically with `npm install`
   - No code changes
   - Keep all Playwright Test features

4. **Do you want to upgrade to v1.57?**
   - Independent of the chromium-bundling question
   - May have breaking changes
   - Latest features and fixes

---

## Final Recommendation

**DO NOT migrate to playwright-chromium.**

**Instead:**

1. **Add postinstall hook** to automate browser installation
2. **Consider upgrading** @playwright/test to v1.57 (separate decision)
3. **Document** the simplified installation process

**Rationale:**
- playwright-chromium lacks test runner capabilities
- Would break all existing tests
- Loses critical features ARTK depends on
- Minimal benefit for massive migration cost
- postinstall hook achieves the same goal (simpler installation)

---

## Code Example: Postinstall Approach

### core/typescript/package.json
```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "playwright install chromium --with-deps",
    "test": "playwright test"
  },
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "zod": "^3.22.4",
    "yaml": "^2.3.4",
    "otplib": "^12.0.1"
  }
}
```

### Updated Installation (User Experience)

**Before:**
```bash
npm install
npx playwright install chromium  # Manual step
```

**After:**
```bash
npm install  # Browser installs automatically
```

**Result:** Same goal achieved, zero code changes, all features retained.
