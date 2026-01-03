# Copilot Instructions Location Analysis

**Date:** 2026-01-03
**Topic:** Where should ARTK Copilot instructions live? Single file vs multiple files?

---

## The Question

Currently the prompts reference:
```
.github/
├── copilot-instructions.md              # Repo-wide
└── instructions/
    ├── artk-tests.instructions.md       # Path-scoped
    └── artk-journeys.instructions.md    # Path-scoped
```

**But does Copilot actually read files from `.github/instructions/`?**

---

## Research: GitHub Copilot Instruction Files

### What GitHub Copilot Actually Supports

Based on GitHub Copilot documentation and behavior:

1. **`.github/copilot-instructions.md`** - ✅ ALWAYS READ
   - This is the primary instruction file
   - Copilot reads this automatically for every request
   - No special configuration needed

2. **`.github/instructions/*.instructions.md`** - ⚠️ CONDITIONAL
   - These are "custom instructions" files
   - **Require VS Code setting to enable:**
     ```json
     "github.copilot.chat.codeGeneration.useInstructionFiles": true
     ```
   - The `applyTo` frontmatter filters when they're used
   - **NOT enabled by default in most setups**

3. **Prompt files (`.github/prompts/*.prompt.md`)** - ✅ ALWAYS AVAILABLE
   - These are slash commands, not instructions
   - Different purpose: user-invoked actions vs passive context

---

## The Problem

If we put ARTK instructions in `.github/instructions/`:
- Users must enable a VS Code setting
- Many users won't know to do this
- Instructions won't apply by default
- ARTK behavior becomes inconsistent

---

## Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Single file** (copilot-instructions.md) | Always works, no config needed, guaranteed visibility | File gets long, all rules apply everywhere |
| **Multiple files** (instructions/*.md) | Organized, path-scoped, cleaner | Requires VS Code setting, not default behavior |

---

## Recommendation: SINGLE FILE

**Put ALL ARTK instructions in `.github/copilot-instructions.md`**

### Reasons:

1. **Zero configuration** - Works out of the box
2. **Guaranteed visibility** - Copilot always reads it
3. **User doesn't need to know** - No "enable this setting" step
4. **Consistency** - Same behavior for all users

### Structure within single file:

```markdown
# Project Instructions

## General
[Project-wide rules]

## ARTK E2E Testing

### For Test Files (`artk-e2e/**/*.ts`)
- Use Playwright auto-waits
- Prefer user-facing locators
- No sleeps or random waits
- Keep tests thin
- Enforce journey ID traceability

### For Journey Files (`artk-e2e/journeys/**/*.md`)
- Require valid YAML frontmatter
- Require id, title, tier, status, actor
- Implemented status requires tests[] links
- Use two-layer style: criteria + steps

### For Modules (`artk-e2e/src/modules/**/*.ts`)
- Export factory functions
- Use Page Object pattern
- No hardcoded URLs
- Document public methods
```

### Benefits of this structure:

1. **Clear sections** - Easy to find ARTK rules
2. **Path hints in headers** - Human-readable context
3. **Single source of truth** - No file hunting
4. **Works immediately** - No setup required

---

## What About Path-Scoped Rules?

The `applyTo` feature is nice in theory, but:
- Copilot is smart enough to understand "For Test Files (pattern)" headers
- The path hint gives Copilot context about when rules apply
- In practice, Copilot uses the whole file as context anyway

**The "path-scoped" benefit is marginal compared to the "requires config" cost.**

---

## Implementation Plan

1. **Update `/init-playbook` prompt:**
   - Remove Step 7B and 7C (separate instruction files)
   - Expand Step 7A to include all ARTK sections
   - Add clear section headers with path hints

2. **Single file structure:**
   ```markdown
   # Copilot Instructions

   ## Project Overview
   [From existing content if any]

   ## ARTK E2E Testing Framework

   ### General Rules
   - Always follow <ARTK_ROOT>/docs/PLAYBOOK.md
   - No hardcoded URLs - use config loader
   - No secrets in code

   ### Test Files (<ARTK_ROOT>/**/*.ts)
   [Test-specific rules]

   ### Journey Files (<ARTK_ROOT>/journeys/**/*.md)
   [Journey-specific rules]

   ### Modules (<ARTK_ROOT>/src/modules/**/*.ts)
   [Module-specific rules]
   ```

3. **Keep it focused:**
   - ~50-100 lines for ARTK section
   - Most important rules only
   - Link to PLAYBOOK.md for details

---

## Conclusion

**YES, consolidate into single `.github/copilot-instructions.md` file.**

The path-scoped instruction files (`.github/instructions/*.md`) are a nice feature but:
- Require explicit VS Code configuration
- Most users won't enable them
- ARTK would be unreliable without them

A well-organized single file with section headers achieves 90% of the benefit with 100% reliability.
