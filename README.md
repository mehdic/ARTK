# Automatic Regression Testing Kit (ARTK) — Repo Starter

This repository contains the **current ARTK design docs** and the **Copilot prompt commands** we authored so far,
plus the first **ARTK Core (Journeys) v0.1.0** payload (zip + extracted).

## What’s inside

- `docs/`
  - `ARTK_Master_Launch_Document_v0.6.md` — the master merged spec (source of truth)
  - `ARTK_Journey_Lifecycle_v0.1.md` — full Journey status lifecycle + transitions

- `prompts/`
  - Command prompts for Copilot (init/playbook/journey-system/discover/journey-* …)

- `core/`
  - `ARTK_Core_Journeys_v0.1.0.zip` — versioned core payload
  - `artk-core-journeys/` — extracted copy for inspection/editing

## Installation

Install ARTK to any Playwright project:

```bash
# Run from your target project directory:
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh .

# Or specify a path:
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh /path/to/your-project
```

**What gets installed:**
- `.github/prompts/` - Copilot slash commands
- `.artk/core/` - @artk/core library
- `.artk/autogen/` - AutoGen CLI for test generation

**After installation:**
1. Open VS Code → Copilot Chat → `/artk.init`
2. Generate tests: `node .artk/autogen/dist/cli/index.js generate "journeys/*.md"`

## Getting Started

1. Read `docs/ARTK_Master_Launch_Document_v0.6.md`
2. Read `docs/ARTK_Journey_Lifecycle_v0.1.md`
3. Install ARTK to your project (see above)
4. Run `/artk.init` in Copilot Chat
