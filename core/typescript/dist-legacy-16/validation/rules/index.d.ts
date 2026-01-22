/**
 * Validation Rules Index
 *
 * Exports all validation rules for the foundation validation gate.
 *
 * @module @artk/core/validation/rules
 */
import { ImportMetaUsageRule, createImportMetaUsageRule } from './import-meta-usage.js';
import { DirnameUsageRule, createDirnameUsageRule } from './dirname-usage.js';
import { ImportPathsRule, createImportPathsRule } from './import-paths.js';
import { DependencyCompatRule, createDependencyCompatRule } from './dependency-compat.js';
export { ImportMetaUsageRule, createImportMetaUsageRule, };
export { DirnameUsageRule, createDirnameUsageRule };
export { ImportPathsRule, createImportPathsRule };
export { DependencyCompatRule, createDependencyCompatRule, };
/**
 * Get all built-in validation rules
 */
export declare function getAllRules(): (ImportMetaUsageRule | DirnameUsageRule | ImportPathsRule | DependencyCompatRule)[];
//# sourceMappingURL=index.d.ts.map