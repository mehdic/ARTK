"use strict";
/**
 * Validation Engine for Foundation Modules
 * T066: Export validateFoundation() from validation module
 *
 * Pre-generation validation gate that checks for module system compatibility.
 * Auto-rollback on failure (FR-033).
 *
 * @module @artk/core/validation
 *
 * @example
 * ```typescript
 * import { validateFoundation } from '@artk/core/validation';
 *
 * const result = await validateFoundation({
 *   files: ['auth/login.ts', 'config/env.ts'],
 *   environmentContext: 'commonjs-node-18.12.1'
 * });
 *
 * if (result.status === 'failed') {
 *   console.error('Validation failed:', result.errors);
 *   // Rollback has already occurred
 * }
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRules = exports.createDependencyCompatRule = exports.DependencyCompatRule = exports.createImportPathsRule = exports.ImportPathsRule = exports.createDirnameUsageRule = exports.DirnameUsageRule = exports.createImportMetaUsageRule = exports.ImportMetaUsageRule = exports.generateRollbackMessage = exports.rollbackTransaction = exports.commitTransaction = exports.trackOriginalFile = exports.trackGeneratedFile = exports.startTransaction = exports.validateFoundation = exports.ValidationRunner = void 0;
// Main exports
var runner_js_1 = require("./runner.js");
Object.defineProperty(exports, "ValidationRunner", { enumerable: true, get: function () { return runner_js_1.ValidationRunner; } });
Object.defineProperty(exports, "validateFoundation", { enumerable: true, get: function () { return runner_js_1.validateFoundation; } });
// Rollback functionality
var rollback_js_1 = require("./rollback.js");
Object.defineProperty(exports, "startTransaction", { enumerable: true, get: function () { return rollback_js_1.startTransaction; } });
Object.defineProperty(exports, "trackGeneratedFile", { enumerable: true, get: function () { return rollback_js_1.trackGeneratedFile; } });
Object.defineProperty(exports, "trackOriginalFile", { enumerable: true, get: function () { return rollback_js_1.trackOriginalFile; } });
Object.defineProperty(exports, "commitTransaction", { enumerable: true, get: function () { return rollback_js_1.commitTransaction; } });
Object.defineProperty(exports, "rollbackTransaction", { enumerable: true, get: function () { return rollback_js_1.rollbackTransaction; } });
Object.defineProperty(exports, "generateRollbackMessage", { enumerable: true, get: function () { return rollback_js_1.generateRollbackMessage; } });
// Validation rules
var index_js_1 = require("./rules/index.js");
Object.defineProperty(exports, "ImportMetaUsageRule", { enumerable: true, get: function () { return index_js_1.ImportMetaUsageRule; } });
Object.defineProperty(exports, "createImportMetaUsageRule", { enumerable: true, get: function () { return index_js_1.createImportMetaUsageRule; } });
Object.defineProperty(exports, "DirnameUsageRule", { enumerable: true, get: function () { return index_js_1.DirnameUsageRule; } });
Object.defineProperty(exports, "createDirnameUsageRule", { enumerable: true, get: function () { return index_js_1.createDirnameUsageRule; } });
Object.defineProperty(exports, "ImportPathsRule", { enumerable: true, get: function () { return index_js_1.ImportPathsRule; } });
Object.defineProperty(exports, "createImportPathsRule", { enumerable: true, get: function () { return index_js_1.createImportPathsRule; } });
Object.defineProperty(exports, "DependencyCompatRule", { enumerable: true, get: function () { return index_js_1.DependencyCompatRule; } });
Object.defineProperty(exports, "createDependencyCompatRule", { enumerable: true, get: function () { return index_js_1.createDependencyCompatRule; } });
Object.defineProperty(exports, "getAllRules", { enumerable: true, get: function () { return index_js_1.getAllRules; } });
//# sourceMappingURL=index.js.map