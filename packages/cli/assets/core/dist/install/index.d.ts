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
interface PackageJsonOptions {
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
interface GeneratedPackageJson {
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
declare function normalizeProjectName(name: string): string;
/**
 * Generates a package.json object for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Package.json object
 */
declare function generatePackageJsonObject(options?: PackageJsonOptions): GeneratedPackageJson;
/**
 * Generates a package.json string for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Formatted package.json string
 */
declare function generatePackageJson(options?: PackageJsonOptions): string;
/**
 * Validates a project name.
 *
 * @param name - Project name to validate
 * @returns Validation result with normalized name
 */
declare function validateProjectName(name: string): {
    valid: boolean;
    normalized: string;
    warnings: string[];
};
/**
 * Default versions for ARTK E2E dependencies.
 */
declare const DEPENDENCY_VERSIONS: {
    readonly playwright: "^1.57.0";
    readonly typescript: "^5.3.3";
    readonly artkCore: "1.0.0";
    readonly node: ">=18.0.0";
};

/**
 * @module install/playwright-config-generator
 * @description Playwright configuration generator for ARTK E2E.
 *
 * Generates playwright.config.ts with multi-target support and
 * environment-aware configuration.
 *
 * @example
 * ```typescript
 * import { generatePlaywrightConfig, PlaywrightConfigOptions } from '@artk/core/install';
 *
 * const config = generatePlaywrightConfig({
 *   targets: ['user-portal', 'admin-portal'],
 *   defaultTarget: 'user-portal',
 * });
 *
 * await fs.writeFile('artk-e2e/playwright.config.ts', config);
 * ```
 */
/**
 * Target configuration for Playwright.
 */
interface PlaywrightTargetConfig {
    /**
     * Target name (e.g., 'user-portal').
     */
    name: string;
    /**
     * Base URL for the target.
     * Can include environment placeholder: ${ARTK_ENV}
     */
    baseUrl?: string;
    /**
     * Test directory for this target.
     * @default `tests/${name}`
     */
    testDir?: string;
    /**
     * Storage state path for this target.
     */
    storageState?: string;
}
/**
 * Options for generating playwright.config.ts.
 */
interface PlaywrightConfigOptions {
    /**
     * Target configurations.
     */
    targets?: PlaywrightTargetConfig[];
    /**
     * Default target name.
     */
    defaultTarget?: string;
    /**
     * Test directory (when not using targets).
     * @default 'tests'
     */
    testDir?: string;
    /**
     * Output directory for test artifacts.
     * @default 'test-results'
     */
    outputDir?: string;
    /**
     * Number of retries for failed tests.
     * @default 2
     */
    retries?: number;
    /**
     * Whether to run tests in parallel.
     * @default true
     */
    fullyParallel?: boolean;
    /**
     * Number of workers (parallel processes).
     */
    workers?: number;
    /**
     * Whether to forbid test.only() in CI.
     * @default true in CI
     */
    forbidOnly?: boolean;
    /**
     * Test timeout in milliseconds.
     * @default 30000
     */
    timeout?: number;
    /**
     * Expect (assertion) timeout in milliseconds.
     * @default 5000
     */
    expectTimeout?: number;
    /**
     * Whether to record trace on first retry.
     * @default 'on-first-retry'
     */
    trace?: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
    /**
     * Whether to capture screenshots on failure.
     * @default 'only-on-failure'
     */
    screenshot?: 'on' | 'off' | 'only-on-failure';
    /**
     * Whether to record video on failure.
     * @default 'on-first-retry'
     */
    video?: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
    /**
     * Browser viewport size.
     */
    viewport?: {
        width: number;
        height: number;
    };
    /**
     * Whether to run in headless mode.
     * @default true in CI
     */
    headless?: boolean;
    /**
     * Browsers to test against.
     * @default ['chromium']
     */
    browsers?: ('chromium' | 'firefox' | 'webkit')[];
    /**
     * Whether to include the reporter configuration.
     * @default true
     */
    includeReporter?: boolean;
    /**
     * Custom reporter configuration.
     */
    reporter?: string;
    /**
     * Whether to use the @artk/core harness.
     * @default true
     */
    useArtkHarness?: boolean;
    /**
     * Whether to include auth setup project.
     * @default true
     */
    includeAuthSetup?: boolean;
}
/**
 * Generates a playwright.config.ts string.
 *
 * @param options - Configuration options
 * @returns TypeScript configuration file content
 */
declare function generatePlaywrightConfig(options?: PlaywrightConfigOptions): string;
/**
 * Generates a minimal playwright.config.ts for quick setup.
 */
declare function generateMinimalPlaywrightConfig(): string;
/**
 * Generates tsconfig.json for the E2E test project.
 */
declare function generateTsConfig(): string;

/**
 * @module install/gitignore-generator
 * @description .gitignore generator for ARTK E2E isolated installation.
 *
 * Generates a comprehensive .gitignore for E2E test directories,
 * including patterns for test artifacts, auth states, and dependencies.
 *
 * @example
 * ```typescript
 * import { generateGitignore, GitignoreOptions } from '@artk/core/install';
 *
 * const gitignore = generateGitignore({
 *   includeAuthStates: true,
 *   includeTestArtifacts: true,
 * });
 *
 * await fs.writeFile('artk-e2e/.gitignore', gitignore);
 * ```
 */
/**
 * Options for generating .gitignore.
 */
interface GitignoreOptions {
    /**
     * Include patterns for auth storage states.
     * These contain sensitive session data and should not be committed.
     * @default true
     */
    includeAuthStates?: boolean;
    /**
     * Include patterns for test artifacts (traces, screenshots, videos).
     * @default true
     */
    includeTestArtifacts?: boolean;
    /**
     * Include patterns for coverage reports.
     * @default true
     */
    includeCoverage?: boolean;
    /**
     * Include patterns for IDE and editor files.
     * @default true
     */
    includeIdeFiles?: boolean;
    /**
     * Include patterns for OS-specific files.
     * @default true
     */
    includeOsFiles?: boolean;
    /**
     * Additional patterns to include.
     */
    additionalPatterns?: string[];
    /**
     * Patterns that should never be ignored (exceptions).
     * Will be prefixed with !
     */
    exceptions?: string[];
}
/**
 * Generates a .gitignore string for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Formatted .gitignore content
 */
declare function generateGitignore(options?: GitignoreOptions): string;
/**
 * Common .gitignore patterns for E2E testing.
 */
declare const GITIGNORE_PATTERNS: {
    readonly authStates: readonly [".auth-states/", "*.storageState.json"];
    readonly testArtifacts: readonly ["test-results/", "playwright-report/", "*.trace.zip"];
    readonly coverage: readonly ["coverage/", ".nyc_output/"];
    readonly dependencies: readonly ["node_modules/"];
    readonly environment: readonly [".env", ".env.local"];
};
/**
 * Creates a minimal .gitignore for quick setup.
 */
declare function generateMinimalGitignore(): string;
/**
 * Merges existing .gitignore content with ARTK patterns.
 *
 * @param existingContent - Existing .gitignore content
 * @param options - Generation options
 * @returns Merged .gitignore content
 */
declare function mergeGitignore(existingContent: string, options?: GitignoreOptions): string;

/**
 * @module install
 * @description Installation utilities for ARTK E2E independent architecture.
 * Generates package.json, playwright.config.ts, and other required files.
 *
 * @example
 * ```typescript
 * import {
 *   generatePackageJson,
 *   generatePlaywrightConfig,
 *   generateGitignore
 * } from '@artk/core/install';
 *
 * const packageJson = generatePackageJson({ projectName: 'my-e2e-tests' });
 * const playwrightConfig = generatePlaywrightConfig({ targets: ['user-portal'] });
 * const gitignore = generateGitignore();
 * ```
 */

/**
 * Install module version.
 */
declare const INSTALL_MODULE_VERSION = "1.0.0";

export { DEPENDENCY_VERSIONS, GITIGNORE_PATTERNS, type GeneratedPackageJson, type GitignoreOptions, INSTALL_MODULE_VERSION, type PackageJsonOptions, type PlaywrightConfigOptions, type PlaywrightTargetConfig, generateGitignore, generateMinimalGitignore, generateMinimalPlaywrightConfig, generatePackageJson, generatePackageJsonObject, generatePlaywrightConfig, generateTsConfig, mergeGitignore, normalizeProjectName, validateProjectName };
