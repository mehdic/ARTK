/**
 * Get the package root directory.
 *
 * Strategy:
 * 1. Check ARTK_AUTOGEN_ROOT env var (for testing/override)
 * 2. Use module location to find package root
 * 3. Fallback to cwd-based search
 */
export declare function getPackageRoot(): string;
/**
 * Get the templates directory path.
 *
 * Templates are copied to dist/codegen/templates/ during build.
 * When installed, only one dist variant exists.
 */
export declare function getTemplatesDir(): string;
/**
 * Get the path to a specific template file.
 */
export declare function getTemplatePath(templateName: string): string;
/**
 * Clear cached paths (for testing)
 */
export declare function clearPathCache(): void;
//# sourceMappingURL=paths.d.ts.map