"use strict";
/**
 * Environment Detection Module
 *
 * Automatically detects project environment (CommonJS/ESM, Node version, TypeScript config)
 * for foundation module generation.
 *
 * @module @artk/core/detection/env
 *
 * @example
 * ```typescript
 * import { detectEnvironment } from '@artk/core/detection';
 *
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 * console.log(`Module system: ${result.context.moduleSystem}`);
 * console.log(`Template variant: ${result.context.templateVariant}`);
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectEnvironment = detectEnvironment;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_version_js_1 = require("./node-version.js");
const module_system_js_1 = require("./module-system.js");
const typescript_config_js_1 = require("./typescript-config.js");
const confidence_js_1 = require("./confidence.js");
// Re-export sub-modules
__exportStar(require("./node-version.js"), exports);
__exportStar(require("./module-system.js"), exports);
__exportStar(require("./typescript-config.js"), exports);
__exportStar(require("./confidence.js"), exports);
/**
 * Context file path
 */
const CONTEXT_DIR = '.artk';
const CONTEXT_FILE = 'context.json';
/**
 * Default detection timeout (5 seconds per spec)
 */
const DEFAULT_TIMEOUT = 5000;
/**
 * Reads cached context from .artk/context.json
 */
function readCachedContext(projectRoot) {
    const contextPath = path.join(projectRoot, CONTEXT_DIR, CONTEXT_FILE);
    if (!fs.existsSync(contextPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(contextPath, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Writes context to .artk/context.json
 */
function writeCachedContext(projectRoot, context) {
    const contextDir = path.join(projectRoot, CONTEXT_DIR);
    const contextPath = path.join(contextDir, CONTEXT_FILE);
    // Create .artk directory if it doesn't exist
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}
/**
 * Creates an EnvironmentContext from detection results
 */
function createEnvironmentContext(nodeVersion, moduleSystemResult, tsResult, confidenceResult) {
    const esmCompat = (0, node_version_js_1.determineESMCompatibility)(nodeVersion);
    // Determine final module system
    const moduleSystem = confidenceResult.recommendedModuleSystem;
    // Collect all warnings
    const warnings = [
        ...moduleSystemResult.warnings,
        ...tsResult.warnings,
        ...confidenceResult.warnings,
    ];
    return {
        moduleSystem,
        nodeVersion: nodeVersion.raw,
        nodeVersionParsed: {
            major: nodeVersion.major,
            minor: nodeVersion.minor,
            patch: nodeVersion.patch,
        },
        tsModule: tsResult.tsModule,
        supportsImportMeta: moduleSystem === 'esm' && esmCompat.supportsImportMeta,
        supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
        templateVariant: moduleSystem,
        templateSource: 'bundled',
        detectionTimestamp: new Date().toISOString(),
        detectionConfidence: confidenceResult.confidence,
        detectionMethod: moduleSystemResult.detectionMethod,
        warnings,
    };
}
/**
 * Detects project environment (FR-001 through FR-010)
 *
 * Performs automatic detection of:
 * - Node.js version (FR-001)
 * - Module system from package.json (FR-002)
 * - TypeScript module setting (FR-003)
 * - ESM compatibility (FR-004)
 *
 * Results are cached to .artk/context.json (FR-005, FR-006).
 *
 * @param options - Detection options
 * @returns Detection result with environment context
 * @throws Error if projectRoot doesn't exist or Node version is unsupported
 *
 * @example
 * ```typescript
 * // Basic detection
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 *
 * // Force re-detection (bypass cache)
 * const fresh = detectEnvironment({
 *   projectRoot: '/path/to/project',
 *   forceDetect: true
 * });
 * ```
 */
function detectEnvironment(options) {
    const { projectRoot, forceDetect = false, timeout = DEFAULT_TIMEOUT } = options;
    const startTime = Date.now();
    // Validate project root exists
    if (!fs.existsSync(projectRoot)) {
        throw new Error(`Project directory does not exist: ${projectRoot}`);
    }
    // Check for cached results (unless force-detect)
    if (!forceDetect) {
        const cached = readCachedContext(projectRoot);
        if (cached) {
            return {
                context: cached,
                fromCache: true,
                detectionTime: Date.now() - startTime,
            };
        }
    }
    // Perform detection with timeout protection
    let context;
    let timedOut = false;
    try {
        // Set up timeout check
        const checkTimeout = () => {
            if (Date.now() - startTime > timeout) {
                timedOut = true;
                throw new Error('Detection timeout');
            }
        };
        // 1. Get Node version (FR-001)
        const nodeVersion = (0, node_version_js_1.getNodeVersion)();
        (0, node_version_js_1.validateNodeVersion)(nodeVersion);
        checkTimeout();
        // 2. Detect module system from package.json (FR-002)
        const moduleSystemResult = (0, module_system_js_1.detectModuleSystem)(projectRoot);
        checkTimeout();
        // 3. Detect TypeScript module (FR-003)
        const tsResult = (0, typescript_config_js_1.detectTypeScriptModule)(projectRoot);
        checkTimeout();
        // 4. Calculate confidence (FR-008)
        const signals = {
            packageJsonType: moduleSystemResult.rawType,
            tsconfigModule: tsResult.tsModule,
            usedFallback: moduleSystemResult.detectionMethod === 'fallback',
            timedOut: false,
        };
        const confidenceResult = (0, confidence_js_1.calculateConfidence)(signals);
        // 5. Create context
        context = createEnvironmentContext(nodeVersion, moduleSystemResult, tsResult, confidenceResult);
    }
    catch (error) {
        if (timedOut || (error instanceof Error && error.message === 'Detection timeout')) {
            // Fallback on timeout
            const nodeVersion = (0, node_version_js_1.getNodeVersion)();
            const esmCompat = (0, node_version_js_1.determineESMCompatibility)(nodeVersion);
            context = {
                moduleSystem: 'commonjs',
                nodeVersion: nodeVersion.raw,
                nodeVersionParsed: {
                    major: nodeVersion.major,
                    minor: nodeVersion.minor,
                    patch: nodeVersion.patch,
                },
                tsModule: null,
                supportsImportMeta: false,
                supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
                templateVariant: 'commonjs',
                templateSource: 'bundled',
                detectionTimestamp: new Date().toISOString(),
                detectionConfidence: 'low',
                detectionMethod: 'fallback',
                warnings: ['Detection timed out. Using CommonJS fallback.'],
            };
        }
        else {
            throw error;
        }
    }
    // Cache results (FR-005)
    writeCachedContext(projectRoot, context);
    return {
        context,
        fromCache: false,
        detectionTime: Date.now() - startTime,
    };
}
//# sourceMappingURL=index.js.map