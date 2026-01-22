"use strict";
/**
 * @module detection
 * @description Frontend detection heuristics for ARTK E2E independent architecture.
 * Provides multi-signal detection with weighted scoring for frontend applications.
 *
 * @example
 * ```typescript
 * import { FrontendDetector, SubmoduleChecker } from '@artk/core/detection';
 *
 * const detector = new FrontendDetector();
 * const results = await detector.scan('/path/to/monorepo');
 *
 * const submoduleChecker = new SubmoduleChecker();
 * const submodules = await submoduleChecker.check('/path/to/monorepo');
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
// Signal scoring constants
__exportStar(require("./signals.js"), exports);
// Detection components
__exportStar(require("./package-scanner.js"), exports);
__exportStar(require("./entry-detector.js"), exports);
__exportStar(require("./directory-heuristics.js"), exports);
// Main detection classes
__exportStar(require("./frontend-detector.js"), exports);
__exportStar(require("./submodule-checker.js"), exports);
// Environment detection (Foundation Module System Compatibility)
__exportStar(require("./env/index.js"), exports);
//# sourceMappingURL=index.js.map