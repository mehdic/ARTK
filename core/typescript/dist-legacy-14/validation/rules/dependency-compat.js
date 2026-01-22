"use strict";
/**
 * Dependency Compatibility Validation Rule
 * T056: Implement dependency-compat rule (FR-024, FR-025)
 *
 * Checks that project dependencies are compatible with the detected module system.
 * Detects ESM-only packages (like nanoid v5+) in CommonJS environments.
 *
 * @module @artk/core/validation/rules/dependency-compat
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
exports.DependencyCompatRule = void 0;
exports.createDependencyCompatRule = createDependencyCompatRule;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Rule configuration
 */
const config = {
    id: 'dependency-compat',
    name: 'Dependency Compatibility',
    description: 'Checks that project dependencies are compatible with the detected module system',
    defaultStrictness: 'warning',
};
/**
 * Known ESM-only packages and their version constraints
 */
const ESM_ONLY_PACKAGES = {
    nanoid: '>=5.0.0', // v5+ is ESM-only
    chalk: '>=5.0.0', // v5+ is ESM-only
    execa: '>=6.0.0', // v6+ is ESM-only
    got: '>=12.0.0', // v12+ is ESM-only
    'p-limit': '>=4.0.0', // v4+ is ESM-only
    'p-queue': '>=7.0.0', // v7+ is ESM-only
    'globby': '>=13.0.0', // v13+ is ESM-only
    'find-up': '>=6.0.0', // v6+ is ESM-only
    'pkg-dir': '>=6.0.0', // v6+ is ESM-only
    'read-pkg': '>=7.0.0', // v7+ is ESM-only
    'read-pkg-up': '>=9.0.0', // v9+ is ESM-only
    'ora': '>=6.0.0', // v6+ is ESM-only
    'cli-spinners': '>=3.0.0', // v3+ is ESM-only
    'log-symbols': '>=5.0.0', // v5+ is ESM-only
    'figures': '>=5.0.0', // v5+ is ESM-only
    'boxen': '>=6.0.0', // v6+ is ESM-only
    'wrap-ansi': '>=8.0.0', // v8+ is ESM-only
    'string-width': '>=5.0.0', // v5+ is ESM-only
    'strip-ansi': '>=7.0.0', // v7+ is ESM-only
};
/**
 * Suggested alternatives or compatible versions
 */
const ALTERNATIVES = {
    nanoid: "Use nanoid@^4.0.0 for CommonJS or 'uuid' package as alternative",
    chalk: "Use chalk@^4.0.0 for CommonJS or 'kleur' as alternative",
    execa: "Use execa@^5.0.0 for CommonJS or 'cross-spawn' as alternative",
    got: "Use got@^11.0.0 for CommonJS or 'node-fetch' as alternative",
    'p-limit': 'Use p-limit@^3.0.0 for CommonJS',
};
/**
 * Parse a semver range and check if a version satisfies it
 */
function versionSatisfiesRange(version, range) {
    // Simple parser for common semver patterns
    const versionMatch = version.match(/\^?~?(\d+)\.(\d+)\.(\d+)/);
    const rangeMatch = range.match(/>?=?(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch || !rangeMatch) {
        return false;
    }
    const vMajor = Number(versionMatch[1] ?? 0);
    const vMinor = Number(versionMatch[2] ?? 0);
    const vPatch = Number(versionMatch[3] ?? 0);
    const rMajor = Number(rangeMatch[1] ?? 0);
    const rMinor = Number(rangeMatch[2] ?? 0);
    const rPatch = Number(rangeMatch[3] ?? 0);
    // For >= range (most common case)
    if (range.startsWith('>=')) {
        if (vMajor > rMajor)
            return true;
        if (vMajor < rMajor)
            return false;
        if (vMinor > rMinor)
            return true;
        if (vMinor < rMinor)
            return false;
        return vPatch >= rPatch;
    }
    // For ^ range (semver compatible)
    if (version.startsWith('^')) {
        return vMajor >= rMajor;
    }
    return vMajor >= rMajor;
}
/**
 * Extract package name from import statement
 */
function extractPackageName(importPath) {
    // Skip relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return null;
    }
    // Skip node: protocol
    if (importPath.startsWith('node:')) {
        return null;
    }
    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
        const parts = importPath.split('/');
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return `${parts[0]}/${parts[1]}`;
        }
        return null;
    }
    // Regular packages
    const parts = importPath.split('/');
    return parts[0] ?? null;
}
/**
 * Dependency Compatibility Rule
 *
 * Detects ESM-only packages in CommonJS environments
 */
class DependencyCompatRule {
    constructor() {
        this.config = config;
    }
    /**
     * Get list of known ESM-only packages
     */
    getEsmOnlyPackages() {
        return Object.keys(ESM_ONLY_PACKAGES);
    }
    /**
     * Get version constraints for ESM-only packages
     */
    getEsmOnlyConstraints() {
        return { ...ESM_ONLY_PACKAGES };
    }
    /**
     * Validate a file for ESM-only package imports
     */
    validate(filePath, content, moduleSystem) {
        // ESM-only packages are fine in ESM environments
        if (moduleSystem === 'esm') {
            return [];
        }
        const issues = [];
        const importedPackages = new Set();
        // Extract import/require statements
        const patterns = [
            /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        ];
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const importPath = match[1];
                if (!importPath)
                    continue;
                const packageName = extractPackageName(importPath);
                if (packageName && ESM_ONLY_PACKAGES[packageName]) {
                    // Skip if we've already reported this package
                    if (importedPackages.has(packageName)) {
                        continue;
                    }
                    importedPackages.add(packageName);
                    const lineNumber = this.getLineNumber(content, match.index);
                    issues.push({
                        file: filePath,
                        line: lineNumber,
                        column: null,
                        severity: 'warning',
                        ruleId: this.config.id,
                        message: `'${packageName}' is ESM-only in newer versions and may not work in CommonJS`,
                        suggestedFix: ALTERNATIVES[packageName] ||
                            `Check if your version of '${packageName}' is CommonJS-compatible`,
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Validate dependencies in package.json
     */
    validateDependencies(projectDir, moduleSystem) {
        // ESM-only packages are fine in ESM environments
        if (moduleSystem === 'esm') {
            return [];
        }
        const packageJsonPath = path.join(projectDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return [];
        }
        let packageJson;
        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            packageJson = JSON.parse(content);
        }
        catch {
            return [];
        }
        const issues = [];
        const allDeps = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {}),
        };
        for (const [packageName, versionRange] of Object.entries(allDeps)) {
            const esmOnlyRange = ESM_ONLY_PACKAGES[packageName];
            if (esmOnlyRange && versionSatisfiesRange(versionRange, esmOnlyRange)) {
                issues.push({
                    file: packageJsonPath,
                    line: null,
                    column: null,
                    severity: 'warning',
                    ruleId: this.config.id,
                    message: `'${packageName}@${versionRange}' is ESM-only and incompatible with CommonJS`,
                    suggestedFix: ALTERNATIVES[packageName] ||
                        `Downgrade '${packageName}' to a CommonJS-compatible version`,
                });
            }
        }
        return issues;
    }
    /**
     * Get line number for a position in content
     */
    getLineNumber(content, position) {
        const before = content.substring(0, position);
        return before.split('\n').length;
    }
}
exports.DependencyCompatRule = DependencyCompatRule;
/**
 * Create a new DependencyCompatRule instance
 */
function createDependencyCompatRule() {
    return new DependencyCompatRule();
}
//# sourceMappingURL=dependency-compat.js.map