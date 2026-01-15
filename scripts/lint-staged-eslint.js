#!/usr/bin/env node
/**
 * Cross-platform ESLint runner for lint-staged
 *
 * This script handles running ESLint on staged files from the correct
 * working directory, which is necessary because our monorepo has multiple
 * TypeScript projects with separate ESLint configs.
 *
 * @see research/2026-01-15_remaining_issues_remediation_plan.md
 */
const { execSync } = require('child_process');
const path = require('path');

const files = process.argv.slice(2);

if (files.length === 0) {
  console.log('No files to lint');
  process.exit(0);
}

const rootDir = path.resolve(__dirname, '..');

// Group files by their project directory
const coreFiles = [];
const autogenFiles = [];

for (const file of files) {
  // Normalize path separators for cross-platform compatibility
  const normalizedFile = file.replace(/\\/g, '/');

  if (normalizedFile.includes('core/typescript/autogen/')) {
    autogenFiles.push(file);
  } else if (normalizedFile.includes('core/typescript/')) {
    coreFiles.push(file);
  }
}

let hasError = false;

// Run ESLint on core/typescript files
if (coreFiles.length > 0) {
  console.log(`Linting ${coreFiles.length} core/typescript file(s)...`);
  try {
    const coreDir = path.join(rootDir, 'core', 'typescript');
    // Convert absolute paths to relative paths from the project directory
    const relativePaths = coreFiles.map(f => {
      const rel = path.relative(coreDir, f);
      return rel;
    });
    execSync(`npx eslint --fix ${relativePaths.map(p => `"${p}"`).join(' ')}`, {
      cwd: coreDir,
      stdio: 'inherit',
    });
  } catch (error) {
    hasError = true;
  }
}

// Run ESLint on core/typescript/autogen files
if (autogenFiles.length > 0) {
  console.log(`Linting ${autogenFiles.length} autogen file(s)...`);
  try {
    const autogenDir = path.join(rootDir, 'core', 'typescript', 'autogen');
    // Convert absolute paths to relative paths from the project directory
    const relativePaths = autogenFiles.map(f => {
      const rel = path.relative(autogenDir, f);
      return rel;
    });
    execSync(`npx eslint --fix ${relativePaths.map(p => `"${p}"`).join(' ')}`, {
      cwd: autogenDir,
      stdio: 'inherit',
    });
  } catch (error) {
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Lint complete');
