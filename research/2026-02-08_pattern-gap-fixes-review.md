# Pattern Gap Reduction Fixes - Code Review

**Date:** 2026-02-08
**Reviewer:** Claude (primary)
**Participants:** Claude only (Codex CLI and Gemini CLI not available on this machine; orchestrate.sh not found at expected path)
**Scope:** 4 files changed for pattern gap reduction in ARTK AutoGen

---

## Files Reviewed

| # | File | Lines | Focus Areas |
|---|------|-------|-------------|
| 1 | `core/typescript/autogen/src/mapping/patterns.ts` | 1317 | New toast, fill, select patterns |
| 2 | `core/typescript/autogen/src/mapping/glossary.ts` | 704 | Removed "select"/"selector" from synonyms |
| 3 | `core/typescript/autogen/src/mapping/stepMapper.ts` | 616 | New `getBlockedReason()` function |
| 4 | `core/typescript/autogen/src/codegen/generateTest.ts` | 557 | Structured blocked reason parsing |
| 5 | `core/typescript/autogen/src/codegen/generateModule.ts` | 464 | Same blocked reason parsing |

---

## Findings

### A. REGEX CORRECTNESS

#### A-1. `success-toast-appears-with` can swallow messageless toast texts [MEDIUM]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 353-361

The pattern `success-toast-appears-with` (line 355):
```regex
/^(?:a\s+)?success\s+toast\s+(?:appears?|is\s+shown|displays?)\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$/i
```

The `(?:with\s+)?` and the capture group `(.+?)` are both optional/lazy. Consider the input:

- `"A success toast appears"` -- This would NOT match because `.+?` requires at least one character and there is nothing after the verb. The `$` anchor saves this. However, since `(?:with\s+)?` is optional and `(?:(?:message|text)\s+)?` is optional and `["']?` is optional, the regex engine will try to match the empty string for `(.+?)` at `$`. Since `.+?` requires at least 1 character (`.` with `+`), this will fail to match. **This is correct behavior** -- the messageless case falls through to `toast-appears` (line 386).

**Verdict:** Safe. The `.+?` quantifier (`+` not `*`) correctly prevents matching empty message text.

#### A-2. `fill-field-with-value` overlaps with `fill-field-generic` [MEDIUM]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 738-746

Pattern (line 740):
```regex
/^(?:user\s+)?(?:fills?|enters?|types?|inputs?)(?:\s+in)?\s+(?:the\s+)?["']?(.+?)["']?\s+(?:field|input)\s+with\s+["']?(.+?)["']?$/i
```

Test input: `"Fill in the email field with test@example.com"`

Trace: `(?:fills?)` matches "Fill", `(?:\s+in)?` matches " in", `\s+` matches space, `(?:the\s+)?` matches "the ", `["']?(.+?)["']?` lazily captures, then requires `\s+(?:field|input)\s+with\s+`. The lazy `(.+?)` will try to capture as little as possible, so it will capture `"email"` and then `\s+field\s+with\s+` matches, then `(.+?)` captures `"test@example.com"`. **This works correctly.**

However, consider: `"Fill the 'description' field with 'some | value'"`. The capture will include the pipe character. This is fine for fill values -- the pipe is only a concern in blocked reasons, not here.

Now check: does this pattern sit in `extendedFillPatterns` which is listed BEFORE `fillPatterns` in `allPatterns` (line 1203-1204)? Yes. Could it steal matches from `fill-field-quoted-value` or `fill-field-actor-value`?

- `fill-field-quoted-value` regex: `/^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i`
  - This requires the value BEFORE the field name: `"enters 'value' in 'field'"`
- `fill-field-with-value` requires the field BEFORE the value: `"Fill the field field with value"`

These are structurally different sentence patterns (value-first vs field-first), so they do NOT conflict.

**Verdict:** No conflict between fill patterns. The field-first vs value-first sentence structure naturally disambiguates them.

#### A-3. `select-from-named-dropdown` edge case with "select" as element name [HIGH]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 1077-1085

Pattern (line 1079):
```regex
/^(?:user\s+)?(?:selects?|chooses?)\s+["'](.+?)["']\s+from\s+(?:the\s+)?(.+?)\s*(?:dropdown|select|selector|menu|list)$/i
```

Test input: `"Select 'USA' from the select"`

Trace: `(?:selects?)` matches "Select", `["'](.+?)["']` captures "USA", `\s+from\s+` matches, `(?:the\s+)?` matches "the ", then `(.+?)` lazily captures... here is the problem. The regex needs `(.+?)\s*(?:dropdown|select|selector|menu|list)$`. The word "select" must be consumed by the alternation group, so `(.+?)` captures empty string. But `(.+?)` requires at least 1 character.

Actually, `(.+?)` being lazy, the engine will try `(.+?)` = `"s"`, then check if `elect` matches `(?:dropdown|select|...)`. No. Then `(.+?)` = `"se"`, check if `lect` matches. No. Continue until `(.+?)` tries to consume everything. Eventually the regex fails because `"select"` is the ONLY word after "the", and `.+?` cannot match zero characters. The `(.+?)` capture must consume at least one character, leaving at most `"selec"` + `"t"` which doesn't match any terminator.

Wait, re-reading: input is `"Select 'USA' from the select"`. After "the ", we have `"select"`. So `(.+?)` will try to capture `"s"`, then the remaining `"elect"` must match `\s*(?:dropdown|select|...)$`. `"elect"` does not match "select". Then `(.+?)` = `"se"`, remaining = `"lect"`. Not a match. Continue... `(.+?)` = `"selec"`, remaining = `"t"`. Not a match. `(.+?)` = `"select"`, remaining = `""`. But then `\s*(?:dropdown|select|...)$` requires matching a terminator word, and there is nothing left. Regex fails.

**This means `"Select 'USA' from the select"` will NOT match `select-from-named-dropdown`.** It will also not match `select-from-dropdown` (which requires `dropdown` literally). It will fall through to `select-option-named` or become blocked.

Actually let's check `select-option-named` (line 1101):
```regex
/^(?:user\s+)?(?:selects?|chooses?)\s+(?:the\s+)?(?:option\s+)?(?:named\s+)?["'](.+?)["'](?:\s+option)?$/i
```
Input `"Select 'USA' from the select"` -- after matching `"Select"` and `'USA'`, the regex expects `(?:\s+option)?$` but we have ` from the select` remaining. Does not match.

So this input becomes blocked. **This is a gap but an unlikely real-world input** -- nobody writes "from the select" in natural language; they would write "from the dropdown" or "from the Country dropdown".

**Verdict:** Edge case confirmed, but low real-world probability. Documenting as informational.

#### A-4. Greedy vs lazy matching in toast patterns [LOW]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 340-425

All capture groups in toast patterns use lazy `(.+?)` anchored by `$`. This is correct -- the lazy quantifier minimizes but the `$` anchor forces it to consume everything up to the end. No greedy/lazy mismatch issues.

**Verdict:** Correct lazy matching throughout toast patterns.

---

### B. BACKWARD COMPATIBILITY

#### B-1. Removing "select" from click synonyms causes silent regression [CRITICAL]

**File:** `core/typescript/autogen/src/mapping/glossary.ts`, line 92

Previous:
```typescript
{ canonical: 'click', synonyms: ['press', 'tap', 'select', 'hit'] }
```

Current:
```typescript
{ canonical: 'click', synonyms: ['press', 'tap', 'hit'] }
```

The `normalizeStepText()` function (line 326) replaces synonym words with their canonical forms BEFORE pattern matching. Previously, `"Select the Submit button"` was normalized to `"click the Submit button"`, which then matched the click pattern `click-element-generic`.

After this change, `"Select the Submit button"` is no longer normalized to "click". The word "select" now goes through as-is. Let's trace what happens:

1. normalizeStepText("Select the Submit button") -> "select the submit button" (lowercased, "select" not replaced)
2. Pattern matching checks all patterns in order

Looking at patterns that contain `selects?`:
- `click-menuitem-quoted` (line 150): requires `menu\s*item$` suffix -- no match
- `click-tab-quoted` (line 160): requires `tab$` suffix -- no match
- `select-from-named-dropdown` (line 1077): requires `from` keyword -- no match
- `select-from-dropdown` (line 1088): requires `from` keyword -- no match
- `select-option-named` (line 1099): requires quoted text -- no match for bare "Submit button"

None of the select patterns handle `"Select the Submit button"`. This step will become BLOCKED.

This is a **semantic regression**: the word "select" in natural language can mean "click" (as in "select the option", "select the button to proceed"), not just "choose from dropdown". Removing "select" from click synonyms breaks this common usage pattern.

**Impact:** Any journey step text using "Select" as a verb meaning "click" (e.g., "Select the Submit button", "Select the file", "Select the item") will now become blocked instead of mapping to a click action.

**Recommendation:** Either restore "select" to click synonyms, or add explicit patterns in `clickPatterns` that handle "Select the X button/link/icon" -- or add a disambiguation heuristic that interprets "select" as click when no dropdown context is present.

#### B-2. Removing "selector" from dropdown synonyms [LOW]

**File:** `core/typescript/autogen/src/mapping/glossary.ts`, line 120

Previous:
```typescript
{ canonical: 'dropdown', synonyms: ['select', 'combo', 'combobox', 'selector', 'picker'] }
```

Current:
```typescript
{ canonical: 'dropdown', synonyms: ['combo', 'combobox', 'picker'] }
```

The word "selector" as a noun meaning "dropdown element" is uncommon in natural-language step text. Journey authors are unlikely to write "Choose 'Option' from the selector". The removal of "select" from dropdown synonyms is intentional to prevent ambiguity with the verb "select".

**Impact:** Minimal. "selector" as a dropdown noun is rare in step text.

**Note:** However, removing "select" from dropdown synonyms means `normalizeStepText("Choose from the select")` no longer normalizes "select" to "dropdown". This is actually correct behavior -- the `select-from-named-dropdown` pattern already handles `(?:dropdown|select|selector|menu|list)$` in its regex directly, bypassing glossary normalization.

**Verdict:** Acceptable change. The regex patterns in `extendedSelectPatterns` already contain the word "select" as a terminator, so glossary normalization is not needed for this case.

#### B-3. Structured blocked reason format breaks existing test expectations [HIGH]

**File:** `core/typescript/autogen/src/mapping/stepMapper.ts`, line 232

The `getBlockedReason()` function now returns structured messages like:
```
Could not map step: "text" | Reason: ... | Suggestion: ...
```

The old format was simply:
```
Could not map step
```

An existing test in `normalize.test.ts` line 251 checks:
```typescript
expect(result.blockedSteps[0].reason).toContain('Could not map step');
```

This test still passes because `toContain` is a substring match and the new format still starts with `"Could not map step"`. **However**, if any consumer code does exact equality checks or parsing on the `reason` field, this is a breaking change.

More importantly, looking at `mapAcceptanceCriterion()` in `stepMapper.ts` (line 381):
```typescript
actions.push({
  type: 'blocked',
  reason: result.message || 'Could not map step',
  sourceText: stepText,
});
```

And `mapProceduralStep()` (line 443):
```typescript
actions.push({
  type: 'blocked',
  reason: result.message || 'Could not map procedural step',
  sourceText: ps.text,
});
```

The fallback strings `'Could not map step'` and `'Could not map procedural step'` are still the OLD format without the `| Reason: | Suggestion:` structure. This creates an inconsistency: some blocked steps have structured reasons (from `getBlockedReason`), while others have plain text fallbacks.

When `generateTest.ts` (line 334) tries to `split(' | ')` on the plain fallback, it gets a single-element array, which works but produces a TODO comment without Reason/Suggestion lines. This is acceptable degradation but inconsistent.

**Impact:** Existing `toContain('Could not map step')` tests still pass. But any downstream code that does `reason.split(' | ')` on fallback messages gets different output than on `getBlockedReason` messages.

---

### C. PATTERN ORDERING

#### C-1. Toast pattern ordering is correct [INFO]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 340-425

Order within `toastPatterns`:
1. `success-toast-message` (pre-verb, quoted: `success toast with 'X' appears`)
2. `success-toast-appears-with` (post-verb, unquoted: `success toast appears with X`)
3. `error-toast-message` (pre-verb, quoted: `error toast with 'X' appears`)
4. `error-toast-appears-with` (post-verb, unquoted: `error toast appears with X`)
5. `toast-appears` (no message: `success toast appears`)
6. `toast-with-text` (generic: `toast with text 'X' appears`)
7. `status-message-visible`
8. `verify-status-message`

The ordering of `success-toast-message` before `success-toast-appears-with` is correct because:
- `success-toast-message` requires the message BEFORE the verb: `"success toast with 'Saved' appears"`
- `success-toast-appears-with` requires the message AFTER the verb: `"success toast appears with Saved"`

These are structurally different, so ordering does not cause conflicts.

The critical ordering question is `success-toast-appears-with` (pattern 2) vs `toast-appears` (pattern 5). Consider `"A success toast appears"`:
- Pattern 2 regex: `(?:appears?|...)` matches, then requires `\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$`. After "appears", the remaining text is empty. The `.+?` requires at least 1 character. **Does not match.**
- Pattern 5 regex: `(?:appears?|...)$`. After "appears", the string ends. **Matches.**

**Verdict:** Ordering is correct. Pattern 5 correctly catches messageless toast, pattern 2 catches message-bearing toast.

#### C-2. `extendedFillPatterns` before `fillPatterns` is correct [INFO]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 1203-1204

```typescript
...extendedFillPatterns,  // "Fill the X field with Y"
...fillPatterns,          // "Enter 'value' in 'field'"
```

`fill-field-with-value` uses "field with value" sentence structure (field first, value second). Core `fillPatterns` use "value in field" structure (value first, field second). No overlap because the prepositions are different ("with" vs "in/into").

**Verdict:** No ordering issue.

#### C-3. `extendedSelectPatterns` before `selectPatterns` is correct [INFO]

**File:** `core/typescript/autogen/src/mapping/patterns.ts`, lines 1205-1206

```typescript
...extendedSelectPatterns,  // "Select 'USA' from the country dropdown"
...selectPatterns,          // "Select 'option' from 'Dropdown Name'"
```

`select-from-named-dropdown` requires an unquoted dropdown name followed by a terminator word (`dropdown|select|...`). Core `select-option` requires quoted dropdown name and optional terminator. These are structurally different (unquoted vs quoted dropdown name).

`select-option-named` is a catch-all `"Select option 'Value'"` that does not require "from" or a dropdown name. Being last in the select group is correct.

**Verdict:** Ordering is correct.

---

### D. ARCHITECTURAL CONCERNS

#### D-1. `' | '` delimiter in blocked reasons is fragile [HIGH]

**Files:**
- `core/typescript/autogen/src/mapping/stepMapper.ts`, line 585 (and similar)
- `core/typescript/autogen/src/codegen/generateTest.ts`, line 334
- `core/typescript/autogen/src/codegen/generateModule.ts`, line 349

The structured reason format uses `' | '` (space-pipe-space) as a delimiter:
```typescript
return `Could not map step: "${originalText}" | Reason: ... | Suggestion: ...`;
```

And consumers parse it with:
```typescript
const parts = primitive.reason.split(' | ');
```

If `originalText` contains `" | "` (e.g., a step like `"Select option A | B from dropdown"`), the split produces unexpected results:
- parts[0] = `Could not map step: "Select option A`
- parts[1] = `B from dropdown"`
- parts[2] = `Reason: ...`
- parts[3] = `Suggestion: ...`

The `parts.find(p => p.startsWith('Reason:'))` still works because it scans all parts. But `parts[0]` (mainReason) is truncated, producing a misleading TODO comment.

**Recommendation:** Use a more robust delimiter (e.g., `\n` or a structured object) or escape pipes in the original text. A simple fix: replace `' | '` in `originalText` before interpolation, or use `JSON.stringify` for the structured data and parse it in codegen.

Alternatively, since `getBlockedReason` constructs the string and codegen parses it, this is an internal protocol. A better approach would be to return a structured object from `getBlockedReason` (e.g., `{ summary, reason, suggestion }`) and only serialize to string at the codegen boundary.

#### D-2. `getBlockedReason` partially duplicates `suggestImprovements` [MEDIUM]

**File:** `core/typescript/autogen/src/mapping/stepMapper.ts`, lines 532-571 and 576-615

Both functions categorize blocked steps by keywords (click, fill, see, toast, select, navigate) and provide suggestions. `suggestImprovements` returns an array of suggestion strings, while `getBlockedReason` returns a single structured string.

The difference is:
- `suggestImprovements` takes an array of `StepMappingResult[]` and returns user-facing suggestions
- `getBlockedReason` takes normalized + original text and returns a machine-parseable structured reason

The duplication is in the keyword-based categorization logic. If a new pattern category is added, both functions must be updated.

**Recommendation:** Extract the categorization logic into a shared helper, e.g., `categorizeStep(text): 'click' | 'fill' | 'visibility' | 'toast' | 'select' | 'navigation' | 'generic'`, and have both functions use it.

#### D-3. `escapeString()` in generateModule.ts handles the new format correctly [INFO]

**File:** `core/typescript/autogen/src/codegen/generateModule.ts`, lines 348-358

The blocked case:
```typescript
case 'blocked': {
  const parts = primitive.reason.split(' | ');
  const mainReason = parts[0] ?? primitive.reason;
  const reasonDetail = parts.find(p => p.startsWith('Reason:')) ?? '';
  const suggestion = parts.find(p => p.startsWith('Suggestion:')) ?? '';
  const lines = [`// TODO: ${mainReason}`];
  if (reasonDetail) lines.push(`    // ${reasonDetail}`);
  if (suggestion) lines.push(`    // ${suggestion}`);
  lines.push(`    throw new Error('ARTK BLOCKED: ${escapeString(mainReason)}');`);
  return lines.join('\n');
}
```

`escapeString(mainReason)` is called for the `throw new Error()` line, which correctly escapes quotes and special characters in the reason text. However, the TODO comment lines do NOT escape the content:
```typescript
const lines = [`// TODO: ${mainReason}`];
if (reasonDetail) lines.push(`    // ${reasonDetail}`);
if (suggestion) lines.push(`    // ${suggestion}`);
```

Since these are JavaScript comments (prefixed with `//`), unescaped content is safe -- newlines in the reason would break the comment, but `getBlockedReason` does not produce multi-line reasons. The `originalText` is user-authored step text which typically does not contain newlines.

**Verdict:** Safe for current usage, but worth noting that if `originalText` ever contains newlines, the comment would break.

#### D-4. Hardcoded indentation in generateModule.ts [LOW]

**File:** `core/typescript/autogen/src/codegen/generateModule.ts`, lines 354-355

```typescript
if (reasonDetail) lines.push(`    // ${reasonDetail}`);
if (suggestion) lines.push(`    // ${suggestion}`);
```

The indentation is hardcoded as 4 spaces (`    `). In `generateTest.ts` (line 339), the indentation uses the `indent` parameter:
```typescript
const lines = [`${indent}// TODO: ${mainReason}`];
if (reasonDetail) lines.push(`${indent}// ${reasonDetail}`);
if (suggestion) lines.push(`${indent}// ${suggestion}`);
```

The module generator's `primitiveToMethodLine` function does not receive an `indent` parameter (unlike `renderPrimitive` in generateTest.ts), so the hardcoded indentation is a necessary compromise. However, if the method body indentation ever changes (e.g., from 4 spaces to 2 spaces or tabs), these hardcoded values will be wrong.

**Verdict:** Minor inconsistency. Acceptable for now but could lead to formatting issues if indentation conventions change.

---

### E. MISSING TEST COVERAGE

#### E-1. No unit tests for new toast patterns [HIGH]

**Files checked:**
- `core/typescript/autogen/tests/mapping/patterns.test.ts` -- No toast pattern tests
- `core/typescript/autogen/tests/mapping/stepMapper.test.ts` -- Only 2 toast tests (lines 108-121), and neither tests the new patterns specifically

Missing test cases:
1. `"A success toast appears with Account created"` -- tests `success-toast-appears-with`
2. `"An error toast appears with Invalid email"` -- tests `error-toast-appears-with`
3. `"A success toast appears"` (no message) -- tests `toast-appears` and confirms it does NOT match `success-toast-appears-with`
4. `"Toast with text Hello appears"` (unquoted) -- tests expanded `toast-with-text`
5. Edge case: `"success toast appears"` without leading "A" -- tests optional article

The E2E test (`run-full-e2e.sh` lines 431-433) adds journey steps for these patterns, but there are no unit tests that verify correct pattern matching and correct `toastType`/`message` extraction.

#### E-2. No unit tests for `fill-field-with-value` [HIGH]

No test verifies that `"Fill the username field with john"` correctly maps to a fill primitive with locator label "username" and value "john".

Missing test cases:
1. `"Fill the username field with john"` -- basic unquoted
2. `"Fill the 'description' field with 'the value'"` -- quoted
3. `"Fill in the email field with test@example.com"` -- with "in" preposition
4. `"Enter the search input with query"` -- alternate verb

#### E-3. No unit tests for `select-from-named-dropdown` [HIGH]

Missing test cases:
1. `"Select 'USA' from the country dropdown"` -- basic case
2. `"Select 'Large' from the size selector"` -- "selector" terminator
3. `"Choose 'Option' from the menu"` -- "menu" terminator
4. `"Select 'USA' from the select"` -- edge case (see finding A-3)

#### E-4. No regression test for glossary changes [CRITICAL]

The removal of "select" from click synonyms (finding B-1) has NO corresponding test update. There should be:

1. A test confirming `"Select the Submit button"` behavior -- does it map or become blocked?
2. A test confirming `"Select 'Settings' menu item"` still works (uses `click-menuitem-quoted` pattern directly, not via glossary normalization)
3. A test confirming `"Select 'Details' tab"` still works (uses `click-tab-quoted` pattern directly)
4. A test confirming `normalizeStepText("Select the button")` returns `"select the button"` (NOT `"click the button"`)

Without these tests, the glossary change is a silent behavioral modification with no regression safety net.

#### E-5. No unit tests for `getBlockedReason` [MEDIUM]

The `getBlockedReason` function is not exported and has no direct unit tests. It should be tested to verify:

1. Click without anchor: `"click something"` produces reason with "No identifiable UI anchor"
2. Fill without structure: `"fill stuff"` produces reason with "Could not parse field name and value"
3. Toast: `"toast something"` produces toast-specific suggestion
4. Select: `"select something"` produces select-specific suggestion
5. Generic: `"do something weird"` produces fallback suggestion
6. Input containing `" | "`: Verify the delimiter handling is robust

#### E-6. No tests for structured blocked reason parsing in codegen [MEDIUM]

Neither `generateTest.test.ts` nor any generateModule test verifies the new multi-line TODO comment format. Missing:

1. Test that a blocked primitive with `reason: 'Could not map step: "x" | Reason: foo | Suggestion: bar'` generates:
   ```typescript
   // TODO: Could not map step: "x"
   // Reason: foo
   // Suggestion: bar
   throw new Error('ARTK BLOCKED: Could not map step: "x"');
   ```
2. Test that a blocked primitive with plain `reason: 'Could not map step'` (old format) still generates valid output
3. Test that a reason containing `' | '` in the original text does not corrupt the output

---

## Summary

### By Severity

| Severity | Count | Findings |
|----------|-------|----------|
| CRITICAL | 2 | B-1 (select removed from click synonyms), E-4 (no regression test for glossary change) |
| HIGH | 5 | A-3 (select-from-named edge case), B-3 (structured reason format change), D-1 (fragile delimiter), E-1 (no toast tests), E-2 (no fill tests), E-3 (no select tests) |
| MEDIUM | 4 | A-1 (toast regex analysis), A-2 (fill overlap analysis), D-2 (duplicate categorization), E-5 (no getBlockedReason tests), E-6 (no codegen parsing tests) |
| LOW | 3 | A-4 (lazy matching ok), B-2 (selector removal ok), D-4 (hardcoded indentation) |
| INFO | 4 | C-1 (toast ordering ok), C-2 (fill ordering ok), C-3 (select ordering ok), D-3 (escapeString ok) |

### Critical Action Items

1. **B-1 / E-4: "Select" removed from click synonyms without mitigation.** This is the highest-risk change. Journey authors commonly write "Select the X button" meaning "click". Either:
   - Restore "select" to click synonyms and add context-aware disambiguation, OR
   - Add explicit click patterns that handle `"Select the X button/link/icon"` without relying on glossary normalization, OR
   - Add `selects?` to the `click-element-generic` pattern regex alongside `clicks?|presses?|taps?`

2. **D-1: Replace `' | '` delimiter with structured data.** The current approach is fragile. Refactor `getBlockedReason` to return an object and serialize only at the codegen boundary.

3. **E-1/E-2/E-3: Add unit tests for all new patterns.** Every new regex pattern needs at least:
   - One happy-path test
   - One edge-case test
   - One negative test (input that should NOT match)

### What Looks Good

- Toast pattern regex structure is well-designed with correct use of lazy quantifiers and `$` anchors
- Pattern ordering in `allPatterns` is correct -- extended patterns before base patterns ensures specificity
- The `getBlockedReason` function provides excellent developer experience with actionable suggestions
- Multi-line TODO comments in generated code are a meaningful improvement for debugging blocked steps
- The fill and select pattern additions close real gaps without conflicting with existing patterns

### Confidence

**Overall confidence in this review:** 0.88

**Key caveat:** This review was conducted by Claude only. The orchestrate.sh script, Codex CLI, and Gemini CLI were not available on this machine, so no external LLM perspectives were incorporated. A multi-AI review might surface additional concerns around regex edge cases or identify different prioritization of findings.
