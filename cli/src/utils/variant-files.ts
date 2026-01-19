/**
 * ARTK Variant File Operations
 *
 * Shared utilities for copying variant files and generating AI protection markers.
 * Used by both init and upgrade commands.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { VariantId, ArtkContext } from './variant-types.js';
import { VARIANT_DEFINITIONS, getVariantDefinition } from './variant-definitions.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the ARTK version from package.json or fallback.
 */
export function getArtkVersion(): string {
  // Try to read from CLI package.json
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'package.json'),
    path.join(__dirname, '..', '..', '..', 'package.json'),
    path.join(process.cwd(), 'cli', 'package.json'),
  ];

  for (const pkgPath of possiblePaths) {
    try {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string; name?: string };
        if (pkg.name?.includes('artk') && pkg.version) {
          return pkg.version;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  return '1.0.0';
}

/**
 * Find the ARTK core source directory.
 */
export function findArtkCorePath(): string | null {
  const possiblePaths = [
    // ARTK_CORE_PATH environment variable
    process.env.ARTK_CORE_PATH,
    // Relative to CLI (npm package structure)
    path.join(__dirname, '..', '..', 'vendor', 'artk-core'),
    // Development: relative to CLI source
    path.join(__dirname, '..', '..', '..', '..', 'core', 'typescript'),
    // Monorepo: from CWD
    path.join(process.cwd(), 'core', 'typescript'),
  ].filter(Boolean) as string[];

  for (const corePath of possiblePaths) {
    if (fs.existsSync(corePath) && fs.existsSync(path.join(corePath, 'package.json'))) {
      return corePath;
    }
  }

  return null;
}

/**
 * Get the dist directory for a variant.
 */
export function getVariantDistPath(corePath: string, variant: VariantId): string {
  const variantDef = getVariantDefinition(variant);
  return path.join(corePath, variantDef.distDirectory);
}

/**
 * Check if variant build files exist and are valid.
 */
export function validateVariantBuildFiles(variant: VariantId): {
  valid: boolean;
  corePath?: string;
  distPath?: string;
  error?: string;
} {
  const corePath = findArtkCorePath();

  if (!corePath) {
    return {
      valid: false,
      error: `ARTK core not found. Set ARTK_CORE_PATH environment variable or run from ARTK repository.`,
    };
  }

  const variantDef = getVariantDefinition(variant);
  const distPath = path.join(corePath, variantDef.distDirectory);

  if (!fs.existsSync(distPath)) {
    return {
      valid: false,
      corePath,
      error: `Variant build files not found for '${variant}'.

The ${variantDef.distDirectory}/ directory is missing.

To build all variants, run from the ARTK repository:
  cd core/typescript
  npm run build:variants

Available variants: modern-esm, modern-cjs, legacy-16, legacy-14`,
    };
  }

  // Check for essential files
  const indexFile = path.join(distPath, 'index.js');
  if (!fs.existsSync(indexFile)) {
    return {
      valid: false,
      corePath,
      distPath,
      error: `Variant '${variant}' dist directory exists but is incomplete (missing index.js).

Rebuild with:
  cd core/typescript
  npm run build:variants`,
    };
  }

  return { valid: true, corePath, distPath };
}

/**
 * Copy directory recursively.
 */
function copyDirectoryRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get autogen dist directory for a variant.
 */
function getAutogenDistDirectory(variant: VariantId): string {
  switch (variant) {
    case 'modern-esm':
      return 'dist';
    case 'modern-cjs':
      return 'dist-cjs';
    case 'legacy-16':
      return 'dist-legacy-16';
    case 'legacy-14':
      return 'dist-legacy-14';
    default:
      return 'dist';
  }
}

/**
 * Copy variant files to vendor directory.
 */
export function copyVariantFiles(
  variant: VariantId,
  targetPath: string
): { success: boolean; error?: string; copiedFiles: number; warnings?: string[] } {
  const validation = validateVariantBuildFiles(variant);

  if (!validation.valid || !validation.corePath || !validation.distPath) {
    return {
      success: false,
      error: validation.error,
      copiedFiles: 0,
    };
  }

  const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
  const vendorAutogenPath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core-autogen');
  const autogenPath = path.join(validation.corePath, 'autogen');

  let copiedFiles = 0;
  const warnings: string[] = [];

  try {
    // Create vendor directories
    fs.mkdirSync(path.join(vendorCorePath, 'dist'), { recursive: true });
    fs.mkdirSync(vendorAutogenPath, { recursive: true });

    // Copy variant dist files
    copyDirectoryRecursive(validation.distPath, path.join(vendorCorePath, 'dist'));
    copiedFiles += countFiles(validation.distPath);

    // Copy core package.json
    const corePackageJson = path.join(validation.corePath, 'package.json');
    if (fs.existsSync(corePackageJson)) {
      fs.copyFileSync(corePackageJson, path.join(vendorCorePath, 'package.json'));
      copiedFiles++;
    }

    // Copy version.json if exists
    const versionJson = path.join(validation.corePath, 'version.json');
    if (fs.existsSync(versionJson)) {
      fs.copyFileSync(versionJson, path.join(vendorCorePath, 'version.json'));
      copiedFiles++;
    }

    // Copy README.md if exists
    const readme = path.join(validation.corePath, 'README.md');
    if (fs.existsSync(readme)) {
      fs.copyFileSync(readme, path.join(vendorCorePath, 'README.md'));
      copiedFiles++;
    }

    // Copy autogen package (variant-specific dist if available, fallback to default)
    const autogenDistDir = getAutogenDistDirectory(variant);
    let autogenDist = path.join(autogenPath, autogenDistDir);

    // Fallback to default dist if variant-specific doesn't exist
    if (!fs.existsSync(autogenDist)) {
      autogenDist = path.join(autogenPath, 'dist');
    }

    if (fs.existsSync(autogenDist)) {
      copyDirectoryRecursive(autogenDist, path.join(vendorAutogenPath, 'dist'));
      copiedFiles += countFiles(autogenDist);

      const autogenPackageJson = path.join(autogenPath, 'package.json');
      if (fs.existsSync(autogenPackageJson)) {
        fs.copyFileSync(autogenPackageJson, path.join(vendorAutogenPath, 'package.json'));
        copiedFiles++;
      }
    } else {
      // Warn when autogen is not found
      warnings.push(
        `Autogen package not found for variant '${variant}'. ` +
          `Expected at: ${autogenDist}. ` +
          `Some code generation features may not be available.`
      );
    }

    return {
      success: true,
      copiedFiles,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to copy variant files: ${message}`,
      copiedFiles,
    };
  }
}

/**
 * Count files in a directory recursively.
 */
function countFiles(dir: string): number {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }

  return count;
}

/**
 * Generate variant-features.json content.
 */
export function generateVariantFeatures(variant: VariantId): Record<string, unknown> {
  const variantDef = VARIANT_DEFINITIONS[variant];

  // Define features based on variant
  const features: Record<string, { available: boolean; alternative?: string; notes?: string }> = {};

  // Common features available in all variants
  const commonFeatures = [
    'route_from_har',
    'locator_filter',
    'web_first_assertions',
    'trace_viewer',
    'api_testing',
    'storage_state',
    'video_recording',
    'screenshot_assertions',
    'request_interception',
    'browser_contexts',
    'test_fixtures',
    'parallel_execution',
    'retry_logic',
  ];

  for (const feature of commonFeatures) {
    features[feature] = { available: true };
  }

  // Modern features (Playwright 1.57+)
  if (variant === 'modern-esm' || variant === 'modern-cjs') {
    features['aria_snapshots'] = { available: true };
    features['clock_api'] = { available: true };
    features['locator_or'] = { available: true };
    features['locator_and'] = { available: true };
    features['component_testing'] = { available: true };
    features['expect_poll'] = { available: true };
    features['expect_soft'] = { available: true };
    features['request_continue'] = { available: true };
  } else if (variant === 'legacy-16') {
    // Playwright 1.49.x features
    features['aria_snapshots'] = { available: true };
    features['clock_api'] = { available: true };
    features['locator_or'] = { available: true };
    features['locator_and'] = { available: true };
    features['component_testing'] = { available: true };
    features['expect_poll'] = { available: true };
    features['expect_soft'] = { available: true };
    features['request_continue'] = { available: true };
  } else if (variant === 'legacy-14') {
    // Playwright 1.33.x - older API
    features['aria_snapshots'] = {
      available: false,
      alternative: 'Use page.evaluate() to query ARIA attributes manually',
      notes: 'Introduced in Playwright 1.35',
    };
    features['clock_api'] = {
      available: false,
      alternative: 'Use page.evaluate(() => { Date.now = () => fixedTime }) for manual mocking',
      notes: 'Introduced in Playwright 1.45',
    };
    features['locator_or'] = {
      available: false,
      alternative: 'Use CSS :is() selector: page.locator(":is(.a, .b)")',
      notes: 'Introduced in Playwright 1.34',
    };
    features['locator_and'] = {
      available: false,
      alternative: 'Use chained filter: locator.filter({ has: other })',
      notes: 'Introduced in Playwright 1.34',
    };
    features['component_testing'] = {
      available: false,
      alternative: 'Use E2E testing approach with full page loads',
      notes: 'Experimental in 1.33, stable in later versions',
    };
    features['expect_poll'] = {
      available: false,
      alternative: 'Use expect.poll() polyfill with setTimeout loop',
      notes: 'Introduced in Playwright 1.30 but improved later',
    };
    features['expect_soft'] = {
      available: false,
      alternative: 'Collect assertions manually and report at end',
      notes: 'Introduced in Playwright 1.37',
    };
    features['request_continue'] = { available: true };
  }

  // ESM-specific features
  if (variant === 'modern-esm') {
    features['esm_imports'] = { available: true };
    features['top_level_await'] = { available: true };
    features['import_meta'] = { available: true };
  } else {
    features['esm_imports'] = {
      available: false,
      alternative: 'Use require() for synchronous imports or dynamic import() for async',
    };
    features['top_level_await'] = {
      available: false,
      alternative: 'Wrap in async IIFE: (async () => { await ... })()',
    };
    features['import_meta'] = {
      available: false,
      alternative: 'Use __dirname and __filename (CommonJS globals)',
    };
  }

  return {
    variant,
    playwrightVersion: variantDef.playwrightVersion,
    nodeRange: variantDef.nodeRange,
    moduleSystem: variantDef.moduleSystem,
    tsTarget: variantDef.tsTarget,
    features,
    generatedAt: new Date().toISOString(),
    generatedBy: `ARTK CLI v${getArtkVersion()}`,
  };
}

/**
 * Write variant-features.json to vendor directory.
 */
export function writeVariantFeatures(vendorPath: string, variant: VariantId): void {
  const features = generateVariantFeatures(variant);
  fs.writeFileSync(
    path.join(vendorPath, 'variant-features.json'),
    JSON.stringify(features, null, 2),
    'utf-8'
  );
}

/**
 * Generate READONLY.md content.
 */
export function generateReadonlyMarker(
  variantDef: ReturnType<typeof getVariantDefinition>,
  context: ArtkContext
): string {
  return `# ⚠️ DO NOT MODIFY THIS DIRECTORY

**This directory contains vendor code that should NOT be edited.**

## What This Is

This is a vendored copy of ARTK core code installed by the ARTK CLI.
It should be treated as read-only and immutable.

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | ${variantDef.id} |
| **Display Name** | ${variantDef.displayName} |
| **Node.js Range** | ${variantDef.nodeRange.join(', ')} |
| **Playwright Version** | ${variantDef.playwrightVersion} |
| **Module System** | ${variantDef.moduleSystem} |
| **TypeScript Target** | ${variantDef.tsTarget} |
| **Installed At** | ${context.variantInstalledAt} |
| **ARTK Version** | ${context.artkVersion} |
${context.previousVariant ? `| **Previous Variant** | ${context.previousVariant} |` : ''}

## If You Encounter Issues

### Import/Module Errors

If you see errors like \`ERR_REQUIRE_ESM\` or \`Cannot use import statement\`:

\`\`\`bash
# Check the installed variant
cat .artk/context.json | grep variant

# Reinstall with correct variant detection
artk init . --force

# Or force a specific variant
artk init . --variant modern-esm --force
\`\`\`

### Feature Not Working

Check \`variant-features.json\` in this directory to see if the feature is available
in your variant. If not, the file includes alternative approaches.

### Need Different Variant

\`\`\`bash
# Re-detect and install correct variant
artk upgrade .

# Or force a specific variant
artk init . --variant <variant-id> --force
\`\`\`

## For AI Agents (GitHub Copilot, Claude, etc.)

**DO NOT modify files in this directory.**

If you encounter compatibility issues:
1. Check the variant information above
2. Check \`variant-features.json\` for feature availability and alternatives
3. Suggest running \`artk init --force\` to reinstall with correct variant
4. Use alternative approaches documented in \`variant-features.json\`
5. NEVER patch or modify vendor code directly

---

*This file was generated by ARTK CLI v${context.artkVersion}*
`;
}

/**
 * Write READONLY.md to vendor directory.
 */
export function writeReadonlyMarker(
  vendorPath: string,
  variantDef: ReturnType<typeof getVariantDefinition>,
  context: ArtkContext
): void {
  const content = generateReadonlyMarker(variantDef, context);
  fs.writeFileSync(path.join(vendorPath, 'READONLY.md'), content, 'utf-8');
}

/**
 * Generate .ai-ignore content.
 */
export function generateAiIgnore(variant: VariantId): string {
  return `# ARTK Vendor Directory - DO NOT MODIFY
#
# This directory contains vendored @artk/core code.
# AI agents and code generation tools should NOT modify these files.
#
# Variant: ${variant}
# Generated: ${new Date().toISOString()}
#
# If you need to change behavior:
# 1. Create wrapper functions in your project code
# 2. Use configuration in artk.config.yml
# 3. Run \`artk upgrade\` to get latest version
# 4. Run \`artk init --force\` to reinstall
#
# DO NOT:
# - Edit any .js or .ts files in this directory
# - Add polyfills or patches
# - Modify package.json
# - Create "fixes" for compatibility issues
#
# Instead, use \`artk init --variant <correct-variant> --force\`
#
*
`;
}

/**
 * Write .ai-ignore to vendor directory.
 */
export function writeAiIgnore(vendorPath: string, variant: VariantId): void {
  const content = generateAiIgnore(variant);
  fs.writeFileSync(path.join(vendorPath, '.ai-ignore'), content, 'utf-8');
}

/**
 * Write all AI protection markers to a vendor directory.
 */
export function writeAllAiProtectionMarkers(
  vendorPath: string,
  variant: VariantId,
  context: ArtkContext
): void {
  const variantDef = getVariantDefinition(variant);
  writeReadonlyMarker(vendorPath, variantDef, context);
  writeAiIgnore(vendorPath, variant);
  writeVariantFeatures(vendorPath, variant);
}

/**
 * Check if a variant is compatible with a Node.js version.
 * Returns detailed compatibility info.
 */
export function checkVariantNodeCompatibility(
  variant: VariantId,
  nodeVersion: number
): {
  compatible: boolean;
  variant: VariantId;
  nodeVersion: number;
  supportedRange: string[];
  error?: string;
} {
  const variantDef = VARIANT_DEFINITIONS[variant];
  const compatible = variantDef.nodeRange.includes(String(nodeVersion));

  return {
    compatible,
    variant,
    nodeVersion,
    supportedRange: variantDef.nodeRange,
    error: compatible
      ? undefined
      : `Variant '${variant}' is not compatible with Node.js ${nodeVersion}. ` +
        `Supported versions: ${variantDef.nodeRange.join(', ')}.`,
  };
}

/**
 * Generate variant-aware Copilot instructions content.
 */
export function generateCopilotInstructions(variant: VariantId): string {
  const variantDef = VARIANT_DEFINITIONS[variant];
  const isLegacy = variant === 'legacy-16' || variant === 'legacy-14';
  const isESM = variant === 'modern-esm';

  let content = `---
name: artk.variant-info
description: "Variant-specific Copilot instructions for ARTK tests"
---

# ARTK Variant Information

## Installed Variant: ${variant}

| Property | Value |
|----------|-------|
| **Display Name** | ${variantDef.displayName} |
| **Node.js Range** | ${variantDef.nodeRange.join(', ')} |
| **Playwright Version** | ${variantDef.playwrightVersion} |
| **Module System** | ${variantDef.moduleSystem} |

## Critical: Vendor Directory Rules

**DO NOT modify files in \`artk-e2e/vendor/artk-core/\` or \`artk-e2e/vendor/artk-core-autogen/\`.**

These directories contain vendored ARTK code that:
1. Is automatically managed by ARTK CLI/bootstrap
2. Will be overwritten on upgrades
3. Is built for a specific Node.js version and module system

If you encounter issues with vendor code:
1. Check \`artk-e2e/vendor/artk-core/variant-features.json\` for feature availability
2. Suggest running \`artk init --force\` or re-running bootstrap to reinstall
3. Use documented alternatives from \`variant-features.json\`
4. **NEVER patch or modify vendor code directly**

## Feature Availability

Before using Playwright features, check \`artk-e2e/vendor/artk-core/variant-features.json\`:

\`\`\`typescript
// Read feature availability
import features from './vendor/artk-core/variant-features.json';

if (!features.features.clock_api?.available) {
  // Use alternative approach documented in features.features.clock_api.alternative
}
\`\`\`

`;

  // Add legacy-specific instructions
  if (isLegacy) {
    content += `## Legacy Variant Limitations

This project uses a legacy ARTK variant (\`${variant}\`) with Playwright ${variantDef.playwrightVersion}.
Some modern features are NOT available. Always check \`variant-features.json\` before using:

- **aria_snapshots**: May not be available - use manual ARIA attribute queries
- **clock_api**: May not be available - use manual Date mocking
- **locator_or/and**: May not be available - use CSS selectors
- **expect_soft**: May not be available - collect assertions manually

When generating tests, always check feature availability first.

`;
  }

  // Add import patterns based on module system
  if (isESM) {
    content += `## Import Patterns (ESM)

Use ESM import syntax:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loadConfig } from '@artk/core/config';
import { AuthFixture } from '@artk/core/auth';
\`\`\`

`;
  } else {
    content += `## Import Patterns (CommonJS)

Use CommonJS require syntax:

\`\`\`typescript
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('@artk/core/config');
const { AuthFixture } = require('@artk/core/auth');
\`\`\`

**DO NOT use ESM import syntax in this project.**

`;
  }

  // Add error handling guidance
  content += `## When You Encounter Errors

### Module/Import Errors

If you see \`ERR_REQUIRE_ESM\`, \`Cannot use import statement\`, or similar:

1. Check the variant's module system (this project: ${variantDef.moduleSystem})
2. Suggest reinstalling: \`artk init . --force\` or re-run bootstrap
3. **DO NOT try to fix by modifying vendor code**

### Feature Not Found

If a Playwright feature doesn't exist:

1. Check \`variant-features.json\` for availability
2. This variant uses Playwright ${variantDef.playwrightVersion}
3. Use the documented alternative approach

---

*Generated by ARTK CLI v${getArtkVersion()} for variant ${variant}*
`;

  return content;
}

/**
 * Write variant-aware Copilot instructions to project.
 */
export function writeCopilotInstructions(targetPath: string, variant: VariantId): void {
  const promptsDir = path.join(targetPath, '.github', 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  const content = generateCopilotInstructions(variant);
  fs.writeFileSync(
    path.join(promptsDir, 'artk.variant-info.prompt.md'),
    content,
    'utf-8'
  );
}
