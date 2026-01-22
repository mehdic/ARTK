"use strict";
/**
 * Detection Confidence Scoring
 *
 * Calculates confidence level based on consistency of detection signals.
 *
 * @module @artk/core/detection/env/confidence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateConfidence = calculateConfidence;
/**
 * TypeScript module values that indicate ESM
 */
const ESM_TS_MODULES = new Set([
    'es6',
    'es2015',
    'es2020',
    'es2022',
    'esnext',
    'nodenext',
    'node16',
    'node18',
]);
/**
 * Determines if a tsconfig module setting indicates ESM
 */
function isTsModuleESM(tsModule) {
    if (!tsModule)
        return null;
    return ESM_TS_MODULES.has(tsModule.toLowerCase());
}
/**
 * Determines if package.json type indicates ESM
 */
function isPackageTypeESM(packageType) {
    return packageType === 'module';
}
/**
 * Calculates detection confidence based on signal consistency (FR-008)
 *
 * Confidence levels:
 * - 'high': package.json and tsconfig agree, or only one present
 * - 'medium': package.json and tsconfig conflict but clear precedence
 * - 'low': fallback used or timeout occurred
 *
 * When there's a conflict, TypeScript config is prioritized for .ts files.
 *
 * @param signals - Detection signals to evaluate
 * @returns Confidence result with recommended module system
 *
 * @example
 * ```typescript
 * // High confidence - both agree
 * calculateConfidence({ packageJsonType: 'module', tsconfigModule: 'esnext' });
 * // { confidence: 'high', recommendedModuleSystem: 'esm', warnings: [] }
 *
 * // Medium confidence - conflict
 * calculateConfidence({ packageJsonType: 'module', tsconfigModule: 'commonjs' });
 * // { confidence: 'medium', recommendedModuleSystem: 'commonjs', warnings: [...] }
 * ```
 */
function calculateConfidence(signals) {
    const warnings = [];
    // Low confidence: fallback or timeout
    if (signals.usedFallback || signals.timedOut) {
        const reason = signals.timedOut ? 'detection timed out' : 'fallback was used';
        warnings.push(`Low confidence: ${reason}`);
        return {
            confidence: 'low',
            recommendedModuleSystem: 'commonjs', // Safe default
            warnings,
        };
    }
    const packageIsESM = isPackageTypeESM(signals.packageJsonType);
    const tsIsESM = isTsModuleESM(signals.tsconfigModule);
    // Case 1: Only package.json signal available
    if (tsIsESM === null) {
        return {
            confidence: 'high',
            recommendedModuleSystem: packageIsESM ? 'esm' : 'commonjs',
            warnings,
        };
    }
    // Case 2: Only tsconfig signal available (package.json has no type field)
    if (signals.packageJsonType === undefined) {
        // No explicit package type, tsconfig determines
        return {
            confidence: 'high',
            recommendedModuleSystem: tsIsESM ? 'esm' : 'commonjs',
            warnings,
        };
    }
    // Case 3: Both signals available - check for agreement
    const packageModuleSystem = packageIsESM ? 'esm' : 'commonjs';
    const tsModuleSystem = tsIsESM ? 'esm' : 'commonjs';
    if (packageModuleSystem === tsModuleSystem) {
        // Agreement
        return {
            confidence: 'high',
            recommendedModuleSystem: packageModuleSystem,
            warnings,
        };
    }
    // Case 4: Conflict - package.json and tsconfig disagree
    warnings.push(`Conflicting module system settings: package.json indicates "${packageModuleSystem}", ` +
        `tsconfig.json indicates "${tsModuleSystem}".`);
    warnings.push('TypeScript configuration is prioritized for .ts files (recommended for foundation modules).');
    return {
        confidence: 'medium',
        recommendedModuleSystem: tsModuleSystem, // Prioritize TypeScript config
        warnings,
    };
}
//# sourceMappingURL=confidence.js.map