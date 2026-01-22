---
name: artk.journey-propose
mode: agent
description: "Auto-propose high-signal Journeys from discovery findings - generates proposed Journey files and JOURNEY_PROPOSALS.md"
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

# ARTK /artk.journey-propose — Automatic Journey Identification (Phase 5)

You are running **ARTK Phase 5**.

ARTK is a standardized kit that plugs into GitHub Copilot (repository instructions + prompt files + structured artifacts) to help teams build and continuously maintain **complete automated regression testing suites** for existing applications. These suites cover end-to-end **Journeys**, detect regressions early, and keep behavior stable across releases.

This command generates a **high-signal proposed Journey backlog** with **module dependency hints**, using:
- outputs from `/artk.discover-foundation` (Phase 4), plus
- **change risk signals** (code churn / hotspots), and
- **incident/bug history signals** (ticket references, postmortems, changelog “fixes”)

The objective is simple: propose the Journeys most likely to catch regressions **where they are most likely to happen** and **where they hurt the most**.

## Non‑Negotiables
- **High-signal only.** Propose Journeys that a team would actually automate soon.
- **Risk-first.** Favor critical + high-risk user flows over edge cases.
- **Feasibility-aware.** Do not flood the backlog with untestable Journeys.
- **Idempotent and safe.** Never overwrite human-written Journeys. Only update sections wrapped in ARTK managed markers.
- **Deterministic.** Same inputs ⇒ same proposal ordering and file names.
- **No secrets.** Never ask for credentials. If auth is needed, request a test account *process*, not secrets.
- **Graceful degradation.** If git history or incident sources are unavailable, proceed with discovery-only signals and label uncertainty.
- **Edit safety.** MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before any file edits.

---

# Expected inputs (best-effort)
Prefer these sources, in this order:

## A) Discovery (Phase 4)
Machine outputs if present:
- `docs/discovery/summary.json`
- `docs/discovery/routes.json`
- `docs/discovery/features.json`
- `docs/discovery/risk.json`
- `docs/discovery/apis.json`

Human outputs:
- `docs/DISCOVERY.md`
- `docs/TESTABILITY.md`

## B) Change signals (optional, best-effort)
- Local git history (preferred) using `git log` / `git diff` where available.
- If no git access:
  - PR diff context (if the environment provides it),
  - or repo-provided “release notes” and change summaries.

## C) Incident/bug signals (optional, best-effort)
Look for any of these in the repo:
- `docs/incidents/**`, `docs/postmortems/**`, `postmortem/**`, `incident/**`
- `CHANGELOG.md`, `RELEASE_NOTES.md`
- bug/incident exports: `incidents.csv`, `bugs.csv`, `jira_export.*`, `tickets.*`
- commit messages containing ticket IDs (e.g., `ABC-1234`, `INC123456`)

If discovery sources are missing, stop and instruct the user to run `/artk.discover-foundation` first.

---

# Outputs (must produce these)
Unless overridden by args, write outputs under `<ARTK_ROOT>/`:

## 1) Proposed Journey files
- Create canonical proposed Journey files under: `journeys/proposed/`
- Each file MUST:
  - conform to ARTK Core Journey schema (YAML frontmatter)
  - set `status: proposed`
  - include: intent, acceptance criteria (declarative), procedural steps, tentative assertions, dependencies, open questions
  - include a managed proposal metadata block with scoring evidence (see Step 9)

## 2) Updated generated outputs
- Regenerate:
  - `journeys/BACKLOG.md`
  - `journeys/index.json`
Use the installed Core generator via wrapper if available; otherwise emulate generator logic exactly.

## 3) Proposal summary doc
- Create/update: `docs/JOURNEY_PROPOSALS.md`

## 4) Optional machine evidence outputs (recommended)
Create a deterministic evidence folder under docs:
- `docs/journey-proposals/evidence.change.json`
- `docs/journey-proposals/evidence.incidents.json`
- `docs/journey-proposals/evidence.mapping.json`
- `docs/journey-proposals/evidence.scoring.json`

All generated sections MUST include managed markers:
- `<!-- ARTK:BEGIN <section> -->` and `<!-- ARTK:END <section> -->`

---

# Inputs (optional)
Parse `key=value` args after `/artk.journey-propose`:

## General
- `mode`: `quick | standard | max` (default: `standard`) — controls **question depth** (how much to ask)
- `artkRoot`: ARTK root folder path (default: infer from `artk.config.yml`)
- `appScope`: `auto | all | <appName>` (default: `auto`)
- `coverage`: `small | large` (default: `large`) — controls **proposal quantity** (how many journeys)
  - `small`: 20 journeys (5 smoke, 10 release, 5 regression) — quick start
  - `large`: 50 journeys (10 smoke, 20 release, 20 regression) — comprehensive
- `maxJourneys`: default depends on `coverage` (20 for small, 50 for large)
- `smokeCount`: default depends on `coverage` (5 for small, 10 for large)
- `releaseCount`: default depends on `coverage` (10 for small, 20 for large)
- `regressionCount`: default depends on `coverage` (5 for small, 20 for large)
- `includeRegression`: default `true` — regression tier is now included by default
- `includeBlocked`: default `true`
- `minFeasibility`: `high | medium` (default: `medium`)
- `allowDuplicates`: default `false`
- `outProposedDir`: default `journeys/proposed`
- `outDocsDir`: default `docs`
- `dryRun`: default `false`

**Coverage presets (user can override individual counts):**

| Coverage | Smoke | Release | Regression | Total |
|----------|-------|---------|------------|-------|
| `small`  | 5     | 10      | 5          | 20    |
| `large`  | 10    | 20      | 20         | 50    |

### Parameter Priority Rules (explicit overrides implicit)

When parameters conflict, apply this priority order:

1. **Explicit tier counts override coverage presets:**
   - `smokeCount=15` overrides the preset value from `coverage`
   - Same for `releaseCount` and `regressionCount`

2. **`includeRegression=false` disables regression regardless of coverage:**
   - `coverage=large includeRegression=false` → smoke + release only, no regression
   - The `regressionCount` is ignored when `includeRegression=false`

3. **`maxJourneys` caps total (priority-based filling):**
   - Fill smoke tier first (up to `smokeCount`)
   - Fill release tier next (up to `releaseCount`)
   - Fill regression tier last (up to `regressionCount`)
   - Stop when total reaches `maxJourneys`
   - Example: `smokeCount=10, releaseCount=20, regressionCount=20, maxJourneys=30`
     → Smoke: 10, Release: 20, Regression: 0 (maxJourneys hit)

### Backward Compatibility Note

**Breaking change (v2.0):** `includeRegression` now defaults to `true` (was `false`).
To restore old behavior, use `includeRegression=false`.

### Insufficient Data Handling

If there aren't enough quality candidates to fill the requested counts:
1. Apply tier criteria to all candidates first (see Step 9.4)
2. Assign each candidate to the appropriate tier based on criteria, not counts
3. Report actual counts vs requested counts in the output
4. Do NOT spread candidates thin just to fill tiers
5. Do NOT pad with low-quality proposals

Example: 5 candidates found, all meet smoke criteria
→ Smoke: 5, Release: 0, Regression: 0
→ Output explains: "Only 5 smoke-quality candidates found"

## Change/incident signal controls
- `changeSignals`: `auto | on | off` (default: `auto`)
- `changeWindowDays`: default `90`
- `changeWindowCommits`: default `500` (cap to avoid massive repos)
- `baseRiskWeight`: default `1.0`
- `churnWeight`: default `1.0`
- `incidentWeight`: default `1.0`
- `ownerWeight`: default `0.5`
- `useCODEOWNERS`: `auto | true | false` (default: `auto`)

## Incident parsing
- `incidentPaths`: a glob or comma-separated globs to search in-repo for incident artifacts
  - default: `docs/incidents/**,docs/postmortems/**,postmortem/**,incident/**,CHANGELOG.md,RELEASE_NOTES.md`
- `ticketRegex`: regex to extract ticket IDs
  - default: `([A-Z][A-Z0-9]+-\d+|INC\d+|BUG\d+)`

---

# Required output structure (always follow)

## 1) Detected context (short)
- ARTK_ROOT and repo type (monorepo vs single-app)
- Whether Journey system is installed (Phase 3) and where Core lives
- Whether Discovery outputs exist (Phase 4)
- Whether git/change signals are available (and method used)
- Whether incident sources are available (and where)
- Existing Journey counts by status/tier (from `journeys/index.json` if present)
- Existing module directories (if detectable)

## 2) Proposal plan (short)
- Inputs used (discovery + change + incident)
- Coverage scope (`small` or `large`)
- Proposed counts by tier (smoke / release / regression)
- Dedup strategy
- How IDs will be allocated
- Scoring weights used

## 3) Questions (only if required)
Ask a compact questionnaire for a single reply, based on `mode`.

## 4) Generated deliverables
- Proposed Journey files created/updated
- Backlog/index regenerated
- `docs/JOURNEY_PROPOSALS.md` updated
- Optional evidence JSONs written

At the end print:
- Next commands (`/artk.journey-define`, `/artk.journey-clarify`)
- Known blockers & remediation (from feasibility + incidents)

---

# Procedure / Algorithm

## Step 0 — Preconditions and Context Loading

1) Locate `ARTK_ROOT`:
   - `artkRoot=` argument
   - nearest `artk.config.yml` up the tree

2) **Load context from `.artk/context.json`:**

   Read `<ARTK_ROOT>/.artk/context.json` to get:
   - `targets[]` - detected frontend targets from /artk.init-playbook
   - `detectedTargets[]` - targets with detection confidence
   - `discovery` - if present, cached discovery results (routes, components)
   - `journeys` - existing journey statistics

   Use context to:
   - Pre-populate app scope based on detected targets
   - Access previously discovered routes without re-scanning
   - Check journey counts to avoid over-proposing

   If context file is missing, continue with file-based detection (legacy mode).

3) Confirm Journey system exists:
   - `<ARTK_ROOT>/journeys/`
   - `<ARTK_ROOT>/journeys/journeys.config.yml`
If missing: instruct user to run `/artk.init-playbook` first.

4) Confirm discovery exists:
   - prefer `docs/discovery/*.json`, else `docs/DISCOVERY.md` + `docs/TESTABILITY.md`
   - alternatively, use `discovery` from context.json if present
If missing: instruct user to run `/artk.discover-foundation` first.

## Step 1 — Load Journey config + existing index
- Read `<ARTK_ROOT>/journeys/journeys.config.yml` for:
  - id prefix/width
  - tiers/statuses
  - layout (flat/staged)
- Read `<ARTK_ROOT>/journeys/index.json` if present.
- Build a dedupe set using Journey “fingerprints”:
  - fingerprint = normalize(title + actor + scope + primary routes + key acceptance criteria keywords)

## Step 2 — Load discovery model and build the initial candidate pool
Use discovery sources to create candidates in priority order:

### A) Mandatory baseline (if applicable)
- Authentication entry: login/SSO flow
- Global navigation sanity: landing/home + primary nav menu
- A “core workflow” for the app (from risk list or discovery shortlist)
- A read-only health flow (view dashboard/list)

### B) High-risk flows (from risk.json or DISCOVERY.md)
From the top risk areas (default top 10), propose at least one “happy path” Journey each.

### C) Cross-cutting flows (if present)
- Search/filter + results
- Export/download/report generation
- Approval/review flows
- Notifications/inbox
- Upload/import
- Role-based access (view-only vs edit)

### D) High-reuse module drivers
Flows that demand reusable modules:
- common forms (create/edit)
- tables with filters/pagination
- auth + role switching
- file upload/download

### E) Edge cases only if high-risk
Defer negative flows unless discovery indicates high business impact or frequent change.

## Step 3 — Build change risk signals (optimized, best-effort)
This step is enabled if `changeSignals=on` OR (`auto` and git is available).

### 3.1 Determine change window
Use whichever is most available:
- `git log --since=<changeWindowDays>.days` (preferred)
- else cap by `changeWindowCommits` most recent commits
If neither is possible, mark changeSignals as unavailable and continue.

### 3.2 Compute file-level churn metrics
For each file in the window compute:
- commitsTouched
- linesAdded, linesDeleted (from numstat)
- absoluteChurn = linesAdded + linesDeleted

Then compute **relative churn** to reduce bias:
- LOC(file) = current lines of file (best-effort)
- relativeChurn = absoluteChurn / max(LOC(file), 200)  (use floor to avoid tiny-file dominance)
Also compute **recency-weighted churn**:
- weight commits with exponential decay by age (newer commits count more)

Rationale:
- Relative churn has been shown to be more predictive than absolute churn for defect density. Use it where possible.
- Hotspot approaches also warn about small files that change often skewing churn; normalization is required.

### 3.3 Identify hotspots and change clusters
Create:
- top N hotspot files (default 25) by a combined score:
  `hotspotScore = z(relativeChurn) + z(commitsTouched) + z(recencyWeightedChurn)`
- directory-level aggregates (folder churn) to map to features/routes

### 3.4 Parse commit messages for “defect-like” changes
Using the same window, scan commit subjects for:
- ticket IDs using `ticketRegex`
- keywords: `fix`, `bug`, `hotfix`, `incident`, `regression`, `revert`, `sev`
Compute:
- ticketCount per file/folder
- revertCount per file/folder (reverts are a strong instability signal)

Write evidence JSON:
- `docs/journey-proposals/evidence.change.json`

If git is unavailable but you have a PR diff context:
- compute churn from changed files (no history) and label as “PR-only change risk”

## Step 4 — Build incident/bug history signals (optimized, best-effort)
This step is enabled if incident sources exist OR tickets are found in commit messages.

### 4.1 Incident artifact discovery
Search `incidentPaths` globs for:
- markdown postmortems/incidents
- changelog/release notes sections (“Fixed”, “Bug fixes”)
- exported ticket lists (csv/json)

### 4.2 Extract incident references + severity
For each artifact:
- extract ticket IDs (ticketRegex)
- extract severity if present (sev1/sev2/high/critical)
- extract feature hints:
  - route-like strings (`/foo/bar`)
  - service/module names
  - folder names mentioned
Compute per-feature/folder:
- incidentCount
- weightedIncidentCount (severity weighted)
Write evidence JSON:
- `docs/journey-proposals/evidence.incidents.json`

If no incident artifacts are found:
- fall back to commit-message ticket count as a lightweight incident proxy.

## Step 5 — Optional ownership risk (CODEOWNERS best-effort)
Enabled if `useCODEOWNERS=true` OR (`auto` and CODEOWNERS exists).

Parse CODEOWNERS and compute:
- coverage: % of changed/hotspot files with an owner
- ownerSpread: count of distinct owners touching top hotspot areas
Heuristic:
- low coverage + high churn = higher risk (ownership gaps in volatile areas)
Write evidence into `evidence.change.json` and/or `evidence.mapping.json`.

## Step 6 — Map change/incident signals to features/routes and Journey candidates
Goal: lift file/folder signals to Journey-level signals.

### 6.1 Preferred mapping (if discovery machine files exist)
If `docs/discovery/features.json` includes source paths:
- map file paths → features via folder match
If `docs/discovery/routes.json` includes route source files:
- map route sources → routes → features

### 6.2 Fallback mapping (heuristics)
If discovery lacks file mappings:
- map by folder naming similarity between:
  - feature name (`billing`) and paths (`src/features/billing/**`)
  - route segment (`/billing/*`) and folder (`billing/`)
- map by string match in incident docs (route paths/service names)

For each Journey candidate compute:
- changeScore (0..1) from aggregated hotspot scores for its scope/routes
- incidentScore (0..1) from incident/ticket references for its scope/routes
- ownerScore (0..1) from CODEOWNERS risk heuristic (if available)

Write evidence mapping JSON:
- `docs/journey-proposals/evidence.mapping.json`

## Step 7 — Feasibility / testability scoring (static-first)
For each candidate, compute feasibility: **high/medium/low** from TESTABILITY.md signals:
- Locator readiness (roles/labels/test ids)
- Data setup feasibility (seed/API/admin endpoints)
- Async/eventual consistency risk zones
- Environment constraints (network/access limitations)

If feasibility is low and `includeBlocked=false`, exclude. Otherwise include but mark “blocked” with remediation.

## Step 8 — Module impact analysis (dependency hints for AutoGen)

**Module dependencies are CRITICAL for AutoGen CLI compatibility.**

For each candidate, infer dependencies and structure them for autogen:

### Foundation modules (reusable)

**FOUNDATION_MODULES (canonical list - keep in sync with journey-clarify):**
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
```

Populate `modules.foundation[]` with applicable modules from this list.

### Feature modules (domain-specific)
Populate `modules.features[]` with domain modules:
- Infer from feature grouping and routes
- e.g. `users`, `billing`, `approvals`, `inventory`, `reports`, `admin`

**Output format (AUTOGEN-COMPATIBLE):**
```yaml
modules:
  foundation: [auth, navigation]    # Array of foundation modules
  features: [orders, catalog]       # Array of feature modules
```

**DO NOT use flat array format:**
```yaml
# ❌ WRONG - breaks AutoGen
modules: [auth, navigation, orders]
```

Estimate complexity:
- low / medium / high based on step count, async, data coupling.

Also mark:
- `exists` vs `needs scaffolding` (best-effort check for module folders)

## Step 9 — Scoring, ranking, selection (optimized)
Compute a combined score per candidate:

### 9.1 Base risk
- Use discovery risk score if present.
- Else infer `impact (1..5) × likelihood (1..5)`.

### 9.2 Change/incident augmentation (weights)
Normalize to 0..1:
- `changeScore` from Step 6
- `incidentScore` from Step 6
- `ownerScore` from Step 6 (optional)

Compute:
`augmentedRisk = baseRiskWeight*baseRisk + churnWeight*(changeScore*10) + incidentWeight*(incidentScore*10) + ownerWeight*(ownerScore*10)`

Then apply:
- feasibility penalty (large penalty if low feasibility)
- blocker penalty if blocked (unless includeBlocked and you still want it visible)

### 9.3 Reuse potential bonus
Boost candidates that demand reusable foundation modules shared across many proposals.

### 9.4 Select top Journeys

**First, determine counts based on `coverage` parameter:**

| Coverage | Smoke | Release | Regression | Total |
|----------|-------|---------|------------|-------|
| `small`  | 5     | 10      | 5          | 20    |
| `large`  | 10    | 20      | 20         | 50    |

User-provided `smokeCount`, `releaseCount`, `regressionCount`, or `maxJourneys` override the preset values (see Parameter Priority Rules above).

**Tier Assignment Criteria (NOT just sequential by risk score):**

Before filling tiers, evaluate each candidate against tier criteria:

**Smoke tier candidates MUST:**
- Be happy-path only (no negative/edge cases)
- Have HIGH feasibility (no blockers, stable selectors)
- Cover critical business functionality (auth, core workflow, health check)
- Be expected to complete quickly (< 2 minutes)
- Have low flakiness risk (no complex async, no timing-sensitive operations)

**Release tier candidates SHOULD:**
- Be happy-path or common alternative paths
- Have MEDIUM or HIGH feasibility
- Cover breadth of features (not depth of one feature)
- Be representative of typical user journeys

**Regression tier candidates MAY:**
- Include edge cases, negative paths, error handling
- Include complex multi-step workflows
- Include lower-feasibility candidates (with remediation noted)
- Include incident-driven coverage (flows that caused past bugs)
- Include feature variants (different user types, data states)

**Demotion rule:** If a high-risk candidate doesn't meet smoke criteria, demote to release. If it doesn't meet release criteria, demote to regression. Never promote a candidate to a higher tier just to fill counts.

**Then select journeys (criteria-first, then risk-ranked within tier):**

1. **Smoke tier:** From candidates meeting smoke criteria, select top `smokeCount` by augmentedRisk score
2. **Release tier:** From candidates meeting release criteria (excluding already-selected), select top `releaseCount` by augmentedRisk score
3. **Regression tier:** From remaining candidates meeting regression criteria, select top `regressionCount` by augmentedRisk score (if `includeRegression=true`)

**Empty tier handling:**
- Empty tiers are allowed (e.g., 10 smoke, 0 release, 5 regression is valid)
- Do NOT promote lower-tier candidates to fill empty higher tiers
- Note in output: "Release tier: 0 (no candidates met release criteria)"

**maxJourneys enforcement (priority-based):**
- Fill smoke first, then release, then regression
- Stop when total reaches `maxJourneys`
- Example: `maxJourneys=30` with 10/20/20 counts → Smoke: 10, Release: 20, Regression: 0

Never exceed `maxJourneys` total across all tiers.

Write scoring evidence to `docs/journey-proposals/evidence.scoring.json`:
```json
{
  "generatedAt": "<ISO date>",
  "coverage": "small|large",
  "requestedCounts": { "smoke": 10, "release": 20, "regression": 20, "total": 50 },
  "actualCounts": { "smoke": 8, "release": 15, "regression": 12, "total": 35 },
  "parametersUsed": {
    "includeRegression": true,
    "maxJourneys": 50,
    "minFeasibility": "medium"
  },
  "candidates": [
    {
      "id": "JRN-0001",
      "title": "...",
      "tier": "smoke",
      "augmentedRisk": 42.5,
      "meetsSmokeCriteria": true,
      "meetsReleaseCriteria": true,
      "feasibility": "high"
    }
  ]
}
```

## Step 10 — Allocate IDs deterministically

**ID allocation rules:**
- Determine next available ID from existing index (max suffix)
- Never reuse IDs
- On rerun: if an equivalent proposal exists (fingerprint match), reuse that file/ID

**Rerun behavior with existing proposals:**

When rerunning `/artk.journey-propose` on a repo with existing proposals:

1. **Existing proposals with fingerprint match:** Keep as-is, do not re-tier or re-score
2. **New candidates not in existing proposals:** Assign tier based on criteria and propose
3. **Tier changes between runs:**
   - If `includeRegression` was `false` before and is now `true`:
     - Existing smoke/release proposals: unchanged
     - New regression proposals: added for candidates not already proposed
   - Never demote an existing proposal to a lower tier
   - Never promote an existing proposal to a higher tier (user can do this manually)
4. **Count toward limits:** Existing proposals count toward tier limits
   - Example: 5 existing smoke proposals + `smokeCount=10` → only 5 new smoke proposals possible

**To start fresh:** Delete all files in `journeys/proposed/` before running.

## Step 11 — Generate proposed Journey files

**Progress reporting (for large coverage or >20 journeys):**

When generating many proposals, print progress to keep the user informed:

```
Generating proposed journeys...

Smoke tier (10 journeys):
  ✓ JRN-0001 User Login
  ✓ JRN-0002 Dashboard Load
  ✓ JRN-0003 Core Workflow
  ... (7 more)
  ✓ Smoke tier complete: 10/10

Release tier (20 journeys):
  ✓ JRN-0011 Submit Order
  ✓ JRN-0012 View Order History
  ... (18 more)
  ✓ Release tier complete: 20/20

Regression tier (15 journeys):
  ✓ JRN-0031 Invalid Login Attempt
  ✓ JRN-0032 Session Timeout Handling
  ... (13 more)
  ✓ Regression tier complete: 15/20 (5 excluded - low feasibility)

Total: 45/50 journeys proposed
```

**For each selected Journey:**
- Create file in `journeys/proposed/`:
  - `<ID>__<slug>.md` (kebab-case slug, max 60 chars)
- Frontmatter (AUTOGEN-COMPATIBLE FORMAT):
  ```yaml
  ---
  id: JRN-####
  title: "<title>"
  status: proposed
  tier: smoke | release | regression
  actor: <role>
  scope: <feature-area>
  tags: ["@JRN-####", "@<tier>", "@scope-<scope>"]
  modules:
    foundation: [auth, navigation]      # REQUIRED: object format, NOT array
    features: [<feature-modules>]       # REQUIRED: object format, NOT array
  links:
    requirements: []
    tickets: []
  tests: []
  autogen:
    enabled: true                       # Enables AutoGen CLI for this journey
    blockedSteps: []                    # Steps that need manual implementation (filled by clarify)
    machineHints: false                 # Set to true by journey-clarify after adding hints
  ---
  ```

  **⚠️ CRITICAL: `modules` MUST be an object with `foundation` and `features` arrays.**
  - ✅ CORRECT: `modules: { foundation: [auth], features: [orders] }`
  - ❌ WRONG: `modules: [auth, orders]`

  This format is required for AutoGen CLI compatibility in `/artk.journey-implement`.

- Body must include:
  - Intent
  - Acceptance Criteria (Declarative)
  - Procedural Steps (UI Walkthrough)
  - Tentative Assertions
  - Preconditions & Test Data
  - Risks & Feasibility notes
  - Open questions / blockers

Add this managed evidence block near the top:
```
<!-- ARTK:PROPOSAL:BEGIN -->
proposedBy: /artk.journey-propose
proposedAt: <ISO date>
sources:
  - <file/path>
confidence: low|medium|high
baseRisk: <number>
changeScore: <0..1>
incidentScore: <0..1>
ownerScore: <0..1|na>
feasibility: low|medium|high
complexity: low|medium|high
foundationModules: [..]
featureModules: [..]
<!-- ARTK:PROPOSAL:END -->
```
On rerun:
- update only this block and fill missing required sections.
- never rewrite human content outside managed markers.

## Step 12 — Regenerate backlog + index
Preferred:
- run repo wrapper: `<ARTK_ROOT>/tools/journeys/generate.js`
If you cannot execute scripts:
- emulate Core generator exactly (parse frontmatter, validate constraints, sort by ID, generate backlog and index).

## Step 13 — Write `docs/JOURNEY_PROPOSALS.md`

Create/update a readable report with:

### Required sections:

1. **Executive summary** including:
   - Coverage used (small/large)
   - Counts: requested vs actual per tier
   - Key findings (top risk areas, blockers)

2. **Inputs used:**
   - Discovery sources
   - Change window (days/commits)
   - Incident sources found

3. **Proposed Journeys table (ranked by tier, then risk):**

```markdown
| # | ID | Title | Tier | Scope | Actor | Risk | Feasibility | Blocked? |
|---|-----|-------|------|-------|-------|------|-------------|----------|
| 1 | JRN-0001 | User Login | smoke | auth | user | 42.5 | high | - |
| 2 | JRN-0002 | Dashboard Load | smoke | home | user | 38.2 | high | - |
| 3 | JRN-0003 | Submit Order | release | checkout | user | 35.1 | medium | - |
```

4. **Tier summary:**
   - Smoke: X of Y (list key journeys)
   - Release: X of Y (list key journeys)
   - Regression: X of Y (list key journeys)
   - If any tier is empty or under-filled, explain why

5. **Top hotspots** (top 10 paths with churn metrics)

6. **Top incident clusters** (top 10 with ticket counts)

7. **Module recommendations:**
   - Foundation modules to build early
   - Feature modules demanded by proposals

8. **Deferred candidates** (optional) with reasons

### Tier balance guidance:

A well-balanced proposal set should approximate:
- Smoke: 15-25% of total (critical paths only)
- Release: 40-50% of total (happy paths, breadth)
- Regression: 30-40% of total (edge cases, depth)

The `large` preset (10/20/20 = 20%/40%/40%) follows this guidance.

Keep output deterministic.

---

# Mode-based questions (don't exhaust the user)

**IMPORTANT: When asking questions, follow the User Question Standards in `.github/prompts/common/GENERAL_RULES.md`:**
- Ask ONE question at a time
- Use numbered options (NOT checkboxes)
- Show progress (Question X of Y)
- Provide recommended defaults
- Wait for user response before asking the next question

## QUICK (≤ 3, only if missing)
1) Confirm top 1–2 business-critical workflows (names only).
2) Confirm primary actor roles (e.g., standard user, admin).
3) Confirm any “no-go” areas to exclude.

## STANDARD (≤ 7; default)
Quick +:
4) Confirm auth style (SSO redirect vs login form vs both).
5) Confirm test data approach (seeded env vs API setup vs manual).
6) Confirm coverage scope:
   - `large` (recommended): 50 journeys (10 smoke, 20 release, 20 regression)
   - `small`: 20 journeys (5 smoke, 10 release, 5 regression)
7) Confirm whether blocked journeys should be included (default true).

## MAX (add up to 8)
Standard +:
- roles/tenants switching
- feature flag system notes
- must-test compliance areas
- approval flows to prioritize
- known flaky areas
- preferred change window (days vs commits) if repo is huge

Provide one reply template.

---

# Edge cases you MUST handle

- **No UI**: do not fabricate UI Journeys. Produce a short explanation + suggest API-focused journeys or skip.
- **Monorepo**: separate proposals per app or ask user to pick appScope.
- **Overlap with existing journeys**: dedupe; only propose new.
- **No git history accessible**: proceed with discovery-only and label change signals as unavailable.
- **Huge repo**: cap window; prefer folder-level mapping; avoid O(N files) expensive work.
- **Incident sources absent**: use commit-message tickets as proxy; label uncertainty.
- **Insufficient candidates**: propose only what data supports; explain gaps in output (see Insufficient Data Handling above).
- **Parameter conflicts**: apply Parameter Priority Rules (explicit overrides implicit).
- **Rerun with existing proposals**: follow Rerun Behavior rules (don't re-tier existing).

---

# Completion checklist (print at end)

**Artifacts created:**
- [ ] Proposed Journey files created under `journeys/proposed/`
- [ ] Proposals evaluated against tier criteria (not just sequential fill)
- [ ] Each proposed Journey has goal, steps, tentative assertions, dependencies
- [ ] Backlog/index regenerated
- [ ] `docs/JOURNEY_PROPOSALS.md` created/updated with tier breakdown
- [ ] `docs/journey-proposals/evidence.scoring.json` written

**Tier coverage:**
- [ ] Smoke tier: candidates evaluated against smoke criteria
- [ ] Release tier: candidates evaluated against release criteria
- [ ] Regression tier: candidates evaluated (if `includeRegression=true`)

**Print tier summary:**
```
╔════════════════════════════════════════════════════════════════════╗
║  PROPOSAL SUMMARY                                                   ║
╠════════════════════════════════════════════════════════════════════╣
║  Coverage: large                                                    ║
║                                                                     ║
║  Tier         Proposed    Maximum    Status                        ║
║  ──────────   ─────────   ───────    ──────────────────────────    ║
║  Smoke        8           10         ✓ (2 candidates demoted)      ║
║  Release      15          20         ✓ (5 below max - limited data)║
║  Regression   12          20         ✓ (8 below max - low risk)    ║
║  ──────────   ─────────   ───────                                  ║
║  Total        35          50                                        ║
╚════════════════════════════════════════════════════════════════════╝
```

**If any tier has fewer proposals than maximum, explain why:**
- "Not enough candidates met smoke criteria (demoted to release)"
- "Limited high-risk candidates for release tier"
- "Remaining candidates had low feasibility (excluded)"
- "maxJourneys cap reached before filling regression tier"

---

### Final Output (MANDATORY)
- [ ] "Next Commands" box displayed VERBATIM (copy exactly from template)

# MANDATORY: Final Output Section

**You MUST display this section at the end of your output, exactly as formatted.**

**Display the following commands VERBATIM (do not summarize, paraphrase, or invent commands):**

```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (RECOMMENDED) Define a proposed journey with full structure:    ║
║     /artk.journey-define source=JRN-####                           ║
║                                                                     ║
║  2. (ALTERNATIVE) Define a new journey manually:                    ║
║     /artk.journey-define id=JRN-#### title="<title>"               ║
║                                                                     ║
║  3. (AFTER DEFINE) Add execution detail to a journey:               ║
║     /artk.journey-clarify id=JRN-####                              ║
║                                                                     ║
║  4. (AFTER CLARIFY) Generate Playwright tests:                      ║
║     /artk.journey-implement id=JRN-####                            ║
║                                                                     ║
║  5. (OPTIONAL) Audit selectors for stable test hooks:               ║
║     /artk.testid-audit mode=report                                 ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**CRITICAL - ANTI-HALLUCINATION RULES:**
- Copy the commands box EXACTLY. Do not abbreviate or summarize.
- Do NOT invent commands that don't exist (e.g., `/artk.journey-gen` does NOT exist).
- Only use commands from the handoffs section of this prompt.
- The ONLY valid ARTK commands are those listed in the handoffs section at the top of this file.
