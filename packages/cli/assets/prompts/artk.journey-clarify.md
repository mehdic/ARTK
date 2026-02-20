---
name: artk.journey-clarify
mode: agent
description: "Add deterministic execution detail to a Journey - data strategy, assertions, async handling, promotes to clarified"
handoffs:
  - label: "1. RECOMMENDED - /artk.testid-audit: audit selectors before implementation"
    agent: artk.testid-audit
    prompt: "mode=report scope=journey:<JRN-ID>"
  - label: "2. RECOMMENDED - /artk.journey-implement: implement the journey as Playwright tests"
    agent: artk.journey-implement
    prompt: "id=<JRN-ID>"
  - label: "3. AFTER IMPLEMENT - /artk.journey-validate: validate the generated tests"
    agent: artk.journey-validate
    prompt: "id=<JRN-ID>"
  - label: "4. OPTIONAL - /artk.journey-clarify: clarify another journey"
    agent: artk.journey-clarify
    prompt: "id=JRN-####"
---

# ARTK /journey-clarify — Clarification to Execution-Ready Detail (Phase 7)

You are running **ARTK Phase 7**.

A clarified Journey must be specific enough that `/artk.journey-implement` (later phase) can implement Playwright tests **without guessing** about:
- actor/account assumptions
- environment assumptions
- deterministic data strategy
- success criteria and assertions
- async behavior (wait strategy)
- compliance constraints (PII in traces/artifacts)

## Medium by default
Unless the user sets `mode=minimal` or `mode=max`, use `mode=medium`.

---

# Non‑Negotiables
- **Do not ask for secrets** (passwords/tokens). Ask for provisioning process and account roles only.
- **No test implementation** in this command.
- **Idempotent**: only update managed markers; preserve human notes.
- **Deterministic**: produce stable outputs.
- **Compliance-aware**: call out risk of sensitive data in test artifacts and request policy constraints.
- **Discovery-aware**: if discovery/testability exists, use it to reduce questions and to flag blockers early.
- **Edit safety**: MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before any file edits.

---

# Inputs
The user must identify a Journey by either:
- `id=JRN-####` (preferred), OR
- `file=journeys/.../*.md`

Optional flags:
- `useDiscovery`: `auto|true|false` (default: auto)
- `strictGates`: `true|false` (default: true)
  - if true, do not set status=clarified if blockers exist (selectors/data/env).
- `promote=true` to move file to `journeys/clarified/` when status becomes clarified (default: true for staged layout, false for flat).
- `force`: `true|false` (default: false)
  - if true, allow re-clarification of already-clarified journeys
  - resets `autogen.machineHints` to false and re-runs verification
  - preserves existing clarification content but allows updates

---

# Outputs (must produce)
1) Update the Journey file:
- fill clarification details (managed markers)
- set frontmatter `status: clarified` ONLY when “ready criteria” is satisfied AND (if strictGates=true) no blockers remain

2) Regenerate:
- `<ARTK_ROOT>/journeys/BACKLOG.md`
- `<ARTK_ROOT>/journeys/index.json`

3) Create/update:
- `<ARTK_ROOT>/docs/JOURNEY_CLARIFY.md` (guidance + examples; managed markers only)

---

# Modes and question depth

## minimal (blockers-only, ≤ 4 questions)
Collect only what blocks deterministic execution:
- auth entry style + actor role
- environment/base URL reality
- test data feasibility
- compliance constraints (artifact/PII policy)

## medium (default, ≤ 10 questions)
Enough detail for deterministic automation:
- actor specifics (role, permissions, MFA/SSO constraints)
- env assumptions (base URLs, region constraints)
- data strategy (create/seed/reuse, cleanup)
- assertions (explicit, stable)
- async risks and wait strategy implications
- compliance constraints (PII in traces/videos/screenshots/HAR)
- module dependency confirmation (foundation/feature)

## max (deeper exploration, ≤ 16 questions)
Adds:
- variants and negative paths worth automating
- edge cases if high-risk
- concurrency/multi-actor flows
- feature flags/permissions matrix
- observability hooks for triage (logs, IDs)

---

# Ready criteria for status=clarified
A Journey may be set to `clarified` only if all are true:
- Actor role is known (and how to obtain a test account is documented).
- Target environment(s) are named and realistically accessible.
- Data strategy is defined (setup + cleanup expectations).
- Success criteria are explicit (at least 3 assertions or equivalent).
- Async risks are acknowledged with a wait/verification approach.
- Compliance constraints are documented (artifact retention, PII rules).

**AutoGen readiness criteria (RECOMMENDED):**
- `modules` is in object format: `{ foundation: [], features: [] }`
- Machine hints added to key steps (locator hints for AutoGen)
- `autogen.enabled: true` in frontmatter
- `autogen.blockedSteps` lists any steps requiring manual implementation

Additionally, if `strictGates=true`, these MUST NOT be blocked:
- Locator readiness for the Journey's key screens/actions
- Data feasibility for setup/cleanup
- Environment access feasibility

If any are unknown or blocked, keep status as `defined` (or `proposed`) and list the blockers.

---

# Procedure

## Step 0 — Locate ARTK_ROOT and validate prerequisites
1) Determine `ARTK_ROOT` from:
   - `artkRoot=` argument
   - nearest `artk.config.yml`
2) Confirm Journey system exists:
   - `<ARTK_ROOT>/journeys/journeys.config.yml`
If missing: instruct user to run `/artk.init-playbook` first.

## Step 1 — Load Journey file
- If `id=` provided, resolve using `<ARTK_ROOT>/journeys/index.json` if present.
- Otherwise use the `file=` path.

Validate frontmatter:
- must include id/title/status/tier/actor/scope
If required fields missing, fix minimally and ask user to confirm (do not guess silently).

### Status Gate (MANDATORY)

The Journey MUST have `status: defined` to proceed with clarification.

**If status is NOT `defined`, STOP and display the appropriate message:**

- **`proposed`**:
  ```
  ⛔ CANNOT CLARIFY: Journey <ID> has status 'proposed'

  Journeys must be 'defined' before clarification.

  Run: /artk.journey-define id=<ID> to define this journey first.
  ```

- **`clarified`** (without force flag):
  ```
  ⚠️  ALREADY CLARIFIED: Journey <ID> has status 'clarified'

  This journey was already clarified. Options:
  1. Run /artk.journey-implement id=<ID> to implement tests
  2. Run /artk.journey-clarify id=<ID> force=true to re-clarify
  ```

- **`clarified`** (with force=true):
  ```
  ╔════════════════════════════════════════════════════════════════════╗
  ║  RE-CLARIFICATION MODE                                             ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                    ║
  ║  Journey <ID> is being re-clarified (force=true).                  ║
  ║                                                                    ║
  ║  Actions:                                                          ║
  ║  - Reset autogen.machineHints to false                             ║
  ║  - Re-run machine hints verification                               ║
  ║  - Preserve existing clarification content                         ║
  ║  - Update as needed based on new inputs                            ║
  ║                                                                    ║
  ╚════════════════════════════════════════════════════════════════════╝
  ```
  **Proceed with re-clarification. Always run Machine Hints Verification.**

- **`implemented`**:
  ```
  ⚠️  ALREADY IMPLEMENTED: Journey <ID> has status 'implemented'

  This journey has tests. Use /artk.journey-maintain for updates.
  ```

- **`quarantined` or `deprecated`**:
  ```
  ⛔ CANNOT CLARIFY: Journey <ID> has status '<status>'

  Quarantined/deprecated journeys cannot be clarified.
  Check statusReason in the journey file for details.
  ```

**Only proceed to Step 2 if `status: defined`.**

## Step 1.5 — Migration for Legacy Journeys (if needed)

**Check for legacy format and migrate if necessary.**

### When encountering a journey without `autogen` section:

If the journey has no `autogen` field in frontmatter:

1. Add the autogen section:
   ```yaml
   autogen:
     enabled: true
     blockedSteps: []
     machineHints: false
   ```

2. Output migration notice:
   ```
   ╔════════════════════════════════════════════════════════════════════╗
   ║  LEGACY JOURNEY MIGRATION                                           ║
   ╠════════════════════════════════════════════════════════════════════╣
   ║                                                                     ║
   ║  Journey <ID> was created before AutoGen support.                   ║
   ║  Added autogen section with default values.                         ║
   ║                                                                     ║
   ║  autogen:                                                           ║
   ║    enabled: true                                                    ║
   ║    blockedSteps: []                                                 ║
   ║    machineHints: false                                              ║
   ║                                                                     ║
   ║  Machine hints will be set to true after this clarification.        ║
   ║                                                                     ║
   ╚════════════════════════════════════════════════════════════════════╝
   ```

### When encountering `modules` as array (legacy format):

If modules is a flat array instead of object:

1. Convert using the Module Classification Algorithm (Step 6)
2. Output conversion notice (see Step 6)
3. Do NOT change module names, only restructure

**Example migration:**
```yaml
# BEFORE (legacy):
modules: [auth, navigation, orders, catalog]

# AFTER (AutoGen-compatible):
modules:
  foundation: [auth, navigation]
  features: [orders, catalog]
```

### When encountering invalid `blockedSteps` format:

If blockedSteps is an array of numbers only (legacy format):

```yaml
# BEFORE (legacy):
autogen:
  blockedSteps: [3, 5, 7]

# AFTER (step+reason format):
autogen:
  blockedSteps:
    - step: 3
      reason: "Requires manual review - migrated from legacy format"
    - step: 5
      reason: "Requires manual review - migrated from legacy format"
    - step: 7
      reason: "Requires manual review - migrated from legacy format"
```

Output migration notice:
```
╔════════════════════════════════════════════════════════════════════╗
║  BLOCKEDSTEPS FORMAT MIGRATED                                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  blockedSteps was in legacy format (numbers only).                  ║
║  Converted to step+reason format.                                   ║
║                                                                     ║
║  Please update reasons for each blocked step:                       ║
║  - Step 3: "Requires manual review - migrated from legacy format"   ║
║  - Step 5: "Requires manual review - migrated from legacy format"   ║
║  - Step 7: "Requires manual review - migrated from legacy format"   ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Other invalid formats to fix:**
- `blockedSteps: null` → `blockedSteps: []`
- `blockedSteps: "3, 5"` (string) → parse and convert to array
- `autogen: {}` (empty) → add all required fields

### Migration for bulk journeys:

For teams with many legacy journeys, recommend:
1. Run `/artk.journey-clarify` on each journey individually
2. Or create a batch migration script using the classification algorithm
3. Review converted modules before implementing

**Note:** Migration is automatic during clarification - no separate command needed.

## Step 1.8 — Check App Availability (Auto-Probe)

**Before pulling discovery context, check if the application is reachable.** This allows runtime inspection of pages to resolve steps that would otherwise be marked as blocked.

### 1.8.1 — Extract candidate URLs

Gather potential base URLs from these sources (check in order, stop after 5 candidates):

1. `baseUrl=` argument (if passed by user)
2. `artk.config.yml` → `environments.local.baseUrl` (or any `environments.*.baseUrl`)
3. `playwright.config.ts` → `baseURL` in `use:` block
4. Environment files (`.env.local`, `.env`, `.env.development`): variables matching `*_BASE_URL`, `*_APP_URL`, `BASE_URL`, `APP_URL` containing `localhost` or `127.0.0.1`
5. Build tool configs (`vite.config.ts`, `webpack.config.js`, `angular.json`): `server.port`, `devServer.port`, or proxy targets
6. `package.json` scripts: port numbers from `"dev"`, `"start"`, `"serve"` commands

### 1.8.2 — Probe candidate URLs

For each candidate (up to 5):

```bash
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 5 <url>
```

A URL is **reachable** if HTTP status is 2xx, 3xx, 401, or 403.

### 1.8.3 — Set runtime availability flag

- **One URL reachable:** Set `appAvailable=true`, `appBaseUrl=<url>`. Print:
  `✓ App detected at <url> — will use runtime inspection to reduce blocked steps.`

- **Multiple reachable:** Ask user to pick, then set `appAvailable=true`.

- **None reachable / no candidates:** Set `appAvailable=false`. Print:
  `ℹ App not reachable — proceeding with static-only clarification. Some steps may be marked as blocked.`

**This flag is used later in Machine Hints (Step 6) to attempt runtime resolution before marking steps as blocked.**

## Step 2 — Pull discovery + testability context (auto)
If `useDiscovery=true` OR (`auto` and discovery files exist):
Use discovery outputs (from /artk.discover-foundation) to prefill and reduce questions:
- `docs/TESTABILITY.md` (selectors/data/async/env risks)
- `docs/DISCOVERY.md` and/or `docs/discovery/*.json` (routes/features/auth entry points/risk list)
- `reports/discovery/apis.json` (test data setup patterns - CRITICAL for data strategy)

Extract into a short internal summary (to be written into the Journey clarification block):
- likely auth entry points for this scope
- environment access constraints (regions, base URLs)
- known testability blockers for this scope/routes
- async "flake zones" mentioned for this area

If discovery is unavailable, proceed but ask slightly more questions.

## Step 2.1 — Load Test Data Setup Patterns (NEW)

**Goal:** Auto-fill data strategy from `apis.json` to reduce/eliminate data setup questions.

### A) Check for apis.json

```
Look for: reports/discovery/apis.json
If not found: Skip to Step 2.5 (will ask data questions later)
If found: Parse and extract relevant entities for this journey
```

### B) Identify Journey's Required Entities

From the journey's procedural steps, identify entities that need to be created:
- "Create a new request" → needs Request entity
- "View an HR movement" → needs HRMovement entity (pre-existing)
- "Edit a product template" → needs ProductTemplate entity

### C) Match Entities to Discovered Patterns

For each required entity, check `apis.json.entities[]`:

```
IF entity.operations.create.available == true:
  → Use API-first: method + path + requiredFields
  → Note cleanup: entity.operations.delete if available

ELSE IF entity.uiForms[] has action="create":
  → Use UI-first: route + fields + submitSelector
  → Note: Slower but works when no API

ELSE IF testFactories[] has matching entity:
  → Use factory: file + method
  → Note: Preferred if exists (already tested)

ELSE:
  → Mark as "manual discovery needed"
  → DO NOT ask user for Swagger (try on-demand scan first)
```

### D) Auto-Fill Data Strategy Block

**If all entities found in apis.json:**
```yaml
# Auto-generated from discovery - no user questions needed
dataStrategy:
  approach: api-first  # Based on apis.json availability
  entities:
    - name: Request
      create:
        method: POST
        path: /api/requests
        requiredFields: [title, categoryId, description]
        examplePayload:
          title: "E2E Test Request {{timestamp}}"
          categoryId: "{{lookup:Category.id}}"
          description: "Auto-generated for {{journey.id}}"
      cleanup:
        method: DELETE
        path: /api/requests/{{id}}
      uiAlternative:  # Fallback if API fails
        route: /requests/new
        fields: [title, category, description]
  creationOrder: [Category, Request]  # Based on dependencies
  cleanupStrategy: delete-after-test
```

**If some entities missing from apis.json:**
```yaml
dataStrategy:
  approach: mixed
  entities:
    - name: Request
      create: { ... }  # From apis.json
    - name: CustomWidget
      create: DISCOVERY_NEEDED  # Will trigger focused question
  missingEntities: [CustomWidget]
```

### E) Display Confirmation (Not Questions)

**Instead of asking:**
```
"What backend API endpoints exist for creating test entities?"
```

**Show confirmation:**
```
## Data Setup Patterns (from discovery)

| Entity | Create Method | Cleanup | Source |
|--------|--------------|---------|--------|
| Request | POST /api/requests | DELETE /api/requests/{id} | openapi |
| HRMovement | POST /api/hr-movements | DELETE /api/hr-movements/{id} | openapi |
| Category | - (use existing) | - | read-only |

**Strategy:** API-first with DELETE cleanup after each test.

✓ Using discovered patterns. Adjust if needed: [Y/adjust/scan-more]
```

### F) Fallback: On-Demand Scanning

If entity not in apis.json, try scanning BEFORE asking user:

1. **Try controller scan:**
   ```
   Search: src/**/controller/**/*{EntityName}*.java
   Search: src/**/api/**/*{entityName}*.ts
   Look for: POST endpoint with entity name
   ```

2. **Try UI form scan:**
   ```
   Search: src/**/pages/**/{entity}/new.*
   Search: src/**/components/**/{Entity}Form.*
   Look for: form with submit handler
   ```

3. **Only ask user if scan fails:**
   ```
   Could not discover create method for: CustomWidget

   How should test data be created for this entity?
   1) Point me to the API endpoint or controller
   2) Point me to the UI form
   3) There's a test factory I should use
   4) It's a read-only entity (use existing data)
   ```

### G) Edge Cases

| Scenario | Handling |
|----------|----------|
| No apis.json exists | Proceed to Step 5, ask focused data questions |
| apis.json empty (no entities) | Same as above |
| Entity has no create operation | Mark as read-only, note in clarification |
| Entity has no delete operation | Use soft-delete or filter by test prefix |
| Entity needs parent first | Add to creationOrder, note dependency |
| Auth required for API | Note: use apiContext from storage state |
| GraphQL instead of REST | Use mutation name from graphqlOperation field |
| Multi-tenant API | Include tenant context from multiTenant field |

### H) Output to Clarification Block

Add to journey's clarification section:
```markdown
<!-- ARTK:BEGIN data-strategy -->
**Data Setup (auto-discovered):**
- Approach: API-first
- Entities: Request (POST /api/requests), Category (existing)
- Cleanup: DELETE after test
- Auth: Uses apiContext from storage state
- Source: reports/discovery/apis.json
<!-- ARTK:END data-strategy -->
```

## Step 2.5 — Surface LLKB Knowledge (Read-Only)

**Load relevant LLKB data to inform clarification and surface known issues.**

Check if `.artk/llkb/` exists and `config.yml` has `enabled: true`. If disabled or missing, skip this step.

### LLKB Library Reference (@artk/core/llkb)

**Use the `@artk/core/llkb` library for reading LLKB data. This step is READ-ONLY (no writes to LLKB).**

```typescript
import {
  // File operations (read-only for clarify)
  loadJSON,
  // Confidence calculations (for filtering/sorting)
  needsConfidenceReview, getConfidenceTrend,
  // Category helpers
  inferCategory, isComponentCategory, getAllCategories,
  // Types
  type Lesson, type Component, type AppQuirk, type LLKBConfig,
} from '@artk/core/llkb';
```

**Key functions for journey-clarify:**

| Function | Usage |
|----------|-------|
| `loadJSON<T>(path)` | Safely load lessons.json, components.json, app-profile.json |
| `needsConfidenceReview(lesson)` | Check if lesson has low/declining confidence |
| `getConfidenceTrend(lesson)` | Get confidence direction (increasing/stable/declining) |
| `inferCategory(code)` | Categorize journey steps for component matching |

**Note:** journey-clarify is READ-ONLY. It does NOT write to LLKB (no lessons created, no components extracted).

### 2.5.1 Load Relevant LLKB Data

1. **Read `.artk/llkb/app-profile.json`** - Get app characteristics
2. **Read `.artk/llkb/lessons.json`** - Get lessons and app quirks
3. **Read `.artk/llkb/components.json`** - Get available components

### 2.5.2 Filter by Journey Scope

Filter LLKB data to only what's relevant to this Journey:

1. **Scope matching**:
   ```
   journeyScope = journey.scope  // e.g., "orders", "catalog", "dashboard"
   journeyRoutes = inferRoutes(journey)  // e.g., ["/orders", "/orders/create"]

   relevantLessons = lessons.filter(l =>
     l.scope === 'universal' OR
     l.scope === `framework:${appProfile.framework}` OR
     l.applicableTo.some(pattern => pattern matches journeyScope) OR
     l.tags.some(tag => tag matches journeyScope)
   )

   relevantQuirks = appQuirks.filter(q =>
     q.location matches journeyRoutes OR
     q.component matches journeyScope OR
     q.affectsJourneys.includes(journey.id)
   )

   relevantComponents = components.filter(c =>
     c.category matches journeyType OR
     c.usageContext.some(ctx => ctx matches journeyScope) OR
     c.usedInJourneys.some(j => j matches journeyScope)
   )
   ```

2. **Prioritize by confidence/relevance**:
   ```
   relevantLessons.sort((a, b) => b.confidence - a.confidence)
   relevantComponents.sort((a, b) => b.metrics.successRate - a.metrics.successRate)
   ```

3. **Include all relevant items** (no artificial limits):
   ```
   topLessons = relevantLessons      // All relevant, sorted by confidence
   topComponents = relevantComponents // All relevant, sorted by success rate
   topQuirks = relevantQuirks        // All quirks for this journey
   ```

### 2.5.3 Surface to User in Output

**During clarification, present LLKB insights to the user:**

```markdown
═══════════════════════════════════════════════════════════════════
LLKB INSIGHTS FOR THIS JOURNEY
═══════════════════════════════════════════════════════════════════

⚠️  KNOWN QUIRKS (Issues discovered in similar journeys):

1. **AQ003 - DatePicker validation timing**
   Location: /orders/create
   Impact: Date picker requires blur event before validation check
   Workaround: await datePicker.blur(); await expect(validationMessage).toBeVisible();
   Affects: JRN-0001, JRN-0005

2. **AQ007 - Order form double-click**
   Location: /orders/create
   Impact: Submit button can be double-clicked, creating duplicate orders
   Workaround: await submitButton.click(); await submitButton.waitFor({ state: 'disabled' });
   Affects: JRN-0003

─────────────────────────────────────────────────────────────────

📦 AVAILABLE COMPONENTS (Reusable test helpers):

1. **COMP001 - verifySidebarReady** (95% confidence)
   Category: navigation
   Use when: After page load, before navigation actions
   Import: `import { verifySidebarReady } from '@modules/foundation/navigation';`

2. **COMP020 - expectToast** (98% confidence)
   Category: assertion
   Use when: After form submission, expecting success/error toast
   Import: `import { expectToast } from '@artk/core/assertions';`

3. **COMP015 - verifyCatalogGrid** (92% confidence)
   Category: data grid
   Use when: Verifying catalog/orders grid is loaded with data
   Import: `import { verifyCatalogGrid } from '@modules/feature/catalog';`

─────────────────────────────────────────────────────────────────

💡 RELEVANT LESSONS (Patterns learned from similar tests):

1. **L001 - AG Grid selectors** (HIGH, 92% confidence)
   Problem: CSS class selectors (.ag-cell-value) break on updates
   Solution: Use getByRole('gridcell', { name: value })
   Apply to: Data grid interactions

2. **L015 - Toast timing** (MEDIUM, 88% confidence)
   Problem: Toast assertions fail with default timeout
   Solution: Use timeout: 5000 for toast expectations
   Apply to: Success/error message verification

3. **L022 - Navigation completion** (HIGH, 91% confidence)
   Problem: SPA navigation races cause flaky selectors
   Solution: Assert on heading + URL after navigation
   Apply to: Page transitions

═══════════════════════════════════════════════════════════════════
```

### 2.5.4 Add to Journey Clarification Block

**When writing the clarification block, include LLKB context:**

```markdown
<!-- ARTK:BEGIN clarification -->

## Clarification Details

### Actor Assumptions
<from questions>

### Auth Entry Point
<from questions>

### LLKB Context (Known Issues & Helpers)

**Known Quirks:**
- **AQ003**: DatePicker requires blur before validation check
- **AQ007**: Order form submit button double-click issue (workaround in place)

**Available Components:**
- `verifySidebarReady()` - Navigation readiness check (COMP001)
- `expectToast()` - Toast message assertion (COMP020)
- `verifyCatalogGrid()` - Grid data verification (COMP015)

**Relevant Lessons:**
- L001: Use aria-based selectors for AG Grid cells
- L015: Use 5s timeout for toast expectations
- L022: Assert on heading + URL after navigation

### Data Strategy
<from questions>

### Assertions
<from questions>

### Async Notes
<from questions>

### Compliance Constraints
<from questions>

### Blockers
<from blocker detection>

<!-- ARTK:END clarification -->
```

### 2.5.5 Benefits of LLKB Context Surfacing

- **Prevents repeat issues**: User is aware of quirks before implementation
- **Guides data strategy**: Known patterns inform setup/cleanup approach
- **Informs assertions**: Learned timing patterns guide timeout expectations
- **Highlights reuse**: User knows what components are available
- **Reduces questions**: If LLKB has answer, skip the question

**Note:** This step is READ-ONLY. journey-clarify does NOT write to LLKB (no lessons created, no components extracted). It only surfaces existing knowledge.

## Step 3 — Determine what is missing from the Journey
Detect missing/weak content:
- Preconditions/data strategy incomplete or “unknown”
- Acceptance criteria too vague (“works”, “loads”, “should be fine”)
- Steps ambiguous (unclear navigation, unknown page names)
- Assertions missing or non-deterministic (“looks right”)
- Async behavior not considered
- Compliance not discussed

Also infer which pages/routes the Journey touches (best-effort) by:
- matching step wording to known routes/pages from discovery
- matching scope/feature name to routes

## Step 4 — Selector readiness and data feasibility gates (new)
If testability data exists for this scope/routes:
- If locator readiness is flagged as `blocker` or `high` for relevant screens:
  - add a **Blockers** list with remediation:
    - prefer accessible roles/names
    - add `data-testid` to critical controls if semantics are insufficient
    - avoid CSS/class selectors
- If data feasibility is flagged as `blocker` (no way to create deterministic data):
  - add blocker with remediation:
    - add seed scripts/fixtures
    - add safe API setup endpoints for test environments
    - create admin-only setup helper flows
- If environment access is constrained (regional restrictions):
  - add blocker with remediation:
    - define which env(s) can be used for gating in your region
    - use a proxy runner where allowed (future phases)

If blockers exist and `strictGates=true`:
- keep status NOT clarified and set `statusReason` to a short “blocked by …” summary.

## Step 5 — Ask the smallest smart questionnaire

### CRITICAL: One Question At A Time (NON-NEGOTIABLE)

**This rule MUST be followed regardless of context length or conversation state.**

1. **Ask EXACTLY ONE question per message**
2. **WAIT for user response before asking the next question**
3. **Show progress**: "Question X of Y"
4. **Use numbered options (1, 2, 3...)**, NOT checkboxes
5. **Provide a recommended default** where applicable

**Example format (MUST follow):**
```
**Question 1 of 5: Actor Role**

What role/persona will execute this journey?

1. Admin user (recommended - has all permissions)
2. Standard user
3. Guest/anonymous
4. Multiple roles required

Reply with a number (1-4):
```

**VIOLATION CHECK**: If you find yourself typing "Question 2" or listing multiple questions in the same message, STOP. You are violating this rule.

**Why this matters**: Dumping all questions at once overwhelms users and prevents clarifying follow-up on each answer.

### Adaptive question set (do not be annoying)
If discovery already provides an answer, ask for confirmation only if high impact.

Required categories (medium/max):
A) Actor / auth
- What role/persona?
- Auth style: login form vs SSO redirect vs both?
- MFA/2FA/passkey constraints?
- Any role switching?

B) Environment assumptions
- Which env(s) are realistic targets for regression runs?
- Base URL(s)? Any regional access constraints?

C) Data strategy and cleanup
**SKIP IF: Step 2.1 auto-filled data strategy from `apis.json`**
- Only ask if `apis.json` missing OR entity not found in discovery
- Can we create needed data via UI, API, seed scripts, fixtures?
- Cleanup expectation?

D) Success criteria / assertions
- What must be asserted at each key step?
- Prefer user-visible assertions over DOM internals.

E) Async / wait strategy implications
- Any eventual consistency/background jobs/polling?
- What indicates completion (toast, status change, URL, UI state)?

F) Compliance constraints
- Are traces/videos/screenshots allowed?
- Any PII constraints? Retention rules?

G) Module dependencies
- Confirm foundation and feature modules needed.
- Align names with existing module structure if present.

Question budget by mode:
- minimal: only A+B+C+F (skip C if auto-filled from apis.json)
- medium: A..G (but only ask what's missing, skip C if auto-filled)
- max: A..G + variants/edges/flags/observability

**Data Strategy Skip Rule:** If Step 2.1 auto-filled data strategy from `apis.json`, SKIP question C entirely. Show confirmation instead of asking.

### Question Delivery Checkpoint

**Before asking any question, verify:**
- [ ] You are asking ONLY ONE question
- [ ] You are showing "Question X of Y" progress
- [ ] You are using numbered options (not checkboxes)
- [ ] You will WAIT for user response before continuing

**If context was compacted**: Re-read this section. The one-question-at-a-time rule is NON-NEGOTIABLE.

## Step 6 — Update Journey file safely (managed markers)
### Rules
- Preserve human-written narrative.
- Write clarification details inside managed markers.
- If the Journey lacks markers, append a managed "Clarification Annex" section rather than restructuring.

### Required managed blocks to add/update
1) `<!-- ARTK:BEGIN clarification --> ... <!-- ARTK:END clarification -->`
Must include:
- Actor assumptions (and provisioning process)
- Auth entry point notes (from discovery if available)
- Env assumptions (including regional constraints)
- Data strategy (setup + cleanup)
- Assertions list (explicit)
- Async notes + wait strategy guidance
- Compliance constraints (artifact/PII policy)
- Blockers (if any) + remediation
- **LLKB Context** (from Step 2.5 - known quirks, available components, relevant lessons)

2) `<!-- ARTK:BEGIN deterministic-steps --> ... <!-- ARTK:END deterministic-steps -->`
Rewrite steps to remove ambiguity:
- include concrete navigation cues (menu names, page titles)
- include stable verification points after major transitions
- **ADD MACHINE HINTS FOR AUTOGEN** (see below)

3) `<!-- ARTK:BEGIN acceptance-criteria --> ... <!-- ARTK:END acceptance-criteria -->`
Ensure Given/When/Then style where possible.

### AutoGen Opt-Out Handling

**Before adding machine hints, check if AutoGen is disabled:**

```
IF autogen.enabled === false:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  AUTOGEN DISABLED BY USER                                          ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                    ║
  ║  This journey has autogen.enabled: false                           ║
  ║                                                                    ║
  ║  Skipping machine hints step (not needed for manual implementation)║
  ║                                                                    ║
  ║  Actions taken:                                                    ║
  ║  - Modules format validated/converted (for consistency)            ║
  ║  - Machine hints step SKIPPED                                      ║
  ║  - autogen.machineHints remains false                              ║
  ║                                                                    ║
  ║  To enable AutoGen, set autogen.enabled: true and re-run clarify.  ║
  ║                                                                    ║
  ╚════════════════════════════════════════════════════════════════════╝

  SKIP Machine Hints section entirely
  SKIP Machine Hints Verification box
  SKIP All-Blocked Threshold evaluation
  CONTINUE with other clarification steps (questions, data strategy, etc.)
```

**Note:** Even with autogen disabled, modules format is still converted to object format for schema consistency.

### Machine Hints for AutoGen (CRITICAL)

**If autogen.enabled: true (default), proceed with machine hints.**

**AutoGen CLI uses inline locator hints to generate stable selectors automatically.**

Add machine hints to steps using backtick notation:
```markdown
## Steps

1. Navigate to the login page
2. Enter username in the email field `(role=textbox, name=Email)`
3. Enter password in the password field `(role=textbox, name=Password)`
4. Click the login button `(role=button, name=Sign In)`
5. Verify the dashboard loads `(testid=dashboard-container)`
6. Click the orders menu item `(role=link, name=Orders)`
7. Verify the orders grid is visible `(testid=orders-grid)`
8. Click the first order row `(role=row, name=/ORD-/)`
```

**Machine hint format:**
- `(role=<role>, name=<name>)` - Playwright getByRole locator
- `(testid=<id>)` - Playwright getByTestId locator
- `(label=<text>)` - Playwright getByLabel locator
- `(placeholder=<text>)` - Playwright getByPlaceholder locator
- `(text=<text>)` - Playwright getByText locator
- `(css=<selector>)` - CSS selector (use sparingly, last resort)

**Regex patterns in name:**
- `(role=button, name=/submit/i)` - Case-insensitive match
- `(role=row, name=/^ORD-\d+/)` - Starts with pattern

### Machine Hint Validation Rules

**Before accepting a machine hint, validate its syntax:**

1. **role= must be a valid ARIA role:**
   ```
   VALID_ROLES = [
     "button", "link", "textbox", "checkbox", "radio", "combobox", "listbox",
     "menu", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "tabpanel",
     "dialog", "alertdialog", "alert", "grid", "gridcell", "row", "rowheader",
     "columnheader", "cell", "heading", "img", "list", "listitem", "navigation",
     "main", "form", "search", "banner", "contentinfo", "complementary", "region",
     "article", "figure", "separator", "slider", "spinbutton", "switch", "table",
     "tree", "treeitem", "progressbar", "status", "tooltip", "log", "marquee",
     "timer", "option", "group"
   ]
   ```

2. **testid= must not contain spaces:**
   - ✅ `(testid=orders-grid)` - valid
   - ✅ `(testid=order_grid_123)` - valid
   - ❌ `(testid=orders grid)` - INVALID (has space)

3. **Multiple attributes require comma separation:**
   - ✅ `(role=button, name=Submit)` - valid
   - ❌ `(role=button name=Submit)` - INVALID (missing comma)

4. **No empty values:**
   - ❌ `(role=button, name=)` - INVALID (empty name)
   - ❌ `(testid=)` - INVALID (empty testid)

5. **Regex must be valid JavaScript regex:**
   - ✅ `(role=row, name=/^ORD-\d+/)` - valid
   - ✅ `(role=button, name=/submit/i)` - valid (with flags)
   - ❌ `(role=row, name=/[invalid/)` - INVALID (unclosed bracket)

**If invalid hint detected:**
```
⚠️  INVALID HINT DETECTED

Step 5: Click the button `(role=btn, name=Submit)`

Error: "btn" is not a valid ARIA role
Valid roles include: button, link, textbox, checkbox, etc.

Fix: `(role=button, name=Submit)`
```

**Steps without hints — Runtime Resolution (if `appAvailable=true`):**

Before marking a step as blocked, attempt runtime inspection if the app is reachable (set in Step 1.8):

1. **Navigate to the relevant route** for the step's context:
   ```bash
   curl -s --max-time 5 <appBaseUrl>/<route>
   ```

2. **Inspect the HTML** for selectors, form fields, ARIA roles, or test IDs that resolve the step:
   - Form validation rules → look for `required`, `pattern`, `minlength` attributes, validation libraries
   - Selector mechanisms → look for `<select>`, combobox roles, listbox patterns
   - Console error detection → confirm page loads without server errors (HTTP 2xx)
   - UI component structure → look for `data-testid`, `aria-label`, role attributes

3. **If resolved:** Add the machine hint and proceed (do NOT block the step).

4. **If still unresolvable:** Mark as `blockedSteps` with reason.

**Steps without hints (if `appAvailable=false`):**
- AutoGen will attempt to infer locators from step description
- If inference fails, step is marked as `blockedSteps` for manual implementation
- Add hints proactively to reduce blocked steps

### Machine Hints Verification (MANDATORY OUTPUT)

**After adding machine hints, you MUST output this verification box:**

```
╔════════════════════════════════════════════════════════════════════╗
║  MACHINE HINTS VERIFICATION                                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Total steps: {total}                                               ║
║  Steps with hints: {withHints}                                      ║
║  Steps needing hints: {needingHints}                                ║
║                                                                     ║
║  Steps requiring attention:                                         ║
║  {list of step numbers and descriptions without hints}              ║
║                                                                     ║
║  Resolution for steps without hints:                                ║
║  □ Added hint (step becomes auto-implementable)                     ║
║  □ Added to blockedSteps (step requires manual implementation)      ║
║                                                                     ║
║  AutoGen Ready: {YES if all steps have hints or are blocked, NO}    ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Example:**
```
╔════════════════════════════════════════════════════════════════════╗
║  MACHINE HINTS VERIFICATION                                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Total steps: 8                                                     ║
║  Steps with hints: 6                                                ║
║  Steps needing hints: 2                                             ║
║                                                                     ║
║  Steps requiring attention:                                         ║
║  - Step 1: "Navigate to the login page" (no interaction, OK)        ║
║  - Step 5: "Wait for processing" (async, added to blockedSteps)     ║
║                                                                     ║
║  Resolution for steps without hints:                                ║
║  ☑ Step 1: No hint needed (navigation, no element interaction)      ║
║  ☑ Step 5: Added to blockedSteps (complex async flow)               ║
║                                                                     ║
║  AutoGen Ready: YES                                                 ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**RULE: If a step has no hint AND is not in blockedSteps, you MUST either:**
1. Add a machine hint to the step, OR
2. Add the step number to `autogen.blockedSteps` with a reason

**Do NOT set `autogen.machineHints: true` until this verification is complete.**

### All-Blocked Threshold Rule (MANDATORY)

**If most steps are blocked, disable AutoGen automatically.**

```
BLOCKED_THRESHOLD = 0.80  # 80%

FUNCTION evaluateBlockedThreshold(totalSteps, blockedSteps):
  blockedCount = blockedSteps.length
  blockedRatio = blockedCount / totalSteps

  IF blockedRatio > BLOCKED_THRESHOLD:
    # Most steps need manual implementation - AutoGen adds no value
    RETURN { disableAutogen: true, reason: ">" + (BLOCKED_THRESHOLD * 100) + "% steps blocked" }
  ELSE:
    RETURN { disableAutogen: false }
```

**When >80% of steps are blocked:**

```
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  AUTOGEN DISABLED - Too Many Blocked Steps                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Total steps: {total}                                               ║
║  Blocked steps: {blocked} ({percentage}%)                           ║
║                                                                     ║
║  Threshold: 80%                                                     ║
║                                                                     ║
║  Since most steps require manual implementation, AutoGen has been   ║
║  automatically disabled for this journey.                           ║
║                                                                     ║
║  Setting: autogen.enabled: false                                    ║
║                                                                     ║
║  To override, manually set autogen.enabled: true in frontmatter.    ║
║  AutoGen will generate partial code for non-blocked steps only.     ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Update autogen section when threshold exceeded:**
```yaml
autogen:
  enabled: false           # Disabled - 85% of steps blocked
  blockedSteps:            # [list of blocked steps]
    - step: 1
      reason: "..."
    # ... (many blocked steps)
  machineHints: true       # Hints were added, but most steps still blocked
  disabledReason: "85% of steps (17/20) require manual implementation"
```

**User can override:**
- If user explicitly sets `autogen.enabled: true` despite threshold, respect it
- Output warning: "AutoGen enabled by user override. Partial generation will occur."

### Update frontmatter

**Validate and fix modules format for AutoGen:**

**Module Classification Algorithm (MANDATORY):**
```
FOUNDATION_MODULES = [
  "auth",           # Authentication/login flows
  "navigation",     # Page navigation, sidebar, menus
  "selectors",      # Shared locator utilities
  "locators",       # Alias for selectors
  "data",           # Test data builders/fixtures
  "api",            # API request helpers
  "assertions",     # Shared assertion utilities
  "files",          # File upload/download helpers
  "notifications",  # Toast/alert handling
  "config",         # Configuration loading
  "fixtures"        # Test fixtures
]

FUNCTION classifyModule(moduleName: string) -> "foundation" | "feature":
  normalizedName = moduleName.toLowerCase().trim()
  IF normalizedName in FOUNDATION_MODULES:
    RETURN "foundation"
  ELSE:
    RETURN "feature"

FUNCTION convertModulesToObject(modules: string[]) -> { foundation: [], features: [] }:
  result = { foundation: [], features: [] }
  FOR each module in modules:
    category = classifyModule(module)
    IF category == "foundation":
      result.foundation.push(module)
    ELSE:
      result.features.push(module)
  RETURN result
```

**When modules is an array, convert to object:**
```yaml
# FROM: modules: [auth, navigation, orders, catalog]
# TO (using classification algorithm):
modules:
  foundation: [auth, navigation]   # Matched FOUNDATION_MODULES
  features: [orders, catalog]      # Everything else
```

### Empty Modules Validation (MANDATORY)

**After conversion or when validating existing modules:**

**Validate foundation modules:**
```
IF modules.foundation is empty OR modules.foundation.length === 0:
  OUTPUT WARNING:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ⚠️  WARNING: No Foundation Modules                                 ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                     ║
  ║  This journey has no foundation modules defined.                    ║
  ║                                                                     ║
  ║  Most journeys need at least:                                       ║
  ║  - `auth` - if the journey requires login                           ║
  ║  - `navigation` - if the journey navigates between pages            ║
  ║                                                                     ║
  ║  Current modules:                                                   ║
  ║    foundation: []                                                   ║
  ║    features: [<features>]                                           ║
  ║                                                                     ║
  ║  Suggested action: Add `auth` and/or `navigation` to foundation.    ║
  ║                                                                     ║
  ╚════════════════════════════════════════════════════════════════════╝

  ASK USER: "Should I add `auth` and `navigation` to foundation modules?"
```

**Validate features modules:**
```
IF modules.features is empty OR modules.features.length === 0:
  # This is ACCEPTABLE - journey may use only foundation modules
  # No warning needed, but note in output
  NOTE: "Journey uses only foundation modules (no feature modules)"
```

**Both empty is suspicious:**
```
IF modules.foundation.length === 0 AND modules.features.length === 0:
  OUTPUT ERROR:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ❌ ERROR: No Modules Defined                                       ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                     ║
  ║  Journey <ID> has no modules defined at all.                        ║
  ║                                                                     ║
  ║  modules:                                                           ║
  ║    foundation: []                                                   ║
  ║    features: []                                                     ║
  ║                                                                     ║
  ║  This is likely an error. Every journey needs at least one module.  ║
  ║                                                                     ║
  ║  Please add appropriate modules before continuing.                  ║
  ║                                                                     ║
  ╚════════════════════════════════════════════════════════════════════╝

  STOP and ask user to add modules.
```

**Output conversion notice (MANDATORY):**
```
╔════════════════════════════════════════════════════════════════════╗
║  MODULES FORMAT CONVERTED                                           ║
╠════════════════════════════════════════════════════════════════════╣
║  FROM: modules: [auth, navigation, orders, catalog]                 ║
║  TO:   modules:                                                     ║
║          foundation: [auth, navigation]                             ║
║          features: [orders, catalog]                                ║
║                                                                     ║
║  Classification based on canonical FOUNDATION_MODULES list.         ║
║  Review and adjust if incorrect.                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Update autogen section:**
```yaml
autogen:
  enabled: true
  blockedSteps: []    # List step numbers that need manual implementation
  machineHints: true  # Indicates machine hints have been added
```

### blockedSteps Format Specification (MANDATORY)

**`blockedSteps` MUST use the step+reason format:**

```yaml
autogen:
  enabled: true
  blockedSteps:
    - step: 3
      reason: "Complex async polling - requires custom wait logic"
    - step: 7
      reason: "Multi-actor flow - needs manual setup"
    - step: 12
      reason: "File download verification - browser-specific handling"
  machineHints: true
```

**Format rules:**
- Each entry MUST have `step` (number) and `reason` (string)
- `step` is the 1-based step number from the procedural steps
- `reason` should explain WHY the step cannot be auto-generated
- Empty blockedSteps is valid: `blockedSteps: []`

**Valid reasons include:**
- "Complex async polling/waiting"
- "Multi-actor coordination"
- "File operations (upload/download)"
- "iFrame interaction"
- "External service integration"
- "Complex conditional logic"
- "Browser-specific behavior"
- "Dynamic content requiring custom selectors"

**Example with populated blockedSteps:**
```yaml
---
id: JRN-0005
title: "Order Export and Download"
status: clarified
# ... other fields ...
autogen:
  enabled: true
  blockedSteps:
    - step: 5
      reason: "File download - requires browser download path handling"
    - step: 6
      reason: "File content verification - needs fs module"
  machineHints: true
---
```

**journey-implement will:**
1. Auto-generate code for steps NOT in blockedSteps
2. Generate placeholder/TODO comments for blocked steps
3. Report blocked steps in implementation summary

**Other frontmatter updates:**
- If ready criteria met AND (if strictGates=true) no blockers: set `status: clarified`.
- Otherwise keep status and add/update `statusReason` describing what's missing/blocked.
- Update `updated:` timestamp if present; do not fabricate `created` if missing.

### Layout-aware move (optional)
If journeys.config.yml indicates staged layout and status becomes clarified:
- move file to `journeys/clarified/` unless user set `promote=false`.
If flat layout:
- do not move by default.

## Step 7 — Regenerate backlog/index
Preferred:
- run `<ARTK_ROOT>/tools/journeys/generate.js`
Fallback:
- emulate Core generator exactly.

## Step 8 — Maintain docs/JOURNEY_CLARIFY.md (guidance + examples)
Maintain a canonical guidance doc with managed markers that includes:
- What is a Journey vs a test case
- “Ready for implementation” checklist (including strict gates)
- Examples:
  - good acceptance criteria (Given/When/Then)
  - good procedural steps
  - good data strategy (seed/API setup)
  - compliance-safe example (synthetic/masked data; artifact retention note)
- Do’s and don’ts:
  - avoid sleeps; prefer event-based waits and assertions
  - prefer resilient selectors (role/name/testid)
  - isolate tests (no shared state leakage)
  - avoid storing sensitive data in traces/screenshots unless policy allows

---

# Completion checklist (print at end)
- [ ] Journey updated with clarification blocks (including discovery/testability notes if available)
- [ ] Status set to clarified OR blockers documented with remediation
- [ ] BACKLOG.md regenerated
- [ ] index.json regenerated
- [ ] docs/JOURNEY_CLARIFY.md created/updated

**AutoGen Readiness (IMPORTANT):**
- [ ] `modules` in object format: `{ foundation: [], features: [] }` (fixed if needed)
- [ ] Machine hints added to key steps using backtick notation
- [ ] `autogen.enabled: true` set in frontmatter
- [ ] `autogen.blockedSteps` updated (empty if all steps have hints, or list step numbers)
- [ ] `autogen.machineHints: true` set in frontmatter

---

### Final Output (MANDATORY)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

# MANDATORY: Final Output Section

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.journey-clarify.txt`

**Instructions:**
1. Use your file reading capability to read the file above
2. Display the ENTIRE contents of that file as a code block
3. Do NOT modify, summarize, or add to the file contents
4. Do NOT generate your own version - READ THE FILE

**If you cannot read the file**, display this fallback EXACTLY:
```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (RECOMMENDED) Audit selectors before implementation:            ║
║     /artk.testid-audit mode=report scope=journey:<JRN-ID>          ║
║                                                                     ║
║  2. (RECOMMENDED) Implement the journey as Playwright tests:        ║
║     /artk.journey-implement id=<JRN-ID>                            ║
║                                                                     ║
║  3. (AFTER IMPLEMENT) Validate the generated tests:                 ║
║     /artk.journey-validate id=<JRN-ID>                             ║
║                                                                     ║
║  4. (OPTIONAL) Clarify another journey:                             ║
║     /artk.journey-clarify id=JRN-####                              ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<JRN-ID>` with the actual journey ID that was just clarified (e.g., JRN-0001).**

**IMPORTANT:**
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
