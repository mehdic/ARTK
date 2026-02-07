# Codex's Analysis - Round 1

**Model**: gpt-5.2-codex (OpenAI Codex v0.94.0)
**Confidence**: 0.78

## Key Recommendations

### 1. Analyze App Selectors + Semantics
- DOM roles, labels, data-testid, ARIA, form metadata
- Yields deterministic selectors and intent mappings
- **Concern:** Overfitting to unstable attributes; need scoring heuristic

### 2. Detect Auth Flows and Navigation Topology Early
- Login paths, SSO redirects, post-login landing, guarded routes
- Auth is top source of brittle tests
- **Concern:** Risk of capturing environment-specific flows

### 3. Identify UI Pattern Clusters
- Tables, modals, toasts, drawers, file uploads, multi-step forms
- These recur across journeys and map well to IR primitives
- **Concern:** Needs canonical set to avoid fragmentation

### 4. Detect Framework + Component Libraries
- React/Vue/Angular, MUI/Ant/Chakra/AG Grid
- Framework conventions imply reliable selector strategies
- **Concern:** Detection via static hints can be wrong

### 5. Use Hybrid Extraction
- Static analysis + runtime DOM + existing tests
- Static finds routes/components; runtime validates selectors; existing tests provide proven steps
- **Concern:** Runtime crawling can be slow; existing tests can encode bad practices

## Extraction Methods

### Static Analysis MVP
- Parse routes, component tree, shared components
- Infer interaction "verbs"
- Fast, offline, good for cold start

### Runtime DOM Crawl MVP
- Shallow crawl of key routes with Playwright
- Capture stable selectors, roles, repeated structures
- Directly measurable evidence

### Test Ingestion (Comprehensive)
- Mine existing E2E/unit tests for selectors and flows
- Map to IR primitives
- Must sanitize anti-patterns

## Balancing Generic vs App-Specific

### Two-Tier LLKB
- Core patterns (generic, high confidence) + app layer (scoped by app fingerprint)
- Prevents pollution while enabling app-specific boost
- App layer should only extend, not override unless confidence is high

### Confidence + Decay Model
- App-specific patterns require higher confidence
- Can decay if failures increase
- Requires feedback loop integration

## MVP vs Comprehensive

### MVP (2-3 days)
- Static route/component scan
- Runtime DOM snapshot on 3-5 core pages
- Generate ~20-30 app patterns with confidence scores

### Comprehensive (2-4 weeks)
- Full crawl with interaction heuristics
- Test ingestion and pattern mining
- Component library detection
- Feedback loop from run results
- UI pattern catalog with reusable templates

## Priority Ranking

1. Runtime DOM snapshot + selector scoring
2. Auth flow detection + guard route mapping
3. UI pattern cluster detection (table, modal, toast, form)
4. Static analysis for routes/component usage
5. Test ingestion and component-library detection
6. Full crawl + continuous feedback learning

## Key Caveats
- Effectiveness depends on access to runnable app environments
- App-specific patterns can drift if UI changes frequently
