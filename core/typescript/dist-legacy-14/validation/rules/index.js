"use strict";
/**
 * Validation Rules Index
 *
 * Exports all validation rules for the foundation validation gate.
 *
 * @module @artk/core/validation/rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDependencyCompatRule = exports.DependencyCompatRule = exports.createImportPathsRule = exports.ImportPathsRule = exports.createDirnameUsageRule = exports.DirnameUsageRule = exports.createImportMetaUsageRule = exports.ImportMetaUsageRule = void 0;
exports.getAllRules = getAllRules;
const import_meta_usage_js_1 = require("./import-meta-usage.js");
Object.defineProperty(exports, "ImportMetaUsageRule", { enumerable: true, get: function () { return import_meta_usage_js_1.ImportMetaUsageRule; } });
Object.defineProperty(exports, "createImportMetaUsageRule", { enumerable: true, get: function () { return import_meta_usage_js_1.createImportMetaUsageRule; } });
const dirname_usage_js_1 = require("./dirname-usage.js");
Object.defineProperty(exports, "DirnameUsageRule", { enumerable: true, get: function () { return dirname_usage_js_1.DirnameUsageRule; } });
Object.defineProperty(exports, "createDirnameUsageRule", { enumerable: true, get: function () { return dirname_usage_js_1.createDirnameUsageRule; } });
const import_paths_js_1 = require("./import-paths.js");
Object.defineProperty(exports, "ImportPathsRule", { enumerable: true, get: function () { return import_paths_js_1.ImportPathsRule; } });
Object.defineProperty(exports, "createImportPathsRule", { enumerable: true, get: function () { return import_paths_js_1.createImportPathsRule; } });
const dependency_compat_js_1 = require("./dependency-compat.js");
Object.defineProperty(exports, "DependencyCompatRule", { enumerable: true, get: function () { return dependency_compat_js_1.DependencyCompatRule; } });
Object.defineProperty(exports, "createDependencyCompatRule", { enumerable: true, get: function () { return dependency_compat_js_1.createDependencyCompatRule; } });
/**
 * Get all built-in validation rules
 */
function getAllRules() {
    return [
        (0, import_meta_usage_js_1.createImportMetaUsageRule)(),
        (0, dirname_usage_js_1.createDirnameUsageRule)(),
        (0, import_paths_js_1.createImportPathsRule)(),
        (0, dependency_compat_js_1.createDependencyCompatRule)(),
    ];
}
//# sourceMappingURL=index.js.map