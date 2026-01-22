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
export interface PlaywrightTargetConfig {
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
export interface PlaywrightConfigOptions {
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
export declare function generatePlaywrightConfig(options?: PlaywrightConfigOptions): string;
/**
 * Generates a minimal playwright.config.ts for quick setup.
 */
export declare function generateMinimalPlaywrightConfig(): string;
/**
 * Generates tsconfig.json for the E2E test project.
 */
export declare function generateTsConfig(): string;
//# sourceMappingURL=playwright-config-generator.d.ts.map