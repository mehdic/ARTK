---
mode: command
description: "Export local commits as patches for syncing to Home PC (Company PC only)"
---

# Export Patches for Dual-PC Workflow

**This prompt is for COMPANY PC use only** (where you can't push to GitHub).

## What it does

Exports all local commits that aren't on origin/main as patch files in the `./patches/` folder. Your sync tool will automatically sync these patches to your Home PC.

## Steps

1. Verify you have unpushed commits:
   ```bash
   git log --oneline origin/main..HEAD
   ```

2. Run the export script:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-patches.ps1
   ```

3. Verify patches were created:
   ```bash
   ls patches/
   ```

4. Wait for your sync tool to sync the patches/ folder to Home PC

5. On Home PC, use `/apply-patches` to apply and push them

## Expected Output

```
╔════════════════════════════════════════════╗
║     ARTK Patch Export Script               ║
╚════════════════════════════════════════════╝

Current branch: main
Found 3 local commit(s) to export

Commits to export:
  abc1234 Fix something
  def5678 Add feature
  ghi9012 Update docs

Exporting patches to: .\patches

✓ Exported 3 patch(es)

Next steps:
  1. Your sync tool will sync the patches folder to Home PC
  2. On Home PC, run: ./scripts/apply-patches.sh
```

## Files Created

- `patches/0001-*.patch`
- `patches/0002-*.patch`
- `patches/README.txt` (with instructions)

These files will be synced to Home PC automatically.

## Error: No commits to export

If you see "No local commits to export", it means:
- All commits are already pushed to origin, OR
- You haven't made any commits yet

Make your changes, commit them, then run this command again.

## Notes

- **NEVER run this on Home PC** - use `/apply-patches` instead
- Patches are automatically ignored by git (see .gitignore)
- Each export overwrites previous patches (they're applied on Home PC anyway)
