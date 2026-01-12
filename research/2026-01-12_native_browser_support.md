# Native Browser Support for ARTK in Corporate Environments

**Date:** 2026-01-12
**Topic:** Using system-installed browsers (Chrome/Firefox) instead of Playwright's bundled browsers

---

## Problem Statement

Corporate environments may block installation of Playwright's bundled browsers due to:
- Admin privileges required for browser installation
- Security policies restricting automated downloads
- IT approval processes for new software

**Question:** Can ARTK work with native system browsers (Chrome/Firefox) without requiring Playwright browser installation?

---

## Solution 1: Native Chrome Browser (Recommended)

### Technical Feasibility: ✅ YES

Playwright supports using system-installed Chrome via the `channel` option:

```typescript
// In playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    channel: 'chrome', // Use system Chrome instead of bundled Chromium
  },
});
```

**Or per-project:**

```typescript
export default defineConfig({
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // System Chrome
      },
    },
  ],
});
```

### Supported Channels

| Channel | Browser | Source |
|---------|---------|--------|
| `chrome` | Google Chrome | System installation |
| `msedge` | Microsoft Edge | System installation |
| `chrome-beta` | Chrome Beta | System installation |
| `chrome-dev` | Chrome Dev | System installation |

### Will It Interfere with User's Manual Chrome Sessions?

**Answer: ❌ NO - Sessions are isolated**

**Why:**
1. **Separate User Data Directory**: Playwright launches Chrome with `--user-data-dir` pointing to a temporary directory
2. **Clean Profile**: Each Playwright test runs in a fresh browser profile
3. **No Shared State**: Cookies, extensions, history from user's manual Chrome session are NOT accessible
4. **Concurrent Execution**: User can browse Chrome manually while Playwright runs tests simultaneously

**Technical Details:**

When Playwright launches Chrome with `channel: 'chrome'`, it:
```bash
# Simplified launch command
chrome.exe \
  --user-data-dir=/tmp/playwright_chromium_<random> \
  --no-first-run \
  --disable-background-networking \
  # ... other isolation flags
```

The user's personal Chrome profile (at `%APPDATA%/Google/Chrome/User Data`) remains untouched.

### Advantages

✅ No Playwright browser download required
✅ Uses corporate-approved browser installation
✅ Chrome is almost always pre-installed in corporate environments
✅ Full Playwright API compatibility
✅ No session interference with user's manual browsing
✅ Automatic updates via IT-managed Chrome updates

### Disadvantages

⚠️ Requires Chrome to be installed (but usually is)
⚠️ Version may be controlled by IT (could lag behind latest)
⚠️ Slightly different behavior vs Chromium (rare edge cases)

---

## Solution 2: Native Firefox (Alternative)

### Technical Feasibility: ⚠️ LIMITED

**Playwright's Firefox architecture is different from Chrome/Edge:**

1. **Playwright patches Firefox**: Playwright uses a custom-patched Firefox build with Juggler protocol
2. **Native Firefox compatibility**: Limited - `channel: 'firefox'` does NOT exist
3. **Workaround**: Can use `executablePath` to point to system Firefox, but:
   - Requires Playwright's patched Firefox build (defeats the purpose)
   - System Firefox lacks Juggler protocol needed for Playwright automation
   - High risk of compatibility issues

**Verdict:** ❌ Native system Firefox is NOT a viable solution for bypassing Playwright browser downloads.

### Why Firefox Doesn't Work Like Chrome

| Aspect | Chrome/Edge | Firefox |
|--------|-------------|---------|
| Protocol | Chrome DevTools Protocol (CDP) | Juggler (Playwright custom) |
| Native support | ✅ System Chrome works via CDP | ❌ System Firefox lacks Juggler |
| Channel option | `channel: 'chrome'` supported | No `channel: 'firefox'` |
| Workaround | Not needed | Requires Playwright's patched build anyway |

---

## Solution 3: Microsoft Edge (Corporate-Friendly Alternative)

### Technical Feasibility: ✅ YES

Edge is Chromium-based and widely deployed in corporate environments:

```typescript
export default defineConfig({
  use: {
    channel: 'msedge', // Use system Microsoft Edge
  },
});
```

### Advantages

✅ Pre-installed on all Windows 10/11 corporate PCs
✅ IT-approved and managed
✅ Full Playwright compatibility (Chromium-based)
✅ No session interference (same isolation as Chrome)
✅ No additional downloads required

**Edge may be the BEST option for corporate environments** since it's guaranteed to be present and managed by IT.

---

## Recommended Configuration for Corporate Environments

### Option A: Chrome (if available)

```typescript
// artk-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    channel: 'chrome', // Use system Chrome
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // System Chrome
      },
    },
  ],
});
```

### Option B: Edge (most reliable for corporate)

```typescript
export default defineConfig({
  use: {
    channel: 'msedge', // Use system Edge
  },

  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],
});
```

### Option C: Fallback Chain (maximum compatibility)

```typescript
export default defineConfig({
  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge', // Try Edge first (most corporate-friendly)
      },
    },
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Fallback to Chrome
      },
    },
  ],
});
```

**Run specific browser:**
```bash
# Test with Edge
npx playwright test --project=edge

# Test with Chrome
npx playwright test --project=chrome
```

---

## Installation Impact

### Without `channel` option (default):
```bash
npx playwright install  # Downloads ~300MB of bundled browsers
```

### With `channel` option (corporate mode):
```bash
# No browser download needed!
npm install @playwright/test  # Only installs npm package (~50MB)
```

**Key point:** Setting `channel: 'chrome'` or `channel: 'msedge'` means you do NOT need to run `npx playwright install`.

---

## Implementation Checklist for ARTK

To support corporate environments without Playwright browser installation:

- [ ] Update `artk-e2e/playwright.config.ts` template to include `channel` option
- [ ] Add `channel` detection to bootstrap script (check if Chrome/Edge installed)
- [ ] Update `/artk.foundation-build` prompt to configure `channel` based on environment
- [ ] Document `channel` option in ARTK setup guides
- [ ] Add troubleshooting section for "browser not found" errors
- [ ] Consider environment variable: `ARTK_BROWSER_CHANNEL=chrome|msedge|auto`
- [ ] Update `artk.config.yml` schema to include browser channel preference

**Example config addition:**

```yaml
# artk-e2e/artk.config.yml
browser:
  channel: msedge  # Use system Edge instead of bundled browsers
  headless: false   # Show browser during test runs
```

---

## Testing Considerations

### Browser Version Consistency

**Challenge:** Corporate IT may control browser versions, causing inconsistency across team.

**Mitigation:**
1. Accept version variance as reality of corporate environments
2. Document minimum supported browser versions
3. Use feature detection instead of version detection in tests
4. Run CI/CD with bundled browsers for reproducibility (if possible)

### Debugging

**Challenge:** Developer's local Chrome profile is NOT used (intentional isolation).

**Solution:**
- Use `headless: false` to watch test execution
- Use Playwright Inspector: `npx playwright test --debug`
- Use `page.pause()` for interactive debugging
- Storage states (`.auth-states/*.json`) work identically with native browsers

---

## Final Recommendation

### ✅ YES - Native Chrome/Edge WILL work with ARTK

**Recommended approach:**

1. **Use `channel: 'msedge'` by default** (guaranteed on corporate Windows)
2. **Fallback to `channel: 'chrome'`** if Edge not available
3. **Update ARTK bootstrap to detect and configure automatically**
4. **Document corporate-mode installation** (skip `npx playwright install`)

### ❌ NO - User's manual Chrome sessions will NOT be affected

Playwright's browser isolation ensures:
- Separate user profiles
- No shared cookies/history
- No interference with manual browsing
- Concurrent execution is safe

### ⚠️ NO - Native Firefox is NOT a viable alternative

Firefox requires Playwright's patched build, which defeats the purpose of avoiding Playwright browser downloads.

---

## Implementation Status: Complete

Native browser channel support has been implemented in ARTK:

- Config schema now supports `browsers.channel` and `browsers.strategy`
- Bootstrap detects system browsers with timeout, logs metadata, and rolls back on failure
- Runtime validation checks the configured channel before tests run

## Next Steps

If you want to extend native browser support further:

1. Add browser version pinning and compatibility checks
2. Add per-browser channel configuration (chromium/firefox/webkit)
3. Add a dedicated health check command (e.g., `npx artk doctor`)
