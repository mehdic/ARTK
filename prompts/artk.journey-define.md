---
mode: agent
description: "Create or promote a Journey to defined status - structured test scenario contract with acceptance criteria"
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

# ARTK /journey-define — User-defined Journeys (Phase 6)

You are running **ARTK Phase 6**.

ARTK plugs into GitHub Copilot to help teams build and maintain complete automated regression suites for existing applications using **Journeys** as the source of truth.

This command creates (or upgrades) a Journey into a canonical, structured, “definition-ready” artifact so `/journey-clarify` can finalize it for deterministic implementation.

## What this command is for
- Create a **new** Journey from human input (goal + business steps + assertions + tier).
- Or “promote” an existing **proposed** Journey into **defined** (standardized structure + clearer acceptance criteria).

## What this command is NOT for
- Implementing tests
- Configuring CI/CD
- Capturing secrets/credentials

---

# Non‑Negotiables
- **Do not overwrite human content** unless it is clearly ARTK-generated and wrapped in managed markers.
- **Deterministic outputs**: stable IDs, stable ordering, stable file naming.
- **No secrets**: do not ask for passwords/tokens. If login is involved, ask for *test account provisioning process* only.
- **Medium friction**: minimize questions; default to reasonable placeholders and mark unknowns.

---

# Required inputs (the “define contract”)
User provides (minimum):
1) **Goal** (what outcome the user is trying to achieve)
2) **Business steps** (high-level steps the user would do)
3) **Expected assertions** (what must be true at the end and/or key checkpoints)
4) **Tier suggestion** (`smoke | release | regression`)

Optional (ask only if missing/unclear):
- `actor` (role/persona)
- `scope` (feature area)
- links (requirements/tickets/docs)

---

# Discovery-aware behavior (new)
If `useDiscovery=auto` (default) and Phase 4 outputs exist, you MUST use them to:
- infer plausible `actor` roles and `scope`/feature area
- infer relevant routes/pages that match the Journey
- infer baseline auth entry points (login/SSO) for context
- pre-fill “Open Questions” with known blockers from TESTABILITY (selectors/data/env)

**Goal:** ask fewer questions, not more.

Preferred sources:
- `docs/discovery/features.json`, `docs/discovery/routes.json`, `docs/discovery/summary.json`
- `docs/TESTABILITY.md`, `docs/DISCOVERY.md`

If discovery is missing, proceed without it.

---

# Output artifacts (must produce)
1) A canonical Journey markdown file created/updated under:
- default: `<ARTK_ROOT>/journeys/defined/`

2) Regenerate:
- `<ARTK_ROOT>/journeys/BACKLOG.md`
- `<ARTK_ROOT>/journeys/index.json`

3) Ensure guidance doc exists (minimal here):
- `<ARTK_ROOT>/docs/JOURNEY_CLARIFY.md` (create if missing; managed markers only)

---

# Modes
`mode=` controls how many questions you ask if inputs are missing.

- `quick`: ask at most 2 questions (only blockers).
- `standard`: ask at most 5 questions (default).
- `max`: ask at most 8 questions (only if necessary).

Default: `standard`

---

# Procedure

## Step 0 — Locate ARTK_ROOT and validate prerequisites
1) Determine `ARTK_ROOT` from:
   - `artkRoot=` argument
   - nearest `artk.config.yml` up the tree
2) Confirm Journey system exists:
   - `<ARTK_ROOT>/journeys/journeys.config.yml`
If missing: instruct user to run `/journey-system` first.

## Step 1 — Determine whether this is “create” or “promote”
If `source=` is provided:
- If it looks like an ID (e.g., `JRN-0042`), locate it via `journeys/index.json` if present.
- If it looks like a path, open that file.
- If source is a Journey with `status: proposed`, this is a **promotion** to defined.
- Otherwise treat as “normalize to defined” but never stomp human content.

If `source=` is not provided:
- This is a **new defined Journey**.

## Step 2 — Load config and ID policy
Read `<ARTK_ROOT>/journeys/journeys.config.yml`:
- `id.prefix`, `id.width`
- layout preference: `flat` or `staged` (if present)

ID rules:
- Prefer system-assigned sequential IDs.
- Never reuse IDs.
- If user typed an ID explicitly, validate format; if it conflicts, refuse and allocate the next ID instead.

## Step 3 — Pull discovery context (if enabled and available)
If `useDiscovery=true` OR (`auto` and discovery files exist):
- Load feature map, route inventory, and testability notes (best-effort).
- Extract:
  - candidate scopes/features matching the user title/goal/steps (string match + route segments)
  - likely actor roles (from auth/permissions notes if present)
  - known blockers in that area (selectors missing, data infeasible, env constraints)
If multiple plausible scopes exist and mode != quick:
- ask the user to pick one (single question).

If discovery is unavailable:
- continue without this step.

## Step 4 — Gather inputs (args or message)
Inputs come from:
- arguments (title/goal/steps/assertions/tier/actor/scope)
- otherwise parse user content following patterns below.

### Accepted input patterns
A) Minimal prose (parse best-effort):
- “Goal: … Steps: … Assertions: … Tier: …”

B) Structured block (preferred):
```
TITLE:
GOAL:
TIER:
ACTOR:
SCOPE:
STEPS:
1.
2.
ASSERTIONS:
- ...
LINKS:
- ...
```

If anything required is missing, ask questions based on mode.

### Question policy (keep it short)
Ask only what is necessary to create a defined Journey:
- missing title: ask for a short title
- missing tier: ask tier
- missing goal: ask goal
- missing steps: ask for 3–8 business steps
- missing assertions: ask for 2–6 assertions

Actor/scope:
- If missing, infer from discovery and only ask one confirmation question if ambiguity remains.

## Step 5 — Create canonical “defined” Journey structure
Create/update a Journey file using the ARTK Core template structure.

### Frontmatter requirements
- status MUST be `defined`
- tier MUST be as provided or inferred
- tests[] MUST be empty (not implemented)
- modules.* may be empty but should exist

If promoting from proposed:
- keep existing `modules` hints
- keep existing `links` hints
- add missing pieces from the user input
- add discovery-derived “notes” as Open Questions, not as facts

### Canonical body sections (managed markers)
The file MUST contain these sections (with managed markers so later commands can update safely):
- Intent
- Acceptance Criteria (Declarative)
- Procedural Steps (UI Walkthrough)
- Preconditions & Test Data (may be unknown at this stage)
- Expected Results & Assertions
- Open Questions / Unknowns (include discovery/testability blockers here)

Use markers like:
`<!-- ARTK:BEGIN <section> --> ... <!-- ARTK:END <section> -->`

### Acceptance criteria writing rules
- Convert user assertions into **Given/When/Then** where possible.
- Keep them behavioral (what the user observes), not DOM-level.
- If criteria are vague, keep them and mark “needs clarification”.

### Procedural steps writing rules
- Use imperative verbs: Open / Navigate / Click / Fill / Select / Submit / Verify.
- Keep steps UI-level (avoid DOM selectors).
- If discovery provides route/page names, use them to remove ambiguity (menu name, page title).

### Add a managed provenance block (new)
Insert near top of the body:
```
<!-- ARTK:DEFINE:BEGIN -->
definedBy: /journey-define
definedAt: <ISO date>
sources:
  - user-input
  - <discovery files if used>
confidence: low|medium|high
<!-- ARTK:DEFINE:END -->
```

## Step 6 — File location and naming (layout-aware)
Default directory for defined:
- `<ARTK_ROOT>/journeys/defined/`

File name:
- `<ID>__<slug>.md` (kebab-case slug from title, max 60 chars)

If layout is `staged`:
- prefer subfolders by status: `journeys/proposed/`, `journeys/defined/`, `journeys/clarified/`.
If promoting from proposed:
- move file from `journeys/proposed/` → `journeys/defined/` and update status.

If layout is `flat`:
- do not move existing files unless clearly ARTK-generated and normalization is requested.

## Step 7 — Regenerate backlog/index
Preferred:
- run repo wrapper if present: `<ARTK_ROOT>/tools/journeys/generate.js`
Fallback:
- emulate Core generator (parse frontmatter, validate constraints, sort by ID, generate BACKLOG and index)

## Step 8 — Ensure docs/JOURNEY_CLARIFY.md exists (minimal here)
If `<ARTK_ROOT>/docs/JOURNEY_CLARIFY.md` does not exist, create it with managed markers only:
- what “clarified” means
- checklist of what `/journey-clarify` will collect
- a short example

---

# Completion checklist (print at end)
- [ ] Journey file created/updated under journeys/defined/ (status: defined)
- [ ] Canonical sections present with managed markers
- [ ] Provenance block added/updated
- [ ] BACKLOG.md regenerated
- [ ] index.json regenerated
- [ ] JOURNEY_CLARIFY.md created if missing (minimal)
