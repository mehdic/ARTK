#!/usr/bin/env node
/**
 * Post-build script to copy .d.ts files from ESM build to CJS variant directories.
 *
 * This is needed because CJS builds (tsup with format: cjs, dts: false) don't generate
 * type definitions. We copy them from the ESM build which has dts: true.
 *
 * Usage: node scripts/copy-dts.cjs <target-dir>
 *
 * Example:
 *   node scripts/copy-dts.cjs dist-cjs
 *   node scripts/copy-dts.cjs dist-legacy-16
 */

const { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } = require('fs');
const { join, dirname, relative } = require('path');

const sourceDir = 'dist';
const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node scripts/copy-dts.cjs <target-dir>');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/copy-dts.cjs dist-cjs');
  console.error('  node scripts/copy-dts.cjs dist-legacy-16');
  process.exit(1);
}

if (!existsSync(sourceDir)) {
  console.error(`Error: Source directory "${sourceDir}" does not exist.`);
  console.error('Build the ESM variant first: npm run build');
  process.exit(1);
}

if (!existsSync(targetDir)) {
  console.error(`Error: Target directory "${targetDir}" does not exist.`);
  console.error('Build the CJS variant first.');
  process.exit(1);
}

/**
 * Recursively find all .d.ts files in a directory
 */
function findDtsFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findDtsFiles(fullPath, files);
    } else if (entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Copy a file, creating parent directories as needed
 */
function copyFileWithDirs(src, dest) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(src, dest);
}

console.log(`Copying .d.ts files from ${sourceDir}/ to ${targetDir}/...`);

const dtsFiles = findDtsFiles(sourceDir);
let copiedCount = 0;

for (const srcPath of dtsFiles) {
  const relPath = relative(sourceDir, srcPath);
  const destPath = join(targetDir, relPath);

  copyFileWithDirs(srcPath, destPath);
  copiedCount++;
}

console.log(`Done. Copied ${copiedCount} .d.ts files to ${targetDir}/`);
