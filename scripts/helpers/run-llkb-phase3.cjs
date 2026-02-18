#!/usr/bin/env node
/**
 * ARTK LLKB Phase 3 Runner — Single-command wrapper for discover-foundation
 *
 * This file is CommonJS (.cjs) to ensure compatibility with ALL Node.js versions
 * (14-22+) and ALL project configurations (ESM or CJS package.json).
 *
 * Consolidates the 3 LLKB initialization steps into one command so that
 * GitHub Copilot agent mode can invoke it as a single terminal command
 * rather than interpreting 3 separate bash blocks.
 *
 * Usage: node run-llkb-phase3.cjs <harness-root> [options]
 *
 * Options:
 *   --verbose          Verbose output
 *   --project-root     Explicit project root (default: parent of harness-root)
 *   --skip-discover    Skip F12 discovery (only run F11 seed + verify)
 *
 * Exit codes:
 *   0 - All steps succeeded (or soft failure with WARNING)
 *   1 - Hard failure (learned-patterns.json missing or invalid)
 *
 * Steps executed:
 *   F11: node bootstrap-llkb.cjs <harness-root> --verbose
 *   F12: npx artk-autogen llkb-patterns discover --project-root .. --llkb-root .artk/llkb
 *   Verify: node verify-llkb-artifacts.cjs <llkb-root> --verbose
 *
 * After completion, writes a manifest to <llkb-root>/.phase3-manifest.json
 * that records timestamps and pattern counts for verification.
 */
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSTANTS
// ============================================================================
const MIN_SEED_PATTERNS = 39;
const TIMEOUT_F11 = 120000;   // 2 min for bootstrap/seed
const TIMEOUT_F12 = 300000;   // 5 min for pattern discovery
const TIMEOUT_F12_RETRY = 600000; // 10 min for retry (double)
const TIMEOUT_VERIFY = 60000; // 1 min for verification

// ============================================================================
// ARGUMENT PARSING
// ============================================================================
function parseArgs(argv) {
  const args = {
    harnessRoot: null,
    verbose: false,
    projectRoot: null,
    skipDiscover: false,
  };

  for (let i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--skip-discover') {
      args.skipDiscover = true;
    } else if (arg === '--project-root' && i + 1 < argv.length) {
      args.projectRoot = argv[++i];
    } else if (!arg.startsWith('-') && !args.harnessRoot) {
      args.harnessRoot = arg;
    }
  }

  return args;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Run a Node.js script safely using execFileSync (no shell, no injection risk).
 */
function runNodeScript(label, scriptPath, scriptArgs, opts) {
  var verbose = opts.verbose;
  var timeout = opts.timeout || TIMEOUT_F11;
  console.log('');
  console.log('--- ' + label + ' ---');
  if (verbose) {
    console.log('  Script: ' + scriptPath);
    console.log('  Args: ' + scriptArgs.join(' '));
  }

  try {
    execFileSync(process.execPath, [scriptPath].concat(scriptArgs), {
      stdio: 'inherit',
      cwd: opts.cwd || undefined,
      env: Object.assign({}, process.env),
      timeout: timeout,
    });
    console.log('  Result: SUCCESS');
    return { success: true };
  } catch (err) {
    console.error('  Result: FAILED');
    if (verbose && err.message) {
      console.error('  Error: ' + err.message);
    }
    return { success: false, error: err.message || 'unknown error' };
  }
}

/**
 * Run npx command safely using spawnSync.
 * Uses shell: true because npx is a shell script/batch file on some platforms.
 */
function runNpxCommand(label, npxArgs, opts) {
  var verbose = opts.verbose;
  var timeout = opts.timeout || TIMEOUT_F12;
  console.log('');
  console.log('--- ' + label + ' ---');
  if (verbose) {
    console.log('  Command: npx --yes ' + npxArgs.join(' '));
    if (opts.cwd) console.log('  CWD: ' + opts.cwd);
  }

  try {
    var result = spawnSync('npx', ['--yes'].concat(npxArgs), {
      stdio: 'inherit',
      cwd: opts.cwd || undefined,
      env: Object.assign({}, process.env),
      timeout: timeout,
      shell: true, // Required: npx is a .cmd on Windows
    });

    if (result.status === 0) {
      console.log('  Result: SUCCESS');
      return { success: true };
    } else {
      console.error('  Result: FAILED (exit code ' + result.status + ')');
      return { success: false, error: 'exit code ' + result.status };
    }
  } catch (err) {
    console.error('  Result: FAILED');
    if (verbose && err.message) {
      console.error('  Error: ' + err.message);
    }
    return { success: false, error: err.message || 'unknown error' };
  }
}

function countPatterns(filePath) {
  if (!fs.existsSync(filePath)) return -1;
  try {
    var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data && Array.isArray(data.patterns)) return data.patterns.length;
    return -1;
  } catch (err) {
    return -1;
  }
}

function writeManifest(llkbRoot, results) {
  var manifestPath = path.join(llkbRoot, '.phase3-manifest.json');
  var manifest = {
    generatedBy: 'run-llkb-phase3.cjs',
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    steps: results,
    learnedPatternCount: countPatterns(path.join(llkbRoot, 'learned-patterns.json')),
    discoveredPatternCount: countPatterns(path.join(llkbRoot, 'discovered-patterns.json')),
  };

  try {
    // Ensure directory exists (F11 may have failed before creating it)
    fs.mkdirSync(llkbRoot, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    // Manifest is required by the validation gate — fail hard
    console.error('');
    console.error('FATAL: Could not write manifest to ' + manifestPath);
    console.error('  Error: ' + err.message);
    console.error('  Check write permissions on: ' + llkbRoot);
    process.exit(1);
  }

  return manifest;
}

/**
 * Delete stale manifest from a previous run to prevent freshness bypass.
 */
function deleteStaleManifest(llkbRoot) {
  var manifestPath = path.join(llkbRoot, '.phase3-manifest.json');
  try {
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
  } catch (err) {
    // Non-fatal — will be overwritten anyway
  }
}

/**
 * Check if artk-autogen CLI is available (for F12).
 */
function isAutogenAvailable(cwd) {
  // Check local node_modules first
  var localBin = path.join(cwd, 'node_modules', '.bin', 'artk-autogen');
  if (fs.existsSync(localBin)) return true;

  // Check if npx can resolve it without install (best-effort check)
  try {
    var result = spawnSync('npx', ['--no-install', 'artk-autogen', '--version'], {
      stdio: 'pipe',
      cwd: cwd,
      timeout: 10000,
      shell: true,
    });
    return result.status === 0;
  } catch (err) {
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  var args = parseArgs(process.argv);

  if (!args.harnessRoot) {
    console.error('ARTK LLKB Phase 3 Runner');
    console.error('');
    console.error('Usage: node run-llkb-phase3.cjs <harness-root> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --verbose          Verbose output');
    console.error('  --project-root     Explicit project root (default: parent of harness-root)');
    console.error('  --skip-discover    Skip F12 discovery (only run F11 seed + verify)');
    console.error('');
    console.error('Example: node run-llkb-phase3.cjs ./artk-e2e --verbose');
    process.exit(1);
  }

  var harnessRoot = path.resolve(args.harnessRoot);
  var projectRoot = args.projectRoot ? path.resolve(args.projectRoot) : path.dirname(harnessRoot);
  var llkbRoot = path.join(harnessRoot, '.artk', 'llkb');
  var vendorDir = path.join(harnessRoot, 'vendor', 'artk-core');

  // Locate helpers
  var bootstrapHelper = path.join(vendorDir, 'bootstrap-llkb.cjs');
  var verifyHelper = path.join(vendorDir, 'verify-llkb-artifacts.cjs');

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ARTK LLKB Phase 3 — Initialization + Discovery + Verify    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Harness root:  ' + harnessRoot);
  console.log('  Project root:  ' + projectRoot);
  console.log('  LLKB root:     ' + llkbRoot);

  // ── Pre-flight checks ──────────────────────────────────────────────
  if (!fs.existsSync(harnessRoot)) {
    console.error('');
    console.error('FATAL: Harness root does not exist: ' + harnessRoot);
    process.exit(1);
  }

  if (!fs.existsSync(bootstrapHelper)) {
    console.error('');
    console.error('FATAL: bootstrap-llkb.cjs not found at: ' + bootstrapHelper);
    console.error('Please re-run bootstrap: artk init . --force');
    process.exit(1);
  }

  // Delete stale manifest from previous run (FIX: freshness bypass)
  deleteStaleManifest(llkbRoot);

  var stepResults = {};
  var f12SoftFail = false;

  // ── Step F11: Initialize LLKB + Seed Patterns ──────────────────────
  var f11 = runNodeScript(
    '[F11] Initialize LLKB + Seed Patterns',
    bootstrapHelper,
    [harnessRoot, '--verbose'],
    { verbose: args.verbose, timeout: TIMEOUT_F11 }
  );
  stepResults.f11 = f11;

  if (!f11.success) {
    console.error('');
    console.error('FATAL: LLKB initialization failed (F11).');
    console.error('Please re-run bootstrap: artk init . --force');
    writeManifest(llkbRoot, stepResults);
    process.exit(1);
  }

  // Verify learned-patterns.json exists after F11 with minimum seed count
  var learnedCount = countPatterns(path.join(llkbRoot, 'learned-patterns.json'));
  if (learnedCount < MIN_SEED_PATTERNS) {
    console.error('');
    console.error('FATAL: learned-patterns.json has insufficient patterns after F11.');
    console.error('Expected >= ' + MIN_SEED_PATTERNS + ' seed patterns. Found: ' + learnedCount);
    writeManifest(llkbRoot, stepResults);
    process.exit(1);
  }

  console.log('');
  console.log('  Seed patterns installed: ' + learnedCount);

  // ── Step F12: Run LLKB Pattern Discovery ───────────────────────────
  var f12 = { success: false, skipped: false };

  if (args.skipDiscover) {
    console.log('');
    console.log('--- [F12] Pattern Discovery: SKIPPED (--skip-discover) ---');
    f12 = { success: true, skipped: true };
  } else {
    // Check if artk-autogen is available
    if (!isAutogenAvailable(harnessRoot)) {
      console.log('');
      console.log('--- [F12] Pattern Discovery: SKIPPED ---');
      console.log('  artk-autogen CLI not found in node_modules.');
      console.log('  If npm install was skipped, run: npm install');
      console.log('  Then re-run this command.');
      f12 = { success: false, skipped: false, reason: 'artk-autogen not available' };
      f12SoftFail = true;
    } else {
      var f12Args = [
        'artk-autogen', 'llkb-patterns', 'discover',
        '--project-root', projectRoot,
        '--llkb-root', llkbRoot,
      ];
      f12 = runNpxCommand('[F12] Run LLKB Pattern Discovery Pipeline', f12Args, {
        verbose: args.verbose,
        cwd: harnessRoot,
        timeout: TIMEOUT_F12,
      });

      // F12 failure is NOT fatal — retry once with longer timeout
      if (!f12.success) {
        console.log('');
        console.log('  Retrying F12 once (with extended timeout)...');
        f12 = runNpxCommand('[F12] Pattern Discovery (retry)', f12Args, {
          verbose: args.verbose,
          cwd: harnessRoot,
          timeout: TIMEOUT_F12_RETRY,
        });
      }

      if (!f12.success) {
        f12SoftFail = true;
      }
    }

    if (f12SoftFail) {
      console.log('');
      console.log('  WARNING: Pattern discovery (F12) failed.');
      console.log('  This is a SOFT failure — seed patterns from F11 are sufficient.');
      console.log('  journey-implement will work with seed patterns only.');
    }
  }
  stepResults.f12 = f12;

  // ── Verify LLKB Artifacts ──────────────────────────────────────────
  var verify = { success: false };

  if (f12SoftFail) {
    // When F12 failed, only verify the hard requirement (learned-patterns)
    // The full verify script would fail on missing discovered-patterns.json
    console.log('');
    console.log('--- [Verify] LLKB Artifact Verification (seeds only) ---');
    var learnedPath = path.join(llkbRoot, 'learned-patterns.json');
    var verifyCount = countPatterns(learnedPath);
    if (verifyCount >= MIN_SEED_PATTERNS) {
      console.log('  learned-patterns.json: PASS (' + verifyCount + ' patterns)');
      verify = { success: true, seedsOnly: true };
    } else {
      console.error('  learned-patterns.json: FAIL (' + verifyCount + ' patterns, need >= ' + MIN_SEED_PATTERNS + ')');
      verify = { success: false, seedsOnly: true };
    }
  } else if (fs.existsSync(verifyHelper)) {
    verify = runNodeScript(
      '[Verify] LLKB Artifact Verification',
      verifyHelper,
      [llkbRoot, '--verbose'],
      { verbose: args.verbose, timeout: TIMEOUT_VERIFY }
    );
  } else {
    console.log('');
    console.log('--- [Verify] LLKB Artifact Verification ---');
    console.log('  WARNING: verify-llkb-artifacts.cjs not found at: ' + verifyHelper);
    console.log('  Falling back to manual check...');

    // Manual fallback: check the hard requirement only
    var learnedPathFallback = path.join(llkbRoot, 'learned-patterns.json');
    var fallbackCount = countPatterns(learnedPathFallback);
    if (fallbackCount >= MIN_SEED_PATTERNS) {
      console.log('  learned-patterns.json: PASS (' + fallbackCount + ' patterns)');
      verify = { success: true, fallback: true };
    } else {
      console.error('  learned-patterns.json: FAIL (' + fallbackCount + ' patterns, need >= ' + MIN_SEED_PATTERNS + ')');
      verify = { success: false, fallback: true };
    }
  }
  stepResults.verify = verify;

  // ── Write manifest ─────────────────────────────────────────────────
  var manifest = writeManifest(llkbRoot, stepResults);

  // ── Final summary ──────────────────────────────────────────────────
  var f12Status = f12.skipped ? 'SKIP' : f12.success ? 'PASS' : 'WARN';
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ARTK LLKB Phase 3 — Summary                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  F11 (Seed Patterns):     ' + padRight(f11.success ? 'PASS' : 'FAIL', 36) + '║');
  console.log('║  F12 (Pattern Discovery): ' + padRight(f12Status, 36) + '║');
  console.log('║  Verify (Artifact Check): ' + padRight(verify.success ? 'PASS' : 'FAIL', 36) + '║');
  console.log('║                                                               ║');
  console.log('║  Learned patterns:    ' + padLeft(String(manifest.learnedPatternCount), 5) + padRight('', 35) + '║');
  console.log('║  Discovered patterns: ' + padLeft(String(manifest.discoveredPatternCount >= 0 ? manifest.discoveredPatternCount : 'N/A'), 5) + padRight('', 35) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Determine exit code
  if (!f11.success || !verify.success) {
    // Hard failure: seeds failed or verify failed
    console.log('');
    console.log('RESULT: HARD FAILURE — learned-patterns.json is required.');
    process.exit(1);
  }

  if (f12SoftFail) {
    // Soft failure: exit 0 with WARNING (non-zero confuses agent terminals)
    console.log('');
    console.log('WARNING: PARTIAL SUCCESS — seeds OK, discovery failed (soft warning).');
    console.log('RESULT: SUCCESS — LLKB Phase 3 complete (with warnings).');
    process.exit(0);
  }

  console.log('');
  console.log('RESULT: SUCCESS — LLKB Phase 3 complete.');
  process.exit(0);
}

// ── String helpers ───────────────────────────────────────────────────
function padRight(str, len) {
  while (str.length < len) str += ' ';
  return str;
}

function padLeft(str, len) {
  while (str.length < len) str = ' ' + str;
  return str;
}

main();
