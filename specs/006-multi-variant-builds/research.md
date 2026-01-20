# Research: ARTK Multi-Variant Build System

**Date**: 2026-01-19
**Feature**: 006-multi-variant-builds
**Status**: Complete

---

## Research Questions Addressed

1. What Playwright versions are compatible with each Node.js version?
2. What TypeScript target and module settings are needed per variant?
3. How should ESM vs CommonJS detection work?
4. What's the best approach for build tooling?
5. How to handle feature differences between Playwright versions?

---

## 1. Playwright Version Compatibility

### Decision: Use specific Playwright versions per Node.js range

| Variant | Playwright | Node.js Range | Rationale |
|---------|------------|---------------|-----------|
| modern | 1.57.x | 18, 20, 22 | Latest stable, requires Node 18+ |
| legacy-16 | 1.49.x | 16, 18, 20 | Last version with Node 16 support |
| legacy-14 | 1.33.x | 14, 16, 18 | Last version with Node 14 support |

### Alternatives Considered

1. **Single Playwright version for all** - Rejected: Playwright 1.57 requires Node 18+
2. **Use Playwright 1.40 for all legacy** - Rejected: 1.49 has more features for Node 16 users
3. **Dynamic Playwright installation** - Rejected: Complexity, version conflicts

### Evidence

From Playwright release notes:
- Playwright 1.50+ requires Node.js 18+
- Playwright 1.34+ requires Node.js 16+
- Playwright 1.33.x is the last version supporting Node 14

---

## 2. TypeScript Configuration

### Decision: Separate tsconfig per variant

| Variant | Target | Module | Lib |
|---------|--------|--------|-----|
| modern-esm | ES2022 | ESNext | ES2022, DOM |
| modern-cjs | ES2022 | CommonJS | ES2022, DOM |
| legacy-16 | ES2021 | CommonJS | ES2021, DOM |
| legacy-14 | ES2020 | CommonJS | ES2020, DOM |

### Alternatives Considered

1. **Single build with conditional exports only** - Rejected: Doesn't address language feature differences
2. **Use babel for transpilation** - Rejected: TypeScript sufficient, adds complexity
3. **Target ES2015 for maximum compatibility** - Rejected: Unnecessary, kills performance

### Rationale

- ES2022 allows using all modern features (top-level await, private fields)
- ES2021 excludes features like WeakRef that Node 16 handles poorly
- ES2020 is Node 14's native target, avoids transpilation issues

---

## 3. Module System Detection

### Decision: Check `package.json` type field + Node version

```typescript
function detectModuleSystem(targetPath: string): 'esm' | 'cjs' {
  const pkg = readPackageJson(targetPath);
  return pkg?.type === 'module' ? 'esm' : 'cjs';
}

function selectVariant(nodeVersion: number, moduleSystem: string): Variant {
  if (nodeVersion < 14) throw new Error('Node 14+ required');
  if (nodeVersion < 16) return 'legacy-14';
  if (nodeVersion < 18) return 'legacy-16';
  return moduleSystem === 'esm' ? 'modern-esm' : 'modern-cjs';
}
```

### Alternatives Considered

1. **Check file extensions (.mjs/.cjs)** - Rejected: Less reliable than package.json
2. **Always use CJS** - Rejected: Penalizes modern ESM projects
3. **Let user choose** - Partial: Added `--variant` override for power users

### Rationale

The `"type": "module"` field is the standard way Node.js determines module system. Defaulting to CJS is safe because CJS works everywhere.

---

## 4. Build Tooling

### Decision: Use tsup for modern, tsc for legacy variants

| Variant | Build Tool | Reason |
|---------|------------|--------|
| modern-esm | tsup | Optimized bundling, tree-shaking |
| modern-cjs | tsc | Simple transpilation to CJS |
| legacy-16 | tsc | Direct compilation to ES2021 |
| legacy-14 | tsc | Direct compilation to ES2020 |

### Alternatives Considered

1. **tsup for all** - Rejected: tsup has issues with older targets
2. **esbuild directly** - Rejected: tsup wraps esbuild with better DX
3. **Rollup** - Rejected: More config complexity, no benefit for library

### Rationale

tsup is already used for the modern build. Using tsc for legacy variants ensures compatibility without introducing bundler edge cases.

---

## 5. Playwright Feature Compatibility

### Decision: Document differences, provide LLM guidance

| Feature | 1.57 | 1.49 | 1.33 | Alternative for Legacy |
|---------|------|------|------|------------------------|
| ARIA snapshots | ✅ | ✅ | ❌ | Use `page.evaluate()` for accessibility |
| Clock API | ✅ | ✅ | ❌ | Use `page.evaluate()` with Date mocking |
| `page.routeFromHAR()` | ✅ | ✅ | ✅ | N/A |
| Component testing | ✅ | ✅ | Limited | Use E2E approach |
| `locator.or()` | ✅ | ✅ | ❌ | Chain multiple locators |
| `locator.filter()` | ✅ | ✅ | ✅ | N/A |

### Decision: Dual-format feature documentation

1. **Prose in Copilot instructions** - Human-readable guidance
2. **Structured JSON file** - Machine-readable for LLM programmatic access

Schema: `variant-features.json`
```json
{
  "variant": "legacy-14",
  "playwright_version": "1.33.x",
  "features": {
    "aria_snapshots": {
      "available": false,
      "alternative": "Use page.evaluate() to query ARIA attributes"
    }
  }
}
```

### Rationale

LLMs generating tests need to know which features are available. The dual format (prose + JSON) ensures both human developers and AI agents can access this information.

---

## 6. Concurrency Control

### Decision: Lock file with immediate failure

- Lock file: `.artk/install.lock`
- Behavior: Second process fails immediately with clear message
- Cleanup: Lock deleted on success, failure, or rollback

### Alternatives Considered

1. **Wait with timeout** - Rejected: User confusion about hanging process
2. **No locking** - Rejected: Risk of corrupted installations
3. **PID-based locking** - Rejected: Complexity, stale lock handling

### Rationale

Immediate failure with clear message is the most predictable behavior. Users can retry after the first installation completes.

---

## 7. Rollback Strategy

### Decision: Full rollback to clean pre-install state

On partial failure:
1. Delete all files in `vendor/artk-core/`
2. Delete all files in `vendor/artk-core-autogen/`
3. Remove `.artk/context.json` entries for variant
4. Log failure to `.artk/install.log`
5. Exit with error code

### Alternatives Considered

1. **Keep partial state** - Rejected: Causes confusion, hard to debug
2. **Restore previous variant** - Rejected: Complex, may not exist
3. **Transaction-like approach** - Rejected: Overkill for file copy operations

### Rationale

Clean state is predictable. Users can re-run installation knowing they start from scratch.

---

## 8. Observability

### Decision: Verbose logging to `.artk/install.log`

Log format:
```
[2026-01-19T10:30:00Z] INFO: Starting ARTK installation
[2026-01-19T10:30:00Z] INFO: Detected Node.js version: 20
[2026-01-19T10:30:00Z] INFO: Detected module system: esm
[2026-01-19T10:30:00Z] INFO: Selected variant: modern-esm
[2026-01-19T10:30:01Z] INFO: Copying variant files...
[2026-01-19T10:30:02Z] INFO: Installation complete
```

- Append-only (preserves history)
- Includes timestamps, detected values, selected variant
- Logs errors with stack traces

### Rationale

Enterprise environments need audit trails. Append-only ensures installation history is preserved for troubleshooting.

---

## Summary of Decisions

| Question | Decision | Confidence |
|----------|----------|------------|
| Playwright versions | 1.57/1.49/1.33 per variant | 0.95 |
| TypeScript targets | ES2022/ES2021/ES2020 | 0.90 |
| Module detection | package.json type field | 0.95 |
| Build tooling | tsup + tsc | 0.85 |
| Feature docs | Dual format (prose + JSON) | 0.90 |
| Concurrency | Lock file, immediate fail | 0.90 |
| Rollback | Full clean state | 0.95 |
| Logging | Append-only install.log | 0.90 |

**Overall Confidence**: 0.91

---

## References

- [Playwright Release Notes](https://playwright.dev/docs/release-notes)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [TypeScript Target Compatibility](https://www.typescriptlang.org/tsconfig#target)
- [tsup Documentation](https://tsup.egoist.dev/)
- Existing implementation plan: `research/2026-01-19_multi-variant-implementation-plan.md`
