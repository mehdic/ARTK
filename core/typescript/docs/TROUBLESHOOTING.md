# ARTK Template System - Troubleshooting Guide

## Common Issues and Solutions

### Generation Failures

#### Issue: "Generation script not found"

**Symptoms:**
```
[5.5/7] Generating foundation modules...
⚠️  Generation script not found, skipping foundation module generation
Expected: /path/to/ARTK/core/typescript/scripts/generate-foundation.ts
```

**Causes:**
- ARTK core repository not properly installed
- Bootstrap script can't find ARTK installation
- File was deleted or moved

**Solutions:**
1. Verify ARTK_ROOT environment variable:
   ```bash
   echo $ARTK_ROOT
   # Should print: /path/to/ARTK
   ```

2. Check file exists:
   ```bash
   ls /path/to/ARTK/core/typescript/scripts/generate-foundation.ts
   ```

3. Reinstall ARTK or fix paths in bootstrap script

---

#### Issue: "Node.js is required but not found"

**Symptoms:**
```
Error: Node.js is required but not found
```

**Causes:**
- Node.js not installed
- Node.js not in PATH
- Wrong shell environment

**Solutions:**
1. Install Node.js 18.0.0+:
   ```bash
   node --version  # Should be >= 18.0.0
   ```

2. Add Node.js to PATH:
   ```bash
   # macOS/Linux
   export PATH="/path/to/node/bin:$PATH"

   # Windows
   set PATH=C:\Program Files\nodejs;%PATH%
   ```

3. Restart terminal after installing Node.js

---

#### Issue: "Foundation module generation failed"

**Symptoms:**
```
✗ Foundation module generation failed
Details saved to: /path/to/project/.artk/logs/template-generation.log
```

**Solutions:**

1. **Check the log file:**
   ```bash
   cat /path/to/project/.artk/logs/template-generation.log
   ```

2. **Common causes in logs:**

   **Cause: Missing template file**
   ```
   Error: Template not found: auth/login.ts
   ```
   Solution: Ensure ARTK core templates exist:
   ```bash
   ls /path/to/ARTK/core/typescript/templates/esm/auth/login.ts
   ls /path/to/ARTK/core/typescript/templates/commonjs/auth/login.ts
   ```

   **Cause: Permission denied**
   ```
   Error: EACCES: permission denied, open '/path/to/file.ts'
   ```
   Solution: Fix permissions:
   ```bash
   chmod -R u+w /path/to/project/artk-e2e/
   ```

   **Cause: Template syntax error**
   ```
   Error: Template syntax errors:
   - Unclosed conditional block at line 42
   ```
   Solution: Report this as a bug (template files shouldn't have syntax errors)

3. **Enable verbose mode for debugging:**
   ```bash
   node scripts/generate-foundation.ts \
     --projectRoot=/path/to/project \
     --variant=esm \
     --verbose
   ```

---

### Validation Failures

#### Issue: "Validation failed" with import.meta-usage errors

**Symptoms:**
```
Validation failed
Errors: 5
  - /path/to/auth/login.ts:10 - import.meta used in CommonJS environment
```

**Causes:**
- Wrong template variant selected
- Module system detection failed
- Manual override conflicts with actual environment

**Solutions:**

1. **Check detected variant:**
   ```bash
   cat .artk/context.json | grep templateVariant
   ```

2. **Verify project is actually ESM:**
   ```bash
   # Check package.json
   grep '"type"' package.json
   # Should show: "type": "module"

   # Check tsconfig.json
   grep 'module' tsconfig.json
   # Should show ESM-compatible module (ES2020, ES2022, ESNext)
   ```

3. **Force correct variant:**
   ```bash
   # If project is ESM but detected as CommonJS:
   ./scripts/bootstrap.sh /path/to/project --template-variant=esm

   # If project is CommonJS but detected as ESM:
   ./scripts/bootstrap.sh /path/to/project --template-variant=commonjs
   ```

4. **Manual fix (if needed):**
   Edit `.artk/context.json`:
   ```json
   {
     "templateVariant": "esm",  // Change to "commonjs" if needed
     "moduleSystem": "esm"      // Change to "commonjs" if needed
   }
   ```
   Then re-run generation:
   ```bash
   node core/typescript/scripts/generate-foundation.ts \
     --projectRoot=/path/to/project \
     --variant=commonjs
   ```

---

#### Issue: "Validation failed" with dirname-usage errors

**Symptoms:**
```
Errors: 3
  - /path/to/config/env.ts:14 - __dirname used in ESM environment
```

**Causes:**
- Wrong template variant (CommonJS template used for ESM project)
- Detection failure

**Solutions:**

Same as import.meta-usage above, but force ESM variant instead of CommonJS.

---

#### Issue: "Validation timeout"

**Symptoms:**
```
Warnings: 1
  - Validation timed out after 10000ms
```

**Causes:**
- Too many files to validate
- System under heavy load
- Validation rules hanging

**Solutions:**

1. **Increase timeout:**
   ```typescript
   // In your script
   const result = await generateFoundationModules(
     projectRoot,
     variant,
     context,
     {
       validateAfter: true,
       timeout: 30000  // 30 seconds
     }
   );
   ```

2. **Skip validation temporarily:**
   ```bash
   ./scripts/bootstrap.sh /path/to/project --skip-validation
   ```

3. **Validate manually after generation:**
   ```bash
   npm run validate
   ```

---

### Module System Detection Issues

#### Issue: Wrong module system detected

**Symptoms:**
- ESM project detected as CommonJS (or vice versa)
- Generated code has wrong syntax (`import.meta` in CommonJS, `__dirname` in ESM)

**Diagnosis:**
```bash
# Check what was detected
cat /path/to/project/.artk/context.json

# Look for:
{
  "moduleSystem": "...",      # What was detected
  "templateVariant": "...",   # What template was used
  "packageType": "...",       # package.json type
  "tsConfigModule": "..."     # tsconfig.json module
}
```

**Causes:**

1. **Missing `type` field in package.json:**
   - No `"type"` field defaults to CommonJS
   - Solution: Add `"type": "module"` for ESM

2. **Conflicting signals:**
   - package.json says `"type": "module"` (ESM)
   - tsconfig.json says `"module": "CommonJS"`
   - Solution: Make them consistent

3. **Incomplete tsconfig.json:**
   - Missing `compilerOptions.module` field
   - Solution: Add explicit module setting

**Solutions:**

1. **For ESM projects:**

   `package.json`:
   ```json
   {
     "type": "module"
   }
   ```

   `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "module": "ES2022",
       "moduleResolution": "node"
     }
   }
   ```

2. **For CommonJS projects:**

   `package.json`:
   ```json
   {
     "type": "commonjs"
   }
   ```

   OR omit the `type` field entirely.

   `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "module": "CommonJS",
       "moduleResolution": "node"
     }
   }
   ```

3. **Force variant override:**
   ```bash
   ./scripts/bootstrap.sh /path/to/project --template-variant=esm
   ```

---

### Rollback Issues

#### Issue: "Rollback failed" after validation error

**Symptoms:**
```
Validation failed, unsuccessfully rolled back generated files
```

**Causes:**
- File permissions
- Files locked by another process
- Disk full

**Solutions:**

1. **Check file permissions:**
   ```bash
   ls -la /path/to/project/artk-e2e/foundation/
   ```

2. **Manually delete generated files:**
   ```bash
   rm -rf /path/to/project/artk-e2e/foundation/auth
   rm -rf /path/to/project/artk-e2e/foundation/config
   rm -rf /path/to/project/artk-e2e/foundation/navigation
   ```

3. **Check for file locks:**
   ```bash
   # macOS/Linux
   lsof /path/to/project/artk-e2e/foundation/auth/login.ts

   # Windows
   handle.exe /path/to/project/artk-e2e/foundation/auth/login.ts
   ```

4. **Check disk space:**
   ```bash
   df -h /path/to/project
   ```

---

#### Issue: Backup files not restored

**Symptoms:**
- Rollback succeeded but old files are gone
- `.backup.*` files still present

**Solutions:**

1. **Manually restore from backup:**
   ```bash
   # Find backup files
   find /path/to/project/artk-e2e -name "*.backup.*"

   # Restore (example)
   mv auth/login.ts.backup.1673123456789 auth/login.ts
   ```

2. **Check if backups were created:**
   ```bash
   ls -la /path/to/project/artk-e2e/foundation/**/*.backup.*
   ```

3. **Backups are only created when overwriting existing files:**
   - First-time generation: no backups
   - Re-generation: backups created

---

### Template Variable Errors

#### Issue: "Template variable 'XXX' is not defined in context"

**Symptoms:**
```
Error: Template variable 'projectRoot' is not defined in context.
Available variables: projectName, artkRoot, ...
```

**Causes:**
- Missing required field in template context
- Template uses undocumented variable
- Custom template with custom variables

**Solutions:**

1. **Use createTemplateContext helper:**
   ```typescript
   import { createTemplateContext } from '@artk/core/templates';

   const context = createTemplateContext({
     projectRoot: '/path/to/project',
     projectName: 'my-project',
     // ... other required fields
   });
   ```

2. **Check required fields:**
   - `projectName` (required)
   - `projectRoot` (required)
   - `artkRoot` (required)
   - `moduleSystem` (required)
   - See [TEMPLATE_SYSTEM.md](./TEMPLATE_SYSTEM.md) for full list

3. **Add missing field manually:**
   ```typescript
   const context = createTemplateContext({ /* ... */ });
   context.missingField = 'value';
   ```

---

### File System Issues

#### Issue: "ENOENT: no such file or directory"

**Symptoms:**
```
Error: ENOENT: no such file or directory, open '/path/to/artk-e2e/foundation/auth/login.ts'
```

**Causes:**
- Parent directory doesn't exist
- Wrong path in configuration

**Solutions:**

1. **Ensure directories exist:**
   ```bash
   mkdir -p /path/to/project/artk-e2e/foundation/auth
   mkdir -p /path/to/project/artk-e2e/foundation/config
   mkdir -p /path/to/project/artk-e2e/foundation/navigation
   ```

2. **Check bootstrap completed structure creation:**
   ```bash
   ls -la /path/to/project/artk-e2e/
   ```

3. **Run bootstrap again:**
   ```bash
   ./scripts/bootstrap.sh /path/to/project
   ```

---

## Debugging Techniques

### Enable Verbose Logging

```bash
# Bootstrap with verbose output
./scripts/bootstrap.sh /path/to/project --verbose

# Generation script with verbose output
node scripts/generate-foundation.ts \
  --projectRoot=/path/to/project \
  --verbose
```

### Check Generated Context

```bash
# View detection results
cat /path/to/project/.artk/context.json | jq

# Expected output:
{
  "artkRoot": "/path/to/ARTK",
  "projectRoot": "/path/to/project",
  "projectName": "project",
  "artkVersion": "1.0.0",
  "nodeVersion": "18.12.1",
  "templateVariant": "esm",
  "moduleSystem": "esm",
  "packageType": "module",
  "tsConfigModule": "ES2022",
  ...
}
```

### Dry-Run Mode

Preview what would be generated without writing files:

```bash
node scripts/generate-foundation.ts \
  --projectRoot=/path/to/project \
  --variant=esm \
  --dryRun \
  --verbose
```

### Check Validation Results

```bash
# View validation history
cat /path/to/project/.artk/validation-results.json | jq

# Check latest validation
cat /path/to/project/.artk/validation-results.json | jq '.[-1]'
```

### Manual Validation

Run validation separately:

```typescript
import { validateFoundation } from '@artk/core/validation';

const result = await validateFoundation({
  files: [
    '/path/to/project/artk-e2e/foundation/auth/login.ts',
    '/path/to/project/artk-e2e/foundation/config/env.ts',
    '/path/to/project/artk-e2e/foundation/navigation/nav.ts'
  ],
  environmentContext: 'esm'
});

console.log('Status:', result.status);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

---

## Getting Help

If none of these solutions work:

1. **Collect diagnostic information:**
   ```bash
   # System info
   node --version
   npm --version
   cat /etc/os-release  # Linux
   sw_vers              # macOS

   # Project info
   cat package.json | jq '.type, .dependencies, .devDependencies'
   cat tsconfig.json | jq '.compilerOptions.module'

   # ARTK context
   cat .artk/context.json

   # Recent logs
   tail -50 .artk/logs/template-generation.log
   tail -20 .artk/validation-results.json
   ```

2. **Check existing issues:**
   - Search ARTK GitHub issues
   - Check CLAUDE.md in repo root

3. **Create a bug report with:**
   - Error message and full stack trace
   - Diagnostic information from step 1
   - Steps to reproduce
   - Expected vs actual behavior

4. **Workarounds:**
   ```bash
   # Skip validation if needed
   ./scripts/bootstrap.sh /path/to/project --skip-validation

   # Force specific variant
   ./scripts/bootstrap.sh /path/to/project --template-variant=commonjs

   # Manual generation
   cp -r /path/to/ARTK/core/typescript/templates/esm/* \
         /path/to/project/artk-e2e/foundation/

   # Then manually fix paths and variables
   ```

---

## Prevention Best Practices

### 1. Consistent Module Configuration

Keep package.json and tsconfig.json aligned:

**ESM:**
- `package.json`: `"type": "module"`
- `tsconfig.json`: `"module": "ES2022"` or `"ESNext"`

**CommonJS:**
- `package.json`: `"type": "commonjs"` or omit field
- `tsconfig.json`: `"module": "CommonJS"`

### 2. Verify Before Bootstrap

```bash
# Check Node.js version
node --version  # Must be >= 18.0.0

# Check project configuration
grep '"type"' package.json
grep 'module' tsconfig.json

# Check ARTK installation
ls /path/to/ARTK/core/typescript/templates/
```

### 3. Review Generated Files

After successful generation:

```bash
# Check module system
grep 'import.meta' artk-e2e/foundation/**/*.ts  # Should be ESM only
grep '__dirname' artk-e2e/foundation/**/*.ts    # Should be CommonJS only

# Check imports
grep 'import ' artk-e2e/foundation/**/*.ts      # ESM syntax
grep 'require(' artk-e2e/foundation/**/*.ts     # CommonJS syntax
```

### 4. Keep Validation Enabled

Don't skip validation unless absolutely necessary:

```bash
# Good (validation enabled)
./scripts/bootstrap.sh /path/to/project

# Avoid (validation skipped)
./scripts/bootstrap.sh /path/to/project --skip-validation
```

---

## Related Documentation

- [Template System Overview](./TEMPLATE_SYSTEM.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [CLAUDE.md](/CLAUDE.md) - Main project documentation
