"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTALL_MODULE_VERSION = void 0;
__exportStar(require("./package-generator.js"), exports);
__exportStar(require("./playwright-config-generator.js"), exports);
__exportStar(require("./gitignore-generator.js"), exports);
/**
 * Install module version.
 */
exports.INSTALL_MODULE_VERSION = '1.0.0';
//# sourceMappingURL=index.js.map