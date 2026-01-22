"use strict";
/**
 * Module System Detection
 *
 * Detects whether a project uses CommonJS or ESM based on package.json.
 *
 * @module @artk/core/detection/env/module-system
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleSystemFromType = getModuleSystemFromType;
exports.parsePackageJson = parsePackageJson;
exports.detectModuleSystem = detectModuleSystem;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Gets module system from package.json "type" field (FR-002)
 *
 * Per Node.js specification:
 * - "module" = ESM
 * - "commonjs" or absent = CommonJS
 *
 * @param typeField - Value of "type" field from package.json
 * @returns Module system ('commonjs' or 'esm')
 *
 * @example
 * ```typescript
 * getModuleSystemFromType('module');   // 'esm'
 * getModuleSystemFromType('commonjs'); // 'commonjs'
 * getModuleSystemFromType(undefined);  // 'commonjs'
 * ```
 */
function getModuleSystemFromType(typeField) {
    if (typeField === 'module') {
        return 'esm';
    }
    // "commonjs" or any other value (including undefined) = CommonJS
    return 'commonjs';
}
/**
 * Parses package.json content string
 *
 * @param content - Raw package.json content
 * @returns Parsed package.json object
 * @throws Error if content is invalid JSON
 *
 * @example
 * ```typescript
 * const pkg = parsePackageJson('{"name": "test", "type": "module"}');
 * // { name: 'test', type: 'module' }
 * ```
 */
function parsePackageJson(content) {
    try {
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error(`Failed to parse package.json: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
}
/**
 * Detects module system from package.json in the project root (FR-002)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module system, method, and warnings
 *
 * @example
 * ```typescript
 * const result = detectModuleSystem('/path/to/project');
 * if (result.moduleSystem === 'esm') {
 *   console.log('Project uses ES Modules');
 * }
 * ```
 */
function detectModuleSystem(projectRoot) {
    const warnings = [];
    const packageJsonPath = path.join(projectRoot, 'package.json');
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
        warnings.push('package.json not found in project root. Using CommonJS fallback.');
        return {
            moduleSystem: 'commonjs',
            detectionMethod: 'fallback',
            confidence: 'low',
            warnings,
        };
    }
    // Read and parse package.json
    let pkg;
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        pkg = parsePackageJson(content);
    }
    catch (error) {
        warnings.push(`Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}. Using CommonJS fallback.`);
        return {
            moduleSystem: 'commonjs',
            detectionMethod: 'fallback',
            confidence: 'low',
            warnings,
        };
    }
    // Determine module system from type field
    const moduleSystem = getModuleSystemFromType(pkg.type);
    return {
        moduleSystem,
        detectionMethod: 'package.json',
        confidence: 'high',
        warnings,
        rawType: pkg.type,
    };
}
//# sourceMappingURL=module-system.js.map