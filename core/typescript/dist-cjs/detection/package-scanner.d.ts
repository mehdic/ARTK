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
import type { ArtkTargetType } from '../types/target.js';
import type { DetectionSignal } from '../types/detection.js';
/**
 * Result of scanning a package.json file.
 */
export interface PackageScanResult {
    /** Whether a package.json was found */
    found: boolean;
    /** Absolute path to the package.json file */
    packageJsonPath: string | null;
    /** Package name from package.json */
    packageName: string | null;
    /** Detection signals from package dependencies */
    signals: string[];
    /** Detailed signal information */
    detailedSignals: DetectionSignal[];
    /** Combined score from all signals */
    score: number;
    /** Detected frontend type based on dependencies */
    detectedType: ArtkTargetType | null;
    /** All dependencies found (for debugging) */
    allDependencies: string[];
}
/**
 * Scanner for package.json files.
 */
export declare class PackageScanner {
    /**
     * Scans a package.json file for frontend dependencies.
     *
     * @param dirPath - Directory containing package.json
     * @returns Scan result with signals and detected type
     */
    scan(dirPath: string): Promise<PackageScanResult>;
    /**
     * Analyzes a parsed package.json for frontend indicators.
     */
    private analyzePackage;
    /**
     * Gets all dependencies from package.json (deps + devDeps + peerDeps).
     */
    private getAllDependencies;
    /**
     * Checks if a dependency indicates a frontend project.
     */
    private isFrontendDependency;
    /**
     * Detects the primary framework type from dependencies.
     * Priority: meta-frameworks > frameworks > build tools
     */
    private detectFrameworkType;
}
/**
 * Convenience function to scan a package.json file.
 *
 * @param dirPath - Directory containing package.json
 * @returns Scan result
 */
export declare function scanPackageJson(dirPath: string): Promise<PackageScanResult>;
/**
 * Checks if a directory has a package.json file.
 *
 * @param dirPath - Directory to check
 * @returns True if package.json exists
 */
export declare function hasPackageJson(dirPath: string): boolean;
//# sourceMappingURL=package-scanner.d.ts.map