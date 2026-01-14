/**
 * Environment detection utilities
 *
 * Detects the target project's module system (ESM vs CommonJS)
 * and other environment characteristics.
 */
interface EnvironmentInfo {
    moduleSystem: 'esm' | 'commonjs' | 'unknown';
    nodeVersion: string;
    npmVersion: string | null;
    hasGit: boolean;
    hasPlaywright: boolean;
    hasArtkCore: boolean;
    platform: NodeJS.Platform;
    arch: string;
    isCI: boolean;
}
/**
 * Detect the target project's environment
 */
declare function detectEnvironment(projectPath: string): Promise<EnvironmentInfo>;

/**
 * Logger - Colorful console output utilities
 */
declare class Logger {
    private spinner;
    private verbose;
    constructor(options?: {
        verbose?: boolean;
    });
    header(text: string): void;
    step(current: number, total: number, message: string): void;
    startSpinner(message: string): void;
    updateSpinner(message: string): void;
    succeedSpinner(message?: string): void;
    failSpinner(message?: string): void;
    stopSpinner(): void;
    info(message: string): void;
    success(message: string): void;
    warning(message: string): void;
    error(message: string): void;
    debug(message: string): void;
    list(items: string[], indent?: number): void;
    table(rows: Array<{
        label: string;
        value: string;
    }>): void;
    nextSteps(steps: string[]): void;
    blank(): void;
    divider(): void;
}

/**
 * Browser resolver
 *
 * Handles browser detection and installation for Playwright tests.
 * Implements a fallback chain: release cache → bundled install → system browsers
 */

type BrowserChannel = 'bundled' | 'msedge' | 'chrome' | 'chrome-beta' | 'chrome-dev';
type BrowserStrategy = 'auto' | 'bundled-only' | 'system-only' | 'prefer-system' | 'prefer-bundled';
interface BrowserInfo {
    channel: BrowserChannel;
    version: string | null;
    path: string | null;
    strategy: 'release-cache' | 'bundled-install' | 'system' | 'auto';
}
/**
 * Resolve and configure browsers for Playwright
 */
declare function resolveBrowser(targetPath: string, logger?: Logger, options?: {
    strategy?: BrowserStrategy;
    logsDir?: string;
}): Promise<BrowserInfo>;

/**
 * Bootstrap - Core installation logic
 *
 * This module implements the complete ARTK bootstrap process,
 * replacing the shell scripts (bootstrap.sh/bootstrap.ps1) with
 * a unified TypeScript implementation.
 */

interface BootstrapOptions {
    skipNpm?: boolean;
    skipBrowsers?: boolean;
    force?: boolean;
    variant?: 'commonjs' | 'esm' | 'auto';
    prompts?: boolean;
    verbose?: boolean;
}
interface BootstrapResult {
    success: boolean;
    projectPath: string;
    artkE2ePath: string;
    browserInfo?: BrowserInfo;
    environment?: EnvironmentInfo;
    errors: string[];
}
/**
 * Bootstrap ARTK in a target project
 */
declare function bootstrap(targetPath: string, options?: BootstrapOptions): Promise<BootstrapResult>;

/**
 * Prerequisites checker
 *
 * Verifies that all required tools are installed and configured.
 */

interface PrerequisiteResult {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    version?: string;
    required?: string;
    message: string;
    fix?: string;
}
interface PrerequisiteCheckResult {
    passed: boolean;
    results: PrerequisiteResult[];
}
/**
 * Check all prerequisites
 */
declare function checkPrerequisites(): Promise<PrerequisiteCheckResult>;

/**
 * Version utilities
 */
/**
 * Get the CLI version from package.json
 */
declare function getVersion(): string;

export { type BootstrapOptions, type BrowserInfo, type EnvironmentInfo, type PrerequisiteResult, bootstrap, checkPrerequisites, detectEnvironment, getVersion, resolveBrowser };
