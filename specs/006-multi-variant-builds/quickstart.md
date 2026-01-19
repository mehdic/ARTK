# Quickstart: Multi-Variant Build System

## For Users

### Installation (Automatic Detection)

```bash
# Auto-detects Node version and module system
npx @artk/cli init /path/to/your-project
```

The CLI automatically selects the appropriate variant:

| Your Environment | Detected Variant |
|-----------------|------------------|
| Node 18+ with `"type": "module"` | modern-esm |
| Node 18+ without ESM | modern-cjs |
| Node 16-17 | legacy-16 |
| Node 14-15 | legacy-14 |

### Force a Specific Variant

```bash
# Override automatic detection
npx @artk/cli init /path/to/project --variant legacy-16
```

### Check Installed Variant

```bash
# Using CLI
artk doctor /path/to/project

# Or manually
cat artk-e2e/.artk/context.json | jq .variant
```

### Upgrade After Node Version Change

```bash
# Re-detect and install correct variant
artk upgrade /path/to/project
```

---

## For Developers (Building ARTK)

### Build All Variants

```bash
cd core/typescript
npm run build:variants
```

This produces:
- `dist/` - Modern ESM (Node 18+)
- `dist-cjs/` - Modern CJS (Node 18+)
- `dist-legacy-16/` - Legacy (Node 16+)
- `dist-legacy-14/` - Legacy (Node 14+)

### Test All Variants

```bash
# Run tests on current Node version
npm run test:unit

# Run full variant matrix (requires Docker)
npm run test:variants
```

### Build Single Variant

```bash
# Modern ESM only
npm run build:modern

# Legacy 16 only
npm run build:legacy-16
```

---

## For AI Agents (LLM Guidelines)

### Reading Feature Availability

Check `vendor/artk-core/variant-features.json`:

```json
{
  "variant": "legacy-14",
  "features": {
    "aria_snapshots": {
      "available": false,
      "alternative": "Use page.evaluate() to query ARIA attributes"
    }
  }
}
```

### Before Using a Playwright Feature

1. Read `variant-features.json` from the vendor directory
2. Check if the feature is `available: true`
3. If not, use the `alternative` approach

### DO NOT Modify Vendor Files

If you encounter compatibility issues:

1. **DO NOT** edit files in `vendor/artk-core/`
2. **DO NOT** add polyfills or patches
3. **DO** check if correct variant is installed
4. **DO** suggest `artk init --force` if variant mismatch

---

## Common Scenarios

### Scenario: ESM Import Errors

**Symptom**: `ERR_REQUIRE_ESM` or `Cannot use import statement`

**Solution**:
```bash
# Check variant
cat artk-e2e/.artk/context.json | jq .variant

# If mismatch, reinstall
artk init . --force
```

### Scenario: Playwright Feature Not Working

**Symptom**: `page.clock` is undefined on Node 14

**Solution**: Feature not available in Playwright 1.33. Check `variant-features.json` for alternative.

### Scenario: Upgrading from Node 16 to Node 20

```bash
# After upgrading Node
artk upgrade .
# System detects Node 20, switches to modern variant
```

---

## File Locations Reference

| File | Purpose |
|------|---------|
| `.artk/context.json` | Installed variant metadata |
| `.artk/install.log` | Installation history |
| `.artk/install.lock` | Concurrent install prevention |
| `vendor/artk-core/READONLY.md` | Immutability warning |
| `vendor/artk-core/variant-features.json` | Feature availability |
