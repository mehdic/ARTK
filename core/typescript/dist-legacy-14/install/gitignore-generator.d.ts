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
export interface GitignoreOptions {
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
export declare function generateGitignore(options?: GitignoreOptions): string;
/**
 * Common .gitignore patterns for E2E testing.
 */
export declare const GITIGNORE_PATTERNS: {
    readonly authStates: readonly [".auth-states/", "*.storageState.json"];
    readonly testArtifacts: readonly ["test-results/", "playwright-report/", "*.trace.zip"];
    readonly coverage: readonly ["coverage/", ".nyc_output/"];
    readonly dependencies: readonly ["node_modules/"];
    readonly environment: readonly [".env", ".env.local"];
};
/**
 * Creates a minimal .gitignore for quick setup.
 */
export declare function generateMinimalGitignore(): string;
/**
 * Merges existing .gitignore content with ARTK patterns.
 *
 * @param existingContent - Existing .gitignore content
 * @param options - Generation options
 * @returns Merged .gitignore content
 */
export declare function mergeGitignore(existingContent: string, options?: GitignoreOptions): string;
//# sourceMappingURL=gitignore-generator.d.ts.map