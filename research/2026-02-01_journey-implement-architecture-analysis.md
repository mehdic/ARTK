# Journey-Implement Architecture Analysis

**Date:** 2026-02-01
**Status:** Current understanding of the system

---

## Executive Summary

The ARTK journey-implement system is a **hybrid architecture** where:
- **CLI** handles validation, orchestration, and session management
- **AutoGen** handles deterministic pattern-based code generation (40-60% of steps)
- **LLM** handles complex semantic understanding and blocked steps (40-60% of steps)
- **LLKB** is designed to learn patterns over time but is currently incomplete

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARTK JOURNEY-IMPLEMENT SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  CLI (artk journey implement)                                       │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  ✓ Validates frontmatter (Zod schemas - id, status, title)          │    │
│  │  ✓ Finds journey files across folders                               │    │
│  │  ✓ Checks LLKB exists and is configured                             │    │
│  │  ✓ Orchestrates command execution with timeout                      │    │
│  │  ✓ Tracks session state                                             │    │
│  │  ✗ Does NOT understand journey content                              │    │
│  │  ✗ Does NOT generate test code                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  AutoGen (deterministic, regex-based)                               │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  ✓ Parses journey markdown (YAML + steps)                           │    │
│  │  ✓ Normalizes text via glossary (press → click)                     │    │
│  │  ✓ Matches 65+ regex patterns                                       │    │
│  │  ✓ Converts to IR (Intermediate Representation)                     │    │
│  │  ✓ Generates Playwright code via EJS templates                      │    │
│  │  ✗ Can only handle patterns it knows (~40-60% of real steps)        │    │
│  │  ✗ Complex assertions → { type: 'blocked' } → throw Error           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                     ┌──────────────┴──────────────┐                         │
│                     ▼                              ▼                        │
│          ┌─────────────────────┐      ┌─────────────────────────────────┐   │
│          │  MATCHED (40-60%)   │      │  BLOCKED (40-60%)               │   │
│          │  ─────────────────  │      │  ───────────────────────────── │   │
│          │  Simple patterns:   │      │  Complex steps like:            │   │
│          │  - "Click Submit"   │      │  - "Verify order summary shows  │   │
│          │  - "Navigate to /"  │      │     correct items & total"      │   │
│          │  - "Fill email"     │      │  - Business domain logic        │   │
│          │                     │      │  - Multi-part assertions        │   │
│          │  → Playwright code  │      │  → throw Error('BLOCKED')       │   │
│          └─────────────────────┘      └────────────────┬────────────────┘   │
│                                                        │                    │
│                                                        ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  LLM (Copilot/Claude reading the prompt)                            │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  ✓ Understands semantic meaning of journey content                  │    │
│  │  ✓ Writes Playwright code for BLOCKED steps                         │    │
│  │  ✓ Knows what "correct order summary" means in context              │    │
│  │  ✓ Handles business domain logic                                    │    │
│  │  ✓ Fixes edge cases and complex assertions                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Division of Labor

| Task | Who Handles It | How |
|------|----------------|-----|
| Validate `id: JRN-0001` format | **CLI** | Zod regex |
| Validate `status: clarified` | **CLI** | Zod enum |
| Find journey file on disk | **CLI** | fs operations |
| Parse "Click Submit button" | **AutoGen** | Regex pattern |
| Parse "Fill email field" | **AutoGen** | Regex pattern |
| Parse "Verify order is correct" | **BLOCKED** | No pattern exists |
| Write code for blocked steps | **LLM** | Semantic understanding |
| Know what "correct" means | **LLM** | Domain knowledge |

---

## AutoGen Details

AutoGen is a **deterministic, rule-based code generator**:

### Pipeline
```
Journey Markdown → Parse YAML → Normalize via Glossary → Match Patterns → IR → Playwright Code
```

### Key Components
- **Glossary** (`glossary.ts`): Maps synonyms to canonical terms (press → click)
- **Patterns** (`patterns.ts`): 65+ regex patterns for step matching
- **IR Types** (`ir/types.ts`): Intermediate representation for code generation
- **Code Generator** (`generateTest.ts`): EJS templates for Playwright output

### What AutoGen Can Match
- Simple clicks: `"User clicks the 'Submit' button"`
- Navigation: `"Navigate to /login"`
- Form fills: `"Enter 'test@email.com' in email field"`
- Basic assertions: `"User should see 'Welcome'"`

### What AutoGen Cannot Match
- Complex assertions: `"Verify the order summary shows correct items"`
- Business logic: `"Ensure total price includes tax and shipping"`
- Multi-part conditions: `"User sees modal with name, email, and phone"`
- Domain-specific: `"Validate the invoice matches the quote"`

---

## Critical Flaws Identified

| Flaw | Severity | Description |
|------|----------|-------------|
| **LLKB CLI doesn't exist** | 🔴 CRITICAL | `artk llkb export` command not implemented - learning loop is broken |
| **40-60% blocked rate** | 🟡 HIGH | Most real acceptance criteria are too complex for regex |
| **No feedback loop** | 🟡 HIGH | When LLM fixes blocked steps, LLKB doesn't learn from it |
| **Cold start problem** | 🟡 HIGH | LLKB starts empty, needs 100+ journeys to be useful |
| **No telemetry** | 🟠 MEDIUM | Can't measure what percentage of steps are blocked |

---

## LLKB (Lessons Learned Knowledge Base)

### Designed Purpose
LLKB is meant to learn patterns over time:
1. Human fixes blocked step → writes Playwright code
2. System records successful pattern
3. Next time similar step appears → LLKB matches it
4. Confidence increases with more successes

### Current State
- Library exists in `core/typescript/llkb/` (~1,500 lines)
- Exported from `@artk/core/llkb`
- **BUT**: CLI commands (`artk llkb export`) are not implemented
- Learning loop is broken

### Required CLI Commands (Not Implemented)
```bash
artk llkb export --for-autogen --output artk-e2e/
artk llkb check-updates --tests-dir artk-e2e/tests/
artk llkb update-test --test artk-e2e/tests/login.spec.ts
artk llkb learn --type pattern --journey JRN-0001
artk llkb health
artk llkb stats
```

---

## Value Proposition

Even with 40-60% blocked rate, the system provides value:

1. **50% less LLM-generated code** - cheaper, faster
2. **50% more consistent output** - patterns are deterministic
3. **Clear separation of concerns** - mechanical vs intelligent work
4. **Gradual improvement** - LLKB learns over time (once implemented)

---

## Next Steps

1. Implement LLKB CLI commands
2. Add feedback loop from LLM fixes to LLKB
3. Add telemetry for blocked step analysis
4. Pre-seed LLKB with common patterns (cold start)
5. Document the hybrid nature of the system

---

## References

- `packages/cli/src/lib/workflows/` - CLI workflow implementation
- `core/typescript/autogen/` - AutoGen implementation
- `core/typescript/llkb/` - LLKB library (needs CLI)
- `prompts/artk.journey-implement.md` - LLM instructions
