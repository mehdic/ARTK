/**
 * Get the package version from package.json
 */
export declare function getPackageVersion(): string;
/**
 * Get ISO timestamp for generated file headers
 */
export declare function getGeneratedTimestamp(): string;
/**
 * Generate a standard header comment for generated files
 */
export interface GeneratedHeaderOptions {
    title?: string;
    journeyId?: string;
    tags?: string[];
    tier?: string;
    scope?: string;
    actor?: string;
}
export declare function generateFileHeader(options?: GeneratedHeaderOptions): string;
/**
 * Branding string for inline comments
 */
export declare function getBrandingComment(): string;
//# sourceMappingURL=version.d.ts.map