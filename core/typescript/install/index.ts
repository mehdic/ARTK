/**
 * @module install
 * @description Installation utilities for ARTK E2E independent architecture.
 * Generates package.json, playwright.config.ts, and other required files.
 *
 * @example
 * ```typescript
 * import {
 *   generatePackageJson,
 *   generatePlaywrightConfig,
 *   generateGitignore
 * } from '@artk/core/install';
 *
 * const packageJson = generatePackageJson({ projectName: 'my-e2e-tests' });
 * const playwrightConfig = generatePlaywrightConfig({ targets: ['user-portal'] });
 * const gitignore = generateGitignore();
 * ```
 */

export * from './package-generator.js';
export * from './playwright-config-generator.js';
export * from './gitignore-generator.js';

/**
 * Install module version.
 */
export const INSTALL_MODULE_VERSION = '1.0.0';
