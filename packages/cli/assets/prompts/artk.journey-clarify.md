---
name: artk.journey-clarify
mode: agent
description: "Add deterministic execution detail to a Journey - data strategy, assertions, async handling, promotes to clarified"
handoffs:
  - label: "MANDATORY - /artk.init-playbook: bootstrap ARTK, playbook, journey system"
    agent: artk.init-playbook
    prompt: "Bootstrap ARTK in this repo"
  - label: "MANDATORY - /artk.discover-foundation: analyze app and build harness"
    agent: artk.discover-foundation
    prompt: "Analyze app and build foundation harness"
  - label: "OPTIONAL - /artk.journey-propose: propose journeys from discovery"
    agent: artk.journey-propose
    prompt: "Propose journeys from discovery outputs"
  - label: "MANDATORY - /artk.journey-define: create journey file"
    agent: artk.journey-define
    prompt: 'id=JRN-#### title="<title>"'
  - label: "MANDATORY - /artk.journey-clarify: add machine hints"
    agent: artk.journey-clarify
    prompt: "id=JRN-####"
  - label: "RECOMMENDED - /artk.testid-audit: audit selectors and add test hooks"
    agent: artk.testid-audit
    prompt: "mode=report"
  - label: "MANDATORY - /artk.journey-implement: generate tests"
    agent: artk.journey-implement
    prompt: "id=JRN-####"
  - label: "MANDATORY - /artk.journey-validate: static validation gate"
    agent: artk.journey-validate
    prompt: "id=JRN-####"
  - label: "MANDATORY - /artk.journey-verify: run tests and verify"
    agent: artk.journey-verify
    prompt: "id=JRN-####"
---

# ARTK /journey-clarify — Clarification to Execution-Ready Detail (Phase 6)

You are running **ARTK Phase 6**.

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

Additionally, if `strictGates=true`, these MUST NOT be blocked:
- Locator readiness for the Journey’s key screens/actions
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

## Step 2 — Pull discovery + testability context (auto)
If `useDiscovery=true` OR (`auto` and discovery files exist):
Use Phase 4 outputs to prefill and to reduce questions:
- `docs/TESTABILITY.md` (selectors/data/async/env risks)
- `docs/DISCOVERY.md` and/or `docs/discovery/*.json` (routes/features/auth entry points/risk list)

Extract into a short internal summary (to be written into the Journey clarification block):
- likely auth entry points for this scope
- environment access constraints (regions, base URLs)
- known testability blockers for this scope/routes
- async "flake zones" mentioned for this area

If discovery is unavailable, proceed but ask slightly more questions.

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

**IMPORTANT: When asking questions, follow the User Question Standards in `.github/prompts/common/GENERAL_RULES.md`:**
- Ask ONE question at a time
- Use numbered options (NOT checkboxes)
- Show progress (Question X of Y)
- Provide recommended defaults
- Wait for user response before asking the next question

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
- minimal: only A+B+C+F
- medium: A..G (but only ask what’s missing)
- max: A..G + variants/edges/flags/observability

## Step 6 — Update Journey file safely (managed markers)
### Rules
- Preserve human-written narrative.
- Write clarification details inside managed markers.
- If the Journey lacks markers, append a managed “Clarification Annex” section rather than restructuring.

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

2) `<!-- ARTK:BEGIN deterministic-steps --> ... <!-- ARTK:END deterministic-steps -->`
Rewrite steps to remove ambiguity:
- include concrete navigation cues (menu names, page titles)
- include stable verification points after major transitions

3) `<!-- ARTK:BEGIN acceptance-criteria --> ... <!-- ARTK:END acceptance-criteria -->`
Ensure Given/When/Then style where possible.

### Update frontmatter
- If ready criteria met AND (if strictGates=true) no blockers: set `status: clarified`.
- Otherwise keep status and add/update `statusReason` describing what’s missing/blocked.
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

---

# MANDATORY: Final Output Section

**You MUST display this section at the end of your output, exactly as formatted.**

**Display the following commands VERBATIM (do not summarize, paraphrase, or invent commands):**

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
- Copy the commands box exactly. Do not abbreviate or summarize.
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
