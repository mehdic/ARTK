# Final Synthesis: Enhancing discover-foundation for LLKB Pattern Generation

**Date:** 2026-02-04
**Debate ID:** discover-foundation-llkb
**Participants:** Claude Opus 4.5 (Moderator), Gemini 3 Pro Preview, OpenAI Codex 0.94.0

---

## Summary of Perspectives

### Gemini's Perspective (The Pragmatic Architect)
- **Focus:** Static analysis and framework heuristics
- **Key insight:** "Configuration over Generation" - better to configure rules than generate fragile patterns
- **Unique contribution:** "Library Packs" concept - pre-curated patterns for detected frameworks
- **Priority:** Selector strategy discovery is P0

### Codex's Perspective (The Systematic Engineer)
- **Focus:** Hybrid extraction with runtime validation
- **Key insight:** Two-tier LLKB with confidence decay model
- **Unique contribution:** Detailed extraction methodology (static → runtime → test ingestion)
- **Priority:** Runtime DOM snapshot first, then auth detection

### Claude's Perspective (The Integration Architect)
- **Focus:** Layered pattern architecture with clear separation
- **Key insight:** Three-layer model (Universal → Framework → App-specific)
- **Unique contribution:** Confidence-tiered matching priority system
- **Priority:** Balance both approaches with phased implementation

---

## Areas of Agreement

All three participants agree on:

1. **Selector Convention Discovery is Critical**
   - Must detect `data-testid`, `data-cy`, `aria-label` patterns
   - Auto-configure selector strategy based on what the app uses
   - This directly reduces the ~18% TODO rate

2. **Framework Detection Provides High Leverage**
   - Parse `package.json` for React/Vue/Angular + component libraries
   - Load pre-built patterns for detected frameworks (MUI, AG Grid, etc.)
   - Low effort, high impact

3. **Auth Flow Detection is Non-Negotiable**
   - Auth failures block all downstream testing
   - Must extract login form structure and selectors
   - Should detect bypass mechanisms for test efficiency

4. **Hybrid Approach is Best**
   - Static analysis for speed and safety
   - Runtime validation for accuracy
   - Neither alone is sufficient

5. **MVP Should Be 2-3 Days Effort**
   - Focus on highest-impact features first
   - Generate 20-30 app-specific patterns
   - Target 50-70% reduction in TODO rate

---

## Areas of Disagreement

### Static vs Runtime Priority
- **Gemini:** Prefers static-first, minimal runtime (faster, safer)
- **Codex:** Prefers runtime-first for validated selectors
- **Resolution:** Use static for initial detection, runtime for validation

### Pattern Scope
- **Gemini:** Conservative - only generate what's proven
- **Codex:** Comprehensive - generate candidates with confidence scores
- **Resolution:** Generate with confidence scores, let matching filter

### Legacy Test Mining
- **Gemini:** P3 (nice to have, complex)
- **Codex:** P5 (comprehensive phase only)
- **Resolution:** Defer to v2, focus on new projects first

---

## Recommended Implementation

### Architecture: Layered Pattern Model

```
┌─────────────────────────────────────┐
│ Layer 3: App-Specific Patterns      │  ← discover-foundation generates
│ Confidence: 0.85-0.95               │
├─────────────────────────────────────┤
│ Layer 2: Framework Patterns         │  ← auto-loaded library packs
│ Confidence: 0.7                     │
├─────────────────────────────────────┤
│ Layer 1: Universal Patterns (79)    │  ← shipped with ARTK
│ Confidence: 0.5                     │
└─────────────────────────────────────┘
```

### LLKB Structure Update

```
.artk/llkb/
├── learned-patterns.json      # Universal + learned (existing)
├── app-profile.json           # NEW: Framework, selectors, auth
├── discovered-patterns.json   # NEW: App-specific from discovery
└── library-packs/             # NEW: Framework-specific patterns
    ├── react-mui.json
    ├── react-antd.json
    └── ag-grid.json
```

### discover-foundation Additions

Add new steps after existing foundation discovery:

```markdown
## Step F12: LLKB Pattern Discovery

### F12.1: Framework Detection (Static)
- Read package.json dependencies
- Detect: React, Angular, Vue, Svelte
- Detect component libraries: MUI, Ant Design, AG Grid
- Load appropriate library pack
- Output to .artk/llkb/app-profile.json

### F12.2: Selector Convention Analysis (Static + Runtime)
- Scan src/ for data-testid, aria-label, role patterns
- Load app in Playwright for validation
- Identify naming conventions (kebab-case, camelCase)
- Configure selector strategy in LLKB
- Output selector patterns

### F12.3: Auth Pattern Extraction (Runtime)
- Navigate to login page
- Extract form field selectors
- Detect auth type (form, SSO, OAuth, MFA)
- Check for bypass mechanisms (AUTH_BYPASS_PATTERNS.md)
- Output auth patterns to LLKB

### F12.4: Generate Initial LLKB Patterns
- Create app-specific patterns from discoveries
- Assign confidence based on source:
  - Static only: 0.7
  - Runtime validated: 0.85
  - Both: 0.95
- Merge with seed patterns (non-destructive)
- Output to discovered-patterns.json
```

### MVP Scope (2-3 Days)

| Feature | Effort | Impact |
|---------|--------|--------|
| Framework detection | 0.5 days | High |
| Selector convention analysis | 1 day | Critical |
| Auth pattern extraction | 1 day | Critical |
| Pattern generation | 0.5 days | High |

**Total: ~3 days**

### Comprehensive Scope (2-3 Weeks)

| Feature | Effort | Impact |
|---------|--------|--------|
| Full app crawl | 3 days | Medium |
| Interaction recording | 5 days | High |
| API discovery | 2 days | Medium |
| Legacy test mining | 3 days | Medium |
| Feedback loop integration | 2 days | High |

---

## Next Steps

### Immediate (This Sprint)

1. **Update discover-foundation prompt** with F12 steps
2. **Create app-profile.json schema** for storing discoveries
3. **Build framework detection** using package.json analysis
4. **Add selector scanning** to existing foundation discovery

### Short-term (Next Sprint)

5. **Create library packs** for top 3 frameworks (React/MUI, React/Antd, AG Grid)
6. **Integrate runtime validation** for selectors
7. **Add auth pattern extraction** with bypass detection

### Medium-term (v2)

8. Full app crawling
9. Interaction recording
10. Continuous learning feedback loop

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| TODO rate | ~18% | ~8-10% | Count TODO comments in generated tests |
| Cold start patterns | 79 | 100-120 | Count patterns after discovery |
| Pattern match confidence | 0.5 avg | 0.7 avg | Average confidence of matched patterns |
| First-run success rate | TBD | >60% | Tests passing on first generation |

---

## Confidence & Caveats

**Overall Confidence:** 0.85

**Key Caveats:**
1. Effectiveness depends on app having good selector attributes
2. Runtime analysis requires runnable app environment
3. Patterns may drift as UI evolves - need re-validation mechanism
4. Library packs require maintenance as frameworks update

---

## Participants

- **Claude Opus 4.5** - Moderator and Integration Architect
- **Gemini 3 Pro Preview** - Pragmatic Architect perspective
- **OpenAI Codex 0.94.0** - Systematic Engineer perspective

**Consensus reached:** Yes
**Recommended approach:** MVP with layered pattern model
