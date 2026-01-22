"use strict";
/**
 * @module detection/package-scanner
 * @description Package.json dependency scanner for frontend detection.
 *
 * Scans package.json files for framework and build tool dependencies
 * to detect frontend applications.
 *
 * @example
 * ```typescript
 * import { scanPackageJson, PackageScanner } from '@artk/core/detection';
 *
 * const result = await scanPackageJson('/path/to/project');
 * console.log(result.signals); // ['package-dependency:react', 'package-dependency:vite']
 * console.log(result.detectedType); // 'react-spa'
 * ```
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageScanner = void 0;
exports.scanPackageJson = scanPackageJson;
exports.hasPackageJson = hasPackageJson;
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const signals_js_1 = require("./signals.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('detection', 'package-scanner');
/**
 * Scanner for package.json files.
 */
class PackageScanner {
    /**
     * Scans a package.json file for frontend dependencies.
     *
     * @param dirPath - Directory containing package.json
     * @returns Scan result with signals and detected type
     */
    async scan(dirPath) {
        const packageJsonPath = node_path_1.default.join(dirPath, 'package.json');
        const emptyResult = {
            found: false,
            packageJsonPath: null,
            packageName: null,
            signals: [],
            detailedSignals: [],
            score: 0,
            detectedType: null,
            allDependencies: [],
        };
        if (!(0, node_fs_1.existsSync)(packageJsonPath)) {
            return emptyResult;
        }
        try {
            const content = await (0, promises_1.readFile)(packageJsonPath, 'utf-8');
            const pkg = JSON.parse(content);
            return this.analyzePackage(pkg, packageJsonPath);
        }
        catch (error) {
            // Log error for debugging but continue gracefully
            logger.warn('Failed to parse package.json (treating as empty)', {
                path: packageJsonPath,
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                ...emptyResult,
                packageJsonPath,
            };
        }
    }
    /**
     * Analyzes a parsed package.json for frontend indicators.
     */
    analyzePackage(pkg, packageJsonPath) {
        const allDeps = this.getAllDependencies(pkg);
        const signals = [];
        const detailedSignals = [];
        // Check for frontend framework/tool dependencies
        for (const dep of allDeps) {
            if (this.isFrontendDependency(dep)) {
                const signal = (0, signals_js_1.createSignal)('package-dependency', dep);
                const weight = (0, signals_js_1.getSignalWeight)(signal);
                if (weight > 0) {
                    signals.push(signal);
                    detailedSignals.push({
                        type: 'package-dependency',
                        source: signal,
                        weight,
                        description: `Found ${dep} in package.json dependencies`,
                    });
                }
            }
        }
        // Calculate total score
        const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);
        // Detect primary framework type
        const detectedType = this.detectFrameworkType(allDeps);
        return {
            found: true,
            packageJsonPath,
            packageName: pkg.name ?? null,
            signals,
            detailedSignals,
            score,
            detectedType,
            allDependencies: allDeps,
        };
    }
    /**
     * Gets all dependencies from package.json (deps + devDeps + peerDeps).
     */
    getAllDependencies(pkg) {
        const deps = new Set();
        if (pkg.dependencies) {
            Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
        }
        if (pkg.devDependencies) {
            Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
        }
        if (pkg.peerDependencies) {
            Object.keys(pkg.peerDependencies).forEach((d) => deps.add(d));
        }
        return Array.from(deps);
    }
    /**
     * Checks if a dependency indicates a frontend project.
     */
    isFrontendDependency(dep) {
        // Direct match
        if (signals_js_1.FRONTEND_PACKAGE_INDICATORS.includes(dep)) {
            return true;
        }
        // Check framework detection map
        if (dep in signals_js_1.FRAMEWORK_DETECTION_MAP) {
            return true;
        }
        // Check for scoped packages that indicate frontend
        const scopedPatterns = [
            /^@angular\//,
            /^@vue\//,
            /^@vitejs\//,
            /^@remix-run\//,
            /^@sveltejs\//,
            /^@astrojs\//,
            /^@nuxt\//,
            /^@next\//,
        ];
        return scopedPatterns.some((pattern) => pattern.test(dep));
    }
    /**
     * Detects the primary framework type from dependencies.
     * Priority: meta-frameworks > frameworks > build tools
     */
    detectFrameworkType(deps) {
        // Priority 1: Meta-frameworks (Next, Nuxt, etc.)
        if (deps.includes('next'))
            return 'next';
        if (deps.includes('nuxt') || deps.includes('nuxt3'))
            return 'nuxt';
        // Priority 2: Core frameworks
        if (deps.includes('react') || deps.includes('react-dom'))
            return 'react-spa';
        if (deps.includes('vue'))
            return 'vue-spa';
        if (deps.includes('@angular/core') ||
            deps.includes('@angular/platform-browser')) {
            return 'angular';
        }
        // Priority 3: Other frameworks
        if (deps.includes('svelte'))
            return 'other';
        if (deps.includes('astro'))
            return 'other';
        if (deps.includes('solid-js'))
            return 'other';
        // Priority 4: Check for framework plugins in build tools
        const hasReactVitePlugin = deps.includes('@vitejs/plugin-react');
        const hasVueVitePlugin = deps.includes('@vitejs/plugin-vue');
        const hasReactWebpackPlugin = deps.includes('babel-preset-react-app') ||
            deps.includes('@babel/preset-react');
        if (hasReactVitePlugin || hasReactWebpackPlugin)
            return 'react-spa';
        if (hasVueVitePlugin)
            return 'vue-spa';
        // No clear framework detected
        return null;
    }
}
exports.PackageScanner = PackageScanner;
/**
 * Convenience function to scan a package.json file.
 *
 * @param dirPath - Directory containing package.json
 * @returns Scan result
 */
async function scanPackageJson(dirPath) {
    const scanner = new PackageScanner();
    return scanner.scan(dirPath);
}
/**
 * Checks if a directory has a package.json file.
 *
 * @param dirPath - Directory to check
 * @returns True if package.json exists
 */
function hasPackageJson(dirPath) {
    return (0, node_fs_1.existsSync)(node_path_1.default.join(dirPath, 'package.json'));
}
//# sourceMappingURL=package-scanner.js.map