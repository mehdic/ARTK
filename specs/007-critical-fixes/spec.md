# Specification: Critical Fixes from Multi-AI Review

**Spec ID:** 007-critical-fixes
**Date:** 2026-01-21
**Status:** Draft
**Priority:** Critical

---

## Executive Summary

Following a multi-AI review (Claude, Gemini, Codex), five critical issues were identified that require immediate attention. This specification documents each issue, its root cause, impact, and the planned fix.

---

## Issue 1: CLI Feature Divergence (Not Duplication)

### Clarification

The initial assessment called this "duplicate CLIs" but investigation reveals it's actually **feature divergence** between two related implementations:

| Aspect | `cli/` | `packages/cli/` |
|--------|--------|-----------------|
| **Purpose** | Development version | npm-publishable version |
| **Variant Support** | Full (legacy-14, legacy-16, modern-esm, modern-cjs) | Limited (commonjs, esm, auto) |
| **Node Detection** | Yes (via variant-detector.ts) | No (module system only) |
| **CLI Library** | Hand-rolled arg parsing | Commander.js |
| **Git Activity** | Active features | "sync cli assets" only |
| **Commands** | init, doctor, upgrade, check, uninstall | Same |

### Root Cause

The `cli/` directory was developed with multi-variant support (spec 006), but the sync process to `packages/cli/` only copies assets, not the variant detection logic. This leaves the publishable CLI without the documented features.

### Impact

- **Users who run `npx @artk/cli init --variant legacy-16`** get an error because `packages/cli/` only accepts `commonjs|esm|auto`
- **CLAUDE.md documents features** that don't exist in the published CLI
- **Confusion** about which CLI is canonical

### Planned Fix

**Chosen Approach: Automatic Sync via Pre-Commit Hook**

Keep both directories with automatic synchronization:

- **`cli/`** = Source of truth for variant utilities (active development)
- **`packages/cli/`** = npm-publishable version (receives synced files)
- **Pre-commit hook** = Automatically syncs before each commit

**Implementation (COMPLETED):**

1. ✅ Created `scripts/sync-cli-variants.sh` that:
   - Copies variant utilities from `cli/src/utils/` to `packages/cli/src/lib/variants/`
   - Syncs tests
   - Creates barrel export `index.ts`
   - Stages synced files for commit

2. ✅ Updated `.husky/pre-commit` to run sync script before lint/typecheck

3. Remaining work:
   - Update `packages/cli/src/commands/init.ts` to import from `./lib/variants/`
   - Update `packages/cli/src/lib/bootstrap.ts` to use variant selection
   - Accept `--variant <modern-esm|modern-cjs|legacy-16|legacy-14|auto>`

**Why keep both?**

- `cli/` has cleaner development experience (simpler structure)
- `packages/cli/` has npm publishing setup (prepublishOnly, files array)
- Automatic sync prevents divergence without manual effort
- No need to choose - get benefits of both

### Files to Modify

```
packages/cli/src/lib/variant-definitions.ts  (NEW - from cli/)
packages/cli/src/lib/variant-detector.ts     (NEW - from cli/)
packages/cli/src/lib/variant-files.ts        (NEW - from cli/)
packages/cli/src/lib/variant-types.ts        (NEW - from cli/)
packages/cli/src/commands/init.ts            (UPDATE - add variant options)
packages/cli/src/lib/bootstrap.ts            (UPDATE - use variant selection)
cli/                                          (DELETE after merge)
```

### Acceptance Criteria

- [ ] `artk init --variant legacy-16` works and installs legacy-16 variant
- [ ] `artk init --variant modern-esm` works and installs modern-esm variant
- [ ] `artk init` (no variant) auto-detects based on Node version
- [ ] Only one CLI directory exists
- [ ] Tests pass for all variant combinations

---

## Issue 2: Legacy Variants Not Exposed in CLI

### Description

CLAUDE.md documents four build variants:

```
| Variant | Node.js | Module | Playwright | ES Target |
|---------|---------|--------|------------|-----------|
| modern-esm | 18+ | ESM | 1.57.x | ES2022 |
| modern-cjs | 18+ | CJS | 1.57.x | ES2022 |
| legacy-16 | 16+ | CJS | 1.49.x | ES2021 |
| legacy-14 | 14+ | CJS | 1.33.x | ES2020 |
```

But the published CLI (`packages/cli/`) only accepts:
- `--variant commonjs`
- `--variant esm`
- `--variant auto`

### Root Cause

This is a consequence of Issue 1 - the variant features exist in `cli/` but weren't merged to `packages/cli/`.

### Impact

- Users on Node 14 or 16 cannot use the legacy variants
- Documentation promises features that don't work
- Multi-variant build system (spec 006) is effectively unused

### Planned Fix

**Addressed by Issue 1 fix.** Once variant utilities are merged:

1. Update CLI to accept: `modern-esm|modern-cjs|legacy-16|legacy-14|auto`
2. Map old values for backward compatibility:
   - `commonjs` → `modern-cjs`
   - `esm` → `modern-esm`
3. Deprecation warning for old values

### Acceptance Criteria

- [ ] All four variants can be explicitly selected via CLI
- [ ] Auto-detection selects correct variant based on Node version
- [ ] Old `--variant commonjs` still works (with deprecation warning)

---

## Issue 3: init-playbook Decision Tree Loopholes

### Description

The `/artk.init-playbook` prompt has decision logic that can misclassify installations:

**Loophole 1:** `journeyCoreInstalled` computed but never used

```markdown
// From prompts/artk.init-playbook.md:188-199

Detection flags:
- coreInstalled (check for vendor/artk-core/)
- autogenInstalled (check for vendor/artk-core-autogen/)
- journeyCoreInstalled (check for .artk/core/journeys/)  ← COMPUTED

Mode Decision:
IF coreInstalled AND autogenInstalled THEN Mode C  ← journeyCoreInstalled NOT CHECKED
```

This means Mode C can be selected even when Journey Core is missing.

**Loophole 2:** Version comparison type mismatch

```markdown
// Prompt assumes semver string: "1.0.0"
IF installedVersion < "2.0.0" THEN upgrade

// But schema expects integer: 1
// core/typescript/config/schema.ts:596
version: z.number().int().min(1)
```

### Impact

- Fresh installs can skip Journey Core installation
- Upgrades may not trigger when they should
- Mode C (re-run) selected when Mode A (fresh) or Mode B (upgrade) needed

### Planned Fix

**Fix 1:** Add `journeyCoreInstalled` to mode decision

```markdown
// BEFORE (current)
IF coreInstalled AND autogenInstalled THEN Mode C

// AFTER (fixed)
IF coreInstalled AND autogenInstalled AND journeyCoreInstalled THEN Mode C
```

**Fix 2:** Align version handling

Option A: Change schema to accept string (semver)
```typescript
version: z.string().regex(/^\d+\.\d+\.\d+$/)
```

Option B: Change prompt to use integer
```markdown
IF installedVersion < 2 THEN upgrade
```

**Recommendation:** Option B - simpler, fewer breaking changes.

### Files to Modify

```
prompts/artk.init-playbook.md:188-220  (UPDATE mode decision logic)
prompts/artk.init-playbook.md:250-280  (UPDATE version comparison)
```

### Acceptance Criteria

- [ ] Mode decision includes all three component checks
- [ ] Version comparison uses consistent type
- [ ] Test cases cover:
  - [ ] Fresh install (nothing exists)
  - [ ] Partial install (core but no journey)
  - [ ] Complete install, outdated
  - [ ] Complete install, current

---

## Issue 4: Version Type Mismatch

### Description

Configuration version is represented differently across the codebase:

| Location | Type | Example |
|----------|------|---------|
| `core/typescript/config/schema.ts:596` | Integer | `1` |
| `packages/cli/README.md` (examples) | String | `"1.0"` |
| `prompts/artk.init-playbook.md` | Semver string | `"1.0.0"` |
| `docs/` examples | Mixed | Both used |

### Root Cause

Schema was designed with integer versions for simplicity, but documentation and prompts assumed semver strings.

### Impact

- Version comparisons may fail silently
- Prompts may make wrong upgrade decisions
- User confusion about correct format

### Planned Fix

**Standardize on integer version:**

1. Schema already uses integer - no change needed
2. Update all docs to show `version: 1` (not `"1.0"`)
3. Update prompts to compare integers
4. Add migration note: "Version is an integer, not semver"

### Files to Modify

```
packages/cli/README.md                    (UPDATE examples)
prompts/artk.init-playbook.md             (UPDATE version checks)
docs/ARTK_Core_v1_Specification.md        (UPDATE if has version examples)
core/typescript/config/schema.ts          (ADD comment clarifying integer)
```

### Acceptance Criteria

- [ ] All documentation shows `version: 1` (integer)
- [ ] All prompts use integer comparison
- [ ] Schema has clear documentation
- [ ] No semver strings in version field anywhere

---

## Issue 5: Journey Lifecycle Documentation Drift

### Description

`docs/ARTK_Journey_Lifecycle_v0.1.md` states:

```markdown
// Line 201
- clarified → implemented: `/journey-implement` (future phase)
```

But:
- `/journey-implement` prompt exists and is functional
- README lists it as a current command
- It's actively used in the workflow

### Root Cause

Documentation was written during planning phase and not updated when `/journey-implement` was implemented.

### Impact

- Users think journey-implement is not available
- Confusion about workflow completeness
- Reduces confidence in documentation accuracy

### Planned Fix

1. Update lifecycle doc to remove "(future phase)"
2. Add implementation date
3. Review all status references in docs for accuracy

### Files to Modify

```
docs/ARTK_Journey_Lifecycle_v0.1.md:201  (UPDATE - remove "future phase")
docs/ARTK_Journey_Lifecycle_v0.1.md      (REVIEW all status markers)
```

### Acceptance Criteria

- [ ] No "(future phase)" markers for implemented features
- [ ] All lifecycle transitions accurately reflect current state
- [ ] README and lifecycle doc are consistent

---

## Implementation Plan

### Phase 1: CLI Consolidation (Issue 1 + 2)

**Estimated Effort:** Medium

1. Create `packages/cli/src/lib/variants/` directory
2. Copy and adapt variant utilities from `cli/src/utils/`
3. Update init command to use new variant system
4. Update bootstrap to select correct dist folder
5. Test all four variants
6. Delete `cli/` directory
7. Update any scripts that reference `cli/`

### Phase 2: Prompt Fixes (Issue 3)

**Estimated Effort:** Low

1. Update init-playbook mode decision
2. Add `journeyCoreInstalled` to condition
3. Update version comparison to use integers
4. Add test scenarios to prompt tests (if they exist)

### Phase 3: Documentation Alignment (Issue 4 + 5)

**Estimated Effort:** Low

1. Search all docs for version examples
2. Update to integer format
3. Update lifecycle doc
4. Review for other "(future)" markers

---

## Verification

### Manual Testing

```bash
# Test Issue 1+2 fix
artk init --variant modern-esm ./test-esm
artk init --variant modern-cjs ./test-cjs
artk init --variant legacy-16 ./test-16
artk init --variant legacy-14 ./test-14
artk init ./test-auto  # Should auto-detect

# Verify correct variant installed
cat ./test-*/artk-e2e/vendor/artk-core/variant-features.json
```

### Automated Tests

```bash
# Run CLI tests
npm --prefix packages/cli test

# Run prompt tests (if implemented)
npm --prefix prompts test
```

---

## Appendix: Git History Evidence

```bash
# cli/ has feature development
$ git log --oneline -5 -- cli/
4257a11 feat(prompts): comprehensive AutoGen enforcement
b0365c9 fix(variants): spec compliance and build robustness
6b88763 feat(multi-variant): implement complete multi-variant build system

# packages/cli/ only has sync commits
$ git log --oneline -5 -- packages/cli/
e8f1036 chore: sync cli assets
85c718e chore: sync cli assets
e09df2e chore: sync cli assets
```

This confirms `cli/` is the active development location with features that need to be merged into `packages/cli/`.

---

## References

- Multi-AI Debate Synthesis: `research/2026-01-21_multi-ai-debate-synthesis.md`
- Codex Review: `research/debate-output/codex-review.md`
- Gemini Review: `research/debate-output/gemini-review.md`
- Multi-Variant Build Spec: `specs/006-multi-variant-builds/`
