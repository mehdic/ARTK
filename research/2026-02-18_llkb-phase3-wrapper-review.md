# LLKB Phase 3 Wrapper — Multi-AI Review Synthesis

**Date:** 2026-02-18
**Participants:** Claude Opus 4.6 (primary), Gemini (gemini-3-pro-preview), Codex CLI
**Target:** `run-llkb-phase3.cjs` + orchestrator prompt + validate prompt

---

## Consensus Matrix

| # | Issue | Claude | Gemini | Codex | Severity | Action |
|---|-------|--------|--------|-------|----------|--------|
| 1 | Command injection via execSync string concat | CRITICAL | CRITICAL | CRITICAL | **CRITICAL** | Fix NOW |
| 2 | NPX interactive prompt hangs execution | HIGH | HIGH | HIGH | **HIGH** | Fix NOW |
| 3 | Exit code 2 → verify hard-fails on missing discovered-patterns | HIGH | HIGH | CRITICAL | **CRITICAL** | Fix NOW |
| 4 | Timeout 120s too short for F12 | HIGH | MEDIUM | HIGH | **HIGH** | Fix NOW |
| 5 | Pattern count gate inconsistency (script: >=1, prompt: >=39) | HIGH | HIGH | HIGH | **HIGH** | Fix NOW |
| 6 | Manifest freshness not checked by validation | MEDIUM | CRITICAL | MEDIUM | **HIGH** | Fix NOW |
| 7 | LLKB dir may not exist for writeManifest | MEDIUM | MEDIUM | LOW | **MEDIUM** | Fix NOW |
| 8 | Anti-fabrication manifest forgeable | MEDIUM | CRITICAL | HIGH | **MEDIUM** | Fix where practical |
| 9 | Backward compatibility (old bootstrap) | MEDIUM | HIGH | MEDIUM | **MEDIUM** | Already handled |
| 10 | Prompt paths not quoted for spaces | LOW | — | MEDIUM | **MEDIUM** | Fix NOW |
| 11 | Manifest write failure silently swallowed | LOW | — | MEDIUM | **MEDIUM** | Fix NOW |
| 12 | Summary table alignment off by 1 | LOW | LOW | LOW | **LOW** | Fix NOW |
| 13 | NPX resolution if --skip-npm used | — | — | HIGH | **MEDIUM** | Fix NOW |
| 14 | No --force passthrough | LOW | — | — | **LOW** | Skip (not worth complexity) |
| 15 | Verify fallback too lenient | — | MEDIUM | — | **LOW** | Already acceptable |

## Detailed Findings + Fixes

### FIX 1: Command Injection (CRITICAL) — All 3 unanimous

**Problem:** Lines 181, 216-218, 247 build shell commands via string concatenation:
```js
const f11Cmd = 'node "' + bootstrapHelper + '" "' + harnessRoot + '" --verbose';
```
A path containing `"` or `;` breaks the quoting and allows arbitrary command execution.

**Fix:** Use `execFileSync` for `node` commands (no shell needed). For `npx`, use `spawnSync` with `shell: true` and properly escaped args, OR detect the binary path and use `execFileSync`.

### FIX 2: NPX `--yes` flag (HIGH) — All 3 unanimous

**Problem:** `npx artk-autogen` may prompt "Need to install?" and hang in non-interactive terminals.

**Fix:** Change to `npx --yes artk-autogen ...`

### FIX 3: Exit Code 2 + Verify Conflict (CRITICAL) — Codex unique insight

**Problem:** The verify step calls `verify-llkb-artifacts.cjs` which checks for `discovered-patterns.json` with `patterns.length > 0` as a REQUIRED check. If F12 fails (no discovered-patterns.json), verify ALSO fails (exit 1), making the "soft failure" path unreachable. The script could exit 1 (hard failure) when it should exit 2 (soft).

**Fix:** Two-part:
1. Change exit code 2 to exit 0 with WARNING text (Copilot treats non-zero as error)
2. When F12 fails, skip the full verify and only check learned-patterns.json (the hard requirement)

### FIX 4: Timeout (HIGH) — All 3 agree

**Problem:** 120s per step is too short for F12 on large codebases.

**Fix:** Per-step timeouts: F11=120s, F12=300s (5 min), Verify=60s. Double F12 timeout on retry.

### FIX 5: Pattern Count Gate (HIGH) — All 3 agree

**Problem:** Script checks `>= 1`, prompt says `>= 39`. Inconsistent.

**Fix:** Add `MIN_SEED_PATTERNS = 39` constant in script. Enforce in wrapper after F11.

### FIX 6: Manifest Freshness (HIGH) — All 3 agree

**Problem:** Stale manifest from previous run passes validation.

**Fix:** Two-part:
1. Delete existing manifest at script start
2. Validation prompt should check `generatedAt` is recent (within last 30 minutes)

### FIX 7: writeManifest mkdir (MEDIUM) — All 3 agree

**Problem:** If F11 fails before creating `.artk/llkb/`, writeManifest throws ENOENT.

**Fix:** Add `fs.mkdirSync(path.dirname(manifestPath), { recursive: true })` in writeManifest.

### FIX 8: Prompt path quoting (MEDIUM) — Codex spotted

**Problem:** Prompt examples show unquoted paths:
```bash
node HARNESS_ROOT_PATH/vendor/artk-core/run-llkb-phase3.cjs HARNESS_ROOT_PATH --verbose
```
Paths with spaces will break.

**Fix:** Quote the paths in examples:
```bash
node "HARNESS_ROOT_PATH/vendor/artk-core/run-llkb-phase3.cjs" "HARNESS_ROOT_PATH" --verbose
```

### FIX 9: Manifest write failure (MEDIUM) — Codex insight

**Problem:** Manifest write failure is silently swallowed, but validation treats missing manifest as hard gate.

**Fix:** If manifest write fails, exit 1 with clear error about permissions.

### FIX 10: Summary table alignment (LOW) — My own analysis

**Problem:** Box width is 65 chars (║ + 63 inner + ║). Content lines compute padding as `34 - 4 = 30` but need `35 - 4 = 31`. Off by 1.

**Fix:** Adjust padding constants.

### FIX 11: NPX resolution with --skip-npm (MEDIUM) — Codex insight

**Problem:** F12 runs `npx artk-autogen` which requires node_modules. If bootstrap used `--skip-npm`, the binary doesn't exist.

**Fix:** Check if `artk-autogen` is resolvable before F12. If not, skip F12 as soft failure with message.

### FIX 12: Anti-fabrication strengthening (MEDIUM) — Gemini + Codex

**Problem:** Manifest is a plain JSON file that Copilot could create manually.

**Fix:** Add to validation prompt: "Read the manifest AND check that `generatedAt` is within last 30 minutes AND `steps.f11.success === true`". Also check that `learnedPatternCount >= 39` IN the manifest matches the actual file on disk.

## Implementation Priority

1. **FIX 1** (injection) + **FIX 2** (npx --yes) + **FIX 3** (exit codes) — Script rewrite of runCommand
2. **FIX 4** (timeout) + **FIX 5** (pattern count) + **FIX 6** (freshness) — Script constants + logic
3. **FIX 7** (mkdir) + **FIX 9** (manifest error) + **FIX 10** (alignment) — Script small fixes
4. **FIX 8** (prompt quoting) + **FIX 11** (npx resolution) + **FIX 12** (anti-fabrication) — Prompt + script
