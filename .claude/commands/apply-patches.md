---
mode: agent
description: "Apply patches from Company PC, fix any issues, and push to GitHub (Home PC only)"
---

# Apply Patches from Company PC

**This prompt is for HOME PC use only** (where you CAN push to GitHub).

You are an autonomous agent that applies patches from Company PC, handles any issues automatically, and cleans up when done.

## What You Must Do

1. Check for patch files in `./patches/` (synced from Company PC)
2. If no patches found: report and exit
3. Pull latest changes from remote
4. Apply patches using `git am patches/*.patch`
5. **If issues occur: FIX THEM AUTOMATICALLY** (see below)
6. Push to GitHub
7. **Delete applied patches** (patches/*.patch and patches/README.txt)
8. Confirm success

## Execution Steps

### Step 1: Check for patches
```bash
ls patches/*.patch 2>/dev/null
```

If no patches: Report "No patches to apply" and exit.

### Step 2: Check working directory is clean
```bash
git status --porcelain
```

If not clean:
- **Auto-fix:** Commit any uncommitted changes with message "chore: auto-commit before applying patches"
- Or stash if appropriate

### Step 3: Pull latest changes
```bash
git pull
```

### Step 4: Apply patches
```bash
git am patches/*.patch
```

### Step 5: Handle Issues Automatically

**Issue: Merge conflicts**
```
Applying: Some commit message
error: patch failed: somefile.txt:10
Falling back to 3-way merge...
```

**Auto-fix:**
1. Check conflict files: `git status`
2. Read conflicting files
3. Resolve conflicts intelligently:
   - If trivial (whitespace, import order): auto-resolve
   - If code conflict: analyze both versions, merge intelligently
   - Keep both changes when safe
4. Stage resolved files: `git add <files>`
5. Continue: `git am --continue`

**Issue: Patch already applied**
```
error: patch does not apply
```

**Auto-fix:**
1. Skip: `git am --skip`
2. Continue with next patch

**Issue: Whitespace errors**
```
warning: squelched 3 whitespace errors
```

**Auto-fix:** Ignore (non-critical)

### Step 6: Push to GitHub
```bash
git push
```

### Step 7: Clean up patches
```bash
rm patches/*.patch
rm patches/README.txt 2>/dev/null || true
```

### Step 8: Report success
Show:
- Number of patches applied
- Commits added (git log)
- Confirmation patches were deleted

## Important Autonomy Rules

**You MUST fix issues automatically. Do NOT stop and ask the user.**

Examples of automatic fixes:
- Merge conflicts → Read files, resolve intelligently, continue
- Whitespace errors → Ignore and continue
- Already applied → Skip and continue
- Working directory dirty → Commit or stash automatically

**Only stop if:**
- No patches to apply (normal, just report)
- Critical error you absolutely cannot fix (rare)

## Expected Output

When successful:
```
Checking for patches...
✓ Found 3 patches

Pulling latest changes...
✓ Up to date

Applying patches...
  → Applying: Fix something
  → Applying: Add feature
  → Applying: Update docs (conflict detected)
    → Resolving conflicts in src/file.ts
    → Merged both changes
  → Continuing...
✓ All patches applied

Applied commits:
  abc1234 Fix something
  def5678 Add feature
  ghi9012 Update docs

Pushing to GitHub...
✓ Pushed successfully

Cleaning up patches...
  → Deleted 0001-Fix-something.patch
  → Deleted 0002-Add-feature.patch
  → Deleted 0003-Update-docs.patch
  → Deleted README.txt
✓ Patches cleaned up

╔════════════════════════════════════════════╗
║     All Patches Applied & Pushed ✓        ║
╚════════════════════════════════════════════╝
```

## Troubleshooting Guide (For Reference Only)

You should handle these automatically:

**Conflict resolution strategy:**
1. Read both versions (ours vs theirs)
2. If changes are in different areas: keep both
3. If changes overlap: intelligently merge (prefer safer option)
4. If imports/whitespace: auto-fix
5. Mark resolved and continue

**Already applied patches:**
- Skip with `git am --skip`
- Continue with remaining patches

**Uncommitted changes:**
- Commit with: `git add . && git commit -m "chore: auto-commit before patches"`
- Then continue

## Notes

- **NEVER run this on Company PC** - use `/export-patches` instead
- Patches are deleted (not archived) after successful application
- If you cannot fix an issue, explain what you tried and what the user needs to do manually
