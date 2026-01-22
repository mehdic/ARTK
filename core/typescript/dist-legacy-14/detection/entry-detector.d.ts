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
import type { ArtkTargetType } from '../types/target.js';
import type { DetectionSignal } from '../types/detection.js';
/**
 * Entry file patterns to check, organized by framework.
 */
export declare const ENTRY_FILE_PATTERNS: {
    readonly react: readonly ["src/App.tsx", "src/App.jsx", "src/app.tsx", "src/app.jsx", "src/main.tsx", "src/main.jsx", "src/index.tsx", "src/index.jsx"];
    readonly vue: readonly ["src/App.vue", "vue.config.js"];
    readonly 'next-app': readonly ["app/page.tsx", "app/page.jsx", "app/layout.tsx", "app/layout.jsx"];
    readonly 'next-pages': readonly ["pages/index.tsx", "pages/index.jsx", "pages/_app.tsx", "pages/_app.jsx", "pages/_document.tsx", "pages/_document.jsx"];
    readonly nuxt: readonly ["pages/index.vue", "app.vue", "nuxt.config.ts", "nuxt.config.js"];
    readonly angular: readonly ["src/app/app.component.ts", "src/app/app.module.ts", "src/main.ts", "angular.json"];
    readonly config: readonly ["vite.config.ts", "vite.config.js", "webpack.config.js", "webpack.config.ts", "next.config.js", "next.config.mjs", "next.config.ts", "svelte.config.js", "astro.config.mjs"];
};
/**
 * Result of entry file detection.
 */
export interface EntryFileResult {
    /** All entry files found */
    foundFiles: string[];
    /** Detection signals from found files */
    signals: string[];
    /** Detailed signal information */
    detailedSignals: DetectionSignal[];
    /** Combined score from all signals */
    score: number;
    /** Detected framework type based on entry files */
    detectedType: ArtkTargetType | null;
}
/**
 * Entry file detector for frontend applications.
 */
export declare class EntryFileDetector {
    /**
     * Detects entry files in a directory.
     *
     * @param dirPath - Directory to scan for entry files
     * @returns Detection result with signals and type
     */
    detect(dirPath: string): Promise<EntryFileResult>;
    /**
     * Checks if a path is a file (not a directory).
     */
    private isFile;
    /**
     * Detects the framework type from found entry files.
     */
    private detectTypeFromFiles;
}
/**
 * Convenience function to detect entry files.
 *
 * @param dirPath - Directory to scan
 * @returns Detection result
 */
export declare function detectEntryFiles(dirPath: string): Promise<EntryFileResult>;
/**
 * Checks if a directory has any common frontend entry files.
 *
 * @param dirPath - Directory to check
 * @returns True if any entry files are found
 */
export declare function hasEntryFiles(dirPath: string): Promise<boolean>;
/**
 * Gets the list of all entry file patterns to check.
 *
 * @returns Flat list of all entry file patterns
 */
export declare function getAllEntryPatterns(): string[];
//# sourceMappingURL=entry-detector.d.ts.map