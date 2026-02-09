# Debate: Enhancing discover-foundation for LLKB Pattern Generation

**Date:** 2026-02-04
**Topic:** How should `/artk.discover-foundation` be enhanced to analyze target applications and build initial LLKB patterns?

> **Note:** This document has been superseded by a proper multi-AI debate.
> See: `research/debates/discover-foundation-llkb/synthesis.md` for the final consensus.
>
> **Participants:** Claude Opus 4.5, Gemini 3 Pro Preview, OpenAI Codex 0.94.0

---

## Executive Summary

This debate explores the best strategy for making LLKB immediately useful for each new project by enhancing the discover-foundation phase to generate app-specific patterns.

---

## Round 1: What Should discover-foundation Analyze?

### Perspective A: Selector-First Approach (Pragmatic)

**Argument:** Focus on extracting selector patterns from the live application.

**Analysis Points:**
1. **DOM Structure Analysis**
   - Scan for `data-testid`, `data-cy`, `data-test` attributes
   - Identify ARIA roles and landmarks
   - Catalog form field labels and placeholders
   - Map navigation structure (menus, links, breadcrumbs)

2. **Immediate Value:**
   - Selectors are the #1 cause of test flakiness
   - Knowing the app's selector conventions early prevents blocked steps
   - Can be done with a single page load + DOM traversal

3. **Implementation:**
   ```typescript
   // Discover phase extracts:
   {
     selectorConventions: {
       hasTestIds: true,
       testIdPattern: "data-testid",
       commonPrefixes: ["btn-", "input-", "modal-"],
       ariaUsage: "extensive" | "minimal" | "none"
     }
   }
   ```

**Verdict:** High-value, low-effort. Should be MVP.

---

### Perspective B: Auth Flow Analysis (Security-First)

**Argument:** Authentication is the gateway to all testing - analyze it deeply.

**Analysis Points:**
1. **Auth Pattern Detection**
   - Login form structure (username/password, SSO buttons, MFA)
   - Session management (cookies, localStorage, tokens)
   - Role-based access patterns (admin vs user paths)
   - Auth bypass mechanisms (test mode, mock auth)

2. **Why Auth Matters Most:**
   - Every E2E test needs auth (or explicit skip)
   - Auth failures block ALL downstream testing
   - Different apps have wildly different auth patterns

3. **Implementation:**
   ```typescript
   // Discover phase extracts:
   {
     authPatterns: {
       type: "form" | "sso" | "oauth" | "mfa",
       loginPath: "/login",
       loginSelectors: {
         username: "[data-testid='email-input']",
         password: "[data-testid='password-input']",
         submit: "[data-testid='login-btn']"
       },
       bypassAvailable: true,
       bypassMethod: "localStorage.setItem('mockAuth', 'true')"
     }
   }
   ```

**Verdict:** Critical for test reliability. Should be in MVP.

---

### Perspective C: UI Component Library Detection (Framework-Aware)

**Argument:** Detect the UI framework/library to apply framework-specific patterns.

**Analysis Points:**
1. **Framework Detection**
   - React (data-reactroot, __REACT_DEVTOOLS_GLOBAL_HOOK__)
   - Angular (ng-version, _ngcontent attributes)
   - Vue (data-v- attributes, __VUE__)
   - Component libraries (MUI, Ant Design, PrimeNG, AG Grid)

2. **Why Framework Matters:**
   - Each framework has idiomatic selector patterns
   - Component libraries have specific interaction patterns
   - AG Grid, for example, requires special handling

3. **Implementation:**
   ```typescript
   // Discover phase extracts:
   {
     framework: {
       core: "react",
       version: "18.x",
       componentLibrary: "mui",
       specialComponents: ["ag-grid", "react-select"]
     }
   }
   ```

**Verdict:** High leverage for pattern selection. Include in MVP.

---

## Round 2: How Should Patterns Be Extracted?

### Perspective A: Static Analysis (Fast, Offline)

**Argument:** Analyze source code without running the app.

**Methods:**
1. **HTML/Template Analysis**
   - Parse HTML files for common patterns
   - Extract selector conventions from templates
   - Identify form structures

2. **Existing Test Analysis**
   - If project has existing tests, mine them for patterns
   - Extract selectors, wait patterns, assertions
   - Learn from what already works

3. **Package.json Analysis**
   - Detect frameworks from dependencies
   - Identify test libraries already in use
   - Infer patterns from ecosystem

**Pros:**
- Fast (no browser needed)
- Works offline
- Can run in CI/CD

**Cons:**
- Misses dynamic content
- Can't verify selectors actually work
- May miss runtime-generated elements

**Verdict:** Good starting point, but needs runtime validation.

---

### Perspective B: Runtime Discovery (Accurate, Live)

**Argument:** Load the app in a browser and analyze the live DOM.

**Methods:**
1. **Page Crawling**
   - Navigate to key pages (login, dashboard, main features)
   - Extract DOM structure at each page
   - Build selector catalog

2. **Interaction Recording**
   - Perform sample interactions
   - Record what selectors are used
   - Validate they work

3. **Network Analysis**
   - Identify API endpoints
   - Detect loading patterns
   - Find auth token locations

**Pros:**
- Accurate (sees real DOM)
- Validates selectors work
- Captures dynamic content

**Cons:**
- Requires running app
- Slower than static analysis
- May need auth to access pages

**Verdict:** Essential for accuracy. Use for validation.

---

### Perspective C: Hybrid Approach (Recommended)

**Argument:** Combine static and runtime analysis for best results.

**Workflow:**
1. **Phase 1: Static Analysis (instant)**
   - Scan package.json for framework
   - Scan HTML/templates for patterns
   - Analyze existing tests if present

2. **Phase 2: Runtime Validation (with app running)**
   - Load login page, extract auth patterns
   - Navigate to 2-3 key pages
   - Validate discovered selectors

3. **Phase 3: Pattern Synthesis**
   - Merge static + runtime findings
   - Generate LLKB patterns
   - Flag uncertain patterns for review

**Verdict:** Best balance of speed and accuracy. Recommended approach.

---

## Round 3: Generic vs App-Specific Pattern Balance

### Perspective A: Seed with Generic, Enhance with Specific

**Argument:** Start with universal patterns, layer app-specific on top.

**Strategy:**
```
┌─────────────────────────────────────┐
│ Layer 3: App-Specific Patterns      │  ← discover-foundation adds
│ (app's selectors, auth, quirks)     │
├─────────────────────────────────────┤
│ Layer 2: Framework Patterns         │  ← auto-detected
│ (React, Angular, AG Grid, etc.)     │
├─────────────────────────────────────┤
│ Layer 1: Universal Patterns         │  ← shipped with ARTK
│ (click, fill, navigate, assert)     │
└─────────────────────────────────────┘
```

**Pattern Priority:**
1. App-specific patterns (highest confidence)
2. Framework patterns (medium confidence)
3. Universal patterns (fallback)

**Verdict:** Clean layering model. Recommended.

---

### Perspective B: App-First, No Generic Fallback

**Argument:** Generic patterns are noise - only use what's discovered.

**Rationale:**
- Generic patterns may not match app's conventions
- Forces explicit discovery
- Cleaner LLKB with only relevant patterns

**Counter-argument:**
- Cold start problem (no patterns until discovery runs)
- Discovery may miss edge cases
- Generic patterns provide safety net

**Verdict:** Too restrictive. Rejected.

---

### Perspective C: Weighted Confidence Model

**Argument:** All patterns coexist with different confidence weights.

**Model:**
```typescript
interface LlkbPattern {
  source: "universal" | "framework" | "app-specific" | "learned";
  confidence: number; // 0.0 - 1.0

  // Confidence weights by source:
  // - universal: 0.5 (baseline)
  // - framework: 0.7 (framework-appropriate)
  // - app-specific: 0.9 (discovered from this app)
  // - learned: varies (based on success rate)
}
```

**Matching Priority:**
1. Exact app-specific match → use it
2. High-confidence learned pattern → use it
3. Framework pattern → use it
4. Universal pattern → use as fallback

**Verdict:** Most flexible. Recommended for implementation.

---

## Round 4: MVP vs Comprehensive Approach

### MVP Approach (Recommended for v1)

**Scope:**
1. **Framework Detection** (static)
   - Scan package.json
   - Output: `framework`, `componentLibrary`

2. **Selector Convention Discovery** (runtime)
   - Load 1-2 pages
   - Extract data-testid patterns
   - Output: `selectorConventions`

3. **Auth Pattern Extraction** (runtime)
   - Analyze login page DOM
   - Identify form fields
   - Output: `authPatterns`

4. **LLKB Pattern Generation**
   - Generate 10-20 app-specific patterns
   - Merge with seed patterns
   - Output: `learned-patterns.json` updates

**Implementation Effort:** ~2-3 days
**Value:** Immediate improvement in pattern matching

---

### Comprehensive Approach (Future v2)

**Additional Features:**
1. **Full App Crawl**
   - Visit all linked pages
   - Build complete selector catalog
   - Map navigation structure

2. **Interaction Recording**
   - Record sample user flows
   - Extract interaction patterns
   - Build flow templates

3. **API Discovery**
   - Intercept network requests
   - Document API endpoints
   - Generate API wait patterns

4. **Accessibility Audit**
   - Check ARIA compliance
   - Identify missing labels
   - Suggest selector improvements

**Implementation Effort:** ~2-3 weeks
**Value:** Comprehensive test foundation

---

## Consensus Recommendations

### Immediate Actions (MVP)

1. **Add to discover-foundation prompt:**
   ```markdown
   ## Step F12: LLKB Pattern Discovery

   ### F12.1: Framework Detection
   - Read package.json dependencies
   - Detect: React, Angular, Vue, Svelte
   - Detect component libraries: MUI, Ant Design, AG Grid
   - Output to .artk/llkb/app-profile.json

   ### F12.2: Selector Convention Analysis
   - Load app in Playwright
   - Navigate to login page + 1 main page
   - Extract all data-testid, aria-label, role patterns
   - Identify naming conventions (kebab-case, camelCase, etc.)
   - Output selector patterns to LLKB

   ### F12.3: Auth Pattern Extraction
   - Analyze login page DOM structure
   - Extract form field selectors
   - Detect auth type (form, SSO, OAuth)
   - Output auth patterns to LLKB

   ### F12.4: Generate Initial LLKB Patterns
   - Create app-specific patterns from discoveries
   - Merge with seed patterns (don't overwrite)
   - Set confidence based on source
   ```

2. **Update LLKB structure:**
   ```
   .artk/llkb/
   ├── learned-patterns.json      # Universal + learned
   ├── app-profile.json           # NEW: Framework, selectors, auth
   └── discovered-patterns.json   # NEW: App-specific from discovery
   ```

3. **Pattern confidence tiers:**
   - `universal`: 0.5
   - `framework`: 0.7
   - `discovered`: 0.85
   - `learned`: 0.5-0.95 (based on success rate)

### Future Enhancements (v2+)

1. **Interactive discovery mode**
   - User performs sample flow
   - AI records and extracts patterns
   - Builds journey templates

2. **Continuous learning**
   - Every successful test run updates LLKB
   - Patterns gain/lose confidence over time
   - Auto-prune low-confidence patterns

3. **Cross-project learning**
   - Export high-confidence patterns
   - Share between similar projects
   - Build framework-specific pattern libraries

---

## Final Verdict

**Recommended Strategy:** Implement MVP with layered pattern model.

**Key Principles:**
1. **Seed + Discover + Learn** - Three sources of patterns
2. **Confidence-weighted matching** - App-specific > Framework > Universal
3. **Non-destructive merge** - Discovery adds, never overwrites
4. **Validate at runtime** - Static analysis needs runtime confirmation

**Expected Impact:**
- 50-70% reduction in blocked steps for new projects
- Faster journey-implement due to better pattern matching
- Self-improving system through learning loop

---

## Participants

- **Claude Opus 4.5** (Primary analysis and synthesis)
- Multi-perspective analysis simulating diverse viewpoints

**Confidence:** 0.85 (High confidence in recommendations)
