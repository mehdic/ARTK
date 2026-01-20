---
name: artk.journey-implement
description: "Phase 8: Turn a clarified Journey into stable Playwright tests + modules using the Phase 7 harness. Includes post-implementation quality gates: /artk.journey-validate (static) and /artk.journey-verify (run + stabilize). Updates Journey status/tests links, module registry, backlog/index."
argument-hint: "mode=standard|quick|max artkRoot=<path> id=<JRN-0001> file=<path> harnessRoot=e2e tier=auto|smoke|release|regression testFileStrategy=per-journey|groupedByScope splitStrategy=auto|single|multi createFeatureModules=auto|true|false updateModulesRegistry=true|false useDiscovery=auto|true|false strictGates=true|false allowNonClarified=false|true allowBlocked=false|true authActor=auto|<role> multiActor=auto|true|false artifacts=inherit|minimal|standard|max redactPII=auto|true|false flakyBudget=low|medium|high postValidate=auto|true|false validateMode=quick|standard|max postVerify=auto|true|false verifyMode=quick|standard|max heal=auto|off healAttempts=2 repeatGate=auto|0|2|3 failOnFlaky=auto|true|false dryRun=true|false"
agent: agent
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

# ARTK /journey-implement — Implement Journey as Playwright Tests (Phase 8)

You are running **ARTK Phase 8**.

ARTK plugs into GitHub Copilot to help teams build and maintain **complete automated regression testing suites** for existing applications. Phase 8 turns a Journey contract into real Playwright tests that are stable, traceable, and consistent with the harness.

---

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 MANDATORY PRE-IMPLEMENTATION GATES — DO NOT SKIP                      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  Before writing ANY test code, you MUST complete these gates IN ORDER:    ║
# ║                                                                           ║
# ║  GATE 1: Load LLKB Context (Step 2)                                       ║
# ║    □ Read `.artk/llkb/config.yml`                                         ║
# ║    □ Read `.artk/llkb/components.json`                                    ║
# ║    □ Read `.artk/llkb/lessons.json`                                       ║
# ║    □ Output "LLKB Context Loaded" section showing findings                ║
# ║                                                                           ║
# ║  GATE 2: Use AutoGen CLI (Step 3)                                         ║
# ║    □ Run `npx artk-autogen generate` for each journey                     ║
# ║    □ Only use manual implementation if AutoGen fails or has blocked steps ║
# ║                                                                           ║
# ║  Failure to complete these gates = INVALID implementation                 ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🔄 SERIAL EXECUTION POLICY — MULTIPLE JOURNEYS (NON-NEGOTIABLE)          ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  When implementing MULTIPLE journeys (batch execution):                   ║
# ║                                                                           ║
# ║  ❌ DO NOT implement journeys in parallel                                 ║
# ║  ✅ MUST implement journeys SERIALLY, one at a time                       ║
# ║                                                                           ║
# ║  Why? LLKB accumulates wisdom between journeys:                           ║
# ║  - Journey 1 may extract a reusable component                             ║
# ║  - Journey 2 can then REUSE that component instead of recreating it       ║
# ║  - Parallel execution loses this knowledge transfer                       ║
# ║                                                                           ║
# ║  BATCH EXECUTION ALGORITHM:                                               ║
# ║                                                                           ║
# ║  journeys = parseRequestedJourneys(userInput)                             ║
# ║  FOR i, journey IN enumerate(journeys):                                   ║
# ║    OUTPUT: "═══ Journey {i+1}/{len(journeys)}: {journey.id} ═══"          ║
# ║    1. Load LLKB context (may have new components from previous journey)   ║
# ║    2. Run AutoGen for this journey                                        ║
# ║    3. Handle blocked steps if any                                         ║
# ║    4. Update LLKB with any new components/lessons                         ║
# ║    5. Run validation and verification gates                               ║
# ║    6. Update journey status                                               ║
# ║    OUTPUT: "✅ Journey {journey.id} complete. LLKB updated."              ║
# ║    # Next iteration will see updated LLKB                                 ║
# ║                                                                           ║
# ║  If context was compacted: Re-read this section. Serial is NON-NEGOTIABLE.║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

This command must:
1) Convert a Journey (preferably `status: clarified`) into Playwright tests that follow the Phase 7 harness conventions.
2) **Load LLKB context FIRST** to reuse existing components and apply learned patterns.
3) **Use AutoGen CLI as the PRIMARY approach** for test generation.
4) Create/extend **feature modules** only when needed (foundation modules are reused).
5) Run **quality gates**:
   - `/artk.journey-validate` (static rules + traceability)
   - `/artk.journey-verify` (actually run + stabilize tests)
6) Only then: update the Journey system of record (status + tests links), update module registry, regenerate backlog/index.

---

## Research-backed design principles (do not violate)
These are not "style preferences". They are how you avoid flaky, unreadable E2E suites:

- **Use Playwright locators + auto-wait**. Prefer user-facing attributes and explicit contracts (role/name/label/test id).
- **Use web-first assertions** that wait and retry; for complex async, use `expect.poll` or `expect.toPass` instead of sleeps.
- **Keep tests isolated**. Each test should be independently runnable and not depend on previous tests.
- **Auth must reuse storageState** created by the setup project and stored in an ignored directory; never commit it.
- **Local auth bypass**: do not add per-test conditionals. Use tags/projects so `@auth/@rbac` can be skipped or run per environment.
- **Use tags** (`@JRN-####`, `@smoke/@release/@regression`, `@scope-*`) so teams can filter runs via `--grep`.
- **Collect traces smartly**. Prefer traces retained on failure (and first-failure tracing where supported) rather than capturing everything always.

(These align with official Playwright capabilities: CLI filtering, retries, tracing, and tags.)

---

# Non‑Negotiables
- **No secrets**: never embed passwords/tokens. Ask for provisioning process only.
- **No hardcoded URLs**: always rely on Phase 7 env/config loader + baseURL.
- **Idempotent**: reruns should update managed blocks and avoid duplicates.
- **Traceability is mandatory**:
  - every test includes `@JRN-####`
  - Journey `tests[]` links to test paths
- **No "flakiness fixes" using sleeps**. `page.waitForTimeout()` is forbidden except as last resort with justification + TODO.
- **Respect strict gates** by default (`strictGates=true`):
  - if selectors/data/env are blocked, do not "pretend-implement" the Journey.
- **LLKB is mandatory**: Load and use LLKB context before ANY code generation.
- **AutoGen is primary**: Use the AutoGen CLI; manual implementation is a fallback only.
- **Serial execution for batches**: Multiple journeys must be implemented one at a time, not in parallel.
- **Status rule (important)**:
  - You may create test code before verification,
  - but you may set Journey `status: implemented` **only after**:
    1) `/artk.journey-validate` passes, and
    2) `/artk.journey-verify` passes (tests run green + stability gate),
    3) `tests[]` is non-empty and points to real files.

---

# Inputs
User must identify a Journey by:
- `id=JRN-####` (preferred) OR
- `file=journeys/.../*.md`
- **Multiple journeys**: `id=JRN-0001,JRN-0002,JRN-0003` OR `file=journeys/clarified/*.md`

Key args:
- `mode`: quick | standard | max (default: standard)
- `harnessRoot`: default `e2e`
- `tier`: auto | smoke | release | regression (default auto = Journey tier)
- `testFileStrategy`: per-journey | groupedByScope (default per-journey)
- `splitStrategy`: auto | single | multi
- `useDiscovery`: auto|true|false (default auto)
- `strictGates`: true|false (default true)
- `allowNonClarified`: default false
- `allowBlocked`: default false
- `postValidate`: auto|true|false (default auto)
- `validateMode`: quick|standard|max (default standard)
- `postVerify`: auto|true|false (default auto)
- `verifyMode`: quick|standard|max (default standard)
- `heal`: auto|off (default auto)
- `healAttempts`: default 2 (standard)
- `repeatGate`: auto|0|2|3 (default auto = 2 in standard, 0 in quick, 3 in max)
- `failOnFlaky`: auto|true|false (default auto = true in standard/max, false in quick)
- `dryRun`: true|false (default false)

---

# Preconditions (must validate before writing code)
1) ARTK Journey system exists (`journeys/`, config, backlog/index).
2) Phase 7 harness exists:
   - `<ARTK_ROOT>/<harnessRoot>/playwright.config.*`
   - `<harnessRoot>/fixtures/test.*` (or equivalent base test)
   - `<harnessRoot>/modules/foundation/*`
3) Journey should be `status: clarified` unless `allowNonClarified=true`.
4) If Journey has blockers and `allowBlocked=false`: STOP and explain remediation (selectors/data/env).
5) **LLKB context MUST be loaded before any code generation** (Step 2).
6) **AutoGen CLI must be attempted before manual implementation** (Step 3).

If any prerequisite is missing, print the exact command to run next and stop.

---

# Outputs (must produce)

## A) Test implementation
- Create/modify test file(s) under:
  - `<harnessRoot>/tests/<tier>/`
- **Edit safety**: MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before making any file edits.

Default naming:
- per-journey: `<harnessRoot>/tests/<tier>/<JRN-ID>__<slug>.spec.(ts|js)`
- groupedByScope: `<harnessRoot>/tests/<tier>/<scope>.journeys.spec.(ts|js)` (append new describe block)

## B) Feature modules (if needed)
- Under `<harnessRoot>/modules/feature/<scope>/`
- Only create if required by Journey dependencies and missing (or `createFeatureModules=true`).

## C) Quality gates (post steps)
- Run (or instruct the user to run) `/artk.journey-validate`
- Run (or instruct) `/artk.journey-verify` with bounded healing loop

## D) Update Journey + system of record (only after gates pass)
- Add test links to Journey frontmatter `tests[]`
- Set `status: implemented` ONLY when valid and verified
- Add/update managed implementation + verification blocks
- Regenerate:
  - `journeys/BACKLOG.md`
  - `journeys/index.json`

## E) Update module registry (recommended)
- Update `<harnessRoot>/modules/registry.json`:
  - add any new feature modules
  - update `journeyDependencies[JRN-####] = { foundation:[...], feature:[...] }`

---

# Required assistant output structure (always follow)
When executing this command, structure your response like this:

1) **Detected Context**
2) **LLKB Context Loaded** ← MANDATORY: Show components/lessons found
3) **Implementation Plan**
4) **Questions (if needed)**
5) **AutoGen Execution** ← MANDATORY: Show AutoGen CLI output
6) **Changes Applied** (if manual steps needed)
7) **LLKB Summary** ← MANDATORY: Components reused/created, lessons applied
8) **Validation + Verification**
9) **How to Run + Debug**
10) **Blockers / Follow-ups**

If `dryRun=true`, output sections 1–4 only.

---

# Implementation Algorithm (extended, do in order)

## Step 0 — Locate ARTK_ROOT and detect harness language
- Find `ARTK_ROOT` from `artk.config.yml` or `artkRoot=`.
- Determine harness root (`harnessRoot`).
- Detect TS vs JS from existing config and fixtures.
- Detect existing module registry and existing tests.
- **Initialize session state for batch tracking:**
  ```
  sessionState = {
    journeysRequested: parseJourneyList(userInput),
    journeysCompleted: [],
    predictiveExtractionCount: 0,
    startTime: now()
  }
  ```

## Step 1 — Load Journey(s) and validate readiness

### 1.1 Parse Journey List
If multiple journeys requested:
```
journeyList = parseJourneyList(userInput)  // e.g., ["JRN-0001", "JRN-0002", ...]
totalJourneys = journeyList.length

# ═══════════════════════════════════════════════════════════════
# BATCH SIZE LIMITS (prevent context overflow and quality degradation)
# ═══════════════════════════════════════════════════════════════
SOFT_LIMIT = 10   # Warning threshold
HARD_LIMIT = 50   # Maximum allowed

IF totalJourneys > HARD_LIMIT:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ❌ BATCH TOO LARGE: {totalJourneys} journeys exceeds limit of 50  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Processing too many journeys in one session:                      ║
  ║  - Risks context compaction losing serial execution rules          ║
  ║  - May exceed conversation context limits                          ║
  ║  - Reduces quality of LLKB integration per journey                 ║
  ║                                                                    ║
  ║  Please split into smaller batches of 10-20 journeys each.         ║
  ╚════════════════════════════════════════════════════════════════════╝
  STOP

IF totalJourneys > SOFT_LIMIT:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ⚠️  LARGE BATCH: {totalJourneys} journeys (recommended max: 10)   ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Consider splitting into smaller batches for better quality.       ║
  ║  Proceeding anyway, but quality may degrade for later journeys.    ║
  ╚════════════════════════════════════════════════════════════════════╝

IF totalJourneys > 1:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  BATCH EXECUTION: {totalJourneys} journeys detected                ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Journeys will be implemented SERIALLY (one at a time)             ║
  ║  This allows LLKB wisdom to accumulate between journeys.           ║
  ║                                                                    ║
  ║  Order: {journeyList.join(" → ")}                                  ║
  ╚════════════════════════════════════════════════════════════════════╝
```

### 1.2 For Each Journey (Serial Loop)
```
FOR journeyIndex, journeyId IN enumerate(journeyList):
  IF totalJourneys > 1:
    OUTPUT:
    ═══════════════════════════════════════════════════════════════════
    JOURNEY {journeyIndex + 1} of {totalJourneys}: {journeyId}
    ═══════════════════════════════════════════════════════════════════

  # Continue with Steps 1.3 through Step 15 for this journey
  # Then loop to next journey
```

### 1.3 Load Single Journey
Parse Journey YAML frontmatter (must minimally include):
- `id`, `title`, `status`, `tier`, `actor`, `scope`
- `modules.foundation[]`, `modules.feature[]` (best effort)
- `tests[]` (may be empty)

Extract from body (best effort):
- acceptance criteria (declarative)
- procedural steps (UI walkthrough)
- data strategy + cleanup expectations
- async completion signals
- compliance constraints (PII/artifacts)

If the Journey is not clarified:
- If `allowNonClarified=false`: stop and instruct `/artk.journey-clarify id=...`
- If `allowNonClarified=true`: generate a **skeleton implementation** but mark tests skipped until clarification is complete. Do not mark Journey implemented.

---

## Step 2 — Load LLKB Context (MANDATORY — BEFORE ANY CODE GENERATION)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 STOP: This step is MANDATORY and cannot be skipped                    ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST complete this step BEFORE Step 3 (AutoGen) or any manual code.  ║
# ║  Failure to load LLKB = wasted extraction opportunities and duplicate     ║
# ║  components that could have been reused.                                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 2.1 Check LLKB Availability
```
IF NOT exists(".artk/llkb/"):
  OUTPUT:
  ⚠️  LLKB directory not found. Proceeding without LLKB integration.
      Consider initializing LLKB for better component reuse.
  SKIP to Step 3

config = loadYAML(".artk/llkb/config.yml")
IF NOT config.enabled:
  OUTPUT:
  ⚠️  LLKB is disabled in config.yml. Proceeding without LLKB integration.
  SKIP to Step 3
```

### 2.2 Load LLKB Data Files
```
components = loadJSON(".artk/llkb/components.json") OR { components: [] }
lessons = loadJSON(".artk/llkb/lessons.json") OR { lessons: [], globalRules: [], appQuirks: [] }
appProfile = loadJSON(".artk/llkb/app-profile.json") OR {}
```

### 2.3 Filter by Journey Scope (Context Injection Algorithm)

**Filter and prioritize LLKB data for the current journey:**

```
FUNCTION loadAndFilterLLKBContext(journeyScope: string, journeySteps: Step[]) -> LLKBContext:
  # ═══════════════════════════════════════════════════════════════
  # STEP 1: Filter by scope (relevance-based)
  # ═══════════════════════════════════════════════════════════════
  relevantScopes = [
    "universal",                          # Always included
    "framework:" + appProfile.framework,  # Framework-specific
    "app-specific"                        # App-specific
  ]

  filteredComponents = components.filter(c =>
    relevantScopes.includes(c.scope) OR
    c.usageContext.some(ctx => matchesJourneySteps(ctx, journeySteps))
  )

  filteredLessons = lessons.lessons.filter(l =>
    relevantScopes.includes(l.scope) OR
    l.applicableTo.some(pattern => matchesJourneyScope(pattern, journeyScope))
  )

  # ═══════════════════════════════════════════════════════════════
  # STEP 2: Filter by confidence (quality-based)
  # ═══════════════════════════════════════════════════════════════
  confidenceThreshold = config.extraction.confidenceThreshold  # default 0.7

  highConfidenceComponents = filteredComponents.filter(c =>
    c.metrics.confidence >= confidenceThreshold
  )

  highConfidenceLessons = filteredLessons.filter(l =>
    l.metrics.confidence >= confidenceThreshold AND
    l.metrics.successRate >= config.retention.minSuccessRate  # default 0.6
  )

  # ═══════════════════════════════════════════════════════════════
  # HELPER: Extract keywords from journey steps for matching
  # ═══════════════════════════════════════════════════════════════
  FUNCTION extractKeywords(journeySteps: Step[]) -> string[]:
    keywords = []

    FOR each step in journeySteps:
      # Extract action verbs and map to categories
      IF step.description.includes("verify"): keywords.push("verify", "assertion")
      IF step.description.includes("navigate"): keywords.push("navigate", "navigation")
      IF step.description.includes("click"): keywords.push("click", "ui-interaction")
      IF step.description.includes("fill"): keywords.push("fill", "form", "data")
      IF step.description.includes("submit"): keywords.push("submit", "form")
      IF step.description.includes("login"): keywords.push("login", "auth")
      IF step.description.includes("logout"): keywords.push("logout", "auth")
      IF step.description.includes("grid"): keywords.push("grid", "table", "data-grid")
      IF step.description.includes("toast"): keywords.push("toast", "notification")
      IF step.description.includes("modal"): keywords.push("modal", "dialog")
      IF step.description.includes("sidebar"): keywords.push("sidebar", "navigation")
      IF step.description.includes("menu"): keywords.push("menu", "navigation")
      IF step.description.includes("loading"): keywords.push("loading", "async")
      IF step.description.includes("wait"): keywords.push("wait", "async")

      # Extract component names (nouns)
      keywords.push(...extractNouns(step.description))

    RETURN unique(keywords)

  # ═══════════════════════════════════════════════════════════════
  # STEP 3: Prioritize by relevance score
  # ═══════════════════════════════════════════════════════════════
  FUNCTION calculateRelevanceScore(item, journeySteps) -> float:
    score = 0.0
    keywords = extractKeywords(journeySteps)
    matchCount = countMatches(keywords, item.usageContext || item.applicableTo)
    score += matchCount * 0.2
    score += item.metrics.confidence * 0.3
    daysSinceUsed = daysBetween(now(), item.metrics.lastUsed || item.metrics.lastApplied)
    IF daysSinceUsed < 7: score += 0.2
    ELIF daysSinceUsed < 30: score += 0.1
    score += (item.metrics.successRate || 0) * 0.2
    RETURN min(score, 1.0)

  # Score and sort
  scoredComponents = highConfidenceComponents.map(c => ({
    ...c,
    relevanceScore: calculateRelevanceScore(c, journeySteps)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore)

  scoredLessons = highConfidenceLessons.map(l => ({
    ...l,
    relevanceScore: calculateRelevanceScore(l, journeySteps)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore)

  # ═══════════════════════════════════════════════════════════════
  # STEP 4: Include global rules and quirks (always)
  # ═══════════════════════════════════════════════════════════════
  globalRules = lessons.globalRules || []
  appQuirks = lessons.appQuirks.filter(q =>
    q.affectsJourneys.includes(journeyScope) OR
    q.location matches any journeyStep.route
  )

  RETURN {
    enabled: true,
    components: scoredComponents,
    lessons: scoredLessons,
    globalRules: globalRules,
    appQuirks: appQuirks,
    appProfile: appProfile,
    stats: {
      totalComponentsAvailable: components.length,
      totalLessonsAvailable: lessons.lessons.length,
      componentsInjected: scoredComponents.length,
      lessonsInjected: scoredLessons.length,
      quirksInjected: appQuirks.length
    }
  }
```

### 2.4 Output LLKB Context Loaded Section (MANDATORY)

**You MUST output this section before proceeding to Step 3:**

```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB CONTEXT LOADED                                               ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  📊 Statistics:                                                    ║
║    Total components available: {stats.totalComponentsAvailable}    ║
║    Components relevant to this journey: {stats.componentsInjected} ║
║    Total lessons available: {stats.totalLessonsAvailable}          ║
║    Lessons relevant to this journey: {stats.lessonsInjected}       ║
║    App quirks for this scope: {stats.quirksInjected}               ║
║                                                                    ║
║  📦 Available Components for Reuse:                                ║
║    {for each component: "- {id}: {name} ({category}, {confidence}%)"}
║                                                                    ║
║  💡 Applicable Lessons:                                            ║
║    {for each lesson: "- {id}: {title} ({confidence}%)"}            ║
║                                                                    ║
║  ⚠️  Known Quirks:                                                 ║
║    {for each quirk: "- {id}: {description}"}                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**If LLKB is empty or disabled, output:**
```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB CONTEXT LOADED                                               ║
╠════════════════════════════════════════════════════════════════════╣
║  Status: {disabled | empty | not initialized}                      ║
║  Proceeding without LLKB integration.                              ║
║  New patterns discovered will be candidates for extraction.        ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 3 — Generate Tests with AutoGen CLI (PRIMARY APPROACH — MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 STOP: AutoGen is the PRIMARY approach — NOT optional                  ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST attempt AutoGen BEFORE any manual code generation.              ║
# ║  Manual implementation (Step 5) is a FALLBACK only.                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 3.1 Check AutoGen Settings from Frontmatter

**Read the `autogen` section from journey frontmatter:**

```yaml
# Expected autogen section in journey frontmatter:
autogen:
  enabled: true           # true = use AutoGen, false = skip to manual
  blockedSteps: []        # Steps requiring manual implementation
  machineHints: true      # true = hints added by journey-clarify
```

**Decision tree based on autogen settings:**

```
IF journey.autogen is missing OR journey.autogen.enabled is undefined:
  # Default to AutoGen enabled (backward compatibility)
  PROCEED with AutoGen

IF journey.autogen.enabled === false:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  AUTOGEN DISABLED FOR THIS JOURNEY                                  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                     ║
  ║  Journey <ID> has autogen.enabled: false                            ║
  ║                                                                     ║
  ║  Skipping AutoGen CLI. Using manual implementation.                 ║
  ║                                                                     ║
  ║  Reason: {journey.autogen.disabledReason OR "User preference"}      ║
  ║                                                                     ║
  ╚════════════════════════════════════════════════════════════════════╝

  SKIP to Step 5 (Manual Implementation)
  DO NOT run AutoGen CLI

IF journey.autogen.enabled === true:
  # Check for blocked steps
  IF journey.autogen.blockedSteps.length > 0:
    OUTPUT: "AutoGen will skip steps: {blockedSteps.map(s => s.step).join(', ')}"
    OUTPUT: "These steps will need manual implementation after AutoGen"

  # Check for machine hints
  IF journey.autogen.machineHints === false:
    OUTPUT: "⚠️  Warning: machineHints is false - AutoGen may have lower accuracy"
    OUTPUT: "Consider running /artk.journey-clarify first to add hints"

  PROCEED with AutoGen (Step 3.2)
```

### 3.2 Validate Modules Format for AutoGen

**AutoGen requires `modules` to be an object with `foundation` and `features` arrays:**
```yaml
# REQUIRED format for AutoGen:
modules:
  foundation: [auth, navigation]
  features: [orders, catalog]
```

**If Journey has wrong format (array instead of object):**
```
IF journey.modules is Array:
  # Fix the format before running AutoGen
  fixedModules = {
    foundation: journey.modules.filter(m => isFoundationModule(m)),
    features: journey.modules.filter(m => !isFoundationModule(m))
  }
  # Update journey frontmatter
  updateJourneyFrontmatter(journey.file, { modules: fixedModules })
  OUTPUT: "Fixed journey modules format for AutoGen compatibility"
```

### 3.3 Run AutoGen CLI

From the `<harnessRoot>/` directory (typically `artk-e2e/`):

```bash
# Navigate to harness root
cd <ARTK_ROOT>/<harnessRoot>

# Generate tests from the Journey
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ \
  -m \
  --dry-run  # First do a dry run to check for issues
```

**If dry-run succeeds:**
```bash
# Run actual generation
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ \
  -m
```

**CLI Options:**

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory for generated tests (default: `./tests/generated`) |
| `-m, --modules` | Also generate feature module files |
| `--dry-run` | Preview what would be generated without writing |
| `-c, --config <file>` | Custom autogen config file |
| `-q, --quiet` | Suppress output except errors |

**Example CLI output:**
```
Found 1 journey file(s)
Generated: tests/smoke/jrn-0001__user-login.spec.ts
Generated: tests/smoke/modules/authentication.page.ts

Summary:
  Tests: 1
  Modules: 1
  Errors: 0
  Warnings: 0
```

### 3.3.1 Programmatic API (for CI/CD Pipelines)

For advanced automation (CI pipelines, custom tooling):

```typescript
import { generateJourneyTests } from '@artk/core-autogen';

const result = await generateJourneyTests({
  journeys: ['journeys/clarified/JRN-0001.md'],
  isFilePaths: true,
  outputDir: 'artk-e2e/tests/smoke/',
  generateModules: true,
});

// Result contains:
// - generatedTests: string[]  (file paths)
// - generatedModules: string[]  (file paths)
// - blockedSteps: { step: number, reason: string }[]
// - warnings: string[]
```

### 3.4 Output AutoGen Results (MANDATORY)

**You MUST output the AutoGen execution results:**

```
╔════════════════════════════════════════════════════════════════════╗
║  AUTOGEN EXECUTION                                                 ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Command: npx artk-autogen generate {journey.file} -o {output} -m  ║
║                                                                    ║
║  Result: {SUCCESS | PARTIAL | FAILED}                              ║
║                                                                    ║
║  Generated Files:                                                  ║
║    - tests/{tier}/{JRN-ID}__{slug}.spec.ts                        ║
║    - modules/feature/{scope}/{module}.page.ts (if -m used)         ║
║                                                                    ║
║  Blocked Steps: {count} (see below for resolution)                 ║
║    {for each blocked: "- Step {n}: {reason}"}                      ║
║                                                                    ║
║  Warnings: {count}                                                 ║
║    {for each warning: "- {description}"}                           ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### 3.5 Handle AutoGen Results

**If AutoGen succeeds (no errors, no blocked steps):**
1. Review generated test code for correctness
2. Verify selector strategies match Journey intent
3. Confirm acceptance criteria are mapped to assertions
4. **Skip to Step 6** (LLKB Component Matching and Usage Recording)

**If AutoGen reports blocked steps:**

**Option A: Add machine hints to Journey (preferred)**

Edit the Journey to add explicit locator hints using inline syntax:
```markdown
## Steps
3. Click the submit button `(role=button, name=Submit Order)`
4. Verify the confirmation dialog appears `(testid=order-confirmation)`
5. Check the status indicator shows success `(role=status, name=/success/i)`
```

Then re-run AutoGen:
```bash
npx artk-autogen generate ../journeys/clarified/JRN-0001.md -o tests/smoke/ -m
```

**Option B: Manual implementation for blocked steps only**

If machine hints can't resolve the issue (complex async, multi-actor, domain logic):
1. Use AutoGen output as a starting point
2. **Proceed to Step 5** (Manual Implementation) for blocked steps ONLY
3. Preserve AutoGen structure, tagging, and imports
4. Document why manual implementation was needed

**If AutoGen fails entirely:**

**MANDATORY: You MUST output the error before proceeding to manual implementation:**
```
╔════════════════════════════════════════════════════════════════════╗
║  AUTOGEN FAILED — FALLING BACK TO MANUAL IMPLEMENTATION            ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Error: {actual error message from AutoGen}                        ║
║                                                                    ║
║  Troubleshooting attempted:                                        ║
║    □ Journey status: {clarified | other}                           ║
║    □ Frontmatter YAML: {valid | invalid}                           ║
║    □ Modules format: {object | array (needs fix)}                  ║
║                                                                    ║
║  Reason for fallback: {specific reason AutoGen cannot be used}     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Then proceed to Step 5** (Manual Implementation) as fallback.

**⚠️ LOOPHOLE PREVENTION:** You cannot claim "AutoGen failed" without showing the actual error. The output above is MANDATORY before any manual code generation.

---

## Step 4 — Pull discovery/testability signals (recommended)
If `useDiscovery=auto` and Phase 4 outputs exist, load:
- `docs/TESTABILITY.md` and/or `docs/DISCOVERY.md`
Use them to:
- confirm selectors strategy availability (roles/test ids)
- identify known async "risk zones"
- identify environment constraints
- map scope/routes to modules

Do not invent facts.

---

## Step 5 — Manual Test Implementation (FALLBACK ONLY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ⚠️  FALLBACK: Only use this step when AutoGen cannot generate tests      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Valid reasons to use manual implementation:                              ║
# ║  - AutoGen failed entirely                                                ║
# ║  - AutoGen has blocked steps that machine hints can't resolve             ║
# ║  - Complex async flows need custom polling logic                          ║
# ║  - Multi-actor coordination requires custom setup                         ║
# ║  - Domain-specific assertions not covered by AutoGen                      ║
# ║  - Journey is not clarified (`allowNonClarified=true`)                    ║
# ║                                                                           ║
# ║  If AutoGen succeeded with no blocked steps, SKIP this step entirely.     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 5.1 Strict gates and blocker resolution
If `strictGates=true`, enforce these gates:
- **Selector gate**: critical controls must be reliably locatable.
- **Data gate**: deterministic data setup must be feasible.
- **Environment gate**: baseURL/env must be reachable.

If any gate fails:
- If `allowBlocked=false`: stop, add a blocker note to the Journey (managed block), and print remediation steps.
- If `allowBlocked=true`: create skipped tests with clear reasons, but do NOT set Journey implemented.

### 5.2 Determine test plan (single vs split)
Decide test shape based on `splitStrategy` and `flakyBudget`.

Default:
- one Journey = one main test unless splitting improves reliability.

Splitting is allowed when:
- multiple independent outcomes exist, OR
- long flows have multiple hard boundaries, OR
- multi-actor workflows require clarity, OR
- `flakyBudget=low` (be conservative).

### 5.3 Decide file placement and naming (idempotent)
- Determine test file path based on strategy.
- Search existing tests for `@JRN-####`:
  - If found, update instead of creating a new one.
- If duplicates exist, pick the most canonical and flag others for cleanup.

### 5.4 Module plan (foundation + feature)

#### 5.4.1 Verify foundation modules exist
Ensure equivalents exist for:
- auth
- navigation
- selectors/locators
- data/run-id/builders

If missing: stop and instruct `/artk.discover-foundation`.

#### 5.4.2 Feature modules
Create missing feature modules only when needed.
Keep modules small and composable. No mega-POMs.

### 5.5 Implement selector strategy (resilience rules)
1) Prefer `getByRole` with name.
2) Else `getByLabel`, `getByPlaceholder`.
3) Else `byTestId` helper.
4) CSS/XPath only as last resort with justification and encapsulation.

Never:
- rely on auto-generated class names
- use brittle `nth()` without strong reason

### 5.6 Implement waiting/async strategy (no sleeps)
- Use Playwright auto-wait.
- For navigation, assert completion with URL/title/heading.
- For background jobs: `expect.poll` / `expect.toPass` with bounded timeouts.
- Avoid `networkidle` unless you know it helps.
- `page.waitForTimeout()` is forbidden except as last resort with TODO.

### 5.7 Implement data strategy (setup + cleanup)
- Prefer API seed helpers if available.
- Namespace all created data using `runId`.
- Cleanup if feasible; otherwise ensure namespacing and document.

### 5.8 Manual Test Writing Guidelines

**CRITICAL: Import from ARTK Core Fixtures**

**Auth/RBAC tagging rules (mandatory when applicable):**
- Add `@auth` if the Journey validates login, logout, redirects to IdP, or unauthenticated access behavior.
- Add `@rbac` if the Journey validates role-based access (admin vs user, permission gates).
- Do **not** add `@auth`/`@rbac` for pure public pages or generic business flows unless access control is being asserted.

```typescript
// tests/<tier>/<JRN-ID>__<slug>.spec.ts
import { test, expect } from '@artk/core/fixtures';

test.describe('JRN-0001: User can view dashboard @JRN-0001 @smoke @scope-dashboard', () => {
  test('should display user dashboard with navigation @JRN-0001', async ({
    authenticatedPage,
    config,
    runId,
    testData,
  }) => {
    // Use core fixtures - NO custom fixture setup needed
    // authenticatedPage: Already authenticated as default role
    // config: ARTK configuration
    // runId: Unique test run ID
    // testData: Cleanup manager

    await test.step('Navigate to dashboard', async () => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
    });

    await test.step('AC-1: User sees welcome message', async () => {
      const welcome = authenticatedPage.getByRole('heading', { name: /welcome/i });
      await expect(welcome).toBeVisible();
    });

    await test.step('AC-2: Navigation menu is available', async () => {
      const nav = authenticatedPage.getByRole('navigation');
      await expect(nav).toBeVisible();
    });
  });
});
```

**Core Fixture Usage:**
- `authenticatedPage`: Pre-authenticated page (default role from config)
- `adminPage`, `userPage`: Role-specific authenticated pages
- `config`: Full ARTK configuration
- `runId`: Unique test run identifier (for data namespacing)
- `testData`: Cleanup manager (register cleanup callbacks)
- `apiContext`: Authenticated API request context

**Use Core Locator Utilities:**
```typescript
import { byTestId } from '@artk/core/locators';

// Prefer role/label locators from Playwright
const button = page.getByRole('button', { name: 'Submit' });

// Use core helpers when needed
const customElement = byTestId(page, 'custom-widget');
await expect(customElement).toBeVisible({ timeout: 5000 });
```

**Use Core Assertions:**
```typescript
import {
  expectToast,
  waitForLoadingComplete,
  expectFormValid,
} from '@artk/core/assertions';

await test.step('AC-3: Success toast appears', async () => {
  await expectToast(authenticatedPage, {
    message: 'Saved successfully',
    type: 'success',
  });
});

await test.step('Wait for data to load', async () => {
  await waitForLoadingComplete(authenticatedPage, {
    indicator: '[data-loading]',
    timeout: 10000,
  });
});
```

**Use Grid Helpers for AG Grid Testing:**
```typescript
import { agGrid } from '@artk/core/grid';

await test.step('Verify orders grid data', async () => {
  const grid = agGrid(authenticatedPage, 'orders-grid');

  // Wait for grid to be ready
  await grid.waitForReady();
  await grid.waitForDataLoaded();

  // Verify data
  await grid.expectRowCount(10);
  await grid.expectRowContains({ orderId: '12345', status: 'Active' });

  // Sort and filter
  await grid.sortByColumn('date', 'desc');
  await grid.filterByColumn('status', 'Pending');

  // Handle virtualized grids (scrolls to find row)
  await grid.scrollToRow({ ariaRowIndex: 500 });

  // Enterprise features (if ag-grid-enterprise is used)
  await grid.expandGroup({ ariaRowIndex: 1 });
  await grid.expandMasterRow({ ariaRowIndex: 2 });
});
```

Tagging (mandatory):
- `@JRN-####`
- `@smoke` / `@release` / `@regression`
- `@scope-<scope>`

Assertions mapping:
- Map each acceptance criterion to at least one assertion.
- Prefer user-visible assertions.
- No sleeps - use core assertions for async completion.

---

## Step 6 — LLKB Component Matching and Usage Recording

### 6.1 Match Generated Code to Existing Components

For each step in the generated test code (from AutoGen or manual):

**Component Matching Algorithm with Confidence Thresholds:**

```
FOR each testStep in generatedTest.steps:
  keywords = extractKeywords([testStep])

  # Find candidate components
  candidates = llkbContext.components.filter(c =>
    c.category matches stepType AND
    (c.scope === 'universal' OR
     c.scope === `framework:${appProfile.framework}` OR
     c.scope === 'app-specific') AND
    c.usageContext.some(ctx => ctx matches keywords)
  )

  # Score each candidate
  FOR each candidate in candidates:
    score = calculateSimilarity(testStep.description, candidate.usageContext)

    # ═══════════════════════════════════════════════════════════════
    # CONFIDENCE THRESHOLDS (MANDATORY)
    # ═══════════════════════════════════════════════════════════════
    IF score > 0.7:
      # AUTO-USE: Import and call the component
      USE candidate
      recordComponentUsage(candidate, journey.id)
      LOG: "Component matched - {candidate.id} for step {stepNumber} (score: {score})"

    ELIF score > 0.4:
      # SUGGEST: Show to user in output, let them decide
      SUGGEST candidate
      LOG: "Component suggested - {candidate.id} for step {stepNumber} (score: {score})"

    ELSE:
      # NO MATCH: Write inline code
      PASS
```

**Example Match:**
```
Journey step: "Verify that the sidebar navigation is visible"

Component: COMP001 - verifySidebarReady
  usageContext: ["After page load, before navigation actions", "When testing any page that has sidebar"]
  category: navigation
  scope: app-specific

Match score: 0.85 → AUTO-USE

Generated code:
  import { verifySidebarReady } from '@modules/foundation/navigation';
  await verifySidebarReady(page);
```

**Lesson Application with Confidence Levels:**

```
FOR each lesson in llkbContext.lessons:
  IF testCode.matches(lesson.applicableTo):
    confidence = lesson.metrics.confidence

    # ═══════════════════════════════════════════════════════════════
    # LESSON CONFIDENCE THRESHOLDS
    # ═══════════════════════════════════════════════════════════════
    IF confidence > 0.7:
      # HIGH: Auto-apply pattern, add comment
      APPLY lesson.pattern
      ADD COMMENT: "// LLKB {lesson.id}: {lesson.title} (confidence: {confidence})"
      recordLessonApplication(lesson, journey.id, success=true)

    ELIF confidence >= 0.5:
      # MEDIUM: Add comment with suggestion only
      ADD COMMENT: "// LLKB suggests {lesson.id}: {lesson.title} - consider applying"
      recordLessonApplication(lesson, journey.id, success=null)  # pending validation

    ELSE:
      # LOW (< 0.5): Skip entirely
      PASS
```

### 6.2 Predict Reuse for New Patterns (with Rate Limiting)

When writing NEW inline code (no existing component matches):

1. **Analyze the pattern**: Is this a common UI interaction?
   - Navigation (sidebar, menu, breadcrumb, tabs)
   - Forms (validation, submission, clearing, field interaction)
   - Tables/Grids (sorting, filtering, row selection, pagination)
   - Modals/Dialogs (open, close, confirm, cancel)
   - Notifications (toast, alert, banner, snackbar)
   - Loading states (spinners, skeletons, progress bars)

2. **Check other journeys**: Does this pattern appear in other proposed/implemented journeys?
   - Read `journeys/index.json` for all journeys
   - Scan journey steps for similar keywords
   - **If 1+ other journey has similar step** → Consider extraction
   - **If 0 other journeys but common pattern** → Mark as candidate

3. **Rate Limiting (MANDATORY)**:

   ```
   FUNCTION shouldExtractPredictively(pattern, config) -> ExtractDecision:
     # ═══════════════════════════════════════════════════════════════
     # CHECK 1: Is predictive extraction enabled?
     # ═══════════════════════════════════════════════════════════════
     IF NOT config.extraction.predictiveExtraction:
       RETURN { extract: false, reason: "Predictive extraction disabled in config" }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 2: Session rate limit (max extractions per journey)
     # ═══════════════════════════════════════════════════════════════
     MAX_PREDICTIVE_PER_JOURNEY = 3  # Hard cap

     IF sessionState.predictiveExtractionCount >= MAX_PREDICTIVE_PER_JOURNEY:
       RETURN {
         extract: false,
         reason: "Session limit reached (" + MAX_PREDICTIVE_PER_JOURNEY + " per journey)",
         fallback: "Mark as extraction candidate for journey-verify"
       }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 3: Daily rate limit (prevent LLKB bloat)
     # ═══════════════════════════════════════════════════════════════
     MAX_PREDICTIVE_PER_DAY = 10  # Hard cap

     todayExtractions = countPredictiveExtractionsToday()
     IF todayExtractions >= MAX_PREDICTIVE_PER_DAY:
       RETURN {
         extract: false,
         reason: "Daily limit reached (" + MAX_PREDICTIVE_PER_DAY + " per day)",
         fallback: "Mark as extraction candidate, will be reviewed tomorrow"
       }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 4: Component count limit (prevent registry bloat)
     # ═══════════════════════════════════════════════════════════════
     MAX_TOTAL_COMPONENTS = 100  # Soft cap with warning

     totalComponents = loadJSON(".artk/llkb/components.json").components.length
     IF totalComponents >= MAX_TOTAL_COMPONENTS:
       # Still allow, but with warning
       LOG WARNING: "Component count high (" + totalComponents + "). Consider running LLKB prune."

     # ═══════════════════════════════════════════════════════════════
     # CHECK 5: Pattern uniqueness (prevent near-duplicates)
     # ═══════════════════════════════════════════════════════════════
     existingComponents = loadJSON(".artk/llkb/components.json").components

     FOR each existing in existingComponents:
       similarity = calculateSimilarity(pattern.normalizedCode, existing.source.originalCode)
       IF similarity > 0.8:  # 80% similar
         RETURN {
           extract: false,
           reason: "Near-duplicate of existing component " + existing.id,
           suggestion: "Use existing component: " + existing.name
         }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 6: Minimum complexity threshold
     # ═══════════════════════════════════════════════════════════════
     MIN_LINES_FOR_EXTRACTION = 3

     IF pattern.lineCount < MIN_LINES_FOR_EXTRACTION:
       RETURN {
         extract: false,
         reason: "Pattern too simple (" + pattern.lineCount + " lines < " + MIN_LINES_FOR_EXTRACTION + " minimum)"
       }

     # All checks passed - allow extraction
     RETURN { extract: true }
   ```

   **Rate limit configuration (in config.yml):**
   ```yaml
   extraction:
     predictiveExtraction: true
     maxPredictivePerJourney: 3    # Max predictive extractions per journey run
     maxPredictivePerDay: 10       # Max predictive extractions per day
     minLinesForExtraction: 3      # Minimum code lines to extract
     similarityThreshold: 0.8      # Near-duplicate detection threshold
   ```

   **Rate Limit Helper Functions (MANDATORY IMPLEMENTATIONS):**

   ```
   # ═══════════════════════════════════════════════════════════════
   # COUNT DAILY EXTRACTIONS: Query history for today's extractions
   # ═══════════════════════════════════════════════════════════════
   FUNCTION countPredictiveExtractionsToday() -> number:
     today = formatDate(now(), "YYYY-MM-DD")
     historyPath = ".artk/llkb/history/" + today + ".jsonl"

     IF NOT exists(historyPath):
       RETURN 0

     count = 0
     FOR line in readLines(historyPath):
       TRY:
         event = JSON.parse(line)
         # Count predictive extractions from journey-implement
         IF event.event == "component_extracted" AND event.prompt == "journey-implement":
           count += 1
       CATCH:
         # Skip malformed lines
         CONTINUE

     RETURN count

   # ═══════════════════════════════════════════════════════════════
   # SIMILARITY CALCULATION: Detect near-duplicate patterns
   # ═══════════════════════════════════════════════════════════════
   FUNCTION calculateSimilarity(codeA: string, codeB: string) -> float:
     # Normalize both code snippets
     normA = normalizeCode(codeA)
     normB = normalizeCode(codeB)

     # Exact match after normalization
     IF normA == normB:
       RETURN 1.0

     # Empty check
     IF normA.length == 0 OR normB.length == 0:
       RETURN 0.0

     # Jaccard similarity on tokens (word-level)
     tokensA = new Set(normA.split(/\s+/))
     tokensB = new Set(normB.split(/\s+/))

     intersection = tokensA.intersection(tokensB)
     union = tokensA.union(tokensB)

     IF union.size == 0:
       RETURN 0.0

     jaccardScore = intersection.size / union.size

     # Bonus for same structure (same number of lines, similar length)
     linesA = codeA.split('\n').length
     linesB = codeB.split('\n').length
     lineSimilarity = 1.0 - abs(linesA - linesB) / max(linesA, linesB)

     # Weighted average (Jaccard is primary, structure is secondary)
     similarity = (jaccardScore * 0.8) + (lineSimilarity * 0.2)

     RETURN round(similarity, 2)

   # ═══════════════════════════════════════════════════════════════
   # NORMALIZE CODE: Prepare code for similarity comparison
   # ═══════════════════════════════════════════════════════════════
   FUNCTION normalizeCode(code: string) -> string:
     normalized = code
     # Remove string literals (replace with <STRING>)
     normalized = normalized.replace(/'[^']*'/g, '<STRING>')
     normalized = normalized.replace(/"[^"]*"/g, '<STRING>')
     # Remove numbers (replace with <NUMBER>)
     normalized = normalized.replace(/\d+/g, '<NUMBER>')
     # Remove variable names (replace with <VAR>)
     normalized = normalized.replace(/const \w+/g, 'const <VAR>')
     normalized = normalized.replace(/let \w+/g, 'let <VAR>')
     # Normalize whitespace
     normalized = normalized.replace(/\s+/g, ' ').trim()
     RETURN normalized
   ```

   **When rate limit is hit:**
   - Mark the pattern with `// LLKB: extraction candidate (rate limit)` comment
   - Log to history: `{"event":"extraction_deferred","reason":"rate_limit",...}`
   - journey-verify will re-evaluate during its cross-journey analysis

4. **Decision**:
   - **Likely reusable + passes rate limits** → Extract and create component
   - **Likely reusable + rate limit hit** → Mark as `// LLKB: extraction candidate`
   - **Uncertain** → Mark as `// LLKB: extraction candidate`
   - **Unique/one-off** → Write inline, no marking

### 6.3 Create Component for Extracted Patterns

When creating a new component:

1. **Generate module file** with clear documentation:
   ```typescript
   /**
    * Verify sidebar navigation is ready
    *
    * @component COMP###
    * @category navigation
    * @scope app-specific
    * @extractedFrom JRN-####
    * @createdBy journey-implement (predictive)
    */
   export async function verifySidebarReady(
     page: Page,
     options: VerifyOptions = {}
   ): Promise<void> {
     const { timeout = 10000 } = options;
     // LLKB: Applied L001 - use data-testid for sidebar container
     const sidebar = page.locator('[data-testid="sidebar-nav"]');
     await expect(sidebar).toBeVisible({ timeout });
   }
   ```

2. **Add entry to `components.json`**

3. **Log to `history/<YYYY-MM-DD>.jsonl`**:
   ```jsonl
   {"timestamp":"<ISO8601>","event":"component_created","id":"COMP###","journey":"JRN-####","prompt":"journey-implement"}
   ```

4. **Increment session counter**:
   ```
   sessionState.predictiveExtractionCount += 1
   ```

### 6.4 Record All Usage

After generating all test code:

1. **For each component used**:
   - Update `components.json`:
     - Add journey to `usedInJourneys` array
     - Increment `totalUses`
     - Update `lastUsed` timestamp
   - Log to `history/<YYYY-MM-DD>.jsonl`:
     ```jsonl
     {"timestamp":"<ISO8601>","event":"component_used","id":"COMP###","journey":"JRN-####","prompt":"journey-implement"}
     ```

2. **For each lesson applied**:
   - Log to `history/<YYYY-MM-DD>.jsonl`:
     ```jsonl
     {"timestamp":"<ISO8601>","event":"lesson_applied","id":"L###","journey":"JRN-####","prompt":"journey-implement","success":true}
     ```

### 6.5 Decision Tree Safeguards (Edge Case Handling)

**Handle edge cases that can break the LLKB workflow:**

#### 6.5.1 LLKB vs User Disagreement (Override Mechanism)

**When LLKB suggests a pattern but user/test indicates it's wrong:**

```
FUNCTION handleLLKBConflict(suggestion: Suggestion, userChoice: UserChoice) -> Resolution:
  config = loadYAML(".artk/llkb/config.yml")

  # ═══════════════════════════════════════════════════════════════
  # CASE 1: User explicitly overrides LLKB suggestion
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "OVERRIDE":
    IF config.overrides.allowUserOverride:
      # Log the override for future review
      appendToHistory({
        event: "user_override",
        lessonId: suggestion.lessonId,
        componentId: suggestion.componentId,
        userReason: userChoice.reason,
        journey: currentJourney.id
      })

      # Track override count for this pattern
      item = getLessonOrComponent(suggestion.id)
      item.overrideCount = (item.overrideCount || 0) + 1

      IF item.overrideCount >= config.overrides.flagAfterOverrides:
        # Flag for human review
        addToNeedsReview(item, "Multiple user overrides - may be wrong pattern")

      RETURN { action: "USE_USER_CHOICE", reason: "User override accepted" }
    ELSE:
      RETURN { action: "WARN", reason: "User overrides disabled in config" }

  # ═══════════════════════════════════════════════════════════════
  # CASE 2: Test failure indicates LLKB pattern is wrong
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "TEST_FAILED":
    item = getLessonOrComponent(suggestion.id)

    # Decrement success rate
    item.metrics.successRate = recalculateSuccessRate(item, false)
    item.metrics.lastFailure = now().toISO8601()

    # Recalculate confidence
    item.metrics.confidence = calculateConfidence(item)

    IF item.metrics.confidence < 0.4:
      # Demote to low confidence
      addToNeedsReview(item, "Confidence dropped below threshold after failure")

    RETURN { action: "LOG_FAILURE", reason: "Pattern failure recorded" }

  # ═══════════════════════════════════════════════════════════════
  # CASE 3: LLKB and user both have valid but different approaches
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "ALTERNATIVE_VALID":
    # Both are valid - add user's approach as new lesson with lower confidence
    createLesson({
      ...userChoice.pattern,
      source: { discoveredBy: "user-override", journey: currentJourney.id },
      metrics: { confidence: 0.5, occurrences: 1 },  # Start with medium confidence
      validation: { autoValidated: false, humanReviewed: true }
    })

    RETURN {
      action: "BOTH_VALID",
      reason: "Added user pattern as alternative. LLKB pattern retained."
    }
```

**User notification when override is logged:**
```
⚠️  LLKB Override Recorded
────────────────────────────────────────────────────
Pattern: L001 - Use role-based selectors for buttons
Your choice: CSS selector with explicit wait
Reason: [user provided reason]

This override has been logged. After 3 overrides for this pattern,
it will be flagged for human review.

To always use your preferred pattern, add to config.yml:
  overrides:
    suppressLesson: ["L001"]
────────────────────────────────────────────────────
```

#### 6.5.2 Circular Component References

**Detect and prevent components that depend on each other:**

```
FUNCTION detectCircularReferences(componentId: string) -> CircularRefResult:
  visited = Set()
  path = []

  FUNCTION dfs(compId: string) -> bool:
    IF compId in visited:
      # Found a cycle
      cycleStart = path.indexOf(compId)
      cycle = path.slice(cycleStart).concat([compId])
      RETURN { hasCycle: true, cycle: cycle }

    visited.add(compId)
    path.push(compId)

    component = getComponent(compId)
    FOR depId in component.dependencies || []:
      result = dfs(depId)
      IF result.hasCycle:
        RETURN result

    path.pop()
    RETURN { hasCycle: false }

  RETURN dfs(componentId)

# Usage during component creation
FUNCTION validateComponentDependencies(newComponent: Component) -> ValidationResult:
  # Check if adding this component creates a cycle
  FOR depId in newComponent.dependencies || []:
    depComponent = getComponent(depId)
    IF depComponent.dependencies?.includes(newComponent.id):
      RETURN {
        valid: false,
        error: "Circular dependency: " + newComponent.id + " <-> " + depId,
        suggestion: "Merge these components or refactor shared logic"
      }

    # Deep check
    circularCheck = detectCircularReferences(depId)
    IF circularCheck.hasCycle AND circularCheck.cycle.includes(newComponent.id):
      RETURN {
        valid: false,
        error: "Circular dependency chain detected: " + circularCheck.cycle.join(" -> "),
        suggestion: "Break cycle by extracting shared logic to new component"
      }

  RETURN { valid: true }
```

**When circular reference detected:**
```
❌ Circular Component Reference Detected
────────────────────────────────────────────────────
COMP015 (verifyGridReady) depends on COMP020 (expectLoadingComplete)
COMP020 (expectLoadingComplete) depends on COMP015 (verifyGridReady)

This creates a circular dependency that cannot be resolved.

Resolution options:
1. Merge components: Combine shared logic into single component
2. Extract common: Create COMP021 for shared logic both depend on
3. Inline: Remove dependency, duplicate the code (last resort)

Choose an option or modify your implementation.
────────────────────────────────────────────────────
```

#### 6.5.3 Stale Pattern Detection

**Warn when using patterns that haven't been validated recently:**

```
FUNCTION checkPatternStaleness(item: Lesson | Component) -> StalenessResult:
  config = loadYAML(".artk/llkb/config.yml")
  maxAge = config.retention.maxLessonAge  # default 90 days

  daysSinceLastSuccess = daysBetween(now(), item.metrics.lastSuccess || item.metrics.firstSeen)

  IF daysSinceLastSuccess > maxAge:
    RETURN {
      isStale: true,
      daysSinceSuccess: daysSinceLastSuccess,
      warning: "Pattern hasn't been validated in " + daysSinceLastSuccess + " days",
      suggestion: "Use with caution. Consider re-validating or archiving."
    }

  IF daysSinceLastSuccess > maxAge * 0.7:  # 70% of max age
    RETURN {
      isStale: false,
      warning: "Pattern approaching stale threshold (" + daysSinceLastSuccess + "/" + maxAge + " days)",
      suggestion: "Consider re-using in a journey to refresh validation"
    }

  RETURN { isStale: false }
```

**When stale pattern is used:**
```
⚠️  STALE PATTERN WARNING
────────────────────────────────────────────────────
Pattern: L022 - Toast timing patterns
Last validated: 95 days ago (threshold: 90 days)

This pattern may be outdated. The application may have changed.

Options:
1. Use anyway (pattern will be revalidated if tests pass)
2. Skip pattern and write inline code
3. Archive pattern (marks as deprecated)

Proceeding with caution...
────────────────────────────────────────────────────
```

---

## Step 7 — Output LLKB Summary (MANDATORY)

**You MUST output this section after code generation:**

```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB INTEGRATION SUMMARY                                          ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Components Reused: {count}                                        ║
║    {for each: "- {id}: {name} ({category})"}                       ║
║                                                                    ║
║  Components Created: {count}                                       ║
║    {for each: "- {id}: {name} ({category}, {scope})"}              ║
║                                                                    ║
║  Lessons Applied: {count}                                          ║
║    {for each: "- {id}: {title} (confidence: {confidence}%)"}       ║
║                                                                    ║
║  Extraction Candidates: {count}                                    ║
║    {for each: "- Step {n}: {description} (reason: {reason})"}      ║
║                                                                    ║
║  Rate Limits:                                                      ║
║    Session extractions: {sessionState.predictiveExtractionCount}/3 ║
║    Daily extractions: {todayCount}/10                              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 8 — Pre-Compilation Validation (MANDATORY)

**BEFORE proceeding to validation gates, you MUST complete the Pre-Compilation Validation Checklist from `.github/prompts/common/GENERAL_RULES.md`.**

Run through each check on ALL generated test files and modules:
1. **Duplicate Function Check** — No function defined in multiple files
2. **ESM Import Path Check** — Directory imports include `/index`
3. **Import Usage Check** — No unused imports, unused params prefixed with `_`
4. **Path Alias Check** — Consistent import patterns
5. **Syntax Quick Check** — Template literals use backticks, no unclosed brackets

**Only proceed to Step 9 after ALL checks pass.**

---

## Step 9 — Update Journey draft links (pre-gate)
Before running gates, you may:
- add the new test path(s) to Journey `tests[]` (so verify can find them)
- add a managed "implementation draft" block

Do NOT set `status: implemented` yet.

## Step 10 — Update module registry draft (optional)
If `updateModulesRegistry=true`, update registry with new modules and journeyDependencies.

## Step 11 — Run /artk.journey-validate (static gates)
If `postValidate=auto|true`:
- Execute `/artk.journey-validate id=<JRN-####> harnessRoot=<harnessRoot> mode=<validateMode> strict=true`
- If it fails:
  - fix violations (tags/imports/forbidden patterns)
  - re-run validate
If you cannot execute commands here:
- output the exact `/artk.journey-validate ...` invocation as the next step and stop before claiming success.

## Step 12 — Run /artk.journey-verify (run + stabilize)
If `postVerify=auto|true`:
- Execute `/artk.journey-verify id=<JRN-####> harnessRoot=<harnessRoot> mode=<verifyMode> heal=<heal> healAttempts=<healAttempts> repeat=<repeatGate> failOnFlaky=<failOnFlaky>`
- If it fails:
  - apply bounded fixes based on evidence (selectors/data/async)
  - re-run verify until attempts exhausted or blocked

If verification cannot be executed (environment unreachable):
- keep Journey status at clarified/defined
- add a blocker note and print the required next step (run verify in the correct region).

## Step 13 — Finalize Journey as implemented (only after gates pass)
If validate and verify both pass:
- Set Journey `status: implemented`
- Ensure `tests[]` is non-empty and deduped
- Add/update:
  - `<!-- ARTK:IMPLEMENT:BEGIN --> ... <!-- ARTK:IMPLEMENT:END -->`
  - `<!-- ARTK:VERIFY:BEGIN --> ... <!-- ARTK:VERIFY:END -->`
- Regenerate backlog/index:
  - Preferred: `node <ARTK_ROOT>/tools/journeys/generate.js --artkRoot <ARTK_ROOT>`
  - Or run the npm script if configured: `npm run journeys:generate`

If either gate fails:
- Do NOT set implemented.
- Keep status clarified/defined and capture reasons.

## Step 14 — Loop to Next Journey (Batch Execution)

**If processing multiple journeys:**
```
sessionState.journeysCompleted.push(currentJourney.id)
newComponentsThisJourney = sessionState.predictiveExtractionCount  # Track before reset

IF journeyIndex < totalJourneys - 1:
  # ═══════════════════════════════════════════════════════════════
  # CRITICAL: Reset per-journey counters for next journey
  # ═══════════════════════════════════════════════════════════════
  # The predictiveExtractionCount is PER-JOURNEY, not cumulative.
  # Without this reset, Journey 2+ cannot extract any components
  # if Journey 1 hit the session limit.
  sessionState.predictiveExtractionCount = 0

  OUTPUT:
  ═══════════════════════════════════════════════════════════════════
  ✅ Journey {currentJourney.id} complete.
  LLKB updated with {newComponentsThisJourney} new components.
  Session extraction count reset: 0/{MAX_PREDICTIVE_PER_JOURNEY}

  Proceeding to next journey ({journeyIndex + 2}/{totalJourneys})...
  ═══════════════════════════════════════════════════════════════════

  # Loop back to Step 1.2 for next journey
  # LLKB context will now include components created in this journey
  # Session extraction counter is reset for fresh limit per journey
ELSE:
  OUTPUT:
  ═══════════════════════════════════════════════════════════════════
  🎉 BATCH EXECUTION COMPLETE

  Journeys implemented: {sessionState.journeysCompleted.length}/{totalJourneys}
  Total components created: {totalNewComponents}
  Total components reused: {totalReusedComponents}
  ═══════════════════════════════════════════════════════════════════
```

## Step 15 — Print run/debug instructions
Include:
- run by tag: `npx playwright test --grep @JRN-####`
- run by file path
- debug: `--ui`, `--headed`
- where to find report and traces (per Phase 7)

---

# Mode-based question policy (don't be annoying)

## QUICK (≤ 3 questions, blockers only)
- env/baseURL reachable?
- auth actor?
- deterministic data approach?

## STANDARD (default, ≤ 8 questions)
Quick +:
- async completion signals
- compliance constraints (PII/artifacts)
- whether to split tests if ambiguous
- module naming if ambiguous

## MAX
Ask only when necessary:
- variants/negative flows
- multi-actor correlation
- feature flags/permissions matrix
- parallelism constraints

---

# Edge cases you MUST handle
- **SSO/MFA**: if UI login impossible, use external storageState provisioning and document.
- **Region-restricted env**: stop and propose runner-in-region (later phase) rather than guessing.
- **Existing tests present**: update/link rather than duplicate.
- **Downloads/new tabs/iframes**: use Playwright events and frame locators.
- **Flaky env**: do not "fix" with timing. Use explicit completion signals or quarantine later.
- **AG Grid / Data grids**: Use `@artk/core/grid` helpers instead of raw selectors. Handle virtualization with `scrollToRow()`. For enterprise features (grouping, tree data, master-detail), use the specialized enterprise helpers.
- **Large datasets in grids**: Use ARIA-based row targeting (`ariaRowIndex`) for virtualized grids that only render visible rows.
- **Batch execution**: When implementing multiple journeys, ALWAYS process serially to accumulate LLKB wisdom.

---

# LLKB Library Reference (@artk/core/llkb)

**Use the `@artk/core/llkb` library for all LLKB operations:**

```typescript
import {
  // File operations (atomic writes, locking)
  loadJSON, saveJSONAtomic, updateJSONWithLock,
  // Similarity detection
  calculateSimilarity, jaccardSimilarity, findSimilarPatterns, isNearDuplicate,
  // Category inference
  inferCategory, inferCategoryWithConfidence, isComponentCategory,
  // Rate limiting
  isDailyRateLimitReached, isJourneyRateLimitReached,
  // History logging
  appendToHistory, countTodayEvents, countPredictiveExtractionsToday,
  // Types
  type LLKBConfig, type Lesson, type Component, type HistoryEvent,
} from '@artk/core/llkb';
```

**Key functions for journey-implement:**

| Function | Usage |
|----------|-------|
| `calculateSimilarity(code1, code2)` | Compare code patterns (returns 0-1) |
| `findSimilarPatterns(code, patterns)` | Find matching components for a step |
| `inferCategory(code)` | Categorize code (navigation, auth, data, etc.) |
| `isDailyRateLimitReached(config, llkbRoot)` | Check if extraction limit hit |
| `appendToHistory(event, llkbRoot)` | Log component_used, lesson_applied events |
| `updateJSONWithLock(path, updater)` | Safe concurrent updates to components.json |

---

# Completion checklist (print at end)
- [ ] **LLKB context loaded** before any code generation
- [ ] **AutoGen attempted** as primary approach
- [ ] Test file(s) created/updated with `@JRN-####` and tier tag
- [ ] `@auth` / `@rbac` tags present when access control is asserted
- [ ] Tests use harness fixtures and foundation modules
- [ ] No hardcoded URLs; env loader used
- [ ] Web-first assertions used; no timing sleeps
- [ ] Feature modules created only if needed and kept small
- [ ] module registry updated (if enabled)
- [ ] **LLKB usage recorded** (components used/created, lessons applied)
- [ ] `/artk.journey-validate` passed
- [ ] `/artk.journey-verify` passed (including stability gate)
- [ ] Journey updated: tests[] linked, status implemented only when valid+verified
- [ ] backlog/index regenerated
- [ ] **Batch complete** (if multiple journeys): all journeys processed serially

---

# MANDATORY: Final Output Section

**You MUST display this section at the end of your output, exactly as formatted.**

**Display the following commands VERBATIM (do not summarize, paraphrase, or invent commands):**

```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (IF VALIDATE FAILED) Fix issues and re-validate:               ║
║     /artk.journey-validate id=<JRN-ID>                             ║
║                                                                     ║
║  2. (IF VERIFY FAILED) Run verification again after fixes:          ║
║     /artk.journey-verify id=<JRN-ID>                               ║
║                                                                     ║
║  3. (OPTIONAL) Implement another journey:                           ║
║     /artk.journey-implement id=JRN-####                            ║
║                                                                     ║
║  4. (OPTIONAL) Run all tests for the tier:                          ║
║     npm run test:smoke   (or test:release, test:regression)        ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<JRN-ID>` with the actual journey ID that was just implemented (e.g., JRN-0001).**

**IMPORTANT:**
- Copy the commands box exactly. Do not abbreviate or summarize.
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
