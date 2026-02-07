# Codex's Specification - Round 1

**Model**: gpt-5.2-codex (OpenAI Codex v0.94.0)
**Confidence**: 0.86

## Specification: Discover-Foundation LLKB Pattern Generation (F12)

### 1. Feature Overview

**Problem:** LLKB is initialized (F11) with a generic seed set, but lacks app-specific patterns derived from the target codebase and runtime UI. This leads to a high TODO rate (~18%) during generation.

**Goal:** Add an F12 phase that detects the app framework, analyzes selectors and auth flows, and generates app-specific LLKB patterns, reducing TODOs to <10% within MVP scope.

### 2. Acceptance Criteria

1. After discover-foundation runs, `.artk/llkb/discovered-patterns.json` exists and is non-empty for typical modern apps.
2. `.artk/llkb/app-profile.json` is produced with detected framework(s), auth hints, and selector metrics.
3. LLKB export (`artk-autogen llkb-patterns export`) includes newly generated patterns at ≥0.7 confidence.
4. TODO rate in generated tests decreases from ~18% to <10% across at least 2 representative apps.
5. If detection fails, the pipeline continues with seed patterns only, and a warning is logged with concrete causes.

### 3. Technical Design

#### 3.1 Data Structures

**`app-profile.json` (schema)**
```json
{
  "version": "1.0",
  "generatedAt": "2026-02-05T12:00:00Z",
  "projectRoot": "/path/to/project",
  "frameworks": [
    { "name": "nextjs", "confidence": 0.92, "evidence": ["package.json:next", "src/app/"] }
  ],
  "uiLibraries": [
    { "name": "mui", "confidence": 0.78, "evidence": ["@mui/material"] }
  ],
  "selectorSignals": {
    "dataTestIdUsage": 0.63,
    "ariaLabelUsage": 0.41,
    "roleUsage": 0.55,
    "idUsage": 0.12,
    "classNameStability": 0.22
  },
  "auth": {
    "detected": true,
    "type": "cookie-session",
    "routes": ["/login", "/logout"],
    "selectors": ["[data-testid=login-button]", "input[name=email]"],
    "bypassHints": ["?authEnabled=false"]
  },
  "routes": {
    "login": "/login",
    "home": "/",
    "profile": "/account"
  },
  "runtime": {
    "validated": true,
    "scanUrl": "http://localhost:3000",
    "domSampleCount": 8
  }
}
```

**`discovered-patterns.json` (schema)**
```json
{
  "version": "1.0",
  "generatedAt": "2026-02-05T12:00:00Z",
  "source": "discover-foundation:F12",
  "patterns": [
    {
      "id": "app-login-submit",
      "intent": "auth.login.submit",
      "text": "sign in|log in|login",
      "selectorHints": [
        { "strategy": "role", "value": "button", "name": "Sign in" },
        { "strategy": "data-testid", "value": "login-submit" }
      ],
      "irPrimitive": "click",
      "confidence": 0.86,
      "layer": "app-specific"
    }
  ],
  "metadata": {
    "frameworks": ["nextjs"],
    "uiLibraries": ["mui"]
  }
}
```

#### 3.2 New Functions

**Detection (static)**
```ts
export function detectFrameworks(projectRoot: string): Promise<FrameworkSignal[]>;
export function detectUiLibraries(projectRoot: string): Promise<UiLibrarySignal[]>;
export function extractAuthHints(projectRoot: string): Promise<AuthHints>;
export function analyzeSelectorSignals(projectRoot: string): Promise<SelectorSignals>;
```

**Runtime extraction**
```ts
export async function collectDomSamples(page: Page): Promise<DomSample[]>;
export async function extractRuntimeSelectors(domSamples: DomSample[]): Promise<SelectorSignal[]>;
export async function validateAuthRoutes(page: Page, hints: AuthHints): Promise<AuthRuntimeValidation>;
```

**Pattern generation**
```ts
export function generatePatterns(profile: AppProfile, signals: SelectorSignal[]): LlkbPattern[];
export function mergeDiscoveredPatterns(seed: LlkbPattern[], discovered: LlkbPattern[]): LlkbPattern[];
```

#### 3.3 Integration Points

**F11 (existing):** initialize LLKB directory and seed patterns.
**F12 (new):**
1. Framework Detection
2. Selector Analysis
3. Auth Extraction
4. Pattern Generation

**Location in prompt:** After F11 completion in discover-foundation prompt; before foundation module generation.

### 4. Implementation Phases

**Phase 1: Static Analysis (2–3 days MVP)**
- Parse `package.json`, `tsconfig`, `next.config`, `vite.config`, `angular.json`, `app.module.ts`.
- Scan source for auth routes and selectors (regex + AST-lite).
- Populate `app-profile.json` with confidence scores and evidence.

**Phase 2: Runtime Validation (next iteration)**
- Use Playwright to open home + login route.
- Sample DOM for `data-testid`, `aria-label`, `role`, `name` usage.
- Validate auth hints (form fields, buttons, redirects).
- Update selector metrics and discovered patterns with runtime evidence.

### 5. Error Handling

- If framework detection fails: set `frameworks: []`, log warning, continue.
- If auth extraction fails: `auth.detected=false`, skip auth patterns.
- If runtime scan fails: keep `runtime.validated=false`, fallback to static signals.
- If no patterns generated: keep seed patterns only; include `reason` in logs.
- All failures must surface in discover-foundation summary with explicit causes and timestamps.

### 6. Testing Strategy

1. **Unit Tests**
   - Framework detection on fixture repos (Next, React, Angular).
   - Selector analysis on synthetic code samples.
   - Pattern generation yields deterministic IDs and confidence thresholds.

2. **Integration Tests**
   - Run discover-foundation on at least 2 sample apps; verify JSON outputs exist.
   - Assert `discovered-patterns.json` contains ≥5 patterns for apps with login UI.

3. **Regression Metrics**
   - Compare TODO rate before/after F12 on the same journeys.
   - Require <10% TODOs in at least 2 apps.
