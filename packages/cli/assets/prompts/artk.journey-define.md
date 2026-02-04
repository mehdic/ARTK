---
name: artk.journey-define
mode: agent
description: "Create or promote a Journey to defined status - structured test scenario contract with acceptance criteria"
handoffs:
  - label: "1. RECOMMENDED - /artk.journey-clarify: add execution detail to this journey"
    agent: artk.journey-clarify
    prompt: "id=<JRN-ID>"
  - label: "2. OPTIONAL - /artk.testid-audit: audit selectors before implementation"
    agent: artk.testid-audit
    prompt: "mode=report scope=journey:<JRN-ID>"
  - label: "3. AFTER CLARIFY - /artk.journey-implement: implement the journey as Playwright tests"
    agent: artk.journey-implement
    prompt: "id=<JRN-ID>"
  - label: "4. OPTIONAL - /artk.journey-define: define another journey"
    agent: artk.journey-define
    prompt: 'id=JRN-#### title="<title>"'
---

# ARTK /artk.journey-define — User-defined Journeys (Phase 6)

You are running **ARTK Phase 6**.

ARTK plugs into GitHub Copilot to help teams build and maintain complete automated regression suites for existing applications using **Journeys** as the source of truth.

This command creates (or upgrades) a Journey into a canonical, structured, “definition-ready” artifact so `/artk.journey-clarify` can finalize it for deterministic implementation.

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
- **Edit safety**: MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before any file edits.

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
If `useDiscovery=auto` (default) and discovery outputs exist (from /artk.discover-foundation), you MUST use them to:
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

**⚠️ GENERATION COMPLETION REQUIREMENT:**
This command MUST complete ALL file operations in a single execution. Do NOT stop after creating directories. Do NOT stop after reading source files. Do NOT pause mid-generation. Write ALL journey files before presenting results to user.

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
If missing: instruct user to run `/artk.init-playbook` first.

## Step 1 — Determine whether this is "create" or "promote"

**Single journey mode:**
If `source=` is provided with a single journey:
- If it looks like an ID (e.g., `JRN-0042`), locate it via `journeys/index.json` if present.
- If it looks like a path, open that file.
- If source is a Journey with `status: proposed`, this is a **promotion** to defined.
- Otherwise treat as "normalize to defined" but never stomp human content.

**Batch promotion mode:**
If `source=` specifies multiple journeys:
- `source=all-smoke` — promote ALL proposed journeys with tier=smoke
- `source=all-release` — promote ALL proposed journeys with tier=release
- `source=all-regression` — promote ALL proposed journeys with tier=regression
- `source=all-proposed` — promote ALL proposed journeys (all tiers)
- `source=JRN-0001,JRN-0002,JRN-0003` — promote specific journeys by ID (comma-separated)

**⚠️ BATCH PROMOTION RULES:**
- Read ALL source journeys first, then write ALL output journeys
- Do NOT stop after reading — you must WRITE all files
- Do NOT ask for confirmation between journeys
- Write each journey file sequentially without pausing
- Report progress as you go: "Promoting JRN-0001... done. Promoting JRN-0002... done."
- Only print completion checklist after ALL journeys are written

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

**IMPORTANT: When asking questions, follow the User Question Standards in `.github/prompts/common/GENERAL_RULES.md`:**
- Ask ONE question at a time
- Use numbered options (NOT checkboxes)
- Show progress (Question X of Y)
- Provide recommended defaults
- Wait for user response before asking the next question

### Question policy (keep it short)
Ask only what is necessary to create a defined Journey:
- missing title: ask for a short title
- missing tier: ask tier
- missing goal: ask goal
- missing steps: ask for 3–8 business steps
- missing assertions: ask for 2–6 assertions

Actor/scope:
- If missing, infer from discovery and only ask one confirmation question if ambiguity remains.

## Step 5 — Create canonical "defined" Journey structure

**⚠️ CRITICAL: DO NOT STOP MID-GENERATION**

You MUST complete ALL journey file writes in a single uninterrupted operation:
- **NEVER** stop after creating the `defined/` directory — that is NOT a valid stopping point
- **NEVER** stop after reading source files — you must WRITE the output files
- **NEVER** pause to ask for confirmation during file writing
- Continue writing until ALL journey files are created/updated
- If you cannot complete in one output, seamlessly continue in your next output without asking
- Only stop if there is an actual error that prevents file creation

**If you find yourself about to stop after "Created journeys/defined/":**
→ That is a BUG in your execution. Continue immediately with file writing.

Create/update a Journey file using the ARTK Core template structure.

### Frontmatter requirements (AUTOGEN-COMPATIBLE)

**Full frontmatter template:**
```yaml
---
id: JRN-####
title: "<title>"
status: defined
tier: smoke | release | regression
actor: <role>
scope: <feature-area>
tags: ["@JRN-####", "@<tier>", "@scope-<scope>"]
modules:
  foundation: []      # REQUIRED: object format with foundation array
  features: []        # REQUIRED: object format with features array
links:
  requirements: []
  tickets: []
tests: []
autogen:
  enabled: true       # Enable AutoGen CLI for test generation
  blockedSteps: []    # Steps requiring manual implementation (filled by clarify)
  machineHints: false # Set to true by journey-clarify after adding hints
---
```

**Required fields:**
- status MUST be `defined`
- tier MUST be as provided or inferred
- tests[] MUST be empty (not implemented yet)
- modules MUST be an **object** with `foundation` and `features` arrays (for AutoGen compatibility)
- autogen.enabled SHOULD be `true` unless manual implementation is preferred

**⚠️ CRITICAL: Module Format for AutoGen**
```yaml
# ✅ CORRECT - AutoGen compatible
modules:
  foundation: [auth, navigation]
  features: [orders, catalog]

# ❌ WRONG - Breaks AutoGen CLI
modules: [auth, navigation, orders]
```

If promoting from proposed:
- keep existing `modules` hints (but ensure object format)
- keep existing `links` hints
- add missing pieces from the user input
- add discovery-derived "notes" as Open Questions, not as facts
- **validate `modules` format** - convert array to object if needed

### Module Format Conversion (when promoting or normalizing)

**If `modules` is an array, convert to object using this classification:**

```
FOUNDATION_MODULES = [
  "auth", "navigation", "selectors", "locators", "data",
  "api", "assertions", "files", "notifications", "config", "fixtures"
]

FOR each module in modules[]:
  IF module in FOUNDATION_MODULES:
    ADD to modules.foundation[]
  ELSE:
    ADD to modules.features[]
```

**Example conversion:**
```yaml
# FROM: modules: [auth, navigation, orders, catalog]
# TO:
modules:
  foundation: [auth, navigation]
  features: [orders, catalog]
```

**Note:** Full algorithm details in `/artk.journey-clarify` Step 6.

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
definedBy: /artk.journey-define
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
- checklist of what `/artk.journey-clarify` will collect
- a short example

---

# Completion checklist (print at end)

**⚠️ GENERATION VERIFICATION (MANDATORY):**
Before printing this checklist, verify ALL files were actually created:
- Count files in `journeys/defined/` — must match expected count
- If promoting multiple journeys, ALL must be written before stopping
- If count is lower than expected, you stopped mid-generation — CONTINUE WRITING
- Do NOT print this checklist until ALL journey files exist

- [ ] **ALL** Journey files created/updated under journeys/defined/ (verify count matches expected)
- [ ] Canonical sections present with managed markers
- [ ] Provenance block added/updated
- [ ] BACKLOG.md regenerated
- [ ] index.json regenerated
- [ ] JOURNEY_CLARIFY.md created if missing (minimal)

---

### Final Output (MANDATORY)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

# MANDATORY: Final Output Section

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.journey-define.txt`

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
║  1. (RECOMMENDED) Add execution detail to this journey:             ║
║     /artk.journey-clarify id=<JRN-ID>                              ║
║                                                                     ║
║  2. (OPTIONAL) Audit selectors before implementation:               ║
║     /artk.testid-audit mode=report scope=journey:<JRN-ID>          ║
║                                                                     ║
║  3. (AFTER CLARIFY) Implement the journey as Playwright tests:      ║
║     /artk.journey-implement id=<JRN-ID>                            ║
║                                                                     ║
║  4. (OPTIONAL) Define another journey:                              ║
║     /artk.journey-define id=JRN-#### title="<title>"               ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<JRN-ID>` with the actual journey ID that was just created (e.g., JRN-0001).**

**IMPORTANT:**
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
