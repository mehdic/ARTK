# Core + Prompts Hybrid Model Analysis

**Date:** 2024-12-29
**Topic:** How pre-built core and AI prompts work together in ARTK

---

## Clarifying the Vision

The user's intent is a **hybrid layered approach**:

```
┌─────────────────────────────────────────────────────────┐
│                    AI/Prompts Layer                     │
│  (Project-specific: journeys, feature modules, tests)   │
├─────────────────────────────────────────────────────────┤
│                    ARTK Core Layer                      │
│  (Reusable: harness, auth, fixtures, utilities)         │
└─────────────────────────────────────────────────────────┘
```

**This is MORE powerful than either approach alone:**
- Pure prompts = AI regenerates everything, inconsistent results
- Pure packages = No AI flexibility, everything manual
- **Core + Prompts = AI builds on solid foundation, consistent AND flexible**

---

## Current State Audit

### What EXISTS in Core

| Component | Status | Location |
|-----------|--------|----------|
| Journey schema | ✅ Complete | `core/artk-core-journeys/.../schema/` |
| Journey templates | ✅ Complete | `core/artk-core-journeys/.../templates/` |
| Backlog generator | ✅ Complete | `core/artk-core-journeys/.../tools/node/generate.js` |
| Schema validator | ✅ Complete | `core/artk-core-journeys/.../tools/node/validate.js` |

### What's MISSING in Core

| Component | Status | Purpose |
|-----------|--------|---------|
| Playwright harness | ❌ Missing | Base `playwright.config.ts`, project structure |
| Config loader | ❌ Missing | Environment handling, `artk.config.yml` parsing |
| Auth system | ❌ Missing | Providers (form, SSO, token), storage state management |
| Base fixtures | ❌ Missing | `test` export, `authenticatedPage`, `apiContext` |
| Selector utilities | ❌ Missing | Locator factory, testId helpers |
| Assertion helpers | ❌ Missing | Toast, table, form, loading assertions |
| Data harness | ❌ Missing | Run-ID namespacing, cleanup hooks, builders |
| Reporters | ❌ Missing | Custom reporters, artifact management |

### What EXISTS in Prompts

| Prompt | Status | Role |
|--------|--------|------|
| `/init` | ✅ Exists | Bootstrap ARTK structure |
| `/playbook` | ✅ Exists | Generate guardrails |
| `/journey-system` | ✅ Exists | Install journey system |
| `/foundation-build` | ✅ Exists | Create harness + foundation |
| `/discover` | ✅ Exists | Analyze target app |
| `/journey-propose` | ✅ Exists | Auto-propose journeys |
| `/journey-define` | ✅ Exists | Define journeys |
| `/journey-clarify` | ✅ Exists | Clarify journeys |
| `/journey-implement` | ✅ Exists | Generate tests |
| `/journey-validate` | ✅ Exists | Static validation |
| `/journey-verify` | ✅ Exists | Runtime verification |
| `/journey-maintain` | ✅ Exists | Maintenance |

---

## The Hybrid Model Explained

### How Core and Prompts Work Together

```
User runs /init on target project
         │
         ▼
┌─────────────────────────────────────────────┐
│ Prompt: /init                               │
│ - Scans target repo                         │
│ - Asks minimal questions                    │
│ - INSTALLS/COPIES ARTK Core                 │◄── Core provides foundation
│ - Generates artk.config.yml                 │
│ - Sets up .github/prompts/                  │
└─────────────────────────────────────────────┘
         │
         ▼
User runs /foundation-build
         │
         ▼
┌─────────────────────────────────────────────┐
│ Prompt: /foundation-build                   │
│ - USES core harness base                    │◄── Core provides playwright.config base
│ - CONFIGURES core auth provider             │◄── Core provides auth patterns
│ - ADAPTS fixtures to project                │◄── Core provides base fixtures
│ - Generates project-specific setup          │
└─────────────────────────────────────────────┘
         │
         ▼
User runs /journey-implement for JRN-0001
         │
         ▼
┌─────────────────────────────────────────────┐
│ Prompt: /journey-implement                  │
│ - Reads journey definition                  │
│ - IMPORTS from core fixtures                │◄── import { test } from '@artk/fixtures'
│ - USES core locator utilities               │◄── import { byTestId } from '@artk/locators'
│ - USES core assertions                      │◄── import { expectToast } from '@artk/assertions'
│ - GENERATES project-specific:               │
│   - Page objects (feature modules)          │◄── AI creates these
│   - Flows (business actions)                │◄── AI creates these
│   - Tests (journey implementation)          │◄── AI creates these
└─────────────────────────────────────────────┘
```

### What Each Layer Provides

**Core Layer (Pre-built, Deterministic):**
- The "how" of E2E testing mechanics
- Playwright configuration patterns
- Auth flow implementations
- Fixture machinery
- Utility functions
- **Cannot be wrong** - proven patterns

**Prompts Layer (AI-driven, Adaptive):**
- The "what" of each specific project
- Which journeys to create
- What pages/flows exist
- Business logic mapping
- Project-specific assertions
- **Adapts to context** - uses AI judgment

---

## Why This Hybrid is Powerful

### Without Core (Current State)
```
/foundation-build prompt says:
"Create auth harness with storage state..."

AI generates auth code from scratch
→ Might miss edge cases
→ Inconsistent across projects
→ No proven patterns
→ User must verify everything
```

### With Core (Target State)
```
/foundation-build prompt says:
"Configure the FormAuthProvider from @artk/auth..."

AI configures existing proven code
→ Auth patterns already battle-tested
→ Consistent across projects
→ AI just fills in project specifics
→ Less can go wrong
```

---

## Corrected Architecture

```
ARTK (This Repo)
├── core/
│   ├── journeys/           ✅ EXISTS
│   │   ├── schema/
│   │   ├── templates/
│   │   └── tools/
│   ├── harness/            ❌ TO BUILD
│   │   ├── playwright.config.base.ts
│   │   └── projects.ts
│   ├── config/             ❌ TO BUILD
│   │   ├── loader.ts
│   │   └── schema.ts
│   ├── auth/               ❌ TO BUILD
│   │   ├── providers/
│   │   │   ├── form.ts
│   │   │   ├── token.ts
│   │   │   └── sso.ts
│   │   └── storage-state.ts
│   ├── fixtures/           ❌ TO BUILD
│   │   ├── base.ts
│   │   ├── auth.ts
│   │   └── api.ts
│   ├── locators/           ❌ TO BUILD
│   │   └── factory.ts
│   ├── assertions/         ❌ TO BUILD
│   │   ├── toast.ts
│   │   ├── table.ts
│   │   └── form.ts
│   └── data/               ❌ TO BUILD
│       ├── namespace.ts
│       └── cleanup.ts
│
├── prompts/                ✅ EXISTS (need updates)
│   ├── init.prompt.md              → Should install core
│   ├── foundation-build.prompt.md  → Should configure core
│   ├── journey-implement.prompt.md → Should use core imports
│   └── ...
│
└── docs/                   ✅ EXISTS
```

---

## How Prompts Should Reference Core

### Current `/foundation-build` (Simplified)
```markdown
Create the Phase 7 Playwright harness baseline...
- env loader
- auth setup project
- navigation helpers
- selector utilities
```
*Problem: AI creates everything from scratch*

### Updated `/foundation-build` (With Core)
```markdown
Configure the ARTK foundation using core packages:

1. Import and configure `@artk/harness`:
   - Set baseURL from artk.config.yml
   - Configure tiers (smoke/release/regression)

2. Configure `@artk/auth`:
   - Select provider based on artk.config.yml auth.type
   - If form: configure login selectors
   - If token: configure token endpoint
   - Generate setup project using storageState pattern

3. Export fixtures from `@artk/fixtures`:
   - Create src/fixtures/index.ts that re-exports configured fixtures

4. Generate ONLY project-specific code:
   - Navigation helpers specific to this app's shell
   - Any custom assertions needed
```
*Solution: AI configures pre-built core, only creates project-specific parts*

---

## Implementation Plan (Revised)

### Phase 1: Complete the Core (Foundation)
1. `core/config/` - Config loader and schema
2. `core/harness/` - Base Playwright config
3. `core/fixtures/` - Base test fixtures

### Phase 2: Complete the Core (Auth)
1. `core/auth/providers/form.ts` - Form login
2. `core/auth/providers/token.ts` - Token injection
3. `core/auth/storage-state.ts` - State management

### Phase 3: Complete the Core (Utilities)
1. `core/locators/` - Selector factory
2. `core/assertions/` - Common assertions
3. `core/data/` - Namespacing and cleanup

### Phase 4: Update Prompts
1. Update `/init` to install/copy core
2. Update `/foundation-build` to configure core
3. Update `/journey-implement` to import from core

### Phase 5: Test on Real Project
1. Run full workflow on a target app
2. Validate AI + Core integration
3. Iterate on prompt clarity

---

## Key Insight

**The core doesn't replace prompts — it EMPOWERS them.**

- Core = The vocabulary and grammar
- Prompts = The conversation
- AI = The speaker who uses both

With a complete core, the AI prompts become:
- More reliable (using proven patterns)
- More consistent (same base across projects)
- More focused (AI handles business logic, not plumbing)
- Easier to validate (core is tested, AI output is smaller)

---

## Answer to "Is Current Core Complete?"

**No.** Current core is approximately **20% complete**:

| Category | Completeness |
|----------|--------------|
| Journey System | 100% ✅ |
| Playwright Harness | 0% ❌ |
| Auth System | 0% ❌ |
| Fixtures | 0% ❌ |
| Utilities | 0% ❌ |
| **Overall** | **~20%** |

The journey system is solid, but the Playwright infrastructure that tests actually need is missing entirely.

---

## Recommended Next Steps

1. **Build `core/config/`** - Everything else depends on config
2. **Build `core/harness/`** - Base Playwright setup
3. **Build `core/fixtures/`** - Base test fixture
4. **Build `core/auth/form.ts`** - Most common auth pattern
5. **Update `/foundation-build` prompt** - To use new core
6. **Test end-to-end** - On a real target project

This gives us a working hybrid system quickly, then we iterate.
