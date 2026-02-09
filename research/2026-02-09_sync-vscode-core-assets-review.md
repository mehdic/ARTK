# Sync VS Code Core Assets - Implementation Review

**Date:** 2026-02-09
**Topic:** Critical review of sync-vscode-core-assets implementation

---

## Review Summary

**Participants:** Claude (primary reviewer), Claude Code Reviewer (deep analysis)
**Confidence:** 0.92
**Verdict:** Implementation is functionally correct but has 3 HIGH-severity issues and several MEDIUM findings that should be fixed before merge.

---

## Critical Findings (Fix Before Merge)

### SEC-01: Path Injection in `strip_package_json` (HIGH)

The bash `strip_package_json` inlines `$src` and `$dest` into a `node -e` string:
```bash
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('$src', 'utf-8'));
  ...
  require('fs').writeFileSync('$dest', JSON.stringify(pkg, null, 2));
"
```

A repo path containing `'` (e.g., `/Users/O'Brien/`) would break the JS string literal. The CLI's `bundle-assets.ts` and PowerShell both use native file APIs, avoiding this.

**Fix:** Pass paths via `process.argv` instead of string interpolation:
```bash
node -e "
  const [,, src, dest] = process.argv;
  const pkg = JSON.parse(require('fs').readFileSync(src, 'utf-8'));
  delete pkg.devDependencies;
  delete pkg.scripts;
  pkg.private = true;
  require('fs').writeFileSync(dest, JSON.stringify(pkg, null, 2));
" -- "$src" "$dest"
```

### ATM-02: `rm -rf` + `mv` Window Leaves No Target on Crash (HIGH)

Between `rm -rf "$CORE_TARGET"` and `mv "$CORE_STAGING" "$CORE_TARGET"`, a crash leaves zero assets. A safer pattern:
```bash
if [ -d "$CORE_TARGET" ]; then
  mv "$CORE_TARGET" "$CORE_TARGET.old.$$"
fi
mv "$CORE_STAGING" "$CORE_TARGET"
rm -rf "$CORE_TARGET.old.$$" 2>/dev/null || true
```

### ATM-01: Partial Failure Leaves Inconsistent State (HIGH)

Three sequential syncs (core, autogen, bootstrap) — if step 2 fails after step 1 succeeds, assets are in mixed state. Unlike the CLI which wipes everything first.

**Fix:** Wrap all three in a single staging approach: stage all three, then swap all three. Or add rollback on failure.

---

## Medium Findings (Fix Soon After Merge)

### EDGE-01: Empty Source Directory Causes Glob Failure
`cp -PR "$BOOTSTRAP_SOURCE"/*` fails if directory is empty. Add empty-dir check (as sync-vscode-journeys.sh does).

### EDGE-03: No Bootstrap Critical File Verification
Steps 1-2 verify critical files; step 3 does not. Should verify `playwright.config.template.ts`.

### MISS-04: No Source Symlink Warning
`sync-vscode-journeys.sh` warns about symlinks in source. New scripts do not.

### PS-04: UTF-8 BOM Risk on Windows PowerShell 5.x
`Set-Content -Encoding UTF8` writes BOM on PS 5.x. Use `-Encoding utf8NoBOM` or note version requirement.

### COMPAT-01: First-Time Migration Burden
The `.gitignore` change means dist files are now tracked. Every developer will be blocked on first push until they commit the synced assets.

---

## Low Findings (Address When Convenient)

- CON-02: Different symlink handling (bash preserves, CLI follows, installer skips)
- PS-03: JSON formatting differs between bash/Node.js and PowerShell
- LOOP-03: Concurrent run race on staging cleanup
- LOOP-04: No pre-check for `node` availability
- GIT-02: Pre-push hook slower with large dist directories

---

## Action Plan

1. Fix SEC-01 (path injection) — use process.argv
2. Fix ATM-02 (atomic swap) — rename-old pattern
3. Fix ATM-01 (partial failure) — rollback on failure
4. Fix EDGE-01 (empty dir check)
5. Fix EDGE-03 (bootstrap verification)
6. Fix MISS-04 (symlink warning)
