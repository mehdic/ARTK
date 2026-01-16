# AutoGen CLI Integration into journey-implement

**Date:** 2026-01-16
**Topic:** Best approach to integrate `@artk/core-autogen` CLI into the journey-implement prompt

---

## Problem Statement

The current `journey-implement.md` prompt (Step 9.5) shows the **programmatic API** for test generation:

```typescript
import { generateJourneyTests } from '@artk/core-autogen';
const result = await generateJourneyTests({ ... });
```

This is problematic because:
1. A Copilot/Claude agent can't directly "import" and run TypeScript
2. It would need to create a script file, compile it, run it
3. Much more complex than a simple CLI command

## Available Tools

### CLI (preferred for agents)
```bash
artk-autogen generate <journey-files...> [options]

Options:
  -o, --output <dir>     Output directory (default: ./tests/generated)
  -m, --modules          Also generate module files
  -c, --config <file>    Path to autogen config file
  --dry-run              Preview without writing
  -q, --quiet            Suppress output except errors
```

### Programmatic API (for scripts/automation)
```typescript
import { generateJourneyTests } from '@artk/core-autogen';
```

## Installation Context

After bootstrap, the autogen package is vendored at:
```
artk-e2e/
├── vendor/
│   ├── artk-core/           # @artk/core
│   └── artk-core-autogen/   # @artk/core-autogen
└── package.json             # Links: "@artk/core-autogen": "file:./vendor/artk-core-autogen"
```

After `npm install` in `artk-e2e/`, the binary is available at:
- `artk-e2e/node_modules/.bin/artk-autogen`

## CLI Invocation Options

### Option A: npx from artk-e2e directory (RECOMMENDED)
```bash
cd artk-e2e && npx artk-autogen generate ../journeys/clarified/JRN-0001-*.md -o tests/smoke/ -m
```

**Pros:** Clean, uses npm's binary resolution
**Cons:** Requires `cd` first

### Option B: Direct node invocation (FALLBACK)
```bash
node artk-e2e/node_modules/.bin/artk-autogen generate journeys/clarified/JRN-0001.md -o artk-e2e/tests/smoke/ -m
```

**Pros:** Works from repo root
**Cons:** Longer command, path-dependent

### Option C: npm script (BEST UX)
Add to `artk-e2e/package.json`:
```json
"scripts": {
  "autogen": "artk-autogen generate",
  "autogen:journey": "artk-autogen generate -m"
}
```

Then invoke:
```bash
npm run --prefix artk-e2e autogen:journey -- ../journeys/clarified/JRN-0001.md -o tests/smoke/
```

**Pros:** Consistent, documented, works from repo root
**Cons:** Requires npm script setup

## Decision: CLI as Primary, Manual as Fallback

### Algorithm Flow

```
Step 9.5: Attempt AutoGen CLI
    │
    ├── Is Journey clarified with machine hints?
    │   ├── YES → Run: npx artk-autogen generate <journey> -o <output> -m
    │   │         │
    │   │         ├── SUCCESS (no blocked steps)
    │   │         │   └── → Review generated code → Step 10.5 (validation)
    │   │         │
    │   │         └── PARTIAL (has blocked steps)
    │   │             ├── Try: Add machine hints → Re-run AutoGen
    │   │             └── OR: Fall back to Step 10 (manual) for blocked parts
    │   │
    │   └── NO (not clarified)
    │       └── → Step 10 (manual implementation)
    │
Step 10: Manual Implementation (fallback)
    - Only for blocked steps or complex cases AutoGen can't handle
    - Keep existing code examples as reference
```

### When to Use AutoGen CLI
1. Journey is `status: clarified`
2. Journey has machine hints for key controls
3. Standard CRUD/navigation flows
4. Selectors follow Playwright best practices (role/label/testid)

### When to Fall Back to Manual
1. AutoGen reports blocked steps it can't map
2. Complex async flows needing custom polling
3. Multi-actor coordination (admin + user)
4. Domain-specific assertions not in glossary
5. External integrations (downloads, new tabs, iframes)

## Implementation Changes to journey-implement.md

### 1. Rewrite Step 9.5 - AutoGen CLI (Primary)

**Current:** Shows TypeScript programmatic API
**New:** Shows CLI command as primary approach

```markdown
## Step 9.5 — Generate Tests with AutoGen CLI (Primary Approach)

**PREFERRED: Use the `artk-autogen` CLI for deterministic test generation.**

From the `artk-e2e/` directory:
\`\`\`bash
npx artk-autogen generate ../journeys/clarified/JRN-0001-user-login.md \
  -o tests/smoke/ \
  -m
\`\`\`

**CLI Options:**
| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory for generated tests |
| `-m, --modules` | Also generate feature module files |
| `--dry-run` | Preview what would be generated |
| `-c, --config <file>` | Custom autogen config |

**Example output:**
\`\`\`
Found 1 journey file(s)
Generated: tests/smoke/jrn-0001__user-login.spec.ts
Generated: tests/smoke/modules/dashboard.page.ts

Summary:
  Tests: 1
  Modules: 1
  Errors: 0
  Warnings: 0
\`\`\`
```

### 2. Add Step 9.6 - Handle AutoGen Results

```markdown
## Step 9.6 — Review AutoGen Output and Handle Blocked Steps

After running AutoGen, review the output:

### If AutoGen succeeds with no errors:
1. Review generated test code for correctness
2. Check selector strategies match Journey intent
3. Verify acceptance criteria are mapped to assertions
4. Proceed to Step 10.5 (Pre-Compilation Validation)

### If AutoGen reports blocked steps:

**Option A: Add machine hints to Journey (preferred)**
Edit the Journey to add explicit locator hints:
\`\`\`markdown
3. Click the submit button `(role=button, name=Submit Order)`
4. Verify the confirmation appears `(testid=order-confirmation)`
\`\`\`

Then re-run AutoGen:
\`\`\`bash
npx artk-autogen generate ../journeys/clarified/JRN-0001.md -o tests/smoke/ -m
\`\`\`

**Option B: Manual implementation for blocked steps**
If machine hints can't resolve the issue:
1. Use AutoGen output as a starting point
2. Manually implement blocked steps using Step 10 patterns
3. Preserve AutoGen structure and tagging
```

### 3. Reframe Step 10 - Manual Implementation (Fallback)

Change heading from:
```markdown
## Step 10 — Write the test(s)
```

To:
```markdown
## Step 10 — Manual Test Implementation (Fallback)

**Use this step when:**
- AutoGen cannot map certain steps (blocked)
- Complex async flows need custom polling logic
- Multi-actor coordination requires custom setup
- Domain-specific assertions not covered by AutoGen

**If AutoGen succeeded, skip to Step 10.5.**
```

### 4. Add backlog/index regeneration script reference

In Step 15 (Finalize Journey), add explicit script reference:
```markdown
- Regenerate backlog/index:
  - run `<ARTK_ROOT>/tools/journeys/generate.js`
  - or: `npm run --prefix <ARTK_ROOT> journeys:generate`
```

## Two Generate Scripts Clarification

| Script | Purpose | When to use |
|--------|---------|-------------|
| `artk-autogen generate` | Generate Playwright TEST FILES from Journey | Step 9.5 - test generation |
| `tools/journeys/generate.js` | Generate BACKLOG.md + index.json | Step 15 - after implementation finalized |

## Benefits of This Approach

1. **Agent-friendly**: CLI commands are natural for Copilot/Claude agents
2. **Fail-fast**: AutoGen reports blocked steps immediately
3. **Iterative**: Machine hints can be added incrementally
4. **Backward compatible**: Manual implementation still fully documented
5. **Deterministic**: Same Journey input → same test output
6. **Auditable**: CLI output shows exactly what was generated

## Testing the Integration

1. Create a clarified Journey with machine hints
2. Run `npx artk-autogen generate <journey> -o tests/ -m`
3. Verify generated test compiles
4. Run `/journey-validate` on generated tests
5. Run `/journey-verify` to execute tests

## Conclusion

The CLI approach is superior for agent-driven workflows because:
- Single command execution
- Visible output and error reporting
- No intermediate script creation needed
- Natural integration with bash-based workflows

Keep programmatic API documentation for advanced users who want to integrate into their own tooling.
