---
mode: command
description: "Apply patches from Company PC and push to GitHub (Home PC only)"
---

# Apply Patches from Company PC

**This prompt is for HOME PC use only** (where you CAN push to GitHub).

## What it does

1. Checks for patch files in `./patches/` (synced from Company PC)
2. Applies them to your local branch using `git am`
3. Pushes to GitHub
4. Archives applied patches to `patches/.applied/TIMESTAMP/`

## Steps

1. Check if patches exist:
   ```bash
   ls patches/*.patch 2>/dev/null || echo "No patches found"
   ```

2. Run the apply script:
   ```bash
   ./scripts/apply-patches.sh
   ```

3. Verify changes were pushed:
   ```bash
   git log --oneline -3
   ```

## Expected Output

```
╔════════════════════════════════════════════╗
║     ARTK Patch Application Script         ║
╚════════════════════════════════════════════╝

Found 3 patch file(s) to apply:
  - 0001-Fix-something.patch
  - 0002-Add-feature.patch
  - 0003-Update-docs.patch

Pulling latest changes from remote...
Applying patches...
✓ All patches applied successfully

Applied commits:
  abc1234 Fix something
  def5678 Add feature
  ghi9012 Update docs

Pushing to GitHub...
✓ Patches applied and pushed successfully!

Archiving applied patches...
  → 0001-Fix-something.patch
  → 0002-Add-feature.patch
  → 0003-Update-docs.patch
✓ Patches archived to: patches/.applied/20260107_143000

╔════════════════════════════════════════════╗
║           All Done! ✓                      ║
╚════════════════════════════════════════════╝
```

## What Happens

1. **Pull**: Gets latest changes from GitHub
2. **Apply**: Uses `git am` to apply each patch in order
3. **Push**: Pushes all applied commits to GitHub
4. **Archive**: Moves patches to timestamped archive folder

## Error: No patches to apply

If you see "No new patches to apply", it means:
- The patches/ folder is empty, OR
- All patches were already applied and archived

Wait for your sync tool to sync new patches from Company PC.

## Error: Working directory not clean

If you see this error:
```
Error: Working directory not clean
Please commit or stash your changes first.
```

You have uncommitted changes. Either:
- Commit them: `git add . && git commit -m "your message"`
- Stash them: `git stash`
- Discard them: `git reset --hard` (be careful!)

Then run `/apply-patches` again.

## Error: Patch application failed

If `git am` fails with conflicts:
```
Error: Patch application failed

To see the failed patch:
  git am --show-current-patch

To abort:
  git am --abort
```

This means the patch conflicts with your local changes. To fix:
1. Run `git am --show-current-patch` to see the conflict
2. Run `git am --abort` to cancel
3. Manually merge the changes from Company PC

## Notes

- **NEVER run this on Company PC** - use `/export-patches` instead
- Archives are kept in `patches/.applied/` for history (git-ignored)
- You can manually apply patches: `git am patches/*.patch && git push`
