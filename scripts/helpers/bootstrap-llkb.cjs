#!/usr/bin/env node
/**
 * ARTK LLKB Bootstrap Helper
 *
 * This file is CommonJS (.cjs) to ensure compatibility with ALL Node.js versions
 * (14-22+) and ALL project configurations (ESM or CJS package.json).
 *
 * Usage: node bootstrap-llkb.cjs <harness-root> [options]
 *
 * Options:
 *   --verify-only    Only verify LLKB exists, don't create
 *   --verbose        Verbose output
 *   --force          Delete and recreate LLKB even if it exists
 *
 * Exit codes:
 *   0 - Success (LLKB initialized or already exists)
 *   1 - Failure (could not create or verify LLKB)
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================
const CURRENT_VERSION = '1.0.0';
const REQUIRED_FILES = ['config.yml', 'lessons.json', 'components.json', 'analytics.json'];
const REQUIRED_DIRS = ['patterns', 'history'];
const LOCK_FILE_NAME = '.llkb-init.lock';
const LOCK_TIMEOUT_MS = 60000; // 1 minute

// ============================================================================
// ARGUMENT PARSING
// ============================================================================
function parseArgs(argv) {
  const args = {
    harnessRoot: null,
    verifyOnly: false,
    verbose: false,
    force: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--verify-only') {
      args.verifyOnly = true;
    } else if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (!arg.startsWith('-') && !args.harnessRoot) {
      args.harnessRoot = arg;
    }
  }

  return args;
}

// ============================================================================
// PATH VALIDATION (prevents path duplication bug)
// ============================================================================
function validatePath(inputPath) {
  const resolved = path.resolve(inputPath);
  const normalized = path.normalize(resolved);
  const basename = path.basename(normalized);

  // Check for path duplication pattern like "artk-e2e/artk-e2e"
  const duplicatePattern = basename + path.sep + basename;
  if (normalized.includes(duplicatePattern)) {
    return {
      valid: false,
      error: `Path duplication detected: "${inputPath}" contains "${duplicatePattern}"`,
      resolved: null,
    };
  }

  // Also check case-insensitive on Windows
  if (process.platform === 'win32') {
    const lowerNormalized = normalized.toLowerCase();
    const lowerBasename = basename.toLowerCase();
    const lowerDuplicatePattern = lowerBasename + path.sep + lowerBasename;
    if (lowerNormalized.includes(lowerDuplicatePattern)) {
      return {
        valid: false,
        error: `Path duplication detected (case-insensitive): "${inputPath}"`,
        resolved: null,
      };
    }
  }

  return { valid: true, error: null, resolved: normalized };
}

// ============================================================================
// SIMPLE FILE LOCKING (prevents concurrent initialization)
// ============================================================================
function acquireLock(llkbRoot) {
  const lockPath = path.join(path.dirname(llkbRoot), LOCK_FILE_NAME);

  // Check if lock exists and is stale
  if (fs.existsSync(lockPath)) {
    try {
      const lockContent = fs.readFileSync(lockPath, 'utf-8');
      const lockTime = parseInt(lockContent, 10);
      if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
        return { acquired: false, error: 'Another LLKB initialization is in progress' };
      }
      // Lock is stale, remove it
      fs.unlinkSync(lockPath);
    } catch (err) {
      // Ignore errors reading stale lock
    }
  }

  // Create lock file
  try {
    // Ensure parent directory exists
    const lockDir = path.dirname(lockPath);
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
    fs.writeFileSync(lockPath, Date.now().toString(), { flag: 'wx' });
    return { acquired: true, lockPath };
  } catch (err) {
    if (err.code === 'EEXIST') {
      return { acquired: false, error: 'Another LLKB initialization is in progress' };
    }
    // For other errors, proceed without lock (best effort)
    return { acquired: true, lockPath: null };
  }
}

function releaseLock(lockPath) {
  if (lockPath && fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
    } catch (err) {
      // Ignore errors releasing lock
    }
  }
}

// ============================================================================
// CLEANUP ON FAILURE
// ============================================================================
function cleanupCreatedItems(createdItems, verbose) {
  const log = (msg) => { if (verbose) console.log(msg); };

  // Clean up in reverse order (files first, then directories)
  const sortedItems = [...createdItems].sort((a, b) => b.length - a.length);

  for (const item of sortedItems) {
    try {
      if (fs.existsSync(item)) {
        const stat = fs.statSync(item);
        if (stat.isDirectory()) {
          // Only remove if empty
          const contents = fs.readdirSync(item);
          if (contents.length === 0) {
            fs.rmdirSync(item);
            log(`  Cleaned up dir: ${item}`);
          }
        } else {
          fs.unlinkSync(item);
          log(`  Cleaned up file: ${item}`);
        }
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

// ============================================================================
// FORCE DELETE EXISTING LLKB
// ============================================================================
function deleteDirectory(dirPath, verbose) {
  const log = (msg) => { if (verbose) console.log(msg); };

  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      deleteDirectory(fullPath, verbose);
    } else {
      fs.unlinkSync(fullPath);
      log(`  Deleted: ${fullPath}`);
    }
  }
  fs.rmdirSync(dirPath);
  log(`  Deleted dir: ${dirPath}`);
}

// ============================================================================
// LLKB INITIALIZATION
// ============================================================================
function initializeLLKB(llkbRoot, verbose, force) {
  const results = { created: [], skipped: [], errors: [] };

  const log = (msg) => { if (verbose) console.log(msg); };

  // Force delete if requested
  if (force && fs.existsSync(llkbRoot)) {
    console.log('Force mode: deleting existing LLKB...');
    try {
      deleteDirectory(llkbRoot, verbose);
      console.log('Existing LLKB deleted');
    } catch (err) {
      results.errors.push(`Failed to delete existing LLKB: ${err.message}`);
      return results;
    }
  }

  // Create main directory and subdirectories
  const allDirs = [llkbRoot, ...REQUIRED_DIRS.map(d => path.join(llkbRoot, d))];
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        results.created.push(dir);
        log(`  Created dir: ${dir}`);
      } catch (err) {
        results.errors.push(`Failed to create directory ${dir}: ${err.message}`);
        cleanupCreatedItems(results.created, verbose);
        return results;
      }
    } else {
      results.skipped.push(dir);
    }
  }

  // Create config.yml
  const configPath = path.join(llkbRoot, 'config.yml');
  if (!fs.existsSync(configPath)) {
    const configContent = `# LLKB Configuration
# Generated by ARTK bootstrap-llkb.cjs
version: "${CURRENT_VERSION}"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
`;
    try {
      fs.writeFileSync(configPath, configContent, 'utf-8');
      results.created.push(configPath);
      log(`  Created: ${configPath}`);
    } catch (err) {
      results.errors.push(`Failed to create config.yml: ${err.message}`);
      cleanupCreatedItems(results.created, verbose);
      return results;
    }
  } else {
    results.skipped.push(configPath);
  }

  // Create JSON files
  const jsonFiles = {
    'lessons.json': {
      version: CURRENT_VERSION,
      lastUpdated: new Date().toISOString(),
      lessons: [],
      archived: [],
      globalRules: [],
      appQuirks: [],
    },
    'components.json': {
      version: CURRENT_VERSION,
      lastUpdated: new Date().toISOString(),
      components: [],
      componentsByCategory: {
        selector: [],
        timing: [],
        auth: [],
        data: [],
        assertion: [],
        navigation: [],
        'ui-interaction': [],
      },
      componentsByScope: {
        universal: [],
        'framework:angular': [],
        'framework:react': [],
        'framework:vue': [],
        'framework:ag-grid': [],
        'app-specific': [],
      },
    },
    'analytics.json': {
      version: CURRENT_VERSION,
      lastUpdated: new Date().toISOString(),
      overview: {
        totalLessons: 0,
        totalComponents: 0,
        totalApplications: 0,
        lastAnalyzed: null,
      },
      lessonStats: {
        byCategory: {},
        byConfidence: { high: 0, medium: 0, low: 0 },
        trending: [],
      },
      componentStats: {
        byCategory: {},
        mostUsed: [],
        recentlyAdded: [],
      },
      impactMetrics: {
        avgIterationsBeforeLLKB: 0,
        avgIterationsAfterLLKB: 0,
        timesSaved: 0,
      },
    },
  };

  for (const [filename, content] of Object.entries(jsonFiles)) {
    const filePath = path.join(llkbRoot, filename);
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
        results.created.push(filePath);
        log(`  Created: ${filePath}`);
      } catch (err) {
        results.errors.push(`Failed to create ${filename}: ${err.message}`);
        cleanupCreatedItems(results.created, verbose);
        return results;
      }
    } else {
      results.skipped.push(filePath);
    }
  }

  // Create pattern files
  const patternFiles = ['selectors.json', 'timing.json', 'assertions.json', 'auth.json', 'data.json'];
  for (const filename of patternFiles) {
    const filePath = path.join(llkbRoot, 'patterns', filename);
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify({ version: CURRENT_VERSION, patterns: [] }, null, 2), 'utf-8');
        results.created.push(filePath);
        log(`  Created: ${filePath}`);
      } catch (err) {
        results.errors.push(`Failed to create patterns/${filename}: ${err.message}`);
        cleanupCreatedItems(results.created, verbose);
        return results;
      }
    } else {
      results.skipped.push(filePath);
    }
  }

  return results;
}

// ============================================================================
// LLKB VERIFICATION
// ============================================================================
function verifyLLKB(llkbRoot) {
  const issues = { missing: [], invalid: [], version: null };

  // Check main directory
  if (!fs.existsSync(llkbRoot)) {
    issues.missing.push(llkbRoot);
    return { valid: false, issues };
  }

  // Check required files
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(llkbRoot, file);
    if (!fs.existsSync(filePath)) {
      issues.missing.push(file);
    } else if (file.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!content.version) {
          issues.invalid.push(`${file}: missing version field`);
        } else if (file === 'lessons.json') {
          issues.version = content.version;
        }
      } catch (err) {
        issues.invalid.push(`${file}: invalid JSON - ${err.message}`);
      }
    }
  }

  // Check required directories
  for (const dir of REQUIRED_DIRS) {
    const dirPath = path.join(llkbRoot, dir);
    if (!fs.existsSync(dirPath)) {
      issues.missing.push(`${dir}/`);
    }
  }

  return {
    valid: issues.missing.length === 0 && issues.invalid.length === 0,
    issues,
  };
}

// ============================================================================
// VERSION CHECK (improved regex to handle YAML edge cases)
// ============================================================================
function checkVersion(llkbRoot) {
  const configPath = path.join(llkbRoot, 'config.yml');
  if (!fs.existsSync(configPath)) {
    return { exists: false, version: null, needsUpgrade: false };
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // Improved regex that:
    // 1. Matches version at line start or after whitespace
    // 2. Captures only the version value (not comments)
    // 3. Handles quoted and unquoted values
    // 4. Stops at whitespace, newline, or comment
    const versionMatch = configContent.match(/^version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?)["']?(?:\s*#.*)?$/m);
    const existingVersion = versionMatch ? versionMatch[1].trim() : '0.0.0';

    return {
      exists: true,
      version: existingVersion,
      needsUpgrade: existingVersion !== CURRENT_VERSION,
    };
  } catch (err) {
    return { exists: true, version: 'unknown', needsUpgrade: true, error: err.message };
  }
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  const args = parseArgs(process.argv);

  // Validate harness root argument
  if (!args.harnessRoot) {
    console.error('Usage: node bootstrap-llkb.cjs <harness-root> [--verify-only] [--verbose] [--force]');
    console.error('');
    console.error('Options:');
    console.error('  --verify-only  Only verify LLKB exists, don\'t create');
    console.error('  --verbose      Verbose output');
    console.error('  --force        Delete and recreate LLKB even if it exists');
    console.error('');
    console.error('Example: node bootstrap-llkb.cjs /path/to/artk-e2e');
    process.exit(1);
  }

  // Validate and resolve path
  const pathValidation = validatePath(args.harnessRoot);
  if (!pathValidation.valid) {
    console.error(`Error: ${pathValidation.error}`);
    process.exit(1);
  }

  const harnessRoot = pathValidation.resolved;
  const llkbRoot = path.join(harnessRoot, '.artk', 'llkb');

  console.log(`LLKB Bootstrap Helper v${CURRENT_VERSION}`);
  console.log(`Harness root: ${harnessRoot}`);
  console.log(`LLKB root: ${llkbRoot}`);
  console.log('');

  // Acquire lock
  const lock = acquireLock(llkbRoot);
  if (!lock.acquired) {
    console.error(`Error: ${lock.error}`);
    process.exit(1);
  }

  try {
    // Check existing version
    const versionInfo = checkVersion(llkbRoot);
    if (versionInfo.exists && !args.force) {
      console.log(`Existing LLKB found (version: ${versionInfo.version})`);
      if (versionInfo.needsUpgrade) {
        console.log(`  Note: Upgrade available to v${CURRENT_VERSION}`);
        console.log('  Use --force to recreate LLKB with new version');
      }
    }

    // Verify-only mode
    if (args.verifyOnly) {
      const verification = verifyLLKB(llkbRoot);
      if (verification.valid) {
        console.log('LLKB verification: PASSED');
        releaseLock(lock.lockPath);
        process.exit(0);
      } else {
        console.log('LLKB verification: FAILED');
        if (verification.issues.missing.length > 0) {
          console.log('  Missing:', verification.issues.missing.join(', '));
        }
        if (verification.issues.invalid.length > 0) {
          console.log('  Invalid:', verification.issues.invalid.join(', '));
        }
        releaseLock(lock.lockPath);
        process.exit(1);
      }
    }

    // Check if already valid (unless force mode)
    if (!args.force) {
      const preCheck = verifyLLKB(llkbRoot);
      if (preCheck.valid && !versionInfo.needsUpgrade) {
        console.log('LLKB already exists and is valid');
        releaseLock(lock.lockPath);
        process.exit(0);
      }
    }

    // Initialize LLKB
    console.log(args.force ? 'Force reinitializing LLKB...' : 'Initializing LLKB...');
    const results = initializeLLKB(llkbRoot, args.verbose, args.force);

    // Check for errors
    if (results.errors.length > 0) {
      console.log('');
      console.log('LLKB initialization FAILED:');
      results.errors.forEach(e => console.log(`  - ${e}`));
      releaseLock(lock.lockPath);
      process.exit(1);
    }

    // Post-init verification
    const postCheck = verifyLLKB(llkbRoot);
    if (!postCheck.valid) {
      console.log('');
      console.log('LLKB verification FAILED after initialization:');
      if (postCheck.issues.missing.length > 0) {
        console.log('  Missing:', postCheck.issues.missing.join(', '));
      }
      if (postCheck.issues.invalid.length > 0) {
        console.log('  Invalid:', postCheck.issues.invalid.join(', '));
      }
      releaseLock(lock.lockPath);
      process.exit(1);
    }

    // Success
    console.log('');
    console.log('LLKB initialized successfully');
    console.log(`  Created: ${results.created.length} files/directories`);
    console.log(`  Skipped: ${results.skipped.length} (already existed)`);
    releaseLock(lock.lockPath);
    process.exit(0);
  } catch (err) {
    console.error(`Unexpected error: ${err.message}`);
    releaseLock(lock.lockPath);
    process.exit(1);
  }
}

// Run
main();
