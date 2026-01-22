import { type SelectorCatalog } from './catalogSchema.js';
/**
 * Scanner options
 */
export interface ScannerOptions {
    /** Source directory to scan */
    sourceDir: string;
    /** Test ID attribute name */
    testIdAttribute?: string;
    /** File patterns to include */
    include?: string[];
    /** File patterns to exclude */
    exclude?: string[];
    /** Whether to track CSS selector debt */
    trackCSSDebt?: boolean;
    /** Existing catalog to merge with */
    existingCatalog?: SelectorCatalog;
}
/**
 * Scanner result
 */
export interface ScannerResult {
    /** Generated catalog */
    catalog: SelectorCatalog;
    /** Files scanned */
    filesScanned: number;
    /** TestIDs found */
    testIdsFound: number;
    /** CSS debt entries found */
    cssDebtFound: number;
    /** Warnings during scanning */
    warnings: string[];
}
/**
 * Scan source directory for testids
 */
export declare function scanForTestIds(options: ScannerOptions): Promise<ScannerResult>;
/**
 * Quick scan to just get testids (faster, no full catalog)
 */
export declare function quickScanTestIds(sourceDir: string, testIdAttribute?: string): Promise<string[]>;
//# sourceMappingURL=scanner.d.ts.map