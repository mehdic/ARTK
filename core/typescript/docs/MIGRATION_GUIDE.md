# Migration Guide - Legacy Templates to New Template System

## Overview

This guide helps you migrate from the old ARTK template system (manual copy from vendor) to the new automated template generation system.

**Old System:**
- Static templates copied from `vendor/artk-core/templates/`
- Required 15+ manual edits after generation
- No automatic module system detection
- No validation or rollback

**New System:**
- Dynamic template generation with variable substitution
- Automatic module system detection
- Built-in validation with rollback
- Zero manual edits required

## Who Needs to Migrate?

You need to migrate if:
- You installed ARTK before 2026-01-13
- Your `artk-e2e/foundation/` files have hardcoded paths
- You manually edited files after bootstrap
- You see errors like `Cannot use import.meta in CommonJS` or `__dirname is not defined in ESM`

## Migration Paths

### Path 1: Fresh Bootstrap (Recommended)

**Best for:**
- New projects without custom modifications
- Projects with test files that can be regenerated

**Steps:**

1. **Backup your project:**
   ```bash
   cd /path/to/your-project
   cp -r artk-e2e artk-e2e.backup
   cp -r .artk .artk.backup
   ```

2. **Remove old ARTK installation:**
   ```bash
   rm -rf artk-e2e/
   rm -rf .artk/
   rm -rf .github/prompts/  # If you installed prompts
   ```

3. **Run new bootstrap:**
   ```bash
   /path/to/ARTK/scripts/bootstrap.sh /path/to/your-project
   ```

4. **Verify generation:**
   ```bash
   # Check files were generated
   ls -la artk-e2e/foundation/

   # Check module system matches
   cat .artk/context.json | grep templateVariant

   # Verify no hardcoded paths
   grep -r '/Users/' artk-e2e/foundation/  # Should be empty
   grep -r '{{' artk-e2e/foundation/       # Should be empty
   ```

5. **Restore custom files (if any):**
   ```bash
   # Copy back test files you created
   cp artk-e2e.backup/tests/* artk-e2e/tests/

   # Copy back custom config
   cp artk-e2e.backup/config/auth.yml artk-e2e/config/
   ```

6. **Run tests:**
   ```bash
   cd artk-e2e
   npm test
   ```

7. **Clean up backups:**
   ```bash
   rm -rf artk-e2e.backup .artk.backup
   ```

---

### Path 2: In-Place Update

**Best for:**
- Projects with extensive custom modifications
- Projects where regeneration is not feasible
- When you want to preserve git history

**Steps:**

1. **Backup current state:**
   ```bash
   git add -A
   git commit -m "Pre-migration backup"
   ```

2. **Update ARTK core:**
   ```bash
   # Pull latest ARTK
   cd /path/to/ARTK
   git pull origin main

   # Reinstall ARTK core in your project
   /path/to/ARTK/core/typescript/scripts/install-to-project.sh /path/to/your-project
   ```

3. **Backup existing foundation modules:**
   ```bash
   cd /path/to/your-project
   node -e "require('@artk/core/templates').autoMigrate(process.cwd())"
   ```

   This creates: `artk-e2e/templates.backup/` with your old files.

4. **Detect module system:**
   ```bash
   # Check package.json
   grep '"type"' package.json

   # Check tsconfig.json
   grep 'module' tsconfig.json
   ```

5. **Generate new foundation modules:**
   ```bash
   node /path/to/ARTK/core/typescript/scripts/generate-foundation.ts \
     --projectRoot="$(pwd)" \
     --variant=esm \  # or commonjs
     --verbose
   ```

6. **Review changes:**
   ```bash
   # See what changed
   git diff artk-e2e/foundation/

   # Key differences to expect:
   # - Old: hardcoded paths like '/Users/you/ARTK'
   # - New: dynamic paths like '../../vendor/artk-core'
   # - Old: wrong module syntax (import.meta in CommonJS)
   # - New: correct module syntax for your project
   ```

7. **Port custom modifications:**

   If you added custom code to foundation modules:

   ```bash
   # Example: You modified auth/login.ts
   diff artk-e2e/templates.backup/auth/login.ts \
        artk-e2e/foundation/auth/login.ts

   # Copy your custom functions
   # Keep new imports and module structure
   ```

8. **Test everything:**
   ```bash
   cd artk-e2e
   npm test
   ```

9. **Commit migration:**
   ```bash
   git add -A
   git commit -m "Migrate to new ARTK template system"
   ```

---

### Path 3: Manual Update

**Best for:**
- Projects with heavy customizations
- When you understand the codebase deeply
- When automated migration fails

**Steps:**

1. **Identify files to update:**
   ```bash
   ls -la artk-e2e/foundation/
   # Typically:
   # - auth/login.ts
   # - config/env.ts
   # - navigation/nav.ts
   ```

2. **For each file, update module system code:**

   **If your project is ESM:**

   ```typescript
   // OLD (CommonJS):
   const path = require('path');
   const fs = require('fs');

   // NEW (ESM):
   import * as path from 'path';
   import * as fs from 'fs';
   ```

   ```typescript
   // OLD (CommonJS):
   const projectRoot = __dirname;

   // NEW (ESM):
   import { fileURLToPath } from 'url';
   const projectRoot = fileURLToPath(new URL('.', import.meta.url));
   ```

   **If your project is CommonJS:**

   ```typescript
   // OLD (ESM):
   import * as path from 'path';
   import { fileURLToPath } from 'url';
   const projectRoot = fileURLToPath(new URL('.', import.meta.url));

   // NEW (CommonJS):
   const path = require('path');
   const fs = require('fs');
   const projectRoot = __dirname;
   ```

3. **Fix import paths:**

   ```typescript
   // OLD (hardcoded, breaks on other machines):
   import type { AuthConfig } from '/Users/you/ARTK/core/typescript/types/auth';

   // NEW (relative, portable):
   import type { AuthConfig } from '../../vendor/artk-core/types/auth';
   ```

4. **Update configuration paths:**

   ```typescript
   // OLD (hardcoded):
   const projectRoot = '/Users/you/projects/my-project';

   // NEW (dynamic):
   const projectRoot = path.resolve(__dirname, '../..');
   // or for ESM:
   const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
   ```

5. **Test each file:**
   ```bash
   # Compile TypeScript
   npx tsc --noEmit artk-e2e/foundation/auth/login.ts

   # Or import in Node.js
   node -e "import('./artk-e2e/foundation/auth/login.js')"
   ```

---

## Verification Checklist

After migration, verify:

### ✅ File Structure

```bash
# All foundation modules exist
ls artk-e2e/foundation/auth/login.ts
ls artk-e2e/foundation/config/env.ts
ls artk-e2e/foundation/navigation/nav.ts

# New .artk directory created
ls .artk/context.json
ls .artk/validation-results.json
```

### ✅ Module System Correctness

**For ESM projects:**
```bash
# Should find import.meta
grep 'import.meta' artk-e2e/foundation/**/*.ts

# Should NOT find __dirname (except in getDirname compatibility)
grep '__dirname' artk-e2e/foundation/**/*.ts

# Should use import syntax
grep '^import ' artk-e2e/foundation/**/*.ts
```

**For CommonJS projects:**
```bash
# Should find __dirname
grep '__dirname' artk-e2e/foundation/**/*.ts

# Should NOT find import.meta
grep 'import.meta' artk-e2e/foundation/**/*.ts

# Can use import syntax (TypeScript compiles to require)
grep '^import ' artk-e2e/foundation/**/*.ts
```

### ✅ No Hardcoded Paths

```bash
# Should be empty
grep -r '/Users/' artk-e2e/foundation/
grep -r 'C:\\' artk-e2e/foundation/

# Should use relative paths
grep -r 'vendor/artk-core' artk-e2e/foundation/
grep -r 'path.join' artk-e2e/foundation/
```

### ✅ No Template Variables

```bash
# Should be empty (all variables substituted)
grep -r '{{' artk-e2e/foundation/
```

### ✅ Validation Passes

```bash
# Run validation
node -e "
  const { validateFoundation } = require('@artk/core/validation');
  const glob = require('glob');
  const files = glob.sync('artk-e2e/foundation/**/*.ts');

  validateFoundation({
    files,
    environmentContext: 'esm'  // or 'commonjs'
  }).then(result => {
    console.log('Status:', result.status);
    console.log('Errors:', result.errors.length);
    console.log('Warnings:', result.warnings.length);
  });
"
```

### ✅ Tests Pass

```bash
cd artk-e2e
npm test
```

---

## Common Migration Issues

### Issue: "import.meta used in CommonJS environment"

**After migration, validation fails:**
```
Error: import.meta used in CommonJS environment
File: artk-e2e/foundation/config/env.ts:15
```

**Cause:** Generated ESM templates for CommonJS project

**Solution:**
```bash
# Regenerate with correct variant
node /path/to/ARTK/core/typescript/scripts/generate-foundation.ts \
  --projectRoot="$(pwd)" \
  --variant=commonjs \
  --verbose
```

---

### Issue: "__dirname is not defined"

**After migration, tests fail:**
```
ReferenceError: __dirname is not defined in ES module scope
```

**Cause:** Generated CommonJS templates for ESM project

**Solution:**
```bash
# Regenerate with correct variant
node /path/to/ARTK/core/typescript/scripts/generate-foundation.ts \
  --projectRoot="$(pwd)" \
  --variant=esm \
  --verbose
```

---

### Issue: Lost custom modifications

**After migration, custom code is gone**

**Cause:** Fresh generation overwrites files

**Solutions:**

1. **Restore from backup:**
   ```bash
   diff artk-e2e.backup/foundation/auth/login.ts \
        artk-e2e/foundation/auth/login.ts

   # Manually merge changes
   ```

2. **Use templates.backup:**
   ```bash
   diff artk-e2e/templates.backup/auth/login.ts \
        artk-e2e/foundation/auth/login.ts
   ```

3. **Use git:**
   ```bash
   git diff HEAD~1 artk-e2e/foundation/auth/login.ts
   ```

---

### Issue: Import path errors

**Tests fail with module not found:**
```
Error: Cannot find module '../../vendor/artk-core/types/auth'
```

**Cause:** @artk/core not installed or wrong path

**Solutions:**

1. **Reinstall @artk/core:**
   ```bash
   /path/to/ARTK/core/typescript/scripts/install-to-project.sh $(pwd)
   ```

2. **Verify vendor directory:**
   ```bash
   ls artk-e2e/vendor/artk-core/
   ```

3. **Check import paths in generated files:**
   ```bash
   grep 'from.*artk-core' artk-e2e/foundation/**/*.ts
   ```

---

## Rollback

If migration fails and you need to restore old state:

### From Backup Directory

```bash
# Restore from backup
rm -rf artk-e2e
mv artk-e2e.backup artk-e2e

rm -rf .artk
mv .artk.backup .artk

# Test
cd artk-e2e && npm test
```

### From Git

```bash
# Discard all changes
git reset --hard HEAD

# Or restore specific commit
git reset --hard <commit-hash>

# Test
cd artk-e2e && npm test
```

---

## Post-Migration Optimization

After successful migration:

### 1. Clean Up Backups

```bash
# Remove backup directories
rm -rf artk-e2e.backup
rm -rf .artk.backup
rm -rf artk-e2e/templates.backup

# Remove old template files (if any)
rm -rf artk-e2e/templates
```

### 2. Update Documentation

If you have project-specific docs, update references:
- Old: "Edit `artk-e2e/foundation/auth/login.ts` after bootstrap"
- New: "Foundation modules are auto-generated, no edits needed"

### 3. Update CI/CD

If your CI regenerates templates:

**Old:**
```yaml
- run: ./scripts/bootstrap.sh .
- run: ./scripts/fix-templates.sh  # Manual fix script
```

**New:**
```yaml
- run: ./scripts/bootstrap.sh .
# No manual fixes needed!
```

### 4. Share with Team

Update team documentation:
```markdown
## ARTK Setup

1. Clone repo
2. Run bootstrap: `./scripts/bootstrap.sh .`
3. Install dependencies: `npm install`
4. Run tests: `npm test`

No manual template fixes needed anymore!
```

---

## FAQs

### Q: Do I need to regenerate templates every time ARTK updates?

**A:** No. Only regenerate if:
- ARTK core types/interfaces change
- You want new template features
- You're fixing a bug in generated code

### Q: Can I customize generated templates?

**A:** Yes, but customize the source templates in ARTK core:
- Edit: `/path/to/ARTK/core/typescript/templates/{variant}/{module}.ts`
- Then regenerate in your project

For project-specific changes, create new modules instead of modifying foundation.

### Q: Will migration break my tests?

**A:** Only if tests import foundation modules directly. If tests use them correctly:
```typescript
// Good (imports keep working)
import { login } from '../foundation/auth/login';

// Also good
import { navigateTo } from '../foundation/navigation/nav';
```

The function signatures don't change, only internal implementation.

### Q: Can I mix ESM and CommonJS?

**A:** Not recommended. Pick one module system for the entire project:
- ESM: `package.json` with `"type": "module"`, tsconfig with `"module": "ES2022"`
- CommonJS: `package.json` without `"type"` or `"type": "commonjs"`, tsconfig with `"module": "CommonJS"`

---

## Support

If you encounter issues during migration:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [TEMPLATE_SYSTEM.md](./TEMPLATE_SYSTEM.md)
3. Create issue with:
   - Migration path you used
   - Error messages
   - Contents of `.artk/context.json`
   - Output of `npm ls @artk/core`

---

## Related Documentation

- [Template System Overview](./TEMPLATE_SYSTEM.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Main Documentation](/CLAUDE.md)
