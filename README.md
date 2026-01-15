# Automatic Regression Testing Kit (ARTK)

ARTK is a standardized kit for building and maintaining automated regression testing suites using Playwright. It works through **GitHub Copilot slash commands** that guide you from discovery to implementation.

## Quick Start

**Unix/macOS/Linux:**
```bash
# 1. Install ARTK to your project
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/bootstrap.sh .

# 2. Open VS Code with GitHub Copilot
# 3. In Copilot Chat, run:
/artk.init-playbook
```

**Windows (PowerShell):**
```powershell
# 1. Install ARTK to your project
C:\Users\...\ARTK\scripts\bootstrap.ps1 .

# 2. Open VS Code with GitHub Copilot
# 3. In Copilot Chat, run:
/artk.init-playbook
```

## Workflow (Prompts Only)

All work is done through Copilot slash commands. No CLI required.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARTK Workflow                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SETUP (one command does everything)                                    │
│  ─────                                                                  │
│  /artk.init-playbook     Bootstrap + Playbook + Journey System          │
│                          (use journeySystem=false to skip backlog)      │
│                                                                         │
│  DISCOVERY                                                              │
│  ─────────                                                              │
│  /artk.discover-foundation   Analyze app + build Playwright harness     │
│  /artk.journey-propose       Auto-propose Journeys from discovery       │
│                                                                         │
│  TESTABILITY (recommended before implementation)                        │
│  ─────────────────────────────────────────────                          │
│  /artk.testid-audit        Audit selectors + add stable test hooks       │
│                                                                         │
│  JOURNEY LIFECYCLE                                                      │
│  ─────────────────                                                      │
│  /artk.journey-define    Create Journey (proposed → defined)            │
│  /artk.journey-clarify   Add machine hints (defined → clarified)        │
│  /artk.journey-implement Generate Playwright tests (→ implemented)      │
│  /artk.journey-validate  Static validation gate                         │
│  /artk.journey-verify    Run tests + auto-heal failures                 │
│                                                                         │
│  MAINTENANCE (coming soon)                                              │
│  ─────────────────────────                                              │
│  /artk.journey-maintain  Quarantine flaky, deprecate obsolete           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Installation

**Unix/macOS/Linux:**
```bash
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/bootstrap.sh /path/to/your-project
```

**Windows (PowerShell):**
```powershell
C:\Users\...\ARTK\scripts\bootstrap.ps1 C:\path\to\your-project
```

**What gets installed:**

- `artk-e2e/` - E2E workspace (Playwright config, tests, journeys)
- `artk-e2e/vendor/artk-core/` - @artk/core library (auth, config, fixtures)
- `.github/prompts/` - Copilot slash commands (all `/artk.*` commands)
- `.artk/context.json` - ARTK context metadata

VS Code prompt UX: ARTK prompt files include `handoffs` so Copilot can show clickable next commands, and the bootstrap script adds `chat.promptFilesRecommendations` to `.vscode/settings.json` to surface `/artk.*` commands as recommended actions at chat start.

## Browser Selection

Bootstrap detects available browsers and writes the chosen channel and strategy to `artk-e2e/artk.config.yml`:

```yaml
browsers:
  enabled:
    - chromium
  channel: bundled
  strategy: auto
```

Strategies: `auto`, `prefer-bundled`, `prefer-system`, `bundled-only`, `system-only`.
Metadata is recorded in `.artk/context.json`, and generated Playwright configs validate the selected channel at startup.

## Copilot Slash Commands

### Setup Command

- `/artk.init-playbook` - Bootstrap ARTK + Playbook + Journey System (all-in-one)

**Note:** Use `journeySystem=false` to skip BACKLOG.md automation if not needed.

### Discovery Commands

- `/artk.discover-foundation` - Analyze app routes, auth, testability + build harness
- `/artk.journey-propose` - Auto-propose Journeys from discovery results

### Testability Command

- `/artk.testid-audit` - Audit brittle selectors and recommend (or apply) stable hooks

### Journey Lifecycle Commands

- `/artk.journey-define` - Create a new Journey file with frontmatter
- `/artk.journey-clarify` - Add machine hints for deterministic execution
- `/artk.journey-implement` - Generate Playwright tests from Journey
- `/artk.journey-validate` - Static validation (schema, tags, lint)
- `/artk.journey-verify` - Run tests, collect evidence, auto-heal failures

### Maintenance Command (Coming Soon)

- `/artk.journey-maintain` - Quarantine flaky tests, deprecate obsolete Journeys

## Typical Usage Flow

```bash
# 1. Install ARTK
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/bootstrap.sh .

# 2. In VS Code Copilot Chat:
/artk.init-playbook             # Bootstrap project + guardrails
/artk.discover-foundation       # Analyze app + create harness
/artk.journey-propose           # Get suggested Journeys
/artk.testid-audit mode=report  # Audit selectors and plan stable test hooks

# 3. For each Journey:
/artk.journey-define id=JRN-0001 title="User Login"
/artk.journey-clarify id=JRN-0001
/artk.journey-implement id=JRN-0001
/artk.journey-validate id=JRN-0001
/artk.journey-verify id=JRN-0001
```

## Journey File Format

Journeys are markdown files with YAML frontmatter:

```markdown
---
id: JRN-0001
title: User Login
status: clarified
tier: smoke
actor: registered_user
scope: authentication
modules:
  foundation:
    - auth/login-page
  features: []
completion:
  - type: url
    value: /dashboard
---

# User Login Journey

## Context
A registered user authenticates to access the dashboard.

## Acceptance Criteria
- [ ] User can enter email and password
- [ ] Login redirects to dashboard

## Steps

### Step 1: Navigate to Login
Navigate to the login page.

**Machine Hints:**
- action: goto
- url: /login
```

## Journey Lifecycle

```text
proposed → defined → clarified → implemented
                                      ↓
                              quarantined (flaky)
                                      ↓
                              deprecated (obsolete)
```


- `proposed` - Initial idea, minimal structure
- `defined` - Has frontmatter + acceptance criteria
- `clarified` - Has machine hints for each step
- `implemented` - Has linked tests, validated, verified
- `quarantined` - Requires `owner`, `statusReason`, `links.issues[]`
- `deprecated` - Requires `statusReason`

## Documentation

- `docs/ARTK_Master_Launch_Document_v0.7.md` - Full specification
- `docs/ARTK_Journey_Lifecycle_v0.1.md` - Journey status lifecycle
- `docs/ARTK_Module_Architecture.md` - ESM/CommonJS support and module system decisions
- `docs/ARTK_Core_v1_Specification.md` - @artk/core library specification
- `docs/TESTID_AUDIT_DISCOVERY_GUIDANCE.md` - When to re-run discovery after testid audits

## Repository Structure

```text
ARTK/
├── scripts/
│   └── bootstrap.sh           # Main installer
├── prompts/                    # Copilot slash commands
│   ├── artk.init-playbook.md       # Setup (includes Journey System)
│   ├── artk.discover-foundation.md
│   ├── artk.journey-propose.md
│   ├── artk.journey-define.md
│   ├── artk.journey-clarify.md
│   ├── artk.journey-implement.md
│   ├── artk.journey-validate.md
│   ├── artk.journey-verify.md
│   └── artk.testid-audit.md
├── core/typescript/
│   ├── src/                    # @artk/core source
│   └── autogen/                # @artk/core-autogen source
└── docs/                       # Specifications
```
