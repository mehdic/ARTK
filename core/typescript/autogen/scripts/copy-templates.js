#!/usr/bin/env node
/**
 * Cross-platform template copy script for @artk/core-autogen
 * Works on Windows, macOS, and Linux
 * 
 * Usage:
 *   node scripts/copy-templates.js <dist-dir> [--cjs]
 * 
 * Examples:
 *   node scripts/copy-templates.js dist
 *   node scripts/copy-templates.js dist-cjs --cjs
 *   node scripts/copy-templates.js dist-legacy-16 --cjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const distDir = args[0];
const isCjs = args.includes('--cjs');

if (!distDir) {
  console.error('Usage: node scripts/copy-templates.js <dist-dir> [--cjs]');
  process.exit(1);
}

const srcTemplates = path.join(rootDir, 'src', 'codegen', 'templates');
const destTemplates = path.join(rootDir, distDir, 'codegen', 'templates');

// Create destination directory recursively
fs.mkdirSync(destTemplates, { recursive: true });

// Copy all .ejs files
const files = fs.readdirSync(srcTemplates).filter(f => f.endsWith('.ejs'));
for (const file of files) {
  fs.copyFileSync(
    path.join(srcTemplates, file),
    path.join(destTemplates, file)
  );
}

console.log(`Copied ${files.length} template files to ${destTemplates}`);

// For CJS variants, create package.json with type: commonjs
if (isCjs) {
  const packageJsonPath = path.join(rootDir, distDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify({ type: 'commonjs' }, null, 2));
  console.log(`Created ${packageJsonPath} with type: commonjs`);
}

console.log('Done.');
