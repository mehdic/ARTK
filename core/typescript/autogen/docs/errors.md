# Error Codes Reference

This document lists all error codes emitted by `@artk/core-autogen` during validation and verification.

## Journey Parsing Errors

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `JOURNEY_PARSE_ERROR` | error | Failed to parse Journey markdown file | Check YAML frontmatter syntax and markdown formatting |
| `MISSING_FRONTMATTER` | error | Journey file has no YAML frontmatter | Add frontmatter with required fields (id, title, status) |
| `INVALID_FRONTMATTER` | error | Frontmatter doesn't match schema | Verify all required fields are present with correct types |
| `INVALID_STATUS` | error | Status value is not allowed | Use: proposed, defined, clarified, implemented, quarantined, deprecated |
| `INVALID_TIER` | error | Tier value is not allowed | Use: smoke, release, regression |
| `NOT_CLARIFIED` | warning | Journey is not in clarified status | Promote to clarified before generating tests |

## Validation Errors

### Pattern Violations

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `WAIT_FOR_TIMEOUT` | error | Using `waitForTimeout` | Replace with assertions or `waitFor*` methods |
| `FORCE_TRUE` | error | Using `force: true` option | Fix element accessibility or use proper waits |
| `PAGE_PAUSE` | error | Using `page.pause()` | Remove debug statement |
| `TEST_ONLY` | error | Using `.only()` on test | Remove to allow full suite execution |
| `XPATH_SELECTOR` | warning | Using XPath selector | Switch to semantic locators (role, label, testid) |
| `CSS_SELECTOR` | warning | Using CSS selector | Switch to semantic locators for stability |
| `HARDCODED_WAIT` | warning | Using hardcoded sleep/delay | Use explicit waits for conditions |

### Coverage Issues

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `MISSING_AC_COVERAGE` | warning | Acceptance criteria not covered by tests | Add test steps that verify the AC |
| `AC_PARTIAL_COVERAGE` | info | AC partially covered | Consider adding more assertions |
| `MISSING_TEST_TAG` | warning | Test missing required tag | Add `@journey` or `@tier` annotations |
| `ORPHAN_STEP` | info | Test step not mapped to any AC | Link step to relevant AC |

### Selector Issues

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `SELECTOR_UNSTABLE` | warning | Using potentially unstable selector | Use testid, role, or label selectors |
| `SELECTOR_NOT_FOUND` | warning | Referenced selector not in catalog | Add testid to component or update catalog |
| `MULTIPLE_MATCHES` | warning | Selector may match multiple elements | Make selector more specific |

### Lint Errors

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `LINT_ERROR` | error | ESLint rule violation | Fix according to ESLint message |
| `LINT_WARNING` | warning | ESLint suggestion | Consider applying the fix |

## Verification Errors

### Test Execution

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `TEST_FAILED` | error | Test execution failed | Review failure details and fix test or application |
| `TEST_TIMEOUT` | error | Test exceeded timeout | Increase timeout or optimize test |
| `TEST_FLAKY` | warning | Test is flaky (passed/failed inconsistently) | Add proper waits, avoid race conditions |

### Failure Classifications

| Category | Description | Typical Cause |
|----------|-------------|---------------|
| `selector` | Element locator failed | Wrong selector, element not rendered |
| `timing` | Timeout or race condition | Async operation not awaited |
| `navigation` | URL mismatch or redirect | Wrong URL, auth redirect |
| `data` | Assertion mismatch | Test data issue, changed content |
| `auth` | Authentication failure | Expired session, wrong credentials |
| `env` | Environment issue | App not running, network error |
| `script` | Test script error | Syntax or logic error in test |

## Healing Errors

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `HEAL_MAX_ATTEMPTS` | warning | Healing exceeded max attempts | Manual intervention required |
| `HEAL_NO_FIX` | info | No applicable fix found | Review failure manually |
| `HEAL_FORBIDDEN` | error | Fix would use forbidden pattern | Fix rejected, try alternative |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all operations completed without errors |
| 1 | Failure - validation/verification errors found |
| 2 | Error - unexpected error during execution |

## Suppressing Warnings

To suppress specific warnings, use inline comments:

```typescript
// @artk-ignore SELECTOR_UNSTABLE
await page.locator('.legacy-class').click();
```

Or configure in `autogen.config.yml`:

```yaml
validation:
  ignorePatterns:
    - XPATH_SELECTOR  # Legacy tests use XPath
```
