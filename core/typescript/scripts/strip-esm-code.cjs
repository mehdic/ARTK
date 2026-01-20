#!/usr/bin/env node
/**
 * Post-build script to strip ESM-specific code from CJS builds.
 *
 * This script removes code blocks marked with __ESM_ONLY_START__ and __ESM_ONLY_END__
 * from the specified files. This is necessary because CJS builds don't support
 * import.meta.url, but they don't need it since __dirname is available.
 *
 * Usage: node scripts/strip-esm-code.js <dist-dir>
 */

const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const distDir = process.argv[2];
if (!distDir) {
  console.error('Usage: node scripts/strip-esm-code.js <dist-dir>');
  process.exit(1);
}

/**
 * Recursively find all .js and .cjs files in a directory
 */
function findJsFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.endsWith('.js') || entry.endsWith('.cjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Strip ESM-only code blocks from a file
 */
function stripEsmCode(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Pattern to match __ESM_ONLY_START__ ... __ESM_ONLY_END__ blocks
  // This handles both single-line comments (//) and multi-line comments (/* */)
  const esmBlockPattern = /\/[/*]\s*__ESM_ONLY_START__[\s\S]*?\/[/*]\s*__ESM_ONLY_END__[*/]?\s*\n?/g;

  const stripped = content.replace(esmBlockPattern, '// ESM-specific code removed for CJS build\n');

  if (stripped !== content) {
    writeFileSync(filePath, stripped);
    console.log(`Stripped ESM code from: ${filePath}`);
    return true;
  }
  return false;
}

// Process all JS files in the dist directory
console.log(`Processing files in: ${distDir}`);

if (!statSync(distDir).isDirectory()) {
  console.error(`Error: ${distDir} is not a directory`);
  process.exit(1);
}

const files = findJsFiles(distDir);
let strippedCount = 0;

for (const file of files) {
  if (stripEsmCode(file)) {
    strippedCount++;
  }
}

console.log(`Done. Processed ${files.length} files, stripped ESM code from ${strippedCount} files.`);
