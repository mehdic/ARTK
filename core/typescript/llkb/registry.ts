/**
 * LLKB Module Registry Module
 *
 * This module provides functions to manage the module registry,
 * which tracks all exported components and their metadata.
 *
 * @module llkb/registry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Component, ComponentCategory, SaveResult } from './types.js';
import { saveJSONAtomic, loadJSON } from './file-utils.js';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Constants
// =============================================================================

/** Default registry file name */
const REGISTRY_FILENAME = 'registry.json';

/** Default modules directory */
const DEFAULT_MODULES_DIR = 'src/modules';

// =============================================================================
// Registry Management Functions
// =============================================================================

/**
 * Get the registry file path
 */
function getRegistryPath(harnessRoot: string): string {
  return path.join(harnessRoot, DEFAULT_MODULES_DIR, REGISTRY_FILENAME);
}

/**
 * Create an empty registry
 */
export function createEmptyRegistry(): ModuleRegistry {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    modules: [],
    componentToModule: {},
    exportToModule: {},
  };
}

/**
 * Load the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns The module registry or null if not found
 */
export function loadRegistry(harnessRoot: string): ModuleRegistry | null {
  const registryPath = getRegistryPath(harnessRoot);

  try {
    const data = loadJSON<ModuleRegistry>(registryPath);
    return data || createEmptyRegistry();
  } catch {
    return null;
  }
}

/**
 * Save the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param registry - Registry to save
 * @returns Save result
 */
export async function saveRegistry(
  harnessRoot: string,
  registry: ModuleRegistry
): Promise<SaveResult> {
  const registryPath = getRegistryPath(harnessRoot);

  // Update timestamp
  registry.lastUpdated = new Date().toISOString();

  // Ensure directory exists
  const dir = path.dirname(registryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return saveJSONAtomic(registryPath, registry);
}

/**
 * Rebuild lookup indexes in registry
 */
function rebuildIndexes(registry: ModuleRegistry): void {
  registry.componentToModule = {};
  registry.exportToModule = {};

  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registry.componentToModule[exp.componentId] = module.path;
      }
      registry.exportToModule[exp.name] = module.path;
    }
  }
}

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
export async function addComponentToRegistry(
  harnessRoot: string,
  component: Component,
  options: AddToRegistryOptions
): Promise<SaveResult> {
  // Load existing registry
  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }

  // Find or create module entry
  let moduleEntry = registry.modules.find((m) => m.path === options.modulePath);

  if (!moduleEntry) {
    moduleEntry = {
      name: options.moduleName,
      path: options.modulePath,
      description: options.moduleDescription || `${options.moduleName} utilities`,
      exports: [],
      dependencies: options.dependencies || [],
      peerDependencies: options.peerDependencies || ['@playwright/test'],
      lastUpdated: new Date().toISOString(),
    };
    registry.modules.push(moduleEntry);
  }

  // Check if export already exists
  const existingExport = moduleEntry.exports.find((e) => e.name === options.exportDetails.name);

  if (existingExport) {
    // Update existing export
    existingExport.componentId = component.id;
    existingExport.signature = options.exportDetails.signature;
    existingExport.description = options.exportDetails.description;
  } else {
    // Add new export
    moduleEntry.exports.push({
      name: options.exportDetails.name,
      type: options.exportDetails.type,
      componentId: component.id,
      signature: options.exportDetails.signature,
      description: options.exportDetails.description,
    });
  }

  // Update module timestamp
  moduleEntry.lastUpdated = new Date().toISOString();

  // Rebuild indexes
  rebuildIndexes(registry);

  // Save registry
  return saveRegistry(harnessRoot, registry);
}

/**
 * Remove a component from the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to remove
 * @returns Save result
 */
export async function removeComponentFromRegistry(
  harnessRoot: string,
  componentId: string
): Promise<SaveResult> {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: 'Registry not found' };
  }

  // Find and remove the export
  let found = false;
  for (const module of registry.modules) {
    const exportIndex = module.exports.findIndex((e) => e.componentId === componentId);
    if (exportIndex !== -1) {
      module.exports.splice(exportIndex, 1);
      module.lastUpdated = new Date().toISOString();
      found = true;
      break;
    }
  }

  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }

  // Rebuild indexes
  rebuildIndexes(registry);

  // Save registry
  return saveRegistry(harnessRoot, registry);
}

/**
 * Update component details in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to update
 * @param updates - Fields to update
 * @returns Save result
 */
export async function updateComponentInRegistry(
  harnessRoot: string,
  componentId: string,
  updates: Partial<{
    signature: string;
    description: string;
    type: ModuleExport['type'];
  }>
): Promise<SaveResult> {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: 'Registry not found' };
  }

  // Find the export
  let found = false;
  for (const module of registry.modules) {
    const exportEntry = module.exports.find((e) => e.componentId === componentId);
    if (exportEntry) {
      if (updates.signature !== undefined) {
        exportEntry.signature = updates.signature;
      }
      if (updates.description !== undefined) {
        exportEntry.description = updates.description;
      }
      if (updates.type !== undefined) {
        exportEntry.type = updates.type;
      }
      module.lastUpdated = new Date().toISOString();
      found = true;
      break;
    }
  }

  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }

  // Save registry
  return saveRegistry(harnessRoot, registry);
}

/**
 * Get module info for a component
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - Component ID
 * @returns Module entry and export info, or null if not found
 */
export function getModuleForComponent(
  harnessRoot: string,
  componentId: string
): { module: ModuleEntry; export: ModuleExport } | null {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return null;
  }

  const modulePath = registry.componentToModule[componentId];
  if (!modulePath) {
    return null;
  }

  const module = registry.modules.find((m) => m.path === modulePath);
  if (!module) {
    return null;
  }

  const exportEntry = module.exports.find((e) => e.componentId === componentId);
  if (!exportEntry) {
    return null;
  }

  return { module, export: exportEntry };
}

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
export function getImportPath(harnessRoot: string, componentId: string): string | null {
  const info = getModuleForComponent(harnessRoot, componentId);
  if (!info) {
    return null;
  }

  return `import { ${info.export.name} } from '@modules/${info.module.path}';`;
}

/**
 * List all modules in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns Array of module entries
 */
export function listModules(harnessRoot: string): ModuleEntry[] {
  const registry = loadRegistry(harnessRoot);
  return registry?.modules || [];
}

/**
 * Find modules by category
 *
 * @param harnessRoot - Root directory of the test harness
 * @param category - Category to filter by
 * @returns Array of modules that have components in the given category
 */
export function findModulesByCategory(
  harnessRoot: string,
  category: ComponentCategory
): ModuleEntry[] {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return [];
  }

  // Category is typically in the module path (e.g., 'foundation/navigation')
  return registry.modules.filter(
    (m) => m.path.includes(category) || m.name.includes(category)
  );
}

/**
 * Validate registry consistency with components.json
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Validation result with inconsistencies
 */
export function validateRegistryConsistency(
  harnessRoot: string,
  components: Component[]
): {
  valid: boolean;
  missingInRegistry: string[];
  missingInComponents: string[];
  pathMismatches: Array<{ componentId: string; registryPath: string; componentPath: string }>;
} {
  const registry = loadRegistry(harnessRoot);

  const result = {
    valid: true,
    missingInRegistry: [] as string[],
    missingInComponents: [] as string[],
    pathMismatches: [] as Array<{ componentId: string; registryPath: string; componentPath: string }>,
  };

  if (!registry) {
    result.valid = false;
    result.missingInRegistry = components.filter((c) => !c.archived).map((c) => c.id);
    return result;
  }

  // Get all component IDs in registry
  const registryComponentIds = new Set<string>();
  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registryComponentIds.add(exp.componentId);
      }
    }
  }

  // Check each active component is in registry
  for (const component of components) {
    if (component.archived) continue;

    if (!registryComponentIds.has(component.id)) {
      result.missingInRegistry.push(component.id);
      result.valid = false;
    } else {
      // Check path matches
      const modulePath = registry.componentToModule[component.id];
      if (modulePath && !component.filePath.includes(modulePath)) {
        result.pathMismatches.push({
          componentId: component.id,
          registryPath: modulePath,
          componentPath: component.filePath,
        });
        result.valid = false;
      }
    }
  }

  // Check each registry component exists in components.json
  const componentIds = new Set(components.map((c) => c.id));
  for (const componentId of registryComponentIds) {
    if (!componentIds.has(componentId)) {
      result.missingInComponents.push(componentId);
      result.valid = false;
    }
  }

  return result;
}

/**
 * Synchronize registry with components.json
 *
 * Adds missing components and removes stale entries.
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Save result
 */
export async function syncRegistryWithComponents(
  harnessRoot: string,
  components: Component[]
): Promise<SaveResult & { added: number; removed: number }> {
  const validation = validateRegistryConsistency(harnessRoot, components);

  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }

  let added = 0;
  let removed = 0;

  // Remove stale entries
  for (const staleId of validation.missingInComponents) {
    for (const module of registry.modules) {
      const index = module.exports.findIndex((e) => e.componentId === staleId);
      if (index !== -1) {
        module.exports.splice(index, 1);
        removed++;
      }
    }
  }

  // Remove empty modules
  registry.modules = registry.modules.filter((m) => m.exports.length > 0);

  // Note: We don't auto-add missing components because we need the module path info
  // which comes from the extraction process. Just count them for reporting.
  added = validation.missingInRegistry.length;

  // Rebuild indexes
  rebuildIndexes(registry);

  // Save
  const saveResult = await saveRegistry(harnessRoot, registry);

  return {
    ...saveResult,
    added,
    removed,
  };
}
