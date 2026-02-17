#!/usr/bin/env node
/**
 * ARTK LLKB Artifact Verification Helper
 *
 * This file is CommonJS (.cjs) to ensure compatibility with ALL Node.js versions
 * (14-22+) and ALL project configurations (ESM or CJS package.json).
 *
 * Usage: node verify-llkb-artifacts.cjs <llkb-root> [options]
 *
 * Options:
 *   --verbose    Verbose output
 *   --json       Output results as JSON
 *
 * Exit codes:
 *   0 - All checks pass
 *   1 - One or more checks failed
 *
 * Checks:
 *   1. config.yml exists
 *   2. learned-patterns.json exists AND has patterns.length > 0
 *   3. discovered-patterns.json exists AND has patterns.length > 0
 *   4. discovered-profile.json exists
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// ARGUMENT PARSING
// ============================================================================
function parseArgs(argv) {
  const args = {
    llkbRoot: null,
    verbose: false,
    json: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (!arg.startsWith('-') && !args.llkbRoot) {
      args.llkbRoot = arg;
    }
  }

  return args;
}

// ============================================================================
// VERIFICATION CHECKS
// ============================================================================
function verifyArtifacts(llkbRoot, verbose) {
  const results = [];
  const log = (msg) => { if (verbose) console.log(msg); };

  // Check 1: config.yml exists
  const configPath = path.join(llkbRoot, 'config.yml');
  const configExists = fs.existsSync(configPath);
  results.push({
    name: 'config.yml',
    status: configExists ? 'PASS' : 'FAIL',
    detail: configExists ? 'exists' : 'missing',
  });
  log(configExists
    ? '  \u2705 config.yml: exists'
    : '  \u274C config.yml: MISSING');

  // Check 2: learned-patterns.json exists AND has patterns
  const learnedPath = path.join(llkbRoot, 'learned-patterns.json');
  let learnedStatus = 'FAIL';
  let learnedDetail = 'missing';
  let learnedCount = 0;

  if (fs.existsSync(learnedPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(learnedPath, 'utf-8'));
      if (data && Array.isArray(data.patterns)) {
        learnedCount = data.patterns.length;
        if (learnedCount > 0) {
          learnedStatus = 'PASS';
          learnedDetail = learnedCount + ' patterns';
        } else {
          learnedDetail = 'empty patterns array';
        }
      } else {
        learnedDetail = 'invalid structure (no patterns array)';
      }
    } catch (err) {
      learnedDetail = 'invalid JSON: ' + err.message;
    }
  }

  results.push({
    name: 'learned-patterns.json',
    status: learnedStatus,
    detail: learnedDetail,
    count: learnedCount,
  });
  log(learnedStatus === 'PASS'
    ? '  \u2705 learned-patterns.json: ' + learnedCount + ' patterns'
    : '  \u274C learned-patterns.json: ' + learnedDetail);

  // Check 3: discovered-patterns.json exists AND has patterns
  const discoveredPath = path.join(llkbRoot, 'discovered-patterns.json');
  let discoveredStatus = 'FAIL';
  let discoveredDetail = 'missing';
  let discoveredCount = 0;

  if (fs.existsSync(discoveredPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
      if (data && Array.isArray(data.patterns)) {
        discoveredCount = data.patterns.length;
        if (discoveredCount > 0) {
          discoveredStatus = 'PASS';
          discoveredDetail = discoveredCount + ' patterns';
        } else {
          discoveredDetail = 'empty patterns array';
        }
      } else {
        discoveredDetail = 'invalid structure (no patterns array)';
      }
    } catch (err) {
      discoveredDetail = 'invalid JSON: ' + err.message;
    }
  }

  results.push({
    name: 'discovered-patterns.json',
    status: discoveredStatus,
    detail: discoveredDetail,
    count: discoveredCount,
  });
  log(discoveredStatus === 'PASS'
    ? '  \u2705 discovered-patterns.json: ' + discoveredCount + ' patterns'
    : '  \u274C discovered-patterns.json: ' + discoveredDetail);

  // Check 4: discovered-profile.json exists
  const profilePath = path.join(llkbRoot, 'discovered-profile.json');
  let profileStatus = 'FAIL';
  let profileDetail = 'missing';
  let profileFramework = null;

  if (fs.existsSync(profilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        profileStatus = 'PASS';
        profileFramework = (data.application && data.application.framework) ||
                           (data.framework) || 'unknown';
        profileDetail = 'framework: ' + profileFramework;
      } else if (data && typeof data === 'object') {
        profileDetail = 'empty object (no framework data)';
      } else {
        profileDetail = 'invalid structure';
      }
    } catch (err) {
      profileDetail = 'invalid JSON: ' + err.message;
    }
  }

  results.push({
    name: 'discovered-profile.json',
    status: profileStatus,
    detail: profileDetail,
    framework: profileFramework,
  });
  log(profileStatus === 'PASS'
    ? '  \u2705 discovered-profile.json: ' + profileDetail
    : '  \u274C discovered-profile.json: ' + profileDetail);

  return results;
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  const args = parseArgs(process.argv);

  if (!args.llkbRoot) {
    console.error('Usage: node verify-llkb-artifacts.cjs <llkb-root> [--verbose] [--json]');
    console.error('');
    console.error('Verifies that LLKB artifacts exist and have content.');
    console.error('');
    console.error('Example: node verify-llkb-artifacts.cjs /path/to/artk-e2e/.artk/llkb');
    process.exit(1);
  }

  const llkbRoot = path.resolve(args.llkbRoot);

  if (!fs.existsSync(llkbRoot)) {
    if (args.json) {
      console.log(JSON.stringify({
        status: 'FAIL',
        error: 'LLKB root does not exist: ' + llkbRoot,
        results: [],
      }));
    } else {
      console.error('LLKB Artifact Verification: FAIL');
      console.error('  LLKB root does not exist: ' + llkbRoot);
    }
    process.exit(1);
  }

  if (!args.json) {
    console.log('LLKB Artifact Verification');
    console.log('  LLKB root: ' + llkbRoot);
    console.log('');
  }

  const results = verifyArtifacts(llkbRoot, !args.json && args.verbose);
  const allPass = results.every(function(r) { return r.status === 'PASS'; });
  const failCount = results.filter(function(r) { return r.status === 'FAIL'; }).length;

  if (args.json) {
    console.log(JSON.stringify({
      status: allPass ? 'PASS' : 'FAIL',
      llkbRoot: llkbRoot,
      results: results,
      summary: {
        total: results.length,
        passed: results.length - failCount,
        failed: failCount,
      },
    }, null, 2));
  } else {
    console.log('');
    if (allPass) {
      console.log('Result: ALL CHECKS PASSED (' + results.length + '/' + results.length + ')');
    } else {
      console.log('Result: FAILED (' + failCount + '/' + results.length + ' checks failed)');
      console.log('');
      console.log('To fix:');

      for (let i = 0; i < results.length; i++) {
        let r = results[i];
        if (r.status === 'FAIL') {
          if (r.name === 'config.yml' || r.name === 'learned-patterns.json') {
            console.log('  ' + r.name + ': Run "node bootstrap-llkb.cjs <harness-root> --force"');
          } else {
            console.log('  ' + r.name + ': Run "npx artk-autogen llkb-patterns discover --project-root .. --llkb-root .artk/llkb"');
          }
        }
      }
    }
  }

  process.exit(allPass ? 0 : 1);
}

main();
