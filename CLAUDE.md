# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARTK (Automatic Regression Testing Kit) is a standardized kit that plugs into GitHub Copilot to help teams build and maintain automated regression testing suites using Playwright. It is designed as:

- **ARTK Core** (reusable, versioned): schemas, templates, generators, validators
- **ARTK Instance** (per-repo): configuration, generated outputs, Copilot instructions

## Repository Structure

```
docs/                          # Master specifications and lifecycle docs
prompts/                       # GitHub Copilot prompt files (.prompt.md)
core/
  artk-core-journeys/          # Core Journey system (schema, templates, tools)
    journeys/
      schema/                  # Journey frontmatter schema
      templates/               # Journey markdown templates
      tools/node/              # generate.js and validate.js scripts
```

## Key Concepts

### Journey
A durable, text-based contract for a regression scenario with:
- YAML frontmatter (id, status, tier, actor, scope, tests[])
- Acceptance criteria and procedural steps
- Module dependencies (foundation + feature)

### Journey Statuses
`proposed` → `defined` → `clarified` → `implemented` (+ `quarantined`, `deprecated`)

### Journey Tiers
`smoke` | `release` | `regression`

### Status Requirements
- `implemented`: requires non-empty `tests[]`
- `quarantined`: requires `owner`, `statusReason`, `links.issues[]`
- `deprecated`: requires `statusReason`

## Slash Command Workflow

The prompts define this command pipeline:

1. `/init` - Bootstrap ARTK structure in a target repo
2. `/playbook` - Generate permanent guardrails (Copilot instructions + docs)
3. `/journey-system` - Install/upgrade Journey system from Core
4. `/foundation-build` - Create Playwright harness baseline and foundation modules
5. `/discover` - Analyze app routes, features, auth, testability
6. `/journey-propose` - Auto-propose Journeys from discovery
7. `/journey-define` - Create/promote Journey to canonical structure
8. `/journey-clarify` - Add deterministic execution detail
9. `/journey-implement` - Generate Playwright tests
10. `/journey-validate` - Static validation gate
11. `/journey-verify` - Runtime verification gate
12. `/journey-maintain` - Quarantine flaky tests, deprecate obsolete Journeys

## Core Tools

### generate.js
Generates `BACKLOG.md` and `index.json` from Journey markdown files.
```bash
node core/artk-core-journeys/artk-core-journeys/journeys/tools/node/generate.js --artkRoot <path>
```

Dependencies: `ajv`, `yaml`, `fast-glob`, `minimist`

### validate.js
Validates Journey files against the frontmatter schema.

## Architecture Principles

- Journeys are the source of truth; tests are linked execution artifacts
- Modular architecture: Page Objects → Flows → Tests
- Foundation modules (auth, config, navigation) built first
- Feature modules created as Journeys demand
- Backlog is generated, never edited by hand
- No hardcoded URLs; use config loader
- No brittle waits; prefer assertions and auto-wait

## Example Project (ITSS)

The `ignore/` folder contains the ITSS project (`req-apps-it-service-shop`) as a reference for building and testing ARTK Core. This folder is gitignored and never committed.

- **Location:** `ignore/req-apps-it-service-shop/`
- **Purpose:** Real-world target project to validate ARTK implementation
- **Usage:** Research auth patterns, UI structure, and test against this app

When implementing ARTK features, reference this project to understand:
- Authentication flow (OIDC with MFA)
- User roles and permissions
- Page structure and selectors
- API endpoints

## Research Documents

When the user asks to "ultrathink" about a topic, create a research document:

1. **Location:** `research/YYYY-MM-DD_<topic_slug>.md`
2. **Format:**
   ```markdown
   # <Topic Title>

   **Date:** YYYY-MM-DD
   **Topic:** Brief description

   ---

   <Deep analysis content>
   ```
3. **Purpose:** Capture architectural decisions, analysis, and strategic thinking for future reference
4. **Naming:** Use lowercase with underscores for the topic slug (e.g., `generalization_analysis`, `auth_patterns`, `cli_design`)

## Active Technologies
- TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.40.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation) (001-artk-core-v1)
- File system (storage states in `.auth-states/`, config in `artk.config.yml`) (001-artk-core-v1)

## Recent Changes
- 001-artk-core-v1: Added TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.40.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation)
