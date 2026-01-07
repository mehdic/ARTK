# ARTK Init Prompt Merger Analysis

**Date:** 2026-01-03
**Topic:** Should we merge `/artk.init-playbook` and `/artk.journey-system` into one?

---

## Current State

### `/artk.init-playbook` (289 lines)
1. Repo scan - detect package manager, frameworks, existing E2E
2. ARTK placement - decide where to put artk-e2e/
3. Scaffold workspace - create directory structure
4. Copy ARTK Core - from `.artk/core/`
5. Generate `artk.config.yml` - environments, auth, selectors
6. Generate `package.json` - with @artk/core dependency
7. Create `context.json` - store project metadata
8. Generate `PLAYBOOK.md` - governance rules
9. Generate Copilot instructions - `.github/instructions/*.md`
10. Install dependencies - npm install, playwright install

### `/artk.journey-system` (269 lines)
1. Locate ARTK_ROOT - find where ARTK was installed
2. Detect existing Journey Instance - check journeys/ folder
3. Install/upgrade ARTK Core Journeys - copy journey schema/templates
4. Create `journeys.config.yml` - ID scheme, layout, tiers
5. Create `journeys/README.md` - using Core template
6. Create wrapper scripts - `tools/journeys/generate.js`, `validate.js`
7. Generate `BACKLOG.md + index.json` - or stub them

---

## Comparison

| Aspect | init-playbook | journey-system |
|--------|---------------|----------------|
| **Focus** | E2E testing infrastructure | Journey management |
| **Core installed** | `.artk/core/` (fixtures, config) | Journey schema/templates |
| **Config created** | `artk.config.yml` | `journeys.config.yml` |
| **Outputs** | PLAYBOOK.md, package.json | BACKLOG.md, index.json |
| **Dependencies** | Playwright, typescript | ajv, yaml, fast-glob |

---

## Arguments FOR Merging

1. **Simpler workflow** - One command instead of two
2. **Less confusion** - Users don't wonder "which comes first?"
3. **Complete setup** - Everything installed at once
4. **DRY** - Both scan the repo, both look for ARTK_ROOT
5. **No intermediate broken states** - Can't have partial setup

## Arguments AGAINST Merging

1. **Separation of concerns** - E2E infra vs Journey management are different
2. **Optional features** - Some users don't want BACKLOG.md automation
3. **Prompt size** - Combined would be ~500+ lines
4. **Maintenance** - Harder to update one part without affecting other

---

## Recommendation: MERGE with opt-out flag

### New command: `/artk.init`

```yaml
---
mode: agent
description: "Bootstrap ARTK - complete setup including workspace, config, and journey system"
arguments:
  - journeySystem: true|false  # Default: true. Set false to skip BACKLOG automation
  - mode: quick|standard|deep
  - root: path
  - lang: ts|js
---
```

### What it does (combined):

**Phase 1: Workspace Setup**
1. Repo scan
2. ARTK placement
3. Scaffold directory structure
4. Copy ARTK Core
5. Generate `artk.config.yml`
6. Generate `package.json`
7. Generate PLAYBOOK.md
8. Generate Copilot instructions

**Phase 2: Journey System (if journeySystem=true)**
9. Create `journeys.config.yml`
10. Create wrapper scripts (generate.js, validate.js)
11. Generate/stub BACKLOG.md + index.json

**Phase 3: Finalize**
12. Install dependencies
13. Print next steps

### Simplified Workflow

**Before (confusing):**
```
/artk.init-playbook        # Setup
/artk.journey-system       # Optional? Mandatory? When?
/artk.discover-foundation
/artk.journey-propose
/artk.journey-define
/artk.journey-clarify
/artk.journey-implement
/artk.journey-validate
/artk.journey-verify
```

**After (clear):**
```
/artk.init                 # Does everything
/artk.discover-foundation  # Analyze app
/artk.journey-define       # Create journey
/artk.journey-clarify      # Add hints
/artk.journey-implement    # Generate tests
```

### Benefits

1. **8 prompts → 6 prompts** (remove init-playbook, journey-system, add init)
2. **Clear entry point** - Just run `/artk.init`
3. **Opt-out simplicity** - `journeySystem=false` for minimal setup
4. **Single source of truth** - One prompt to maintain
5. **Better UX** - "Run /artk.init" is easier to remember

---

## Implementation Plan

1. Create new `prompts/artk.init.md` (~450 lines)
2. Combine logic from both prompts
3. Add `journeySystem` parameter (default: true)
4. Update README workflow diagram
5. Keep old prompts for backwards compatibility (deprecated)
6. Update bootstrap scripts to rename files

---

## Conclusion

**YES, merge them.** The current two-step setup is confusing and adds cognitive load. Most users want the complete setup anyway. Those who don't can use `journeySystem=false`.

The merger simplifies:
- Documentation (one entry point)
- User experience (one command)
- Maintenance (one file to update)
