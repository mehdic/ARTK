/**
 * @module install/package-generator
 * @description Package.json generator for ARTK E2E isolated installation.
 *
 * Generates a minimal package.json with only essential dependencies:
 * - @artk/core (vendored)
 * - @playwright/test
 *
 * @example
 * ```typescript
 * import { generatePackageJson, PackageJsonOptions } from '@artk/core/install';
 *
 * const packageJson = generatePackageJson({
 *   projectName: 'my-e2e-tests',
 *   artkCoreVersion: '1.0.0',
 *   playwrightVersion: '^1.57.0',
 * });
 *
 * await fs.writeFile('artk-e2e/package.json', packageJson);
 * ```
 */
/**
 * Options for generating package.json.
 */
export interface PackageJsonOptions {
    /**
     * Name of the E2E test project.
     * Will be normalized to lowercase-kebab-case.
     * @default 'artk-e2e-tests'
     */
    projectName?: string;
    /**
     * Description for the package.
     * @default 'ARTK E2E Testing Suite'
     */
    description?: string;
    /**
     * Version of @artk/core to use.
     * @default '1.0.0'
     */
    artkCoreVersion?: string;
    /**
     * Version of @playwright/test to use.
     * @default '^1.57.0'
     */
    playwrightVersion?: string;
    /**
     * Additional npm scripts to include.
     */
    additionalScripts?: Record<string, string>;
    /**
     * Additional dependencies to include.
     */
    additionalDependencies?: Record<string, string>;
    /**
     * Additional devDependencies to include.
     */
    additionalDevDependencies?: Record<string, string>;
    /**
     * Whether to include TypeScript configuration.
     * @default true
     */
    includeTypeScript?: boolean;
    /**
     * TypeScript version to use.
     * @default '^5.3.3'
     */
    typescriptVersion?: string;
    /**
     * Whether this is a vendored installation (uses local path).
     * @default true
     */
    vendored?: boolean;
}
/**
 * Generated package.json structure.
 */
export interface GeneratedPackageJson {
    name: string;
    version: string;
    private: boolean;
    type: 'module';
    description: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    engines: {
        node: string;
    };
}
/**
 * Normalizes a project name to lowercase-kebab-case.
 *
 * @param name - Project name to normalize
 * @returns Normalized project name
 */
export declare function normalizeProjectName(name: string): string;
/**
 * Generates a package.json object for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Package.json object
 */
export declare function generatePackageJsonObject(options?: PackageJsonOptions): GeneratedPackageJson;
/**
 * Generates a package.json string for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Formatted package.json string
 */
export declare function generatePackageJson(options?: PackageJsonOptions): string;
/**
 * Validates a project name.
 *
 * @param name - Project name to validate
 * @returns Validation result with normalized name
 */
export declare function validateProjectName(name: string): {
    valid: boolean;
    normalized: string;
    warnings: string[];
};
/**
 * Default versions for ARTK E2E dependencies.
 */
export declare const DEPENDENCY_VERSIONS: {
    readonly playwright: "^1.57.0";
    readonly typescript: "^5.3.3";
    readonly artkCore: "1.0.0";
    readonly node: ">=18.0.0";
};
//# sourceMappingURL=package-generator.d.ts.map