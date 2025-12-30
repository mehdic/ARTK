#!/usr/bin/env node
/**
 * Update version.json with git SHA and build time
 *
 * This script updates the version.json file with the current git SHA
 * and build timestamp for release tracking and debugging purposes.
 *
 * Usage:
 *   node scripts/update-version.js
 *   npm run version:update
 *
 * @module scripts/update-version
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the current git SHA (short format)
 *
 * @returns {string} Git SHA or 'unknown' if not in a git repository
 */
function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get the current build time in ISO format
 *
 * @returns {string} ISO timestamp
 */
function getBuildTime() {
  return new Date().toISOString();
}

/**
 * Main function to update version.json
 */
function updateVersion() {
  const versionPath = join(__dirname, '..', 'version.json');

  try {
    // Read existing version.json
    const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));

    // Add git SHA and build time
    versionData.gitSha = getGitSha();
    versionData.buildTime = getBuildTime();

    // Write updated version.json with formatting
    writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');

    console.log('✓ Version file updated successfully');
    console.log(`  Git SHA: ${versionData.gitSha}`);
    console.log(`  Build Time: ${versionData.buildTime}`);
  } catch (error) {
    console.error('✗ Failed to update version file:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateVersion();
}

export { updateVersion, getGitSha, getBuildTime };
