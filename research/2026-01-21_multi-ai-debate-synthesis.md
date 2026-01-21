# Multi-AI Debate: ARTK Project Review Synthesis

**Date:** 2026-01-21
**Participants:** Claude (Self), Gemini 2.5 Pro, OpenAI Codex (GPT-5.2)
**Topic:** Brutally honest review of ARTK project

---

## Score Summary

| Category | Claude (Self) | Gemini | Codex | Average |
|----------|---------------|--------|-------|---------|
| Prompt Quality | 8.5 | 7 | 6.5 | **7.3** |
| Architecture | 8.5 | **3** | 6 | **5.8** |
| Error Handling | 8.5 | 5 | 7 | **6.8** |
| Documentation | 8.5 | 6 | 6 | **6.8** |
| **Overall** | **8.5** | **4** | **6.5** | **6.3** |

---

## Consensus Issues (All 3 AIs Agree)

### 1. Duplicate CLI Implementations (HIGH)
**All three AIs flagged this as critical:**
- `cli/` and `packages/cli/` both declare `@artk/cli`
- Different build pipelines and entrypoints
- Risk of divergent behavior and release confusion

**Files:** `cli/package.json:2`, `packages/cli/package.json:2`

### 2. Vendoring vs Package Management (HIGH)
**Gemini rated this as "critical flaw":**
- Core is copied into `vendor/` instead of being an npm package
- Makes upgrades manual and error-prone
- Negates benefits of package manager

**Codex corroborated:** "file: dependency" export issues documented but incomplete workarounds

### 3. Multi-Variant Build Complexity (MEDIUM-HIGH)
**All three noted concerns:**
- 4 build variants (modern-esm, modern-cjs, legacy-16, legacy-14)
- Massive testing matrix
- CLI only accepts `commonjs|esm|auto` - **doesn't expose legacy variants**
- Node version detection not actually implemented

**Files:** `CLAUDE.md:551-606`, `packages/cli/src/commands/init.ts:21-28`

### 4. Documentation Inconsistencies (MEDIUM)
**Multiple examples cited:**
- `/journey-implement` called "future phase" in lifecycle docs but presented as current in README
- Config version shown as string `"1.0"` in docs but schema expects number
- Conflicting messaging on CLI necessity

**Files:** `docs/ARTK_Journey_Lifecycle_v0.1.md:201-218`, `README.md:118-123`

---

## Divergent Opinions

### Architecture Score: Wide Disagreement

| AI | Score | Rationale |
|----|-------|-----------|
| Claude | 8.5 | Modular design, clear separation of concerns |
| Codex | 6 | Inconsistent implementation, loopholes in decision trees |
| **Gemini** | **3** | "Over-engineered," "critical architectural flaw" (vendoring) |

**Analysis:** Gemini took a fundamentally harder stance on the vendoring decision, calling it a "recipe for brittle builds and dependency hell." Claude focused on the internal architecture quality rather than distribution strategy.

### Prompt Quality: Moderate Disagreement

| AI | Score | Rationale |
|----|-------|-----------|
| Claude | 8.5 | After 15 fixes, subagent implementation solid |
| Gemini | 7 | "AI-driven workflow is innovative but has potential loopholes" |
| Codex | 6.5 | Decision tree loopholes, `journeyCoreInstalled` not used in mode decision |

---

## Unique Findings

### Claude Only
- Subagent `#runSubagent` syntax was fundamentally wrong (pseudo-code loops)
- Environment detection for VS Code needed
- LLKB merge semantic deduplication threshold

### Gemini Only
- Missing CI/CD generation for client projects
- No built-in mocking/spying guidance
- "Garbage in, garbage out" risk with AI-generated tests
- Needs stronger human-in-the-loop validation

### Codex Only
- `journeyCoreInstalled` computed but never used in init-playbook mode decision
- Semver strings vs numeric version type mismatch
- Autogen emits TODO notes when AC mapping yields no assertions
- Multiple TODO placeholders in prompt testing suite

**Codex found specific code locations:**
```
prompts/artk.init-playbook.md:188-199
core/typescript/config/schema.ts:584-597
core/typescript/autogen/src/mapping/stepMapper.ts:276-279
docs/PROMPT_TESTING.md:269-287
```

---

## Open Questions Raised

1. **Which CLI is canonical?** `cli/` or `packages/cli/`?
2. **Are legacy-14/16 variants actually supported?** CLI doesn't expose them
3. **Should version be numeric or semver string?** Docs and schema conflict
4. **Is monorepo support planned?** Currently out-of-scope with no warning

---

## Recommendations (Synthesized)

### Critical (All 3 Agree)
1. **Resolve CLI duplication** - Pick one canonical location
2. **Document legacy variant status** - Are they supported or roadmap?
3. **Fix init-playbook decision tree** - Use `journeyCoreInstalled` in mode decision

### High Priority (2/3 Agree)
4. **Consider npm package distribution** for @artk/core (Gemini strongly advocates)
5. **Add human-in-the-loop validation** for AI-generated tests
6. **Implement prompt testing suite** - Remove TODOs

### Medium Priority
7. **Reconcile version type** (numeric vs semver string)
8. **Add monorepo warning** in docs and CLI
9. **Simplify build variants** - Consider dropping Node 14/16 support

---

## Final Verdict

**ARTK is an ambitious, well-thought-out project with solid internal architecture but significant distribution and consistency issues.**

The core functionality (auth, fixtures, assertions, journey system) is well-designed. The main problems are:
1. Distribution strategy (vendoring vs npm)
2. Documentation drift between components
3. Decision tree loopholes in prompts
4. Legacy variant support that exists in code but not in CLI

**Recommended next steps:**
1. Consolidate to single CLI location
2. Decide on vendoring vs npm package strategy
3. Fix the identified decision tree loopholes
4. Update lifecycle docs to reflect current reality

---

## Raw Review Files

- Gemini: `research/debate-output/gemini-review.md`
- Codex: `research/debate-output/codex-review.md`
- Claude self-review: `research/2026-01-20_subagent-implementation-review.md`
