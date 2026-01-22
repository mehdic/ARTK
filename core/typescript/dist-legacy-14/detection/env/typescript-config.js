"use strict";
/**
 * TypeScript Configuration Detection
 *
 * Detects TypeScript module settings from tsconfig.json.
 * Uses strip-json-comments to handle JSON with comments.
 *
 * @module @artk/core/detection/env/typescript-config
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTsConfig = parseTsConfig;
exports.getTsModuleFromConfig = getTsModuleFromConfig;
exports.inferModuleSystemFromTsModule = inferModuleSystemFromTsModule;
exports.detectTypeScriptModule = detectTypeScriptModule;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const strip_json_comments_1 = __importDefault(require("strip-json-comments"));
/**
 * TypeScript module values that map to ESM
 */
const ESM_TS_MODULES = [
    'es6',
    'es2015',
    'es2020',
    'es2022',
    'esnext',
    'nodenext',
    'node16',
    'node18',
];
/**
 * TypeScript module values that map to CommonJS
 */
const CJS_TS_MODULES = ['commonjs', 'umd', 'amd', 'system'];
/**
 * Parses tsconfig.json content, handling JSON with comments
 *
 * Uses strip-json-comments to remove single-line and block style comments.
 *
 * @param content - Raw tsconfig.json content (may contain comments)
 * @returns Parsed config object, or null if parsing fails
 *
 * @example
 * ```typescript
 * const config = parseTsConfig(`{
 *   // TypeScript configuration
 *   "compilerOptions": {
 *     "module": "esnext"
 *   }
 * }`);
 * // { compilerOptions: { module: 'esnext' } }
 * ```
 */
function parseTsConfig(content) {
    try {
        // Strip comments first
        const cleanContent = (0, strip_json_comments_1.default)(content);
        return JSON.parse(cleanContent);
    }
    catch {
        // Return null for any parse error (including invalid JSON after comment stripping)
        return null;
    }
}
/**
 * Extracts module setting from tsconfig
 *
 * @param config - Parsed tsconfig object
 * @returns Module setting or null if not found
 *
 * @example
 * ```typescript
 * getTsModuleFromConfig({ compilerOptions: { module: 'esnext' } });
 * // 'esnext'
 *
 * getTsModuleFromConfig({});
 * // null
 * ```
 */
function getTsModuleFromConfig(config) {
    if (!config || !config.compilerOptions) {
        return null;
    }
    return config.compilerOptions.module ?? null;
}
/**
 * Infers module system from TypeScript module setting
 *
 * @param tsModule - TypeScript module setting
 * @returns Inferred module system or null if cannot determine
 *
 * @example
 * ```typescript
 * inferModuleSystemFromTsModule('esnext');   // 'esm'
 * inferModuleSystemFromTsModule('commonjs'); // 'commonjs'
 * inferModuleSystemFromTsModule('unknown');  // null
 * ```
 */
function inferModuleSystemFromTsModule(tsModule) {
    if (!tsModule) {
        return null;
    }
    const normalized = tsModule.toLowerCase();
    if (ESM_TS_MODULES.includes(normalized)) {
        return 'esm';
    }
    if (CJS_TS_MODULES.includes(normalized)) {
        return 'commonjs';
    }
    // Unknown module type
    return null;
}
/**
 * Detects TypeScript module setting from tsconfig.json (FR-003)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module setting and inferred system
 *
 * @example
 * ```typescript
 * const result = detectTypeScriptModule('/path/to/project');
 * if (result.tsModule === 'esnext') {
 *   console.log('TypeScript configured for ESM');
 * }
 * ```
 */
function detectTypeScriptModule(projectRoot) {
    const warnings = [];
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    // Check if tsconfig.json exists
    if (!fs.existsSync(tsconfigPath)) {
        return {
            tsModule: null,
            inferredModuleSystem: null,
            warnings,
            found: false,
        };
    }
    // Read and parse tsconfig.json
    let config;
    try {
        const content = fs.readFileSync(tsconfigPath, 'utf8');
        config = parseTsConfig(content);
    }
    catch (error) {
        warnings.push(`Failed to read tsconfig.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
            tsModule: null,
            inferredModuleSystem: null,
            warnings,
            found: true,
        };
    }
    if (!config) {
        warnings.push('Failed to parse tsconfig.json (invalid JSON after comment stripping)');
        return {
            tsModule: null,
            inferredModuleSystem: null,
            warnings,
            found: true,
        };
    }
    const tsModule = getTsModuleFromConfig(config);
    const inferredModuleSystem = inferModuleSystemFromTsModule(tsModule);
    return {
        tsModule,
        inferredModuleSystem,
        warnings,
        found: true,
    };
}
//# sourceMappingURL=typescript-config.js.map