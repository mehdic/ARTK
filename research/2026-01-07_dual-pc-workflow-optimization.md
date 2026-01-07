# Dual-PC Workflow Optimization

**Date:** 2026-01-07
**Topic:** Streamlining patch export/import workflow to minimize manual effort and prevent duplicate commits

---

## Current Problems

### Problem 1: Patches in Git Repository
- Patches folder is currently tracked by git (only .patch and README.txt are ignored)
- This causes confusion since patches are synced via external tool, not git
- Patches appear in git status on both machines

### Problem 2: Duplicate Commits on Company PC
**Flow that causes the issue:**
1. Company PC: Makes 3 commits → exports patches
2. Patches sync to Home PC (external tool)
3. Home PC: Applies patches → pushes to GitHub
4. Company PC: Pulls from GitHub
5. **PROBLEM**: Company PC now has:
   - Original 3 local commits (unpushed)
   - Same 3 commits from remote (different commit hashes from git am)
   - Result: 3 duplicate commits sitting there

### Problem 3: Too Much Manual Effort
Current workflow requires:
- Company PC: Export patches, wait for sync, pull from GitHub, manually reset branch
- Home PC: Apply patches, handle conflicts, commit, push
- Multiple manual steps on each machine

---

## Root Cause Analysis

### Why Duplicate Commits Happen
When you `git am` a patch, it creates a **new commit with a different hash** (even if the content is identical). This is because:
- Commit hash = hash(tree + parent + author + committer + timestamp + message)
- The committer timestamp changes when applying patch
- Therefore: same changes ≠ same commit hash

### Why This Matters
- `git pull` brings in the remote commits (new hashes)
- Local commits (old hashes) remain unpushed
- Git sees them as different commits
- You're left with duplicates that need manual cleanup

---

## Solution: Automated Cleanup Workflow

### Design Principle
**Minimize human decisions. Automate the boring, error-prone parts.**

### Solution Components

#### 1. Exclude Patches Folder from Git Entirely

**Update `.gitignore`:**
```gitignore
# Patches folder (synced via external tool, never committed)
patches/
!patches/.gitkeep
```

**Why:** Patches are ephemeral transport mechanism, not source code. They're synced externally (Dropbox/OneDrive/etc), not via git.

#### 2. No Need for Applied Patches Log

**Rationale:**
- Once patches are applied → they're commits in git log
- Git log IS the applied patches log
- No need to duplicate this information

**If you really want tracking (optional):**
- Add to commit message: "Applied from patch: 0001-foo.patch"
- Or use git notes: `git notes add -m "From patch bundle 2026-01-07"`

#### 3. Company PC: Auto-Reset After Export

**Create new script:** `scripts/sync-from-github.ps1` (Company PC only)

**Purpose:** After patches are applied on Home PC and pushed, pull changes and discard local duplicate commits.

**Script logic:**
```powershell
# 1. Fetch latest from remote
git fetch origin

# 2. Check if we have local commits ahead of origin
$CommitsAhead = git rev-list --count origin/main..HEAD

if ($CommitsAhead -eq 0) {
    Write-Host "✓ Already up to date" -ForegroundColor Green
    exit 0
}

# 3. Check if those commits exist on origin (by checking commit messages)
$LocalCommits = git log --format="%s" origin/main..HEAD
$RemoteCommits = git log --format="%s" HEAD..origin/main

# If local commit messages match recent remote commits → safe to reset
$SafeToReset = $true
foreach ($localMsg in $LocalCommits) {
    if ($RemoteCommits -contains $localMsg) {
        # Commit was applied via patches
        continue
    } else {
        # This is a new local commit not yet exported
        $SafeToReset = $false
        break
    }
}

if ($SafeToReset) {
    Write-Host "Detected $CommitsAhead local commits that were applied via patches" -ForegroundColor Yellow
    Write-Host "Resetting to origin/main..." -ForegroundColor Yellow
    git reset --hard origin/main
    Write-Host "✓ Branch synchronized with remote" -ForegroundColor Green
} else {
    Write-Host "⚠ You have new local commits not yet exported as patches" -ForegroundColor Yellow
    Write-Host "Run /export-patches first, then sync again" -ForegroundColor Yellow
}
```

#### 4. Simplified Workflow

**Company PC workflow:**
```
1. Work → Commit changes
2. /export-patches
3. [Wait for patches to sync to Home PC]
4. /sync-from-github  ← NEW: Automatically resets branch after patches applied
```

**Home PC workflow (unchanged):**
```
1. /apply-patches
```

That's it. Two commands per machine, minimal effort.

---

## Alternative Approach: Rebase Instead of Reset

**Safer but slightly more complex:**

Instead of `git reset --hard origin/main`, use:
```powershell
git rebase origin/main
```

**Pros:**
- Preserves any new local commits made after patch export
- Less destructive

**Cons:**
- Can cause rebase conflicts if commits diverged
- More complex to handle automatically

**Verdict:** Use reset approach for simplicity. If you make new commits before syncing, export-patches will catch them.

---

## Edge Cases Handled

### Edge Case 1: Patches Not Yet Applied on Home PC
- Company PC has local commits
- Patches exported but not yet applied on Home PC
- User runs `/sync-from-github` too early
- **Solution:** Script detects local commits don't match remote → warns user to wait

### Edge Case 2: New Commits Made After Export
- Company PC exported patches
- Before syncing, made new commits
- **Solution:** Script detects new commits not on remote → warns user to export first

### Edge Case 3: Patches Partially Applied (Some Failed)
- Home PC applied 2/3 patches, 1 failed
- Company PC syncs
- **Solution:** Script sees local commits not on remote → doesn't reset, warns user

---

## Implementation Plan

### Phase 1: Update .gitignore (Immediate)
```bash
# Add to .gitignore
patches/
!patches/.gitkeep
```

### Phase 2: Create sync-from-github Script (Company PC)
- Create `scripts/sync-from-github.ps1`
- Add Copilot prompt: `.github/prompts/sync-from-github.prompt.md`
- Document in CLAUDE.md

### Phase 3: Update Documentation
- CLAUDE.md: Update workflow to include `/sync-from-github`
- README.md: Add troubleshooting section for duplicate commits

### Phase 4: Test Workflow End-to-End
1. Company PC: Make commits → export patches
2. Sync patches (external tool)
3. Home PC: Apply patches → push
4. Company PC: `/sync-from-github` → verify clean state

---

## Comparison: Before vs After

### Before (Current)
**Company PC:**
1. Make commits
2. Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-patches.ps1`
3. Wait for sync
4. Run: `git pull`
5. **Manually** run: `git reset --hard origin/main` (if you remember)
6. **Manually** clean up patches folder

**Home PC:**
1. Check if patches exist
2. Run: `./scripts/apply-patches.sh`
3. Handle conflicts manually
4. Commit and push

**Total steps:** 9 manual steps, multiple decisions

### After (Optimized)
**Company PC:**
1. Make commits
2. `/export-patches`
3. `/sync-from-github` (after patches applied on Home PC)

**Home PC:**
1. `/apply-patches`

**Total steps:** 4 commands, zero decisions

**Effort reduction:** 55% fewer steps

---

## Benefits

1. **No duplicate commits** - Automatic cleanup after patches applied
2. **Patches excluded from git** - No confusion about which files to track
3. **No manual reset** - Script handles branch synchronization
4. **Fail-safe** - Script warns if unsafe to reset (new commits not exported)
5. **Minimal effort** - 2 commands per machine, fully automated

---

## Recommendation

**Implement Phase 1 immediately** (update .gitignore) - this is safe and solves the patches-in-git problem.

**Implement Phase 2 next** (sync script) - this solves the duplicate commits problem.

**Key insight:** The patch workflow creates duplicate commits by design (git am changes commit hashes). The solution is to **automatically discard the original commits after they're applied remotely** via a smart sync script.

---

## Open Questions

1. **Should we track applied patches at all?**
   - **Answer:** No, git log is sufficient. Each applied patch becomes a commit.

2. **What if user forgets to export patches before syncing?**
   - **Answer:** Script detects local commits not on remote → warns user.

3. **What about branches other than main?**
   - **Answer:** Script should detect current branch and sync with origin/<current-branch>.

4. **Should sync-from-github be automatic (git hook)?**
   - **Answer:** No, explicit command is better - user controls when to sync.
