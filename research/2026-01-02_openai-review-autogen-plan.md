# OpenAI Review: ARTK Auto-Generation (Non-MCP) Integration Plan

**Date:** 2026-01-02
**Source:** OpenAI review of initial integration plan
**Status:** Feedback received, refinement needed

---

## Executive Summary

OpenAI reviewed the initial test generation integration plan and provided significant upgrades for a "2026-ready" autonomous system that works without MCP.

---

## Key Critique of Original Plan

### What Was Good
- Step mapping rules (text → Playwright actions/assertions)
- Selector priority aligned with Playwright best practices
- No sleeps policy and web-first assertions
- Validation + verify gates prevent "LLM greenwashing"

### What Was Missing
1. **Module-first generation** - Tests should call modules; modules own locators
2. **Idempotent codegen** - Re-run generator without duplicating files or destroying edits
3. **Real verify + heal loop with evidence** - Constrained, logged, never weakens contract
4. **More context capture on failure** - Traces, screenshots, and ARIA snapshots

---

## Recommended Architecture

### Core Package Structure
```
artk-core/
  autogen/
    src/
      journey/
        parseJourney.ts
        schema.ts
        normalize.ts
      mapping/
        stepMapper.ts
        patterns.ts
        glossary.ts
        ir.ts              # Intermediate Representation
      selectors/
        selectorCatalog.ts
        inferSelector.ts
        fuzzy.ts
      codegen/
        generateTest.ts
        generateModule.ts
        astEdit.ts         # AST-based edits for idempotency
        templates/
          journey.spec.ts.ejs
          feature.module.ts.ejs
      validate/
        validateJourney.ts
        validateGeneratedCode.ts
        lintRules.ts
      verify/
        runPlaywright.ts
        parseReport.ts
        classifyFailure.ts
        captureEvidence.ts
      heal/
        healLoop.ts
        fixes/
          fixLocatorName.ts
          fixWaitStrategy.ts
          fixNavigationWait.ts
          fixStrictMode.ts
        limits.ts
```

### Intermediate Representation (IR) Primitives
Codegen consumes IR only. Prompts never directly "invent" Playwright code.

```typescript
// IR primitives
Goto(url|route)
Click(locatorSpec)
Fill(locatorSpec, valueSpec)
Select(locatorSpec, optionSpec)
ExpectVisible(locatorSpec)
ExpectText(locatorSpec, textSpec)
WaitForURL(pattern)
WaitForResponse(predicate)
CustomStep(blockedReason)
```

---

## Key Recommendations

### 1. Module-First Generation (Mandatory)
**Rule:** Tests do NOT own locators. Modules do.

Generation flow:
1. Create missing feature modules
2. Insert functions into modules
3. Keep selectors encapsulated in modules
4. Tests call module functions only

**Benefit:** UI rename hits one module file, not 47 tests.

### 2. Selector Catalog (Repo-Local)
Add `artifacts/selectors.catalog.json` generated from:
- Scanning `data-testid` usage
- Router paths
- Component library patterns
- Existing tests (if any)

**This replaces MCP for selector discovery.**

### 3. ARIA Snapshots for Non-MCP "Eyes"
On failure, capture:
```typescript
await page.locator('body').ariaSnapshot()
```

Attach as evidence:
```typescript
testInfo.attach('aria-snapshot', {
  body: snapshot,
  contentType: 'text/plain'
})
```

**Benefits:**
- Yields roles + accessible names
- Enables fuzzy matching for heal loop
- Provides textual UI representation without MCP

### 4. Healing Boundaries (Safe and Bounded)

**Healing ALLOWED:**
- Adjust selectors inside modules
- Add completion signals and web-first waits/assertions
- Add runId namespacing / data isolation

**Healing FORBIDDEN:**
- Delete assertions
- Weaken acceptance criteria
- Introduce sleeps (`waitForTimeout`)
- Add `force: true`
- Change Journey contract text (that's maintain/clarify territory)

### 5. Journey Format Extension
Add optional machine hints to clarified journeys:

```markdown
## Steps
- Click "Submit" (role=button, exact=true)
- Fill "Email" with <actor.email> (label)
- Click "Add" (testid=add-item)
- Wait for success toast (signal=toast.success)
```

### 6. Glossary for Ambiguity Reduction
In `journeys/journeys.config.yml`:
```yaml
glossary:
  synonyms:
    "log in": auth.login
  labelAliases:
    "Submit": ["Submit", "Save", "Continue"]
  defaultLocatorPreference: testid  # for localized UI
```

---

## Tool Stack Recommendations

### Mandatory
1. **eslint-plugin-playwright** - Enforce missing awaits, no force:true, valid tags
2. **Auto-retrying assertions** - `toBeVisible`, `toHaveText`, etc.
3. **`expect.poll` / `expect.toPass`** - For eventual consistency
4. **Trace capture** - `on-first-retry` or `retain-on-failure`
5. **JSON reporting** - Machine-readable for verify/heal loop

### Optional
1. **playwright-bdd** - For teams that benefit from Gherkin
2. **Codegen** - As "selector oracle" for sticky selectors

---

## Updated Pipeline

```
/journey-implement
    │
    ├─1─ Load Journey (status=clarified required)
    │
    ├─2─ Generate/update modules + tests using @artk/core-autogen
    │     └─ Uses IR, not direct Playwright code
    │
    ├─3─ Run /journey-validate (mandatory)
    │
    ├─4─ Run /journey-verify (mandatory for implemented)
    │
    ├─5─ On failure: classify → bounded heal → rerun
    │     └─ Healing respects allowed/forbidden rules
    │
    └─6─ If still failing: produce blocked report
          └─ Update health/quarantine appropriately
```

**Key Rule:** "implemented" requires validate + verify passing, not just code existence.

---

## Prompt Updates Needed

### D1) Add permanent instructions file
`.github/instructions/artk-autogen.instructions.md`

### D2) Update `/foundation-build` (now `/discover-foundation`)
- Add eslint + playwright plugin config
- Add trace defaults
- Add ARIA snapshot helper
- Add `@artk/core-autogen` scaffolding

### D3) Update `/journey-implement`
Replace manual test writing with generator orchestration

### D4) Update `/journey-validate`
Add lint checks, AC→test.step mapping validation

### D5) Update `/journey-verify`
Add ARIA snapshot capture, auto-classify, bounded heal

---

## Extra Recommendations

### Selector Debt as First-Class Output
If generator uses CSS/XPath:
- Record debt in `docs/TESTABILITY.md`
- Add TODO in module function
- Emit ticket template entry

### ARIA Snapshot Assertions (Sparingly)
Use for structural regression detection:
- Nav menus
- Page headings + main sections
- Critical summary panels

### Don't Overgenerate
Keep E2E high-signal and journey-driven. Use discovery to prioritize.

---

## Bottom Line (OpenAI's Conclusion)

> "Prompts alone don't scale. Deterministic core does."

So:
1. Build **ARTK Core AutoGen** (versioned)
2. Update prompts to **install/upgrade + orchestrate** it
3. Make generation + validation + verification **one loop** with bounded healing

That's how you get "autonomous" without MCP and without creating a flaky, unmaintainable mess.
