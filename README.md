# Automatic Regression Testing Kit (ARTK)

ARTK is a standardized kit for building and maintaining automated regression testing suites using Playwright. It transforms human-readable **Journey** specifications into executable Playwright tests.

## Quick Start

```bash
# 1. Install ARTK to your project
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh /path/to/your-project

# 2. Initialize ARTK (in VS Code Copilot Chat)
/artk.init

# 3. Create a Journey file (journeys/login.md)
# 4. Generate tests
node .artk/autogen/dist/cli/index.js generate "journeys/*.md" -o e2e/tests/
```

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARTK Workflow                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. INSTALL          2. DISCOVER           3. DEFINE                   │
│  ─────────           ──────────            ────────                    │
│  install-prompts.sh  /artk.discover        /artk.journey-define        │
│       ↓                   ↓                      ↓                     │
│  .artk/              .artk/context.json    journeys/*.md               │
│  .github/prompts/                          (proposed → defined)        │
│                                                                         │
│  4. CLARIFY          5. GENERATE           6. VALIDATE                 │
│  ─────────           ──────────            ──────────                  │
│  /artk.journey-      artk-autogen          artk-autogen                │
│   clarify            generate              validate                    │
│       ↓                   ↓                      ↓                     │
│  journeys/*.md       e2e/tests/*.spec.ts   Schema + lint checks       │
│  (defined → clarified)                                                  │
│                                                                         │
│  7. VERIFY           8. IMPLEMENT          9. MAINTAIN                 │
│  ────────            ──────────            ──────────                  │
│  artk-autogen        Run tests +           /artk.journey-maintain      │
│  verify              iterate                    ↓                      │
│       ↓                   ↓                Quarantine flaky,           │
│  Tests pass?         Production-ready      deprecate obsolete          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh .
```

**What gets installed:**

| Location | Contents |
|----------|----------|
| `.github/prompts/` | Copilot slash commands (`/artk.init`, `/artk.journey-define`, etc.) |
| `.artk/core/` | @artk/core library (auth, config, fixtures) |
| `.artk/autogen/` | AutoGen CLI (generate, validate, verify) |

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
    options:
      timeout: 5000
---

# User Login Journey

## Context
A registered user authenticates to access the dashboard.

## Steps

### Step 1: Navigate to Login
Navigate to the login page.

**Machine Hints:**
- action: goto
- url: /login

### Step 2: Enter Credentials
Enter email and password.

**Machine Hints:**
- action: fill
- selector: [data-testid="email-input"]
- value: {{user.email}}
```

## AutoGen CLI Commands

```bash
# Generate Playwright tests from Journey files
node .artk/autogen/dist/cli/index.js generate "journeys/*.md" -o e2e/tests/ -m

# Validate Journey frontmatter (static check)
node .artk/autogen/dist/cli/index.js validate "journeys/*.md"

# Verify generated tests run successfully
node .artk/autogen/dist/cli/index.js verify "journeys/*.md" --heal
```

| Command | Purpose | Output |
|---------|---------|--------|
| `generate` | Convert Journeys → Playwright tests | `.spec.ts` + page objects |
| `validate` | Check Journey schema is valid | Pass/fail + warnings |
| `verify` | Run tests, optionally self-heal | Test results + fixes |

## Copilot Slash Commands

| Command | Purpose |
|---------|---------|
| `/artk.init` | Bootstrap ARTK in your project |
| `/artk.discover` | Analyze app for testable features |
| `/artk.journey-define` | Create a new Journey file |
| `/artk.journey-clarify` | Add machine hints to a Journey |
| `/artk.journey-implement` | Generate tests (via Copilot) |
| `/artk.journey-validate` | Validate Journey schema |
| `/artk.journey-verify` | Run and verify tests |
| `/artk.journey-maintain` | Quarantine/deprecate Journeys |

## Journey Lifecycle

```
proposed → defined → clarified → implemented
                                      ↓
                              quarantined (flaky)
                                      ↓
                              deprecated (obsolete)
```

| Status | Meaning |
|--------|---------|
| `proposed` | Initial idea, not yet structured |
| `defined` | Has frontmatter + acceptance criteria |
| `clarified` | Has machine hints for each step |
| `implemented` | Has linked test files (`tests[]` populated) |
| `quarantined` | Flaky, needs investigation |
| `deprecated` | No longer relevant |

## Repository Structure

```
ARTK/
├── scripts/
│   └── install-prompts.sh     # Main installer
├── prompts/                    # Copilot slash commands
│   └── artk.*.md
├── core/typescript/
│   ├── src/                    # @artk/core source
│   ├── autogen/                # @artk/core-autogen source
│   └── scripts/
│       └── install-to-project.sh
├── demo/                       # Example project
│   ├── journeys/
│   └── e2e/tests/
└── docs/                       # Specifications
```

## Documentation

- `docs/ARTK_Master_Launch_Document_v0.6.md` - Full specification
- `docs/ARTK_Journey_Lifecycle_v0.1.md` - Journey status lifecycle
