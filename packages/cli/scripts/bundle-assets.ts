/**
 * Asset bundling script
 *
 * This script bundles assets from the ARTK monorepo into the CLI package
 * for distribution. It copies:
 * - Prompt files from /prompts/
 * - Pre-built @artk/core from /core/typescript/dist/
 * - Pre-built @artk/core-autogen from /core/typescript/autogen/dist/
 * - Templates from /core/typescript/templates/
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CLI_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..');
const ASSETS_DIR = path.join(CLI_ROOT, 'assets');

// Source paths
const PROMPTS_SOURCE = path.join(REPO_ROOT, 'prompts');
const CORE_SOURCE = path.join(REPO_ROOT, 'core', 'typescript');
const AUTOGEN_SOURCE = path.join(CORE_SOURCE, 'autogen');

// Target paths
const PROMPTS_TARGET = path.join(ASSETS_DIR, 'prompts');
const CORE_TARGET = path.join(ASSETS_DIR, 'core');
const AUTOGEN_TARGET = path.join(ASSETS_DIR, 'autogen');

/**
 * Copy a directory recursively
 */
function copyDir(src: string, dest: string, filter?: (name: string) => boolean): void {
  if (!fs.existsSync(src)) {
    console.warn(`Source not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filter && !filter(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy a file
 */
function copyFile(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`Source not found: ${src}`);
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * Copy package.json with devDependencies and scripts stripped
 * This prevents npm from spending 200+ seconds resolving unused dependencies
 * when the package is used as a file: dependency in artk-e2e
 */
function copyPackageJsonStripped(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`Source not found: ${src}`);
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const pkg = JSON.parse(fs.readFileSync(src, 'utf-8'));

  // Remove devDependencies and scripts - not needed for vendored usage
  delete pkg.devDependencies;
  delete pkg.scripts;

  // Mark as private to prevent accidental publish
  pkg.private = true;

  fs.writeFileSync(dest, JSON.stringify(pkg, null, 2));
}

/**
 * Main bundling function
 */
async function bundleAssets(): Promise<void> {
  console.log('Bundling assets for @artk/cli...\n');

  // Clean assets directory
  if (fs.existsSync(ASSETS_DIR)) {
    fs.rmSync(ASSETS_DIR, { recursive: true });
  }
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // 1. Bundle prompts
  console.log('1. Bundling prompts...');
  fs.mkdirSync(PROMPTS_TARGET, { recursive: true });

  if (fs.existsSync(PROMPTS_SOURCE)) {
    const promptFiles = fs.readdirSync(PROMPTS_SOURCE)
      .filter(f => f.startsWith('artk.') && f.endsWith('.md'));

    for (const file of promptFiles) {
      const src = path.join(PROMPTS_SOURCE, file);
      const dest = path.join(PROMPTS_TARGET, file);
      fs.copyFileSync(src, dest);
      console.log(`   - ${file}`);
    }
    console.log(`   Bundled ${promptFiles.length} prompt files`);
  } else {
    console.warn(`   Prompts source not found: ${PROMPTS_SOURCE}`);
  }

  // 2. Bundle @artk/core
  console.log('\n2. Bundling @artk/core...');
  fs.mkdirSync(CORE_TARGET, { recursive: true });

  // Copy dist
  const coreDistSource = path.join(CORE_SOURCE, 'dist');
  if (fs.existsSync(coreDistSource)) {
    copyDir(coreDistSource, path.join(CORE_TARGET, 'dist'));
    console.log('   - dist/');
  } else {
    console.warn(`   @artk/core dist not found. Run 'npm run build' in core/typescript first.`);
  }

  // Copy templates
  const templatesSource = path.join(CORE_SOURCE, 'templates');
  if (fs.existsSync(templatesSource)) {
    copyDir(templatesSource, path.join(CORE_TARGET, 'templates'));
    console.log('   - templates/');
  }

  // Copy package.json (stripped of devDependencies/scripts to prevent npm hanging)
  copyPackageJsonStripped(path.join(CORE_SOURCE, 'package.json'), path.join(CORE_TARGET, 'package.json'));
  console.log('   - package.json (stripped)');

  // Copy version.json if exists
  const versionJsonPath = path.join(CORE_SOURCE, 'version.json');
  if (fs.existsSync(versionJsonPath)) {
    copyFile(versionJsonPath, path.join(CORE_TARGET, 'version.json'));
    console.log('   - version.json');
  }

  // 3. Bundle @artk/core-autogen
  console.log('\n3. Bundling @artk/core-autogen...');
  fs.mkdirSync(AUTOGEN_TARGET, { recursive: true });

  // Copy dist
  const autogenDistSource = path.join(AUTOGEN_SOURCE, 'dist');
  if (fs.existsSync(autogenDistSource)) {
    copyDir(autogenDistSource, path.join(AUTOGEN_TARGET, 'dist'));
    console.log('   - dist/');
  } else {
    console.warn(`   @artk/core-autogen dist not found. Run 'npm run build' in core/typescript/autogen first.`);
  }

  // Copy package.json (stripped of devDependencies/scripts to prevent npm hanging)
  copyPackageJsonStripped(path.join(AUTOGEN_SOURCE, 'package.json'), path.join(AUTOGEN_TARGET, 'package.json'));
  console.log('   - package.json (stripped)');

  // 4. Bundle bootstrap templates
  console.log('\n4. Bundling bootstrap templates...');
  const BOOTSTRAP_TEMPLATES_SOURCE = path.join(REPO_ROOT, 'templates', 'bootstrap');
  const BOOTSTRAP_TEMPLATES_TARGET = path.join(ASSETS_DIR, 'bootstrap-templates');

  if (fs.existsSync(BOOTSTRAP_TEMPLATES_SOURCE)) {
    copyDir(BOOTSTRAP_TEMPLATES_SOURCE, BOOTSTRAP_TEMPLATES_TARGET);
    const templateFiles = fs.readdirSync(BOOTSTRAP_TEMPLATES_SOURCE).filter(f => f.endsWith('.ts'));
    for (const file of templateFiles) {
      console.log(`   - ${file}`);
    }
    console.log(`   Bundled ${templateFiles.length} template files`);
  } else {
    console.warn(`   Bootstrap templates not found: ${BOOTSTRAP_TEMPLATES_SOURCE}`);
  }

  // 5. Calculate sizes
  console.log('\n5. Asset sizes:');
  const sizes = {
    prompts: getDirSize(PROMPTS_TARGET),
    core: getDirSize(CORE_TARGET),
    autogen: getDirSize(AUTOGEN_TARGET),
    bootstrap: getDirSize(BOOTSTRAP_TEMPLATES_TARGET),
  };

  console.log(`   - prompts/:   ${formatSize(sizes.prompts)}`);
  console.log(`   - core/:      ${formatSize(sizes.core)}`);
  console.log(`   - autogen/:   ${formatSize(sizes.autogen)}`);
  console.log(`   - bootstrap/: ${formatSize(sizes.bootstrap)}`);
  console.log(`   - Total:      ${formatSize(sizes.prompts + sizes.core + sizes.autogen + sizes.bootstrap)}`);

  console.log('\nAsset bundling complete!');
}

/**
 * Get directory size recursively
 */
function getDirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;

  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }

  return size;
}

/**
 * Format size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Run
bundleAssets().catch((error) => {
  console.error('Error bundling assets:', error);
  process.exit(1);
});
