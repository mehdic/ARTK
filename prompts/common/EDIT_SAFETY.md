# Edit Safety Rules (Shared)

Use these rules for any prompt that edits files:

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
