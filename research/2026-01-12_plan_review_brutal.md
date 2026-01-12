# Brutal Review: Browser Fallback Implementation Plan

**Plan File:** `/Users/chaouachimehdi/.claude/plans/ethereal-imagining-manatee.md`
**Reviewer:** Claude (Ultrathink Mode)
**Date:** 2026-01-12

---

## Executive Summary

The plan is **fundamentally sound** but has **23 critical/major issues** that could cause production breakage, user frustration, and maintenance nightmares. The implementation is ~60% complete - it handles the happy path well but fails on edge cases, error handling, and user experience.

**Overall Grade: C+ (functional but fragile)**

---

## CRITICAL ISSUES (Must Fix Before Implementation)

### 🔴 ISSUE #1: Config Idempotency Violation

**Problem:** The sed command inserts `channel:` line EVERY time bootstrap runs, creating duplicates.

```bash
# Line 244-256 in plan
if [ "$BROWSER_STRATEGY" != "bundled" ]; then
    sed -i '' "/^  enabled:/a\\
  channel: $BROWSER_STRATEGY
" "$ARTK_E2E/artk.config.yml"
fi
```

**Scenario:**
1. First run: Adds `channel: msedge` ✅
2. User re-runs bootstrap (e.g., after git pull)
3. Second run: Adds `channel: msedge` AGAIN ❌
4. Config now has TWO `channel:` lines → Zod validation fails

**Fix:** Check if channel already exists:
```bash
if [ "$BROWSER_STRATEGY" != "bundled" ]; then
    # Only add if channel doesn't exist
    if ! grep -q "^  channel:" "$ARTK_E2E/artk.config.yml"; then
        sed -i '' "/^  enabled:/a\\
  channel: $BROWSER_STRATEGY
" "$ARTK_E2E/artk.config.yml"
    else
        # Update existing channel value
        sed -i '' "s/^  channel:.*/  channel: $BROWSER_STRATEGY/" "$ARTK_E2E/artk.config.yml"
    fi
fi
```

**Severity:** CRITICAL - Breaks existing installations on re-run.

---

### 🔴 ISSUE #2: Config Mutation is Fragile

**Problem:** Using sed to modify YAML is error-prone and assumes specific formatting.

**Assumptions that will break:**
- YAML uses exactly 2 spaces (what if 4 spaces or tabs?)
- `enabled:` appears exactly once
- No comments on the same line as `enabled:`
- No complex YAML structures (anchors, multi-line, etc.)

**Example that breaks:**
```yaml
browsers:
  enabled: ['chromium']  # Production browser
```

Sed inserts AFTER the line, but comment might interfere.

**Better Solution:** Pass channel to config generator instead of mutating after generation.

**Proposed Fix:**
1. Add `--browser-channel` flag to config generator
2. Generate config with channel already set
3. No mutation needed

**Severity:** CRITICAL - Config corruption risk, especially with user customizations.

---

### 🔴 ISSUE #3: Browser Detection is Unreliable

**Problems with current detection:**

1. **File existence ≠ Runnable**
   ```bash
   if [ -f "/Applications/Microsoft Edge.app/..." ]; then
       echo "msedge"
       return 0
   fi
   ```
   File might exist but:
   - Permissions issue (can't execute)
   - Corrupted installation
   - Quarantined by IT policy

2. **`--version` might hang**
   ```bash
   if microsoft-edge --version >/dev/null 2>&1; then
   ```
   No timeout! Could hang bootstrap indefinitely.

3. **Missing browser locations:**
   - Snap: `/snap/bin/chromium`
   - Flatpak: `/var/lib/flatpak/exports/bin/com.google.Chrome`
   - WSL: `/mnt/c/Program Files/...` (Windows browsers from Linux)
   - Homebrew Cask: Different macOS paths
   - Per-user installs: `~/.local/bin/chrome`

**Fix:**
```bash
detect_available_browser() {
    local timeout_cmd="timeout 5s"  # 5-second timeout

    # Try Edge
    for edge_cmd in microsoft-edge "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
        if command -v "$edge_cmd" >/dev/null 2>&1 || [ -x "$edge_cmd" ]; then
            if $timeout_cmd "$edge_cmd" --version >/dev/null 2>&1; then
                echo "msedge"
                return 0
            fi
        fi
    done

    # Try Chrome (expanded paths)
    for chrome_cmd in google-chrome google-chrome-stable \
                      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
                      "/snap/bin/chromium" \
                      "/var/lib/flatpak/exports/bin/com.google.Chrome"; do
        if command -v "$chrome_cmd" >/dev/null 2>&1 || [ -x "$chrome_cmd" ]; then
            if $timeout_cmd "$chrome_cmd" --version >/dev/null 2>&1; then
                echo "chrome"
                return 0
            fi
        fi
    done

    echo "bundled"
    return 0
}
```

**Severity:** CRITICAL - False positives cause test failures.

---

### 🔴 ISSUE #4: Channel vs Browser Type Semantic Confusion

**Problem:** `channel: 'msedge'` conflicts with `enabled: ['chromium']`.

Edge IS Chromium-based, but this creates confusion:
- User sees `enabled: ['chromium']` and thinks bundled Chromium
- Config actually uses Edge
- User adds `enabled: ['firefox']` and wonders why Edge is still used

**Playwright's behavior:**
```typescript
use: {
  browserName: 'chromium',  // From enabled
  channel: 'msedge',        // From channel
}
```

This works, but semantics are confusing.

**Better Design:**
```yaml
browsers:
  enabled: ['chromium']
  channel: msedge  # Source: 'bundled' | 'msedge' | 'chrome' | ...

  # OR more explicit:
  chromium:
    channel: msedge  # Use Edge for Chromium tests
  firefox:
    channel: bundled  # Use bundled Firefox
```

**Fix:** Add validation that channel is compatible with enabled browser:
```typescript
if (config.browsers.channel === 'msedge' || config.browsers.channel === 'chrome') {
  if (!config.browsers.enabled.includes('chromium')) {
    throw new Error(`channel '${config.browsers.channel}' requires 'chromium' in enabled browsers`);
  }
}
```

**Severity:** MAJOR - User confusion, incorrect test setups.

---

### 🔴 ISSUE #5: No Runtime Validation

**Problem:** User sets `channel: msedge`, then Edge gets uninstalled. Tests fail with cryptic error:

```
Error: browserType.launch: Executable doesn't exist at /usr/bin/microsoft-edge
```

**User Experience:** 😡 "Why is ARTK broken? I didn't change anything!"

**Fix:** Add runtime validation in Playwright config:
```typescript
// In artk-e2e/playwright.config.ts (generated)
import { validateBrowserChannel } from '@artk/core/harness';

export default defineConfig({
  async globalSetup() {
    const config = await loadArtkConfig();
    if (config.browsers.channel && config.browsers.channel !== 'bundled') {
      const validation = await validateBrowserChannel(config.browsers.channel);
      if (!validation.available) {
        throw new Error(
          `Configured browser '${config.browsers.channel}' not available: ${validation.reason}\n` +
          `Solutions:\n` +
          `  1. Install ${config.browsers.channel}\n` +
          `  2. Remove 'channel' from artk.config.yml to use bundled browser`
        );
      }
    }
  },
  // ... rest of config
});
```

**Severity:** MAJOR - Poor error messages, user frustration.

---

### 🔴 ISSUE #6: Playwright Install Error Handling is Weak

**Problem:** Line 221 in plan:
```bash
if npx playwright install chromium 2>&1; then
```

This redirects stderr but doesn't actually capture the output. If there's a permission error or network timeout, this might:
- Exit with code 0 (false positive)
- Hang indefinitely (no timeout)
- Download 50% and fail (no cleanup)

**Fix:**
```bash
install_bundled_chromium() {
    local install_output
    local exit_code

    # Capture both stdout and stderr
    install_output=$(npx playwright install chromium 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        # Verify browser actually installed
        if npx playwright install chromium --dry-run 2>&1 | grep -q "is already installed"; then
            return 0
        fi
    fi

    # Installation failed
    echo -e "${RED}Bundled Chromium installation failed:${NC}"
    echo "$install_output" | tail -5  # Show last 5 lines of error
    return 1
}

# Usage:
if install_bundled_chromium; then
    BROWSER_STRATEGY="bundled"
else
    # Detect system browsers...
fi
```

**Severity:** CRITICAL - Silent failures, corrupt installs.

---

### 🔴 ISSUE #7: No CI Environment Detection Beyond $CI

**Problem:** Line 206 checks only `$CI` variable, but CI environments use different variables:

| CI System | Variable |
|-----------|----------|
| GitHub Actions | `GITHUB_ACTIONS=true` |
| GitLab CI | `GITLAB_CI=true` |
| Jenkins | `JENKINS_HOME=/var/jenkins` |
| CircleCI | `CIRCLECI=true` |
| Travis CI | `TRAVIS=true` |
| Azure Pipelines | `TF_BUILD=True` |

**User Experience:** Corporate CI uses Jenkins, doesn't set `$CI`, uses system Edge, tests fail in CI but pass locally.

**Fix:**
```bash
is_ci_environment() {
    [ -n "$CI" ] || \
    [ -n "$GITHUB_ACTIONS" ] || \
    [ -n "$GITLAB_CI" ] || \
    [ -n "$JENKINS_HOME" ] || \
    [ -n "$CIRCLECI" ] || \
    [ -n "$TRAVIS" ] || \
    [ -n "$TF_BUILD" ] || \
    [ "$USER" = "jenkins" ] || \
    [ "$USER" = "gitlab-runner" ]
}

if is_ci_environment; then
    echo -e "${CYAN}CI detected - using bundled browsers for reproducibility${NC}"
    BROWSER_STRATEGY="bundled"
fi
```

**Severity:** MAJOR - CI failures, flaky tests.

---

## MAJOR ISSUES (Should Fix)

### 🟠 ISSUE #8: No Backward Compatibility Migration

**Problem:** Existing ARTK projects have no `channel` field. After upgrading @artk/core:
- Schema validation still passes (field is optional) ✅
- But user doesn't know they can use system browsers ❌
- No guidance on migration

**Fix:** Add migration guide to CLAUDE.md:

```markdown
## Upgrading to Browser Channel Support (v1.1+)

After upgrading, you can use system browsers instead of bundled:

1. **Automatic**: Re-run bootstrap (handles migration automatically)
   ```bash
   /path/to/ARTK/scripts/bootstrap.sh .
   ```

2. **Manual**: Edit `artk.config.yml`:
   ```yaml
   browsers:
     enabled: ['chromium']
     channel: msedge  # NEW: Use system Edge instead of bundled
   ```

3. **Validation**: Run health check
   ```bash
   cd artk-e2e && npx playwright test --list
   ```
```

**Severity:** MAJOR - Poor upgrade experience.

---

### 🟠 ISSUE #9: No Rollback Mechanism

**Problem:** Bootstrap fails halfway:
1. npm install succeeds ✅
2. Bundled browser install fails ❌
3. sed updates config with `channel: msedge` ✅
4. But Edge detection fails (not actually installed) ❌
5. Bootstrap exits with error
6. **User is left with broken config**

**Fix:** Use trap to cleanup on error:
```bash
cleanup_on_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Bootstrap failed, rolling back config changes...${NC}"
        if [ -f "$ARTK_E2E/artk.config.yml.backup" ]; then
            mv "$ARTK_E2E/artk.config.yml.backup" "$ARTK_E2E/artk.config.yml"
        fi
    fi
}

trap cleanup_on_error EXIT

# Before modifying config:
cp "$ARTK_E2E/artk.config.yml" "$ARTK_E2E/artk.config.yml.backup"

# ... modify config ...

# On success:
rm -f "$ARTK_E2E/artk.config.yml.backup"
```

**Severity:** MAJOR - User stuck with broken setup.

---

### 🟠 ISSUE #10: No User Override for Browser Preference

**Problem:** User wants to force bundled browser even when Edge is available (e.g., for version consistency), but has no way to express this preference.

**Fix:** Add `browserStrategy` preference:
```yaml
browsers:
  enabled: ['chromium']
  strategy: auto  # auto | prefer-bundled | prefer-system | bundled-only | system-only
  channel: msedge  # Auto-detected or user-specified
```

Bootstrap respects this:
```bash
# Read strategy from existing config (if re-running bootstrap)
BROWSER_STRATEGY_PREF=$(grep "^  strategy:" "$ARTK_E2E/artk.config.yml" | awk '{print $2}' || echo "auto")

if [ "$BROWSER_STRATEGY_PREF" = "bundled-only" ]; then
    # Force bundled regardless of system browsers
    npx playwright install chromium
    BROWSER_STRATEGY="bundled"
elif [ "$BROWSER_STRATEGY_PREF" = "system-only" ]; then
    # Skip bundled install entirely
    DETECTED_BROWSER=$(detect_available_browser)
    # ... use detected ...
else
    # auto or prefer-bundled or prefer-system
    # ... existing fallback logic ...
fi
```

**Severity:** MAJOR - No user control over important decision.

---

### 🟠 ISSUE #11: Windows Browser Paths Incomplete

**Problem:** PowerShell detection only checks:
- `Program Files (x86)`
- `Program Files`
- `LOCALAPPDATA`

**Missing:**
- Per-user installs: `$env:USERPROFILE\AppData\Local\...`
- Edge Beta/Dev/Canary: `msedge-beta.exe`, `msedge-dev.exe`
- Chrome Beta/Dev/Canary: `chrome-beta.exe`, etc.
- Portable installs (USB drives, custom locations)
- Chocolatey installs: Different paths

**Fix:** Expand detection:
```powershell
function Resolve-AvailableBrowser {
    # Edge variants
    $edgePaths = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
        "${env:LOCALAPPDATA}\Microsoft\Edge\Application\msedge.exe",
        "${env:USERPROFILE}\AppData\Local\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($path in $edgePaths) {
        if (Test-BrowserExecutable $path) {
            return "msedge"
        }
    }

    # Chrome variants (stable, beta, dev, canary)
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
        "${env:USERPROFILE}\AppData\Local\Google\Chrome\Application\chrome.exe",
        "C:\Program Files\Google\Chrome\Application\chrome.exe"  # Absolute fallback
    )

    foreach ($path in $chromePaths) {
        if (Test-BrowserExecutable $path) {
            return "chrome"
        }
    }

    return "bundled"
}

function Test-BrowserExecutable($path) {
    if (-not (Test-Path $path)) { return $false }
    try {
        $job = Start-Job -ScriptBlock { & $using:path --version } -ErrorAction Stop
        $completed = Wait-Job $job -Timeout 5
        if ($completed) {
            $output = Receive-Job $job
            Remove-Job $job
            return $output -match "^\d+\."  # Version starts with number
        } else {
            Remove-Job $job -Force
            return $false
        }
    } catch {
        return $false
    }
}
```

**Severity:** MAJOR - False negatives on Windows.

---

### 🟠 ISSUE #12: No Logging/Metadata for Debugging

**Problem:** User reports "tests don't work", but we don't know:
- Which browser was detected during bootstrap?
- What version?
- When was detection done?
- What strategy was chosen?

**Fix:** Store metadata in `.artk/context.json`:
```json
{
  "version": "1.0",
  "browser": {
    "strategy": "system",
    "channel": "msedge",
    "detected_at": "2026-01-12T10:30:00Z",
    "version": "130.0.2849.68",
    "path": "/usr/bin/microsoft-edge",
    "detection_log": [
      "Checked release cache: unavailable",
      "Attempted bundled install: failed (permission denied)",
      "Detected Edge: /usr/bin/microsoft-edge v130.0.2849.68",
      "Selected strategy: msedge"
    ]
  }
}
```

Bootstrap appends to this log, making debugging trivial.

**Severity:** MAJOR - Poor debugging experience.

---

## MEDIUM ISSUES (Nice to Have)

### 🟡 ISSUE #13: Type Safety for channel Field

**Problem:** `UseOptions.channel` is `string?` but Playwright actually accepts:
```typescript
type Channel = 'chrome' | 'chrome-beta' | 'chrome-dev' | 'chrome-canary' | 'msedge' | 'msedge-beta' | 'msedge-dev';
```

**Fix:** Import Playwright's type:
```typescript
import type { BrowserChannel as PlaywrightChannel } from 'playwright-core';

export interface UseOptions {
  readonly channel?: PlaywrightChannel;
  // ...
}
```

**Severity:** MEDIUM - Better type safety.

---

### 🟡 ISSUE #14: No Playwright Version Compatibility Check

**Problem:** Older Playwright versions might not support `channel` option.

`channel` option was added in Playwright 1.19. ARTK uses 1.57, so safe, but future-proofing:

**Fix:**
```typescript
import { version as playwrightVersion } from 'playwright-core/package.json';

function validateChannelSupport(channel?: string) {
  if (!channel || channel === 'bundled') return;

  const [major, minor] = playwrightVersion.split('.').map(Number);
  if (major < 1 || (major === 1 && minor < 19)) {
    throw new Error(
      `Playwright ${playwrightVersion} doesn't support 'channel' option (requires 1.19+)\n` +
      `Upgrade Playwright or remove 'channel' from config`
    );
  }
}
```

**Severity:** MEDIUM - Rare but confusing when it happens.

---

### 🟡 ISSUE #15: No Support for Browser-Specific Launch Args

**Problem:** System browsers might need custom flags:
- `--disable-gpu` for headless in certain environments
- `--no-sandbox` for Docker
- `--disable-dev-shm-usage` for limited /dev/shm

**Fix:** Add to config:
```yaml
browsers:
  enabled: ['chromium']
  channel: msedge
  launchArgs:
    - --disable-gpu
    - --no-sandbox
```

Then in harness:
```typescript
use: {
  channel: config.browsers.channel,
  launchOptions: {
    args: config.browsers.launchArgs || [],
  },
},
```

**Severity:** MEDIUM - Limits advanced use cases.

---

## LOW ISSUES (Polish)

### 🟢 ISSUE #16: Error Messages Could Be More Helpful

**Current:**
```
ERROR: No browsers available (bundled install failed, no Edge/Chrome found)
Please install Microsoft Edge or Google Chrome manually
```

**Better:**
```
ERROR: No browsers available

ARTK tried:
  1. Pre-built browser cache from GitHub releases: Unavailable
  2. Bundled Chromium install: Failed (permission denied)
  3. System Microsoft Edge: Not found
  4. System Google Chrome: Not found

Solutions:
  1. Install Microsoft Edge: https://microsoft.com/edge
  2. Install Google Chrome: https://google.com/chrome
  3. Grant permissions for Playwright to install bundled browsers
  4. Ask your IT admin for help

For more help: https://github.com/your-org/ARTK/wiki/Browser-Setup
```

**Severity:** LOW - UX improvement.

---

### 🟢 ISSUE #17: No Health Check Command

**Problem:** Users want to validate their setup without running tests.

**Fix:** Add `npx artk doctor` command:
```typescript
// core/typescript/cli/doctor.ts
export async function runHealthCheck() {
  console.log('🔍 ARTK Health Check\n');

  const config = await loadArtkConfig();

  // Check 1: Config valid
  console.log('✅ Configuration valid');

  // Check 2: Browser available
  if (config.browsers.channel) {
    const browserCheck = await validateBrowserChannel(config.browsers.channel);
    if (browserCheck.available) {
      console.log(`✅ Browser '${config.browsers.channel}' available (${browserCheck.version})`);
    } else {
      console.log(`❌ Browser '${config.browsers.channel}' NOT available: ${browserCheck.reason}`);
    }
  } else {
    console.log('✅ Using bundled browsers');
  }

  // Check 3: Storage states
  // Check 4: Dependencies
  // ...
}
```

**Severity:** LOW - Convenience feature.

---

## MISSING FEATURES

### 1. **Multi-Browser Channel Support**

Current design only allows ONE channel for ALL browsers:
```yaml
browsers:
  enabled: ['chromium', 'firefox']
  channel: msedge  # But this only applies to Chromium!
```

**Better:**
```yaml
browsers:
  chromium:
    channel: msedge
  firefox:
    channel: bundled
  webkit:
    channel: bundled
```

---

### 2. **Browser Version Pinning**

System browsers update automatically, tests might break.

**Feature:**
```yaml
browsers:
  channel: msedge
  version:
    min: "120.0.0"
    max: "130.0.0"
  onVersionMismatch: warn | error | ignore
```

---

### 3. **Graceful Degradation at Test Time**

If system browser fails at test runtime, fallback to bundled:

```typescript
// In global setup
try {
  await browser.launch({ channel: config.browsers.channel });
} catch (error) {
  console.warn(`Failed to launch ${config.browsers.channel}, falling back to bundled`);
  config.browsers.channel = undefined;
}
```

---

### 4. **Browser Detection Dry-Run Mode**

Let users test detection without actually modifying config:

```bash
./scripts/bootstrap.sh --detect-only
# Output:
# Browser Detection Results:
#   Microsoft Edge: Found (/usr/bin/microsoft-edge v130.0)
#   Google Chrome: Found (/usr/bin/google-chrome v131.0)
#   Recommended: msedge
```

---

## DESIGN INCONSISTENCIES

### 1. **Bundled as Enum Value vs Undefined**

Plan says:
- `channel: undefined` = bundled
- But also adds `'bundled'` as enum value

**Why both?** Pick one:
- **Option A:** `undefined` means bundled, remove `'bundled'` from enum
- **Option B:** Always set channel explicitly (`'bundled'`, `'msedge'`, etc.), never undefined

I prefer **Option B** for explicitness.

---

### 2. **Cross-Platform sed Syntax Inconsistency**

Bash version uses different sed syntax for macOS vs Linux, but PowerShell uses regex replace. This makes debugging harder.

**Fix:** Use a shared approach or create a helper function.

---

## LOOPHOLES IN DECISION TREE

### Loophole 1: Playwright Finds Browser at Different Path

- Bootstrap detects Edge at `/usr/bin/microsoft-edge`
- Config set to `channel: msedge`
- But Playwright looks at `/snap/bin/microsoft-edge`
- Tests fail

**Fix:** Store detected path in context.json, validate at runtime.

---

### Loophole 2: Browser Requires Specific Launch Flags

- Corporate Edge requires `--disable-gpu`
- Bootstrap detects Edge successfully
- Tests fail with GPU error

**Fix:** Add `launchArgs` support (Issue #15).

---

### Loophole 3: Browser Quarantined by IT Policy

- Edge installed but marked as untrusted by corporate policy
- Bootstrap detects Edge (file exists, `--version` works)
- But launching with Playwright triggers security warning
- Tests hang waiting for user to click "Allow"

**Fix:** Add more robust validation (try launching headless briefly).

---

## BACKWARDS COMPATIBILITY ANALYSIS

### ✅ Safe:
1. Schema change (channel is optional)
2. Default behavior unchanged (undefined = bundled)
3. Existing tests still work

### ⚠️ Risky:
1. Config file mutation (sed) might corrupt custom configs
2. Playwright version compatibility not checked
3. No migration guide for existing projects

### ❌ Breaking:
None identified if `channel` remains optional.

---

## BREAKAGE RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Config corruption from sed | High | Critical | Use generator instead of sed |
| False browser detection | Medium | Major | Add robust validation |
| Playwright version incompatibility | Low | Major | Add version check |
| Re-run idempotency | High | Major | Check before inserting |
| CI environment misdetection | Medium | Major | Expand CI detection |
| System browser unavailable at runtime | Medium | Major | Add runtime validation |

---

## MAXIMUM SOLUTION IMPROVEMENTS

Here's how to take this to **MAXIMUM**:

### 1. **Pass Channel to Config Generator (Not sed)**

```typescript
// core/typescript/targets/config-generator.ts
export function generateArtkConfig(options: {
  browserChannel?: BrowserChannel;
}) {
  return `
browsers:
  enabled: ['chromium']
  ${options.browserChannel ? `channel: ${options.browserChannel}` : ''}
  viewport:
    width: 1280
    height: 720
`;
}
```

Bootstrap calls:
```bash
node -e "require('./core/typescript/install/config-generator').generate({ browserChannel: '$BROWSER_STRATEGY' })"
```

---

### 2. **Add Browser Strategy Preference**

```yaml
browsers:
  enabled: ['chromium']
  strategy: auto | prefer-bundled | prefer-system | bundled-only | system-only
  channel: msedge  # Auto-detected or user-specified
```

---

### 3. **Store Metadata in context.json**

```json
{
  "browser": {
    "strategy": "system",
    "channel": "msedge",
    "detected_at": "2026-01-12T10:30:00Z",
    "version": "130.0.2849.68",
    "path": "/usr/bin/microsoft-edge",
    "playwright_version": "1.57.0"
  }
}
```

---

### 4. **Runtime Validation with Fallback**

```typescript
async function ensureBrowserAvailable(config: ARTKConfig) {
  if (!config.browsers.channel || config.browsers.channel === 'bundled') {
    return;  // Bundled always works
  }

  const available = await validateBrowserChannel(config.browsers.channel);
  if (!available.success) {
    if (config.browsers.strategy === 'system-only') {
      throw new Error(`Required browser ${config.browsers.channel} not available`);
    } else {
      console.warn(`Falling back to bundled browser`);
      config.browsers.channel = undefined;
    }
  }
}
```

---

### 5. **Comprehensive Browser Detection**

```bash
detect_browser_with_metadata() {
  # Returns JSON with full metadata
  echo '{
    "type": "msedge",
    "version": "130.0.2849.68",
    "path": "/usr/bin/microsoft-edge",
    "detected_at": "2026-01-12T10:30:00Z"
  }'
}
```

---

### 6. **Add `npx artk doctor` Health Check**

Validates:
- Config validity
- Browser availability
- Version compatibility
- Storage states
- Dependencies
- Network access (for auth)

---

### 7. **Better Error Messages**

Include:
- What was tried
- Why it failed
- Specific solutions with links
- Help command

---

### 8. **Add Rollback on Failure**

Use trap to cleanup partial changes.

---

### 9. **Expand CI Detection**

Check ALL major CI environment variables.

---

### 10. **Add Browser Version Logging**

Log detected versions to context.json for debugging.

---

## FINAL VERDICT

### Strengths ✅
- Solid fallback chain (bundled → Edge → Chrome)
- Backwards compatible (channel is optional)
- Clean TypeScript types
- Handles main use case well

### Weaknesses ❌
- **Critical:** Config mutation via sed is fragile
- **Critical:** No idempotency on re-run
- **Critical:** Browser detection has false positives
- **Major:** No runtime validation
- **Major:** Error handling is weak
- **Major:** Missing user override mechanism

### Recommendation

**DO NOT IMPLEMENT AS-IS.** Fix critical issues first:

1. Replace sed with config generator approach
2. Add idempotency check
3. Improve browser detection (timeout, expanded paths)
4. Add runtime validation
5. Improve error handling
6. Add rollback mechanism

**After fixes:** This will be a solid, production-ready feature.

**Grade:** C+ → A- (after fixes)

---

## PRIORITY FIXES

### Must Do (Before Implementation):
1. ✅ Replace sed with config generator
2. ✅ Add idempotency check
3. ✅ Improve browser detection
4. ✅ Add runtime validation
5. ✅ Fix error handling

### Should Do (Soon After):
6. ✅ Add browser strategy preference
7. ✅ Store metadata in context.json
8. ✅ Add rollback mechanism
9. ✅ Expand CI detection
10. ✅ Add health check command

### Nice to Have (Future):
11. Browser version pinning
12. Multi-browser channel support
13. Graceful degradation at runtime
14. Browser-specific launch args
15. Detection dry-run mode

---

**Total Issues Found:** 23 (7 critical, 9 major, 5 medium, 2 low)

**Estimated Fix Effort:** 8-12 hours

**Impact if Shipped As-Is:** High risk of user frustration, support burden, and edge case failures.
