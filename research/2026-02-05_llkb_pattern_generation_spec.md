# Specification: Automated LLKB Pattern Discovery & Generation (F12)

**Status:** Draft
**Date:** 2026-02-05
**Target:** ARTK `discover-foundation` prompt

## 1. Feature Overview

### Problem
Currently, ARTK's `discover-foundation` initializes the Lessons Learned Knowledge Base (LLKB) with an empty structure and a set of generic "Universal" patterns (Step F11). While this provides a baseline, it lacks application-specific context. The "Cold Start" problem remains: the first few generated tests often fail or contain excessive `TODO`s because ARTK hasn't yet "learned" the specific selector strategies, authentication quirks, or reusable component patterns of the target application.

### Solution
Introduce **Step F12: Automated LLKB Pattern Discovery & Generation**. This step will actively analyze the target application's codebase (and optional runtime DOM) to populate the LLKB with *high-confidence, app-specific* patterns before a single test is written.

### Value Proposition
- **Reduce Cold Start Friction:** tailored patterns mean the first generated journey is more likely to pass.
- **Lower TODO Rate:** Automates the discovery of selector strategies (e.g., `data-cy` vs `data-testid`) and auth flows.
- **Consistency:** Enforces app-specific conventions from day one.

## 2. Acceptance Criteria

1.  **Selector Strategy Detection:** Correctly identifies the primary testing attribute (e.g., `data-testid`, `data-cy`, `id`, `aria-label`) and configures `patterns/selectors.json` with the correct priority order.
2.  **Auth Pattern Extraction:** If a login form is detected, generates a `loginFlow` component in `components.json` with specific selectors for username, password, and submit button.
3.  **Component Generation:** Generates at least 5 app-specific reusable components (e.g., navigation helpers, specific form inputs) based on static analysis of the codebase.
4.  **Metric:** Reduces the initial "TODO" density in generated Journey code from ~18% to <10% (estimated).
5.  **Performance:** Adds no more than 30 seconds to the `discover-foundation` execution time (static analysis mode).

## 3. Technical Design

### 3.1 Data Structures

No new files are needed, but we will populate existing LLKB files with richer data.

**Target: `patterns/selectors.json`**
```json
{
  "selectorPriority": {
    "order": [
      { "type": "data-cy", "reliability": 0.99, "note": "Detected primary attribute" },
      { "type": "aria-label", "reliability": 0.85 }
    ]
  }
}
```

**Target: `components.json`**
```json
{
  "components": [
    {
      "id": "COMP-AUTO-001",
      "name": "loginToApp",
      "category": "auth",
      "scope": "app-specific",
      "code": "async (page) => { ... }", // Generated implementation
      "confidence": 0.85,
      "source": "static-analysis"
    }
  ]
}
```

### 3.2 Core Logic (New Functions)

We will introduce a new analysis module (executed within the prompt's script block or via a helper script) with three main phases:

#### A. Framework & Library Detection (Refinement)
Extends the existing D3 step to map detected libraries to specific ARTK pattern sets.
- **Input:** `package.json`, `artk.config.yml`
- **Logic:**
  - If `material-ui` -> Load MUI specific selector strategies (e.g., `MuiSelect-root`).
  - If `ant-design` -> Load AntD strategies (e.g., `.ant-btn-primary`).
  - If `ag-grid` -> Load AG Grid helpers.

#### B. Selector Analysis (Static)
Scans source files to determine the dominant testing attribute convention.
- **Logic:**
  - `grep -r "data-testid=" src/ | wc -l`
  - `grep -r "data-cy=" src/ | wc -l`
  - `grep -r "data-test=" src/ | wc -l`
  - Determine winner and update `patterns/selectors.json`.

#### C. Pattern Generation (Heuristic)
Scans for common UI patterns to generate reusable components.
- **Navigation:** Look for `<nav>`, `Sidebar`, `Menu` components. Extract links and labels to create a `navigate(page, label)` helper.
- **Auth:** Identify the login page (Step D6 data). Extract input fields (user/pass) and submit button to create `loginFlow`.

### 3.3 Integration Point

**Insert Step F12 immediately after Step F11.10 (Output Summary) and before Part 3.**

```markdown
## Step F12 — Automated LLKB Pattern Discovery (New)

**Analyze target app to populate LLKB with app-specific patterns.**

1. **Selector Strategy:** Scan src/ for usage of `data-testid`, `data-cy`, `data-test`. Update `patterns/selectors.json`.
2. **Framework Patterns:** If UI library (MUI, AntD) detected, inject framework-specific lessons into `lessons.json`.
3. **Auth Component:** Generate `loginFlow` component in `components.json` using findings from Step D6.
```

## 4. Implementation Phases

### Phase 1: Static Analysis (MVP)
*Target: Next Sprint (2-3 days)*
- **Mechanism:** Shell commands (`grep`, `find`) and basic string parsing within the `discover-foundation` prompt logic.
- **Scope:**
  - Identify `testIdAttribute`.
  - Identify UI Framework (MUI, Tailwind, etc.).
  - Generate a basic `login` component stub if inputs are identifiable.
- **Output:** Populated `patterns/selectors.json` and basic `components.json`.

### Phase 2: Runtime Validation (Enhanced)
*Target: Future*
- **Mechanism:** If `runtimeScan=true` (Step D10), use Playwright to query the running DOM.
- **Scope:**
  - Verify selector stability (are IDs dynamic?).
  - Extract actual computed ARIA labels.
  - Generate complete Page Object Models (POMs) for critical pages.

## 5. Error Handling

- **Detection Failures:** If no clear selector strategy is found, default to ARTK standard (`data-testid` > role > text).
- **Ambiguity:** If multiple auth forms are found, mark the generated component as `review-needed` or generic.
- **Non-blocking:** Failure in F12 should **not** stop the foundation build. It should log a warning ("Could not auto-detect patterns") and proceed with generic defaults.

## 6. Testing Strategy

1.  **Synthetic Repos:** Create test repositories with known patterns:
    - Repo A: React + MUI + `data-cy`.
    - Repo B: Angular + Bootstrap + `id`.
2.  **Verification:**
    - Run `discover-foundation` on Repo A.
    - Assert `patterns/selectors.json` prioritizes `data-cy`.
    - Assert `components.json` contains MUI-specific helpers.
3.  **Regression:** Ensure existing generic patterns (Step 11.9.5) are not overwritten, only appended to or re-prioritized.
