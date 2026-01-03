# Healing Rules Reference

This document describes the automatic healing system in `@artk/core-autogen` that attempts to fix common test failures.

## Overview

The healing system works in a bounded loop:

1. Run test
2. If failed, classify failure
3. Match classification to applicable fix rules
4. Apply fix with highest confidence
5. Re-verify
6. Repeat up to max attempts

## Healing Configuration

```typescript
interface HealingConfig {
  maxAttempts: number;        // Max healing attempts (default: 3)
  allowedFixTypes: string[];  // Which fix types are allowed
  forbiddenFixTypes: string[]; // Blocked fix types
  logPath?: string;           // Path for healing log
  minConfidence: number;      // Min confidence to apply fix (0-1)
}
```

Default configuration:

```typescript
const DEFAULT_HEALING_CONFIG = {
  maxAttempts: 3,
  allowedFixTypes: ['selector', 'timeout', 'wait', 'navigation'],
  forbiddenFixTypes: ['force', 'skip'],
  minConfidence: 0.7,
};
```

## Fix Types

### Selector Fixes

Applied when element locator fails.

| Fix | Description | Confidence |
|-----|-------------|------------|
| `role-fallback` | Try role-based selector instead | 0.9 |
| `text-fallback` | Try text-based selector | 0.8 |
| `nth-selector` | Add `.nth()` for multiple matches | 0.7 |
| `parent-scope` | Scope to parent element | 0.6 |

Example transformation:
```typescript
// Before
await page.getByTestId('submit-btn').click();

// After (role-fallback)
await page.getByRole('button', { name: 'Submit' }).click();
```

### Timeout Fixes

Applied when test times out.

| Fix | Description | Confidence |
|-----|-------------|------------|
| `increase-timeout` | Double the timeout value | 0.8 |
| `add-wait-for` | Add explicit waitFor before action | 0.7 |

Example transformation:
```typescript
// Before
await page.getByRole('button').click();

// After (add-wait-for)
await page.getByRole('button').waitFor({ state: 'visible' });
await page.getByRole('button').click();
```

### Navigation Fixes

Applied when URL/route assertion fails.

| Fix | Description | Confidence |
|-----|-------------|------------|
| `wait-for-url` | Add waitForURL before assertion | 0.9 |
| `relax-url-match` | Use partial URL match | 0.7 |
| `add-load-wait` | Wait for page load state | 0.8 |

Example transformation:
```typescript
// Before
await expect(page).toHaveURL('/dashboard');

// After (wait-for-url)
await page.waitForURL('**/dashboard');
await expect(page).toHaveURL('/dashboard');
```

### Wait Strategy Fixes

Applied when timing-related issues occur.

| Fix | Description | Confidence |
|-----|-------------|------------|
| `network-idle` | Wait for network to be idle | 0.8 |
| `dom-content` | Wait for DOM content loaded | 0.7 |
| `visibility-wait` | Wait for element visibility | 0.85 |

## Forbidden Fixes

These fixes are never applied as they can mask real issues:

| Fix Type | Reason |
|----------|--------|
| `force` | Using `force: true` bypasses accessibility checks |
| `skip` | Skipping tests hides failures |
| `ignore-error` | Catching and ignoring errors masks issues |
| `arbitrary-delay` | Adding `waitForTimeout` is unreliable |

## Healing Decision Flow

```
Failure → Classify → Match Rules → Filter Allowed → Rank by Confidence → Apply Best → Verify
                                        ↓
                         Check forbidden list
                                        ↓
                         Check min confidence
                                        ↓
                         Apply fix and re-run
```

## Healing Log

Each healing attempt is logged:

```json
{
  "journeyId": "JRN-0001",
  "timestamp": "2024-01-15T10:30:00Z",
  "attempts": [
    {
      "attempt": 1,
      "failure": {
        "category": "selector",
        "message": "locator resolved to 0 elements"
      },
      "appliedFix": "role-fallback",
      "success": true
    }
  ],
  "finalStatus": "passed",
  "totalAttempts": 1
}
```

## Programmatic Usage

```typescript
import { runHealingLoop, DEFAULT_HEALING_CONFIG } from '@artk/core-autogen';

const result = await runHealingLoop({
  journeyId: 'JRN-0001',
  testFile: 'tests/login.spec.ts',
  outputDir: './healed',
  config: {
    ...DEFAULT_HEALING_CONFIG,
    maxAttempts: 5,
    allowedFixTypes: ['selector', 'timeout'],
  },
  verifyFn: async () => {
    // Run verification and return summary
    return verifyResult;
  },
});

console.log(`Healing ${result.success ? 'succeeded' : 'failed'}`);
console.log(`Attempts: ${result.attempts}`);
if (result.appliedFix) {
  console.log(`Applied: ${result.appliedFix}`);
}
```

## Best Practices

1. **Start with default config** - The defaults are tuned for common cases
2. **Review healing logs** - Understand what fixes are being applied
3. **Fix root causes** - Healing is temporary; fix underlying issues
4. **Monitor flakiness** - Track tests that require frequent healing
5. **Limit allowed fixes** - Only allow fixes appropriate for your codebase

## Disabling Healing

For specific tests:
```typescript
// @artk-no-heal
test('sensitive test', async ({ page }) => {
  // This test will not be auto-healed
});
```

Globally:
```yaml
# autogen.config.yml
healing:
  enabled: false
```
