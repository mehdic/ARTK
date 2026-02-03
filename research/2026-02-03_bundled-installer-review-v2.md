# Bundled Installer Review v2 - Post P0-P2 Fixes

**Date:** 2026-02-03
**Topic:** Second code review after implementing P0-P2 fixes
**Confidence:** 0.85

---

## Executive Summary

After P0-P2 fixes, the installer achieves **~70% feature parity** with bootstrap.sh. However, the review identified:
- **4 P0 critical issues** (must fix before ship)
- **4 P1 high issues** (should fix before ship)
- **5 P2 medium issues** (fix soon)
- **3 new bugs introduced**

---

## 1. VERIFIED FIXES (Working Correctly)

| Fix | Lines | Status |
|-----|-------|--------|
| package.json with file: dependencies | 312-315 | FIXED |
| tsconfig.json with path aliases | 347-351 | FIXED |
| common/GENERAL_RULES.md installation | 933-948 | FIXED |
| next-commands/*.txt installation | 951-967 | FIXED |
| variant-info.prompt.md generation | 582-705 | FIXED |
| .gitignore creation | 447-488 | FIXED |

---

## 2. STILL MISSING (vs bootstrap.sh)

### 2.1 Staging Directories with Atomic Rollback (P0)
**bootstrap.sh:** Uses staging directories and cleanup function for atomic operations
**VS Code installer:** Writes directly to final destination - partial installation leaves broken state

### 2.2 Upgrade Detection for Old-Style Prompts (P1)
**bootstrap.sh:** Detects prompts without `agent:` property and migrates to two-tier
**VS Code installer:** No upgrade detection - old installations remain inconsistent

### 2.3 Backup Cleanup (P2)
**bootstrap.sh:** Keeps only 3 most recent backups
**VS Code installer:** Creates backups but never cleans them up

### 2.4 artk-core-journeys Population (P0)
**bootstrap.sh:** Copies full Journey Core files to vendor
**VS Code installer:** Creates empty directory - Journey system won't work

### 2.5 context.json Missing Fields (P2)
Missing: `templateVariant`, `next_suggested`, `variantInstalledAt`, `overrideUsed`, `bootstrap_script`, `artk_repo`

### 2.6 artk.config.yml Missing Sections (P2)
Missing: `version: "1.0"`, `app.type`, `app.description`, entire `core:` section

---

## 3. NEW BUGS INTRODUCED

### 3.1 Comment Stripping Regex Corrupts URLs (P0)

**Lines 517-520:**
```typescript
.replace(/\/\/.*$/gm, '')  // BUG: Removes // in URLs
```

**Example corruption:**
```json
"http.proxy": "http://proxy.example.com:8080"
```
Becomes:
```json
"http.proxy": "http:
```

**Fix:**
```typescript
// Only strip comments that start at beginning of line or after whitespace
.replace(/(?<=^|[,{\s])\/\/.*$/gm, '')
```

### 3.2 backupPath Variable Never Used (P1)

**Lines 1167-1172:** `backupPath` is created but:
- Not returned to caller
- Not logged to user
- Not used for rollback
- Installation continues even if backup fails

### 3.3 copyDir Follows Symlinks (P0)

**Lines 41-55:** Path traversal vulnerability - symlinks could point outside extension directory

**Fix:**
```typescript
if (entry.isSymbolicLink()) {
  continue; // Skip symlinks for security
}
```

### 3.4 Text Fallback Hardcodes Boolean True (P2)

**Line 551:** All settings added as `true` even if they should be strings

### 3.5 No npm install Timeout (P1)

**Lines 1081-1110:** Can hang indefinitely, freezing VS Code

### 3.6 Node Version Detection Uses Electron's Node (P2)

**Line 62:** Detects VS Code's Electron Node, not project's Node - may select wrong variant

---

## 4. PRIORITIZED REMEDIATION

### P0 - Must Fix Before Ship
1. Add symlink check to copyDir (security)
2. Fix comment stripping regex (data corruption)
3. Add staging directories with rollback (partial installation)
4. Bundle artk-core-journeys (Journey system broken)

### P1 - Should Fix Before Ship
5. Add upgrade detection for old prompts
6. Use backupPath for rollback / log to user
7. Add npm install timeout (5 minutes)
8. Complete context.json schema

### P2 - Fix Soon
9. Complete artk.config.yml schema
10. Add backup cleanup (keep 3 most recent)
11. Detect project Node version
12. Fix text fallback to use actual values
13. Log backup path to user

---

## 5. CODE SNIPPETS FOR FIXES

### Fix 3.1 - Safe Comment Stripping

```typescript
function stripJsonComments(content: string): string {
  // Don't strip // inside strings
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString && char === '/' && next === '/') {
      // Skip to end of line
      while (i < content.length && content[i] !== '\n') i++;
      continue;
    }

    if (!inString && char === '/' && next === '*') {
      // Skip to */
      i += 2;
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i++; // skip /
      continue;
    }

    result += char;
  }

  return result;
}
```

### Fix 3.3 - Safe copyDir

```typescript
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip symlinks for security
    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}
```

---

## 6. BACKWARD COMPATIBILITY

| Scenario | Status |
|----------|--------|
| Extension-installed → bootstrap.sh upgrade | PARTIAL (missing context.json fields) |
| bootstrap.sh-installed → extension upgrade | BROKEN (no upgrade detection) |
| CI/CD using generated files | PARTIAL (missing config sections) |

---

## 7. CONCLUSION

The P0-P2 fixes improved the installer significantly, but **3 new bugs were introduced** and **critical features are still missing**. The comment stripping bug and symlink vulnerability are **security concerns** that must be fixed before release.

**Estimated remediation time:** 4-6 hours for P0-P1 fixes
