"use strict";
/**
 * @module detection/entry-detector
 * @description Entry file detector for frontend applications.
 *
 * Scans directories for common frontend entry files like App.tsx,
 * main.ts, pages/index.tsx, etc.
 *
 * @example
 * ```typescript
 * import { detectEntryFiles, EntryFileDetector } from '@artk/core/detection';
 *
 * const result = await detectEntryFiles('/path/to/project');
 * console.log(result.signals); // ['entry-file:src/App.tsx', 'entry-file:src/main.tsx']
 * console.log(result.detectedType); // 'react-spa'
 * ```
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryFileDetector = exports.ENTRY_FILE_PATTERNS = void 0;
exports.detectEntryFiles = detectEntryFiles;
exports.hasEntryFiles = hasEntryFiles;
exports.getAllEntryPatterns = getAllEntryPatterns;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const signals_js_1 = require("./signals.js");
/**
 * Entry file patterns to check, organized by framework.
 */
exports.ENTRY_FILE_PATTERNS = {
    // React/Generic SPA
    react: [
        'src/App.tsx',
        'src/App.jsx',
        'src/app.tsx',
        'src/app.jsx',
        'src/main.tsx',
        'src/main.jsx',
        'src/index.tsx',
        'src/index.jsx',
    ],
    // Vue (src/App.vue is definitive, vue.config.js for Vue 2 CLI projects)
    // Note: src/main.ts and src/main.js are shared with Angular and other frameworks
    // so we exclude them from Vue type detection to avoid false positives
    vue: ['src/App.vue', 'vue.config.js'],
    // Next.js (App Router)
    'next-app': ['app/page.tsx', 'app/page.jsx', 'app/layout.tsx', 'app/layout.jsx'],
    // Next.js (Pages Router)
    'next-pages': [
        'pages/index.tsx',
        'pages/index.jsx',
        'pages/_app.tsx',
        'pages/_app.jsx',
        'pages/_document.tsx',
        'pages/_document.jsx',
    ],
    // Nuxt
    nuxt: [
        'pages/index.vue',
        'app.vue',
        'nuxt.config.ts',
        'nuxt.config.js',
    ],
    // Angular (angular.json is definitive, app.module.ts is legacy but still common)
    angular: [
        'src/app/app.component.ts',
        'src/app/app.module.ts',
        'src/main.ts',
        'angular.json',
    ],
    // Config files (secondary indicators)
    config: [
        'vite.config.ts',
        'vite.config.js',
        'webpack.config.js',
        'webpack.config.ts',
        'next.config.js',
        'next.config.mjs',
        'next.config.ts',
        'svelte.config.js',
        'astro.config.mjs',
    ],
};
/**
 * Entry file detector for frontend applications.
 */
class EntryFileDetector {
    /**
     * Detects entry files in a directory.
     *
     * @param dirPath - Directory to scan for entry files
     * @returns Detection result with signals and type
     */
    async detect(dirPath) {
        const foundFiles = [];
        const signals = [];
        const detailedSignals = [];
        // Check all entry file patterns
        for (const [category, patterns] of Object.entries(exports.ENTRY_FILE_PATTERNS)) {
            for (const pattern of patterns) {
                const fullPath = node_path_1.default.join(dirPath, pattern);
                if ((0, node_fs_1.existsSync)(fullPath) && this.isFile(fullPath)) {
                    foundFiles.push(pattern);
                    // Determine signal category
                    const signalCategory = pattern.includes('config')
                        ? 'config-file'
                        : 'entry-file';
                    const signal = (0, signals_js_1.createSignal)(signalCategory, pattern);
                    const weight = (0, signals_js_1.getSignalWeight)(signal);
                    if (weight > 0) {
                        signals.push(signal);
                        detailedSignals.push({
                            type: signalCategory,
                            source: signal,
                            weight,
                            description: `Found ${category} entry file: ${pattern}`,
                        });
                    }
                }
            }
        }
        // Calculate total score
        const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);
        // Detect framework type from entry files
        const detectedType = this.detectTypeFromFiles(foundFiles);
        return {
            foundFiles,
            signals,
            detailedSignals,
            score,
            detectedType,
        };
    }
    /**
     * Checks if a path is a file (not a directory).
     */
    isFile(filePath) {
        try {
            return (0, node_fs_1.statSync)(filePath).isFile();
        }
        catch {
            return false;
        }
    }
    /**
     * Detects the framework type from found entry files.
     */
    detectTypeFromFiles(files) {
        // Priority 1: Next.js (either router)
        const hasNextApp = files.some((f) => exports.ENTRY_FILE_PATTERNS['next-app'].includes(f));
        const hasNextPages = files.some((f) => exports.ENTRY_FILE_PATTERNS['next-pages'].includes(f));
        const hasNextConfig = files.some((f) => f.startsWith('next.config'));
        if (hasNextApp || hasNextPages || hasNextConfig) {
            return 'next';
        }
        // Priority 2: Nuxt
        const hasNuxt = files.some((f) => exports.ENTRY_FILE_PATTERNS.nuxt.includes(f) ||
            f.startsWith('nuxt.config'));
        if (hasNuxt) {
            return 'nuxt';
        }
        // Priority 3: Angular (requires angular.json as definitive indicator)
        // Note: src/main.ts alone is ambiguous (used by Vue/Angular/React+Vite)
        // We require angular.json to disambiguate from other frameworks
        const hasAngularJson = files.includes('angular.json');
        const hasAngularComponent = files.includes('src/app/app.component.ts');
        const hasAngularModule = files.includes('src/app/app.module.ts');
        if (hasAngularJson || (hasAngularComponent && hasAngularModule)) {
            return 'angular';
        }
        // Priority 4: Vue
        const hasVue = files.some((f) => exports.ENTRY_FILE_PATTERNS.vue.includes(f));
        if (hasVue) {
            return 'vue-spa';
        }
        // Priority 5: React (most generic)
        const hasReact = files.some((f) => exports.ENTRY_FILE_PATTERNS.react.includes(f));
        if (hasReact) {
            return 'react-spa';
        }
        // No clear type detected
        return null;
    }
}
exports.EntryFileDetector = EntryFileDetector;
/**
 * Convenience function to detect entry files.
 *
 * @param dirPath - Directory to scan
 * @returns Detection result
 */
async function detectEntryFiles(dirPath) {
    const detector = new EntryFileDetector();
    return detector.detect(dirPath);
}
/**
 * Checks if a directory has any common frontend entry files.
 *
 * @param dirPath - Directory to check
 * @returns True if any entry files are found
 */
async function hasEntryFiles(dirPath) {
    const result = await detectEntryFiles(dirPath);
    return result.foundFiles.length > 0;
}
/**
 * Gets the list of all entry file patterns to check.
 *
 * @returns Flat list of all entry file patterns
 */
function getAllEntryPatterns() {
    return Object.values(exports.ENTRY_FILE_PATTERNS).flat();
}
//# sourceMappingURL=entry-detector.js.map