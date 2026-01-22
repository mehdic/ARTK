/**
 * @module targets/config-generator
 * @description ARTK configuration file generator for multi-target architecture.
 *
 * Generates artk.config.yml files with target definitions and environment URLs.
 *
 * @example
 * ```typescript
 * import { generateArtkConfig, ConfigGeneratorOptions } from '@artk/core/targets';
 *
 * const config = generateArtkConfig({
 *   projectName: 'my-project',
 *   targets: [
 *     {
 *       name: 'user-portal',
 *       path: '../frontend',
 *       type: 'react-spa',
 *       environments: {
 *         local: { baseUrl: 'http://localhost:3000' },
 *         staging: { baseUrl: 'https://staging.example.com' },
 *       },
 *     },
 *   ],
 * });
 *
 * await fs.writeFile('artk-e2e/artk.config.yml', config);
 * ```
 */
import type { BrowserChannel, BrowserStrategy } from '../config/types.js';
import type { ArtkEnvironmentUrls } from '../types/config.js';
import type { ArtkTargetType } from '../types/target.js';
/**
 * Target input for config generation.
 */
export interface ConfigTargetInput {
    /**
     * Target name (lowercase-kebab-case).
     */
    name: string;
    /**
     * Relative path from artk-e2e/ to frontend directory.
     */
    path: string;
    /**
     * Application type.
     */
    type: ArtkTargetType;
    /**
     * Optional description.
     */
    description?: string;
    /**
     * Environment URLs.
     */
    environments: Record<string, ArtkEnvironmentUrls>;
}
/**
 * Options for generating artk.config.yml.
 */
export interface ConfigGeneratorOptions {
    /**
     * Project name.
     */
    projectName: string;
    /**
     * Optional project description.
     */
    projectDescription?: string;
    /**
     * Target configurations.
     */
    targets: ConfigTargetInput[];
    /**
     * Default target name.
     * If not specified, uses the first target.
     */
    defaultTarget?: string;
    /**
     * Default environment name.
     * @default 'local'
     */
    defaultEnvironment?: string;
    /**
     * Whether to include auth configuration section.
     * @default false
     */
    includeAuth?: boolean;
    /**
     * Storage state directory for auth.
     * @default '.auth-states'
     */
    storageStateDir?: string;
    /**
     * Whether to include browser configuration.
     * @default true
     */
    includeBrowserConfig?: boolean;
    /**
     * Enabled browsers.
     * @default ['chromium']
     */
    browsers?: ('chromium' | 'firefox' | 'webkit')[];
    /**
     * Browser channel selection.
     * @default 'bundled'
     */
    browserChannel?: BrowserChannel;
    /**
     * Browser strategy preference.
     * @default 'auto'
     */
    browserStrategy?: BrowserStrategy;
    /**
     * Whether to include timeout configuration.
     * @default true
     */
    includeTimeouts?: boolean;
    /**
     * Whether to include comments in output.
     * @default true
     */
    includeComments?: boolean;
}
/**
 * Generates YAML content for artk.config.yml.
 *
 * @param options - Configuration options
 * @returns YAML configuration file content
 */
export declare function generateArtkConfig(options: ConfigGeneratorOptions): string;
/**
 * Generates a minimal artk.config.yml for quick setup.
 *
 * @param projectName - Project name
 * @param targetPath - Path to the frontend directory
 * @param targetType - Application type
 * @returns Minimal YAML configuration
 */
export declare function generateMinimalArtkConfig(projectName: string, targetPath: string, targetType?: ArtkTargetType): string;
/**
 * Generates artk.config.yml from detected targets.
 *
 * @param projectName - Project name
 * @param detectedTargets - Targets detected by frontend detector
 * @returns YAML configuration
 */
export declare function generateConfigFromDetection(projectName: string, detectedTargets: Array<{
    name: string;
    path: string;
    type: ArtkTargetType;
    description?: string;
}>): string;
/**
 * Validates a target name follows the lowercase-kebab-case pattern.
 */
export declare function isValidTargetName(name: string): boolean;
/**
 * Normalizes a directory name to a valid target name.
 *
 * @param dirName - Directory name to normalize
 * @returns Valid target name
 */
export declare function normalizeTargetName(dirName: string): string;
/**
 * Parses environment URLs from common patterns.
 *
 * @param baseUrl - Base URL for local environment
 * @param targetName - Target name for generating other URLs
 * @returns Environment URLs map
 */
export declare function generateEnvironmentUrls(baseUrl: string, targetName: string): Record<string, ArtkEnvironmentUrls>;
/**
 * Config generator result with metadata.
 */
export interface ConfigGeneratorResult {
    /**
     * Generated YAML content.
     */
    content: string;
    /**
     * Number of targets in config.
     */
    targetCount: number;
    /**
     * Default target name.
     */
    defaultTarget: string;
    /**
     * List of all target names.
     */
    targetNames: string[];
    /**
     * Warnings from generation (e.g., normalized target names).
     */
    warnings: string[];
}
/**
 * Generates artk.config.yml with detailed result.
 *
 * @param options - Configuration options
 * @returns Generation result with metadata
 */
export declare function generateArtkConfigWithResult(options: ConfigGeneratorOptions): ConfigGeneratorResult;
//# sourceMappingURL=config-generator.d.ts.map