/**
 * LLKB Module Registry Module
 *
 * This module provides functions to manage the module registry,
 * which tracks all exported components and their metadata.
 *
 * @module llkb/registry
 */
import type { Component, ComponentCategory, SaveResult } from './types.js';
/**
 * An export entry in the module registry
 */
export interface ModuleExport {
    /** Export name */
    name: string;
    /** Export type (async function, function, class, const) */
    type: 'async function' | 'function' | 'class' | 'const' | 'type';
    /** Component ID (if registered in components.json) */
    componentId?: string;
    /** TypeScript signature */
    signature: string;
    /** Description */
    description: string;
}
/**
 * A module entry in the registry
 */
export interface ModuleEntry {
    /** Module name */
    name: string;
    /** Module path (relative to modules directory) */
    path: string;
    /** Module description */
    description: string;
    /** Exports from this module */
    exports: ModuleExport[];
    /** Dependencies on other modules */
    dependencies: string[];
    /** Peer dependencies (external packages) */
    peerDependencies: string[];
    /** Module version */
    version?: string;
    /** Last updated timestamp */
    lastUpdated?: string;
}
/**
 * The modules registry.json file structure
 */
export interface ModuleRegistry {
    /** Schema version */
    version: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** All modules in the registry */
    modules: ModuleEntry[];
    /** Quick lookup: component ID to module path */
    componentToModule: Record<string, string>;
    /** Quick lookup: export name to module path */
    exportToModule: Record<string, string>;
}
/**
 * Options for adding a component to the registry
 */
export interface AddToRegistryOptions {
    /** Module name (e.g., 'navigation') */
    moduleName: string;
    /** Module path (e.g., 'foundation/navigation') */
    modulePath: string;
    /** Module description */
    moduleDescription?: string;
    /** Export details */
    exportDetails: {
        name: string;
        type: ModuleExport['type'];
        signature: string;
        description: string;
    };
    /** Dependencies */
    dependencies?: string[];
    /** Peer dependencies */
    peerDependencies?: string[];
}
/**
 * Create an empty registry
 */
export declare function createEmptyRegistry(): ModuleRegistry;
/**
 * Load the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns The module registry or null if not found
 */
export declare function loadRegistry(harnessRoot: string): ModuleRegistry | null;
/**
 * Save the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param registry - Registry to save
 * @returns Save result
 */
export declare function saveRegistry(harnessRoot: string, registry: ModuleRegistry): Promise<SaveResult>;
/**
 * Add a component to the module registry
 *
 * If the module exists, adds the export to it. If not, creates a new module entry.
 *
 * @param harnessRoot - Root directory of the test harness
 * @param component - The component to register
 * @param options - Registration options
 * @returns Save result
 *
 * @example
 * ```typescript
 * await addComponentToRegistry(
 *   'artk-e2e',
 *   component,
 *   {
 *     moduleName: 'navigation',
 *     modulePath: 'foundation/navigation',
 *     moduleDescription: 'Navigation utilities',
 *     exportDetails: {
 *       name: 'verifySidebarReady',
 *       type: 'async function',
 *       signature: 'verifySidebarReady(page: Page, options?: Options): Promise<void>',
 *       description: 'Verify sidebar is loaded and interactive',
 *     },
 *   }
 * );
 * ```
 */
export declare function addComponentToRegistry(harnessRoot: string, component: Component, options: AddToRegistryOptions): Promise<SaveResult>;
/**
 * Remove a component from the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to remove
 * @returns Save result
 */
export declare function removeComponentFromRegistry(harnessRoot: string, componentId: string): Promise<SaveResult>;
/**
 * Update component details in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to update
 * @param updates - Fields to update
 * @returns Save result
 */
export declare function updateComponentInRegistry(harnessRoot: string, componentId: string, updates: Partial<{
    signature: string;
    description: string;
    type: ModuleExport['type'];
}>): Promise<SaveResult>;
/**
 * Get module info for a component
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - Component ID
 * @returns Module entry and export info, or null if not found
 */
export declare function getModuleForComponent(harnessRoot: string, componentId: string): {
    module: ModuleEntry;
    export: ModuleExport;
} | null;
/**
 * Get the import path for a component
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - Component ID
 * @returns Import statement or null if not found
 *
 * @example
 * ```typescript
 * const importPath = getImportPath('artk-e2e', 'COMP001');
 * // Returns: "import { verifySidebarReady } from '@modules/foundation/navigation';"
 * ```
 */
export declare function getImportPath(harnessRoot: string, componentId: string): string | null;
/**
 * List all modules in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns Array of module entries
 */
export declare function listModules(harnessRoot: string): ModuleEntry[];
/**
 * Find modules by category
 *
 * @param harnessRoot - Root directory of the test harness
 * @param category - Category to filter by
 * @returns Array of modules that have components in the given category
 */
export declare function findModulesByCategory(harnessRoot: string, category: ComponentCategory): ModuleEntry[];
/**
 * Validate registry consistency with components.json
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Validation result with inconsistencies
 */
export declare function validateRegistryConsistency(harnessRoot: string, components: Component[]): {
    valid: boolean;
    missingInRegistry: string[];
    missingInComponents: string[];
    pathMismatches: Array<{
        componentId: string;
        registryPath: string;
        componentPath: string;
    }>;
};
/**
 * Synchronize registry with components.json
 *
 * Adds missing components and removes stale entries.
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Save result
 */
export declare function syncRegistryWithComponents(harnessRoot: string, components: Component[]): Promise<SaveResult & {
    added: number;
    removed: number;
}>;
//# sourceMappingURL=registry.d.ts.map