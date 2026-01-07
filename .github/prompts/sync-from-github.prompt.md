---
mode: command
description: "Sync Company PC with GitHub after patches applied on Home PC (Company PC only)"
---

# Sync from GitHub After Patches Applied

**This prompt is for COMPANY PC use only** (after patches were applied on Home PC).

## What it does

After you export patches on Company PC and they're applied on Home PC (pushed to GitHub), this command syncs your branch and automatically removes duplicate commits.

## Why you need this

When patches are applied with `git am`, they create **new commits with different hashes** (even though the content is identical). This means:
- Your local branch has your original commits (hash A, B, C)
- Remote has the same commits applied from patches (hash X, Y, Z)
- After pulling, you'd have both sets (duplicates)

This script automatically detects and removes the duplicates.

## Steps

1. Verify patches were applied on Home PC and pushed to GitHub

2. Run the sync script:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-from-github.ps1
   ```

3. Script will:
   - Fetch latest from GitHub
   - Detect if your local commits were applied via patches
   - Automatically reset your branch to origin (removes duplicates)
   - Clean up any leftover patch files

## Expected Output

### Case 1: Patches were applied (normal case)

```
╔════════════════════════════════════════════╗
║   ARTK Sync from GitHub (Company PC)      ║
╚════════════════════════════════════════════╝

Current branch: main
Fetching latest changes from GitHub...

Status:
  Local commits ahead:  3
  Remote commits ahead: 3

✓ Detected that your 3 local commit(s) were applied via patches on Home PC

Your local commits:
  - Fix authentication bug
  - Add new feature
  - Update docs

These are now on origin/main with different commit hashes (from git am)
Resetting your branch to origin/main to avoid duplicates...

✓ Branch synchronized with origin/main
✓ Duplicate commits removed
✓ Patches cleaned up

╔════════════════════════════════════════════╗
║              Sync Complete                 ║
╚════════════════════════════════════════════╝
```

### Case 2: Patches not applied yet

```
⚠ You have 3 local commit(s) that haven't been applied via patches yet:

  - Fix authentication bug
  - Add new feature
  - Update docs

Next steps:
  1. Run: .\scripts\export-patches.ps1
  2. Wait for patches to sync to Home PC
  3. On Home PC, run: /apply-patches
  4. Then run this script again: .\scripts\sync-from-github.ps1
```

### Case 3: Already up to date

```
Current branch: main
Fetching latest changes from GitHub...
✓ Already up to date with origin/main
✓ Patches cleaned up
```

## Complete Workflow (Company PC → Home PC → Company PC)

**On Company PC:**
1. Make changes → commit
2. `/export-patches` (creates patch files)
3. Wait for patches to sync to Home PC (automatic via your sync tool)

**On Home PC:**
4. `/apply-patches` (applies patches, pushes to GitHub)

**Back on Company PC:**
5. `/sync-from-github` (syncs branch, removes duplicates)

**Result:** Clean git history, no duplicate commits, minimal effort.

## Safety Features

The script is fail-safe:
- ✓ Only resets if local commits match remote commits (were applied via patches)
- ✓ Warns if you have new commits not yet exported
- ✓ Warns if branch has diverged
- ✓ Never deletes untracked commits

## Troubleshooting

**"You have local commits that haven't been applied via patches yet"**
- You exported patches but they weren't applied on Home PC yet
- Or you made new commits after exporting
- Solution: Wait for patches to be applied, or export the new commits

**"Your branch has diverged"**
- Mixed state (some commits applied, some not)
- Solution: Check `git log origin/main..HEAD` to see what you want to keep
- Either export remaining commits or manually reset

## Notes

- **ONLY run this on Company PC** (where you can't push directly)
- Run AFTER patches are applied on Home PC
- Safe to run multiple times (idempotent)
- Cleans up leftover patch files automatically
