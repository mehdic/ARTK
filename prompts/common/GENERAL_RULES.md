# General Rules (Shared)

**MUST read and follow these rules before any file edits or code generation.**

## General Edit Rules
- Make small, targeted edits; avoid large multi-line replacements.
- After each file edit, immediately run `get_errors` and fix syntax issues before continuing.
- If a generator or formatter exists, prefer re-running it instead of manual bulk edits.
- After batch edits, run the most relevant compile/lint check available for the touched area.

## Code Quality Rules (MANDATORY for code generation)

### 1. No Duplicate Functions
- Each function MUST have exactly ONE definition across all files
- If a function is needed in multiple files, define it in ONE file and import from there
- Example: `getStorageStatePath` should be in `storage-state.ts` ONLY, imported by `login.ts`

### 2. ESM Import Paths
- When using dynamic imports for directories, ALWAYS include `/index`
- ✅ `await import('../../src/modules/foundation/navigation/index')`
- ❌ `await import('../../src/modules/foundation/navigation')`
- This prevents "ERR_MODULE_NOT_FOUND" errors in ESM context

### 3. Template Literal Syntax
- Use proper backticks for template literals
- ✅ `` `Hello ${name}` ``
- ❌ Missing backticks causing syntax errors

### 4. Import Path Consistency
- Use consistent import patterns throughout all generated files
- Either use path aliases (`@config/*`) OR relative paths, not mixed
- If using path aliases, ensure `tsconfig.json` has the alias configured FIRST

### 5. TypeScript Strictness
- Assume `noUnusedLocals` and `noUnusedParameters` are enabled
- Import only what you use; never speculatively import
- Prefix unused parameters with `_` (e.g., `_page`)

---

## Pre-Compilation Validation Checklist

**MUST run this checklist BEFORE running `tsc --noEmit` or any compilation.**

After generating/editing code files, perform these checks:

### Step V0: Duplicate Function Check
```
For each function you created:
1. Search the codebase for other definitions of the same function name
2. If found in multiple files → STOP and consolidate to ONE file
3. Update imports in other files to use the single source
```

### Step V1: ESM Import Path Check
```
For each dynamic import statement:
1. If importing a directory → ensure path ends with `/index`
2. ✅ await import('./modules/auth/index')
3. ❌ await import('./modules/auth')
```

### Step V2: Import Usage Check
```
For each file you created/modified:
1. List all imports at the top of the file
2. For each imported symbol, verify it is actually used in the file body
3. Remove any unused imports
4. For unused function parameters, prefix with `_`
```

### Step V3: Path Alias Check
```
If using path aliases (e.g., @config/*, @modules/*):
1. Verify tsconfig.json has the alias defined in "paths"
2. Verify baseUrl is set correctly
3. Ensure all files use the SAME pattern (don't mix aliases and relative paths)
```

### Step V4: Syntax Quick Check
```
For each new file:
1. Verify all template literals use backticks (`)
2. Verify all string interpolations are inside backticks
3. Verify no unclosed brackets, braces, or parentheses
```

**Only proceed to compilation after ALL checks pass.**

---

## Output File Standards

**All prompts MUST follow these standards when creating output files.**

### Folder Structure

| Folder | Purpose | Gitignored |
|--------|---------|------------|
| `docs/` | Human-readable documentation (PLAYBOOK, DISCOVERY, etc.) | No |
| `reports/` | Generated reports (human + machine readable) | Partial |
| `reports/discovery/` | Discovery phase JSON outputs | No |
| `reports/testid/` | TestID audit reports and fix plans | No |
| `reports/validation/` | Journey validation results | No |
| `reports/verification/` | Test run reports and traces | Yes |
| `journeys/` | Journey markdown files + generated index | No |
| `.artk/` | Internal state and metadata | Partial |

### File Naming Conventions

| Type | Location | Format | Example |
|------|----------|--------|---------|
| **Documentation** | `docs/` | `SCREAMING_CASE.md` | `DISCOVERY.md`, `PLAYBOOK.md` |
| **Human reports** | `reports/<category>/` | `kebab-case.md` | `reports/testid/audit-report.md` |
| **Machine reports** | `reports/<category>/` | `kebab-case.json` | `reports/testid/fix-plan.json` |
| **Per-entity reports** | `reports/<category>/` | `<entity-id>.md/.json` | `reports/validation/JRN-0001.md` |
| **Journey files** | `journeys/` | `JRN-####-slug.md` | `JRN-0001-user-login.md` |
| **Test files** | `tests/<tier>/` | `JRN-####__slug.spec.ts` | `JRN-0001__user-login.spec.ts` |
| **Module files** | `src/modules/` | `kebab-case.ts` | `auth/login.ts` |
| **Config files** | Root or `config/` | `kebab-case.ext` | `artk.config.yml` |

### Report Categories

When creating reports, use the correct category folder:

```
reports/
├── discovery/          # Routes, features, APIs, risk (JSON)
│   ├── routes.json
│   ├── features.json
│   ├── apis.json
│   ├── risk.json
│   └── summary.json
├── testid/             # TestID audit outputs
│   ├── audit-report.md     # Human-readable
│   └── fix-plan.json       # Machine-readable
├── validation/         # Journey validation results
│   ├── JRN-0001.md
│   └── JRN-0001.json
└── verification/       # Test execution outputs (gitignored)
    └── latest/
```

### Managed Content Markers

For updatable sections, use consistent markers:

```markdown
<!-- ARTK:BEGIN <section-name> -->
...managed content (regenerated on each run)...
<!-- ARTK:END <section-name> -->
```

**Standard section names:** `environment-matrix`, `route-inventory`, `risk-assessment`, `clarification`, `deterministic-steps`, `acceptance-criteria`, `implementation`, `verification`, `testid-audit`
