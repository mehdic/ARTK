/**
 * ARTK CLI - Public API
 *
 * This module exports the programmatic API for ARTK CLI operations.
 * Use this when you need to integrate ARTK into other tools or scripts.
 */

export { bootstrap, type BootstrapOptions } from './lib/bootstrap.js';
export { checkPrerequisites, type PrerequisiteResult } from './lib/prerequisites.js';
export { detectEnvironment, type EnvironmentInfo } from './lib/environment.js';
export { resolveBrowser, type BrowserInfo } from './lib/browser-resolver.js';
export { getVersion } from './lib/version.js';
