---
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

A clarified Journey must be specific enough that `/journey-implement` (later phase) can implement Playwright tests **without guessing** about:
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
If missing: instruct user to run `/init-playbook` first.

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
- async “flake zones” mentioned for this area

If discovery is unavailable, proceed but ask slightly more questions.

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

## Step 5 — Ask the smallest smart questionnaire (single message)
Ask questions in one batch and provide a reply template.

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
