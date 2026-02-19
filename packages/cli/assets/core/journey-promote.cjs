#!/usr/bin/env node
/**
 * ARTK Journey Promote — Deterministic Quality Gatekeeper
 *
 * This file is CommonJS (.cjs) to ensure compatibility with ALL Node.js versions
 * (14-22+) and ALL project configurations (ESM or CJS package.json).
 *
 * Runs 6 sequential quality gates on a journey + its linked test files.
 * Only promotes (sets status: implemented) if ALL gates pass.
 *
 * Usage: node journey-promote.cjs <journey-file> <harness-root> [options]
 *
 * Options:
 *   --verbose          Verbose output
 *   --json             JSON output for programmatic consumption
 *   --dry-run          Run gates but don't modify journey frontmatter
 *   --skip-verify      Skip runtime test execution (Gate 5)
 *   --skip-llkb        Skip LLKB learning check (Gate 6)
 *   --heal             Enable test healing during verify
 *   --heal-attempts N  Max healing attempts (default: 2)
 *
 * Exit codes:
 *   0 - All gates pass (journey promoted or --dry-run)
 *   1 - One or more gates failed
 *   2 - Pre-condition failure (missing files, invalid input)
 *
 * Gates (ALL run, no short-circuit):
 *   1. Empty Stub Detection    — test files have await/expect/test.step
 *   2. TSC Compilation         — npx tsc --noEmit (SKIP if no tsconfig.json)
 *   3. Scenario Coverage       — AC references in tests (>= 80%)
 *   4. Static Validation       — npx artk-autogen validate (SKIP if unavailable)
 *   5. Runtime Verification    — npx artk-autogen verify (SKIP if --skip-verify)
 *   6. LLKB Learning           — learned-patterns.json has journey ID (SKIP if --skip-llkb)
 *
 * Evidence is always written to: <harnessRoot>/.artk/evidence/<JRN-ID>/gates.json
 */
'use strict';

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var spawnSync = childProcess.spawnSync;

// ============================================================================
// CONSTANTS
// ============================================================================
var TIMEOUT_TSC = 120000;      // 2 min for tsc
var TIMEOUT_VALIDATE = 60000;  // 1 min for artk-autogen validate
var TIMEOUT_VERIFY = 300000;   // 5 min for artk-autogen verify
var MIN_AC_COVERAGE = 80;      // percentage

// ============================================================================
// ARGUMENT PARSING
// ============================================================================
function parseArgs(argv) {
  var args = {
    journeyFile: null,
    harnessRoot: null,
    verbose: false,
    json: false,
    dryRun: false,
    skipVerify: false,
    skipLlkb: false,
    heal: false,
    healAttempts: 2,
  };

  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--skip-verify') {
      args.skipVerify = true;
    } else if (arg === '--skip-llkb') {
      args.skipLlkb = true;
    } else if (arg === '--heal') {
      args.heal = true;
    } else if (arg === '--heal-attempts' && i + 1 < argv.length) {
      args.healAttempts = parseInt(argv[++i], 10) || 2;
    } else if (!arg.startsWith('-') && !args.journeyFile) {
      args.journeyFile = arg;
    } else if (!arg.startsWith('-') && !args.harnessRoot) {
      args.harnessRoot = arg;
    }
  }

  return args;
}

// ============================================================================
// HELPERS
// ============================================================================
function padRight(str, len) {
  while (str.length < len) str += ' ';
  return str;
}

function padLeft(str, len) {
  while (str.length < len) str = ' ' + str;
  return str;
}

function log(verbose, msg) {
  if (verbose) console.log(msg);
}

/**
 * Parse journey frontmatter from markdown file.
 * Tries to use the 'yaml' package from harnessRoot/node_modules.
 * Falls back to regex parsing for basic fields.
 */
function parseJourneyFrontmatter(filePath, harnessRoot) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  var yamlStr = match[1];
  var parsed = null;

  // Try yaml library from harnessRoot
  try {
    var yamlLib = require(path.join(harnessRoot, 'node_modules', 'yaml'));
    parsed = yamlLib.parse(yamlStr);
  } catch (_e) {
    // Fall back to regex parsing
    parsed = parseYamlFallback(yamlStr);
  }

  return {
    frontmatter: parsed,
    yamlStr: yamlStr,
    fullContent: content,
    body: content.slice(match[0].length),
  };
}

/**
 * Regex-based fallback YAML parser for basic scalar/array fields.
 */
function parseYamlFallback(yamlStr) {
  var result = {};
  var lines = yamlStr.split(/\r?\n/);

  var currentKey = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // Key: value
    var kvMatch = line.match(/^(\w[\w-]*):\s*(.+)?$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      // H3: Guard against prototype pollution
      if (currentKey === '__proto__' || currentKey === 'constructor' || currentKey === 'prototype') {
        continue;
      }
      var val = (kvMatch[2] || '').trim();
      if (val === '' || val === '[]') {
        result[currentKey] = [];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // Inline array: [a, b, c]
        result[currentKey] = val.slice(1, -1).split(',').map(function(s) { return s.trim().replace(/^["']|["']$/g, ''); });
      } else {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
      }
      continue;
    }
    // Array item: - value
    var arrMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      result[currentKey].push(arrMatch[1].trim().replace(/^["']|["']$/g, ''));
    }
  }

  return result;
}

/**
 * Get test file paths from journey frontmatter tests[] array.
 * Resolves paths relative to the journey file's parent directory,
 * or relative to harnessRoot.
 */
function resolveTestPaths(journey, journeyFile, harnessRoot) {
  var fm = journey.frontmatter;
  var tests = fm.tests || [];
  if (!Array.isArray(tests)) tests = [];

  var resolved = [];
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    // Handle object format { path: "...", ... }
    var testPath = (typeof t === 'string') ? t : (t && t.path ? t.path : null);
    if (!testPath) continue;

    // H4: Boundary check — resolved path must be within harnessRoot or journeyFile parent
    var abs = path.resolve(harnessRoot, testPath);
    var journeyDir = path.dirname(journeyFile);
    if (!abs.startsWith(harnessRoot + path.sep) && !abs.startsWith(journeyDir + path.sep)) {
      // Path escapes both boundaries — skip with warning
      continue;
    }

    // Try relative to harnessRoot first
    if (fs.existsSync(abs)) {
      resolved.push(abs);
      continue;
    }
    // Try relative to journey file
    abs = path.resolve(path.dirname(journeyFile), testPath);
    if (fs.existsSync(abs)) {
      resolved.push(abs);
      continue;
    }
    // Keep unresolved path for error reporting
    resolved.push(path.resolve(harnessRoot, testPath));
  }

  return resolved;
}

/**
 * Normalize an AC ID by stripping leading zeros (AC-01 → AC-1).
 */
function normalizeACId(ac) {
  return 'AC-' + parseInt(ac.replace('AC-', ''), 10);
}

/**
 * Extract acceptance criteria IDs from journey body.
 * Matches patterns like AC-1, AC-2, AC-01, etc.
 * Normalizes IDs to strip leading zeros for consistent matching.
 */
function extractACIds(journeyContent) {
  var matches = journeyContent.match(/AC-\d+/g);
  if (!matches) return [];
  // Normalize and deduplicate
  var seen = {};
  var unique = [];
  for (var i = 0; i < matches.length; i++) {
    var normalized = normalizeACId(matches[i]);
    if (!seen[normalized]) {
      seen[normalized] = true;
      unique.push(normalized);
    }
  }
  return unique;
}

/**
 * Check if artk-autogen is available in harnessRoot.
 */
function isAutogenAvailable(harnessRoot) {
  var localBin = path.join(harnessRoot, 'node_modules', '.bin', 'artk-autogen');
  if (fs.existsSync(localBin)) return true;

  try {
    var result = spawnSync('npx', ['--no-install', 'artk-autogen', '--version'], {
      stdio: 'pipe',
      cwd: harnessRoot,
      timeout: 10000,
      shell: process.platform === 'win32',
    });
    return result.status === 0;
  } catch (_e) {
    return false;
  }
}

// ============================================================================
// GATE 1: Empty Stub Detection
// ============================================================================
function gateEmptyStubDetection(testPaths, verbose) {
  var start = Date.now();
  var results = [];
  var allPass = true;

  for (var i = 0; i < testPaths.length; i++) {
    var testPath = testPaths[i];
    var filename = path.basename(testPath);

    if (!fs.existsSync(testPath)) {
      results.push({ file: filename, status: 'FAIL', reason: 'file not found' });
      allPass = false;
      continue;
    }

    var content = fs.readFileSync(testPath, 'utf-8');

    var awaitCount = (content.match(/await\s/g) || []).length;
    var expectCount = (content.match(/expect\s*\(/g) || []).length;
    var testStepCount = (content.match(/test\.step\s*\(/g) || []).length;

    // Check for empty test bodies: async ({ page }) => { } or async (...) => { /* comments only */ }
    var emptyBodies = (content.match(/=>\s*\{\s*(\}|\/\/[^\n]*\s*\}|\/\*[\s\S]*?\*\/\s*\})/g) || []).length;

    var issues = [];
    if (awaitCount < 1) issues.push('no await statements');
    if (expectCount < 1) issues.push('no expect() assertions');
    if (testStepCount < 1) issues.push('no test.step() blocks');
    if (emptyBodies > 0) issues.push(emptyBodies + ' empty test body(ies)');

    if (issues.length > 0) {
      results.push({
        file: filename,
        status: 'FAIL',
        reason: issues.join('; '),
        counts: { await: awaitCount, expect: expectCount, testStep: testStepCount, emptyBodies: emptyBodies },
      });
      allPass = false;
    } else {
      results.push({
        file: filename,
        status: 'PASS',
        counts: { await: awaitCount, expect: expectCount, testStep: testStepCount, emptyBodies: 0 },
      });
    }

    log(verbose, '    ' + filename + ': await=' + awaitCount + ' expect=' + expectCount + ' test.step=' + testStepCount + (issues.length ? ' [FAIL: ' + issues.join(', ') + ']' : ' [PASS]'));
  }

  return {
    name: 'empty-stub-detection',
    status: testPaths.length === 0 ? 'FAIL' : (allPass ? 'PASS' : 'FAIL'),
    durationMs: Date.now() - start,
    results: results,
    detail: testPaths.length === 0 ? 'no test files found' : undefined,
  };
}

// ============================================================================
// GATE 2: TSC Compilation
// ============================================================================
function gateTscCompilation(harnessRoot, verbose) {
  var start = Date.now();
  var tsconfigPath = path.join(harnessRoot, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    log(verbose, '    tsconfig.json not found — SKIP');
    return {
      name: 'tsc-compilation',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'no tsconfig.json in harnessRoot' }],
    };
  }

  log(verbose, '    Running: npx tsc --noEmit');

  var result = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: harnessRoot,
    stdio: 'pipe',
    timeout: TIMEOUT_TSC,
    shell: process.platform === 'win32',
    env: Object.assign({}, process.env),
  });

  var stdout = (result.stdout || '').toString().trim();
  var stderr = (result.stderr || '').toString().trim();
  var passed = result.status === 0;

  if (verbose && !passed) {
    if (stdout) console.log('    TSC stdout:\n' + stdout.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
    if (stderr) console.log('    TSC stderr:\n' + stderr.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
  }

  return {
    name: 'tsc-compilation',
    status: passed ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    results: [{
      exitCode: result.status,
      errors: passed ? [] : (stdout + '\n' + stderr).split('\n').filter(function(l) { return l.match(/error TS/); }).slice(0, 10),
    }],
  };
}

// ============================================================================
// GATE 3: Scenario Coverage
// ============================================================================
function gateScenarioCoverage(journey, testPaths, verbose) {
  var start = Date.now();
  var acIds = extractACIds(journey.fullContent);

  if (acIds.length === 0) {
    log(verbose, '    No AC-N patterns found in journey — SKIP');
    return {
      name: 'scenario-coverage',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'no AC-N identifiers found in journey' }],
    };
  }

  // Read all test file contents
  var testContent = '';
  for (var i = 0; i < testPaths.length; i++) {
    if (fs.existsSync(testPaths[i])) {
      testContent += fs.readFileSync(testPaths[i], 'utf-8') + '\n';
    }
  }

  // Extract and normalize AC IDs from test content for consistent matching
  var testACMatches = testContent.match(/AC-\d+/g) || [];
  var testACSet = {};
  for (var t = 0; t < testACMatches.length; t++) {
    testACSet[normalizeACId(testACMatches[t])] = true;
  }

  var covered = [];
  var missing = [];
  for (var j = 0; j < acIds.length; j++) {
    var ac = acIds[j];
    if (testACSet[ac]) {
      covered.push(ac);
    } else {
      missing.push(ac);
    }
  }

  var coverage = Math.round((covered.length / acIds.length) * 100);
  var passed = coverage >= MIN_AC_COVERAGE;

  log(verbose, '    ACs found: ' + acIds.join(', '));
  log(verbose, '    Coverage: ' + covered.length + '/' + acIds.length + ' (' + coverage + '%)');
  if (missing.length > 0) {
    log(verbose, '    Missing: ' + missing.join(', '));
  }

  return {
    name: 'scenario-coverage',
    status: passed ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    results: [{
      totalACs: acIds.length,
      covered: covered.length,
      coveragePercent: coverage,
      threshold: MIN_AC_COVERAGE,
      missing: missing,
    }],
  };
}

// ============================================================================
// GATE 4: Static Validation
// ============================================================================
function gateStaticValidation(journeyFile, harnessRoot, verbose) {
  var start = Date.now();

  if (!isAutogenAvailable(harnessRoot)) {
    log(verbose, '    artk-autogen not available — SKIP');
    return {
      name: 'static-validation',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'artk-autogen not available' }],
    };
  }

  log(verbose, '    Running: npx artk-autogen validate ' + path.basename(journeyFile) + ' --strict');

  var result = spawnSync('npx', ['artk-autogen', 'validate', journeyFile, '--strict'], {
    cwd: harnessRoot,
    stdio: 'pipe',
    timeout: TIMEOUT_VALIDATE,
    shell: process.platform === 'win32',
    env: Object.assign({}, process.env),
  });

  var stdout = (result.stdout || '').toString().trim();
  var stderr = (result.stderr || '').toString().trim();
  var passed = result.status === 0;

  if (verbose && !passed) {
    if (stdout) console.log('    Validate stdout:\n' + stdout.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
    if (stderr) console.log('    Validate stderr:\n' + stderr.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
  }

  return {
    name: 'static-validation',
    status: passed ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    results: [{
      exitCode: result.status,
      output: (stdout + '\n' + stderr).trim().split('\n').slice(0, 20),
    }],
  };
}

// ============================================================================
// GATE 5: Runtime Verification
// ============================================================================
function gateRuntimeVerification(journeyFile, harnessRoot, args) {
  var start = Date.now();

  if (args.skipVerify) {
    log(args.verbose, '    --skip-verify flag — SKIP');
    return {
      name: 'runtime-verification',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'skipped by --skip-verify flag' }],
    };
  }

  if (!isAutogenAvailable(harnessRoot)) {
    log(args.verbose, '    artk-autogen not available — SKIP');
    return {
      name: 'runtime-verification',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'artk-autogen not available' }],
    };
  }

  var verifyArgs = ['artk-autogen', 'verify', journeyFile];
  if (args.heal) {
    verifyArgs.push('--heal');
    verifyArgs.push('--heal-attempts');
    verifyArgs.push(String(args.healAttempts));
  }

  log(args.verbose, '    Running: npx ' + verifyArgs.join(' '));

  var result = spawnSync('npx', verifyArgs, {
    cwd: harnessRoot,
    stdio: 'pipe',
    timeout: TIMEOUT_VERIFY,
    shell: process.platform === 'win32',
    env: Object.assign({}, process.env),
  });

  var stdout = (result.stdout || '').toString().trim();
  var stderr = (result.stderr || '').toString().trim();
  var passed = result.status === 0;

  if (args.verbose && !passed) {
    if (stdout) console.log('    Verify stdout:\n' + stdout.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
    if (stderr) console.log('    Verify stderr:\n' + stderr.split('\n').map(function(l) { return '      ' + l; }).join('\n'));
  }

  return {
    name: 'runtime-verification',
    status: passed ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    results: [{
      exitCode: result.status,
      output: (stdout + '\n' + stderr).trim().split('\n').slice(-20),
    }],
  };
}

// ============================================================================
// GATE 6: LLKB Learning
// ============================================================================
function gateLlkbLearning(journeyId, harnessRoot, args) {
  var start = Date.now();

  if (args.skipLlkb) {
    log(args.verbose, '    --skip-llkb flag — SKIP');
    return {
      name: 'llkb-learning',
      status: 'SKIP',
      durationMs: Date.now() - start,
      results: [{ reason: 'skipped by --skip-llkb flag' }],
    };
  }

  var llkbRoot = path.join(harnessRoot, '.artk', 'llkb');
  var learnedPath = path.join(llkbRoot, 'learned-patterns.json');

  if (!fs.existsSync(learnedPath)) {
    log(args.verbose, '    learned-patterns.json not found — FAIL');
    return {
      name: 'llkb-learning',
      status: 'FAIL',
      durationMs: Date.now() - start,
      results: [{ reason: 'learned-patterns.json not found at ' + learnedPath }],
    };
  }

  var data;
  try {
    data = JSON.parse(fs.readFileSync(learnedPath, 'utf-8'));
  } catch (err) {
    return {
      name: 'llkb-learning',
      status: 'FAIL',
      durationMs: Date.now() - start,
      results: [{ reason: 'invalid JSON: ' + err.message }],
    };
  }

  if (!data || !Array.isArray(data.patterns)) {
    return {
      name: 'llkb-learning',
      status: 'FAIL',
      durationMs: Date.now() - start,
      results: [{ reason: 'invalid structure (no patterns array)' }],
    };
  }

  // Check if any pattern references this journey ID
  var journeyPatterns = data.patterns.filter(function(p) {
    // Check sourceJourneys array
    if (Array.isArray(p.sourceJourneys) && p.sourceJourneys.indexOf(journeyId) !== -1) return true;
    // Check journeyId field
    if (p.journeyId === journeyId) return true;
    // Check source field
    if (p.source === journeyId) return true;
    return false;
  });

  var found = journeyPatterns.length > 0;
  log(args.verbose, '    Patterns for ' + journeyId + ': ' + journeyPatterns.length + '/' + data.patterns.length + ' total');

  return {
    name: 'llkb-learning',
    status: found ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    results: [{
      totalPatterns: data.patterns.length,
      journeyPatterns: journeyPatterns.length,
      journeyId: journeyId,
    }],
  };
}

// ============================================================================
// EVIDENCE WRITING
// ============================================================================
function writeEvidence(harnessRoot, journeyId, gates, promoted, previousStatus) {
  var evidenceDir = path.join(harnessRoot, '.artk', 'evidence', journeyId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  var overallStatus = gates.every(function(g) { return g.status === 'PASS' || g.status === 'SKIP'; }) ? 'PASS' : 'FAIL';

  var evidence = {
    version: '1.0',
    generatedBy: 'journey-promote.cjs',
    generatedAt: new Date().toISOString(),
    journeyId: journeyId,
    promoted: promoted,
    overallStatus: overallStatus,
    gates: gates,
    previousStatus: previousStatus,
    newStatus: promoted ? 'implemented' : previousStatus,
  };

  var evidencePath = path.join(evidenceDir, 'gates.json');
  // F7: Refuse to write through symlinks
  if (fs.existsSync(evidencePath) && fs.lstatSync(evidencePath).isSymbolicLink()) {
    throw new Error('Refusing to write to symlink: ' + evidencePath);
  }
  // F5: Atomic write via temp+rename
  var tmpEvidence = evidencePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmpEvidence, JSON.stringify(evidence, null, 2), 'utf-8');
  fs.renameSync(tmpEvidence, evidencePath);
  return evidencePath;
}

// ============================================================================
// FRONTMATTER UPDATE
// ============================================================================
function updateFrontmatter(journeyFile, harnessRoot) {
  var content = fs.readFileSync(journeyFile, 'utf-8');
  var updated;

  // Try yaml library for full parse+stringify
  try {
    var yamlLib = require(path.join(harnessRoot, 'node_modules', 'yaml'));
    var match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
    if (match) {
      var parsed = yamlLib.parse(match[2]);
      parsed.status = 'implemented';
      var newYaml = yamlLib.stringify(parsed).trimEnd();
      updated = match[1] + newYaml + match[3] + content.slice(match[0].length);
    }
  } catch (_e) {
    // Fall back to regex replacement
    updated = null;
  }

  if (!updated) {
    // Regex fallback: replace status: <value> within frontmatter section only
    // BUG-09: Constrain to frontmatter to avoid matching "status:" in body
    var fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)([\s\S]*)$/);
    if (fmMatch) {
      var newFm = fmMatch[2].replace(/^(status:\s*).+$/m, '$1implemented');
      updated = fmMatch[1] + newFm + fmMatch[3] + fmMatch[4];
    } else {
      // No frontmatter delimiters found — best-effort on full content
      updated = content.replace(/^(status:\s*).+$/m, '$1implemented');
    }
  }

  if (updated !== content) {
    // F7: Refuse to write through symlinks
    if (fs.lstatSync(journeyFile).isSymbolicLink()) {
      throw new Error('Refusing to write to symlink: ' + journeyFile);
    }
    // F5: Atomic write via temp+rename
    var tmpJourney = journeyFile + '.tmp.' + process.pid;
    fs.writeFileSync(tmpJourney, updated, 'utf-8');
    fs.renameSync(tmpJourney, journeyFile);
    return true;
  }
  return false;
}

// ============================================================================
// OUTPUT
// ============================================================================
function printSummary(gates, journeyId, promoted, evidencePath, args) {
  if (args.json) return; // JSON output handled separately

  var gateWidth = 24;
  var statusWidth = 6;

  console.log('');
  console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  JOURNEY PROMOTE \u2014 Quality Gates' + padRight('', 28) + '\u2551');
  console.log('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
  console.log('\u2551  Journey: ' + padRight(journeyId, 50) + '\u2551');
  console.log('\u2551' + padRight('', 61) + '\u2551');

  for (var i = 0; i < gates.length; i++) {
    var g = gates[i];
    var label = padRight('  ' + (i + 1) + '. ' + g.name, 38);
    var status = g.status;
    var indicator = status === 'PASS' ? 'PASS' : (status === 'SKIP' ? 'SKIP' : 'FAIL');
    console.log('\u2551' + label + padRight(indicator, 23) + '\u2551');
  }

  console.log('\u2551' + padRight('', 61) + '\u2551');

  if (promoted) {
    console.log('\u2551  Result: PROMOTED to implemented' + padRight('', 27) + '\u2551');
  } else if (args.dryRun) {
    var wouldPass = gates.every(function(g) { return g.status === 'PASS' || g.status === 'SKIP'; });
    console.log('\u2551  Result: DRY RUN \u2014 ' + (wouldPass ? 'WOULD PASS' : 'WOULD FAIL') + padRight('', wouldPass ? 22 : 22) + '\u2551');
  } else {
    console.log('\u2551  Result: NOT PROMOTED (gates failed)' + padRight('', 24) + '\u2551');
  }

  console.log('\u2551  Evidence: ' + padRight(path.basename(evidencePath), 49) + '\u2551');
  console.log('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');

  // Print failure details
  var failures = gates.filter(function(g) { return g.status === 'FAIL'; });
  if (failures.length > 0) {
    console.log('');
    console.log('Failing gates:');
    for (var j = 0; j < failures.length; j++) {
      var f = failures[j];
      console.log('');
      console.log('  ' + f.name + ':');
      // H2: Print top-level detail (e.g. "no test files found" when tests[] is empty)
      if (f.detail) {
        console.log('    - ' + f.detail);
      }
      if (f.results && f.results.length > 0) {
        for (var k = 0; k < f.results.length; k++) {
          var r = f.results[k];
          if (r.reason) {
            console.log('    - ' + r.reason);
          } else if (r.file && r.status === 'FAIL') {
            console.log('    - ' + r.file + ': ' + (r.reason || 'failed'));
          } else if (r.missing && r.missing.length > 0) {
            console.log('    - Missing ACs: ' + r.missing.join(', '));
            console.log('    - Coverage: ' + r.coveragePercent + '% (threshold: ' + r.threshold + '%)');
          } else if (r.errors && r.errors.length > 0) {
            for (var e = 0; e < Math.min(r.errors.length, 5); e++) {
              console.log('    - ' + r.errors[e]);
            }
          }
        }
      }
    }

    console.log('');
    console.log('Fix suggestions:');
    for (var m = 0; m < failures.length; m++) {
      var fg = failures[m];
      switch (fg.name) {
        case 'empty-stub-detection':
          console.log('  - Re-run AutoGen or manually add await/expect/test.step to test files');
          break;
        case 'tsc-compilation':
          console.log('  - Fix TypeScript errors shown above, then re-run');
          break;
        case 'scenario-coverage':
          console.log('  - Add missing AC references to test.step() or expect() calls');
          break;
        case 'static-validation':
          console.log('  - Run: npx artk-autogen validate <journey> --strict');
          break;
        case 'runtime-verification':
          console.log('  - Run: npx artk-autogen verify <journey> --heal');
          break;
        case 'llkb-learning':
          console.log('  - Run: npx artk-autogen generate <journey> to record patterns');
          break;
      }
    }
  }
}

function printJsonOutput(gates, journeyId, promoted, evidencePath, previousStatus) {
  var overallStatus = gates.every(function(g) { return g.status === 'PASS' || g.status === 'SKIP'; }) ? 'PASS' : 'FAIL';
  var output = {
    version: '1.0',
    generatedBy: 'journey-promote.cjs',
    generatedAt: new Date().toISOString(),
    journeyId: journeyId,
    promoted: promoted,
    overallStatus: overallStatus,
    gates: gates,
    previousStatus: previousStatus,
    newStatus: promoted ? 'implemented' : previousStatus,
    evidencePath: evidencePath,
  };
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  var args = parseArgs(process.argv);

  if (!args.journeyFile || !args.harnessRoot) {
    console.error('ARTK Journey Promote — Deterministic Quality Gatekeeper');
    console.error('');
    console.error('Usage: node journey-promote.cjs <journey-file> <harness-root> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --verbose          Verbose output');
    console.error('  --json             JSON output for programmatic consumption');
    console.error('  --dry-run          Run gates but don\'t modify journey frontmatter');
    console.error('  --skip-verify      Skip runtime test execution (Gate 5)');
    console.error('  --skip-llkb        Skip LLKB learning check (Gate 6)');
    console.error('  --heal             Enable test healing during verify');
    console.error('  --heal-attempts N  Max healing attempts (default: 2)');
    console.error('');
    console.error('Exit codes: 0=all pass, 1=gate failure, 2=pre-condition failure');
    console.error('');
    console.error('Example:');
    console.error('  node journey-promote.cjs ../journeys/clarified/JRN-0001.md ./artk-e2e --verbose');
    process.exit(2);
  }

  var journeyFile = path.resolve(args.journeyFile);
  var harnessRoot = path.resolve(args.harnessRoot);

  // ── Preflight ────────────────────────────────────────────────────────
  if (!fs.existsSync(journeyFile)) {
    if (args.json) {
      console.log(JSON.stringify({ error: 'Journey file not found: ' + journeyFile, exitCode: 2 }));
    } else {
      console.error('FATAL: Journey file not found: ' + journeyFile);
    }
    process.exit(2);
  }

  if (!fs.existsSync(harnessRoot)) {
    if (args.json) {
      console.log(JSON.stringify({ error: 'Harness root not found: ' + harnessRoot, exitCode: 2 }));
    } else {
      console.error('FATAL: Harness root not found: ' + harnessRoot);
    }
    process.exit(2);
  }

  var journey = parseJourneyFrontmatter(journeyFile, harnessRoot);
  if (!journey || !journey.frontmatter) {
    if (args.json) {
      console.log(JSON.stringify({ error: 'Could not parse journey frontmatter', exitCode: 2 }));
    } else {
      console.error('FATAL: Could not parse journey frontmatter from: ' + journeyFile);
    }
    process.exit(2);
  }

  var fm = journey.frontmatter;
  var journeyId = fm.id;
  var previousStatus = fm.status || 'unknown';

  // C4: Validate journeyId to prevent path injection in evidence directory
  if (journeyId && !/^[A-Za-z0-9_-]+$/.test(journeyId)) {
    if (args.json) {
      console.log(JSON.stringify({ error: 'Journey id contains invalid characters (allowed: A-Z, a-z, 0-9, _, -)', exitCode: 2 }));
    } else {
      console.error('FATAL: Journey id contains invalid characters: ' + journeyId);
      console.error('Allowed: A-Z, a-z, 0-9, underscore, hyphen');
    }
    process.exit(2);
  }

  if (!journeyId) {
    if (args.json) {
      console.log(JSON.stringify({ error: 'Journey has no id field in frontmatter', exitCode: 2 }));
    } else {
      console.error('FATAL: Journey has no id field in frontmatter');
    }
    process.exit(2);
  }

  // Resolve test paths
  var testPaths = resolveTestPaths(journey, journeyFile, harnessRoot);

  if (!args.json) {
    console.log('Journey Promote: ' + journeyId);
    console.log('  Journey: ' + journeyFile);
    console.log('  Harness: ' + harnessRoot);
    console.log('  Tests:   ' + testPaths.length + ' file(s)');
    console.log('  Status:  ' + previousStatus);
    if (args.dryRun) console.log('  Mode:    DRY RUN');
    console.log('');
  }

  // ── Run all 6 gates (no short-circuit) ───────────────────────────────
  var gates = [];

  // Gate 1: Empty Stub Detection
  if (!args.json) console.log('Gate 1/6: Empty Stub Detection');
  gates.push(gateEmptyStubDetection(testPaths, args.verbose));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // Gate 2: TSC Compilation
  if (!args.json) console.log('Gate 2/6: TSC Compilation');
  gates.push(gateTscCompilation(harnessRoot, args.verbose));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // Gate 3: Scenario Coverage
  if (!args.json) console.log('Gate 3/6: Scenario Coverage');
  gates.push(gateScenarioCoverage(journey, testPaths, args.verbose));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // Gate 4: Static Validation
  if (!args.json) console.log('Gate 4/6: Static Validation');
  gates.push(gateStaticValidation(journeyFile, harnessRoot, args.verbose));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // Gate 5: Runtime Verification
  if (!args.json) console.log('Gate 5/6: Runtime Verification');
  gates.push(gateRuntimeVerification(journeyFile, harnessRoot, args));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // Gate 6: LLKB Learning
  if (!args.json) console.log('Gate 6/6: LLKB Learning');
  gates.push(gateLlkbLearning(journeyId, harnessRoot, args));
  if (!args.json) console.log('  Result: ' + gates[gates.length - 1].status);

  // ── Determine outcome ────────────────────────────────────────────────
  var allPassOrSkip = gates.every(function(g) { return g.status === 'PASS' || g.status === 'SKIP'; });
  // C1: Gate 1 (empty-stub-detection) MUST pass — cannot be skipped
  var gate1Pass = gates[0] && gates[0].status === 'PASS';
  var allPass = allPassOrSkip && gate1Pass;
  var promoted = false;

  // ── Update frontmatter (only if all pass AND not dry-run) ────────────
  if (allPass && !args.dryRun) {
    try {
      var updated = updateFrontmatter(journeyFile, harnessRoot);
      promoted = updated;
      if (!updated && !args.json) {
        console.log('');
        console.log('NOTE: Frontmatter not changed (status may already be implemented)');
      }
    } catch (updateErr) {
      // C3: Frontmatter update failed — do NOT report success
      if (!args.json) {
        console.error('ERROR: Failed to update frontmatter: ' + updateErr.message);
      }
      allPass = false;
    }
  }

  // ── Write evidence (ALWAYS, AFTER frontmatter attempt) ──────────────
  var evidencePath = writeEvidence(harnessRoot, journeyId, gates, promoted, previousStatus);

  // ── Output ───────────────────────────────────────────────────────────
  if (args.json) {
    printJsonOutput(gates, journeyId, promoted, evidencePath, previousStatus);
  } else {
    printSummary(gates, journeyId, promoted, evidencePath, args);
  }

  // ── Exit ─────────────────────────────────────────────────────────────
  process.exit(allPass ? 0 : 1);
}

main();
