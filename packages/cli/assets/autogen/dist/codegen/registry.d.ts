import type { ModuleDefinition } from './generateModule.js';
/**
 * Module registry entry
 */
export interface RegistryEntry {
    /** Module name (PascalCase) */
    moduleName: string;
    /** Class name */
    className: string;
    /** File path relative to registry */
    filePath: string;
    /** Module scope */
    scope: string;
    /** Export type */
    exportType: 'class' | 'function' | 'const';
}
/**
 * Module registry state
 */
export interface ModuleRegistry {
    /** Registry file path */
    registryPath: string;
    /** Registered modules */
    entries: RegistryEntry[];
    /** Last updated timestamp */
    lastUpdated: Date;
}
/**
 * Options for registry operations
 */
export interface RegistryOptions {
    /** Create registry file if it doesn't exist */
    createIfMissing?: boolean;
    /** Preserve manual exports in index file */
    preserveManualExports?: boolean;
    /** Sort exports alphabetically */
    sortExports?: boolean;
}
/**
 * Result of registry update
 */
export interface RegistryUpdateResult {
    /** Whether the registry was modified */
    modified: boolean;
    /** Entries added */
    added: string[];
    /** Entries removed */
    removed: string[];
    /** Updated registry content */
    content: string;
}
/**
 * Load module registry from an index file
 */
export declare function loadRegistry(indexPath: string): ModuleRegistry | null;
/**
 * Parse an index.ts file to extract module entries
 */
export declare function parseIndexFile(content: string, _indexPath?: string): RegistryEntry[];
/**
 * Generate index file content from entries
 */
export declare function generateIndexContent(entries: RegistryEntry[], options?: RegistryOptions): string;
/**
 * Add a module to the registry
 */
export declare function addToRegistry(registry: ModuleRegistry, module: ModuleDefinition, filePath: string): RegistryEntry;
/**
 * Remove a module from the registry
 */
export declare function removeFromRegistry(registry: ModuleRegistry, moduleNameOrPath: string): boolean;
/**
 * Update index file with new modules
 */
export declare function updateIndexFile(indexPath: string, newModules: Array<{
    module: ModuleDefinition;
    filePath: string;
}>, options?: RegistryOptions): RegistryUpdateResult;
/**
 * Scan directory for module files and build registry
 */
export declare function scanModulesDirectory(_dirPath: string, _pattern?: string): RegistryEntry[];
/**
 * Create a new empty registry
 */
export declare function createRegistry(indexPath: string): ModuleRegistry;
/**
 * Save registry to disk
 */
export declare function saveRegistry(registry: ModuleRegistry, options?: RegistryOptions): void;
/**
 * Find entry by module name
 */
export declare function findEntry(registry: ModuleRegistry, moduleName: string): RegistryEntry | undefined;
/**
 * Find entry by scope
 */
export declare function findEntriesByScope(registry: ModuleRegistry, scope: string): RegistryEntry[];
/**
 * Check if module exists in registry
 */
export declare function hasModule(registry: ModuleRegistry, moduleName: string): boolean;
/**
 * Get all module names
 */
export declare function getModuleNames(registry: ModuleRegistry): string[];
/**
 * Get registry statistics
 */
export declare function getRegistryStats(registry: ModuleRegistry): {
    totalModules: number;
    byScope: Record<string, number>;
    byType: Record<string, number>;
};
//# sourceMappingURL=registry.d.ts.map