import { d as IRJourney, b as LocatorSpec } from '../types-DJnqAI1V.js';
import { VariantInfo, VariantFeatures } from '../variants/index.js';
import { Project, SourceFile, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ImportDeclaration } from 'ts-morph';

/**
 * Import statement for generated test
 */
interface ImportStatement {
    members: string[];
    from: string;
}
/**
 * Options for test generation
 */
interface GenerateTestOptions {
    /** Custom template path */
    templatePath?: string;
    /** Whether to include source comments */
    includeComments?: boolean;
    /** Module imports to add */
    imports?: ImportStatement[];
    /** Custom test ID attribute */
    testIdAttribute?: string;
    /**
     * Code generation strategy
     * - 'full': Generate complete file (default)
     * - 'blocks': Use managed blocks for partial regeneration
     * - 'ast': Use AST editing to preserve structure
     */
    strategy?: 'full' | 'blocks' | 'ast';
    /** Existing code (required for 'blocks' and 'ast' strategies) */
    existingCode?: string;
    /** Whether to update journey frontmatter with test metadata */
    updateJourney?: boolean;
    /** Path to the source journey file (required if updateJourney is true) */
    journeyPath?: string;
    /** Output path for the generated test file (for journey update) */
    outputPath?: string;
    /** LLKB root directory for version tracking (default: .artk/llkb) */
    llkbRoot?: string;
    /** Whether to include LLKB version in generated test header (default: true if LLKB exists) */
    includeLlkbVersion?: boolean;
    /** Target variant for code generation (auto-detected if not specified) */
    targetVariant?: VariantInfo;
    /** Whether to emit warnings for variant-incompatible features (default: true) */
    warnOnIncompatible?: boolean;
}
/**
 * Result of test generation
 */
interface GenerateTestResult {
    /** Generated test code */
    code: string;
    /** Journey ID */
    journeyId: string;
    /** Suggested filename */
    filename: string;
    /** Imports used */
    imports: ImportStatement[];
    /** Variant used for generation */
    variant?: VariantInfo;
    /** Warnings about variant-incompatible features */
    variantWarnings?: string[];
}
/**
 * Context for variant-aware code generation
 */
interface VariantContext {
    /** Variant info for the target environment */
    variant: VariantInfo;
    /** Collected warnings for incompatible features */
    warnings: string[];
    /** Whether to emit warnings */
    warnOnIncompatible: boolean;
}
/**
 * Check if a feature is available in the current variant
 * @internal Reserved for future variant-specific primitive handling
 */
declare function _checkFeature(ctx: VariantContext, feature: keyof VariantFeatures, featureName: string, primitiveType: string): boolean;
declare const __test_checkFeature: typeof _checkFeature;
/**
 * Generate Playwright test code from IR Journey
 */
declare function generateTest(journey: IRJourney, options?: GenerateTestOptions): GenerateTestResult;
/**
 * Generate test code as a string (convenience function)
 */
declare function generateTestCode(journey: IRJourney): string;

/**
 * Locator definition for a module
 */
interface ModuleLocator {
    /** Property name for the locator */
    name: string;
    /** Playwright locator string */
    playwright: string;
    /** Original locator spec */
    spec: LocatorSpec;
    /** Human-readable description */
    description?: string;
}
/**
 * Method parameter definition
 */
interface MethodParam {
    name: string;
    type: string;
    optional?: boolean;
    defaultValue?: string;
}
/**
 * Method definition for a module
 */
interface ModuleMethod {
    /** Method name */
    name: string;
    /** Method description */
    description: string;
    /** Method parameters */
    params: MethodParam[];
    /** Return type */
    returnType: string;
    /** Method body lines */
    body: string[];
}
/**
 * Module definition
 */
interface ModuleDefinition {
    /** Module name (PascalCase) */
    moduleName: string;
    /** Class name (PascalCase with suffix) */
    className: string;
    /** Module scope (feature area) */
    scope: string;
    /** Locators used by the module */
    locators: ModuleLocator[];
    /** Methods provided by the module */
    methods: ModuleMethod[];
}
/**
 * Options for module generation
 */
interface GenerateModuleOptions {
    /** Custom template path */
    templatePath?: string;
    /** Module name suffix (default: 'Page') */
    suffix?: string;
    /** Whether to include JSDoc comments */
    includeJsDoc?: boolean;
}
/**
 * Result of module generation
 */
interface GenerateModuleResult {
    /** Generated module code */
    code: string;
    /** Module name */
    moduleName: string;
    /** Suggested filename */
    filename: string;
    /** Locators defined */
    locators: ModuleLocator[];
    /** Methods defined */
    methods: ModuleMethod[];
}
/**
 * Generate Page Object module from IR Journey
 */
declare function generateModule(journey: IRJourney, options?: GenerateModuleOptions): GenerateModuleResult;
/**
 * Generate module code as a string (convenience function)
 */
declare function generateModuleCode(journey: IRJourney): string;
/**
 * Extract module definition from journey without generating code
 */
declare function extractModuleDefinition(journey: IRJourney, options?: GenerateModuleOptions): ModuleDefinition;

/**
 * AST-based Code Editing - Safely modify existing TypeScript files
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */

/**
 * Result of an AST edit operation
 */
interface AstEditResult {
    /** Whether any changes were made */
    modified: boolean;
    /** List of changes made */
    changes: string[];
    /** Updated source code */
    code: string;
    /** Any warnings generated */
    warnings: string[];
}
/**
 * Options for AST editing
 */
interface AstEditOptions {
    /** Preserve existing methods (don't overwrite) */
    preserveExisting?: boolean;
    /** Add new imports automatically */
    addImports?: boolean;
    /** Format code after editing */
    formatOutput?: boolean;
}
/**
 * Create a ts-morph project for editing
 */
declare function createProject(): Project;
/**
 * Load source file from code string
 */
declare function loadSourceFile(project: Project, code: string, filename?: string): SourceFile;
/**
 * Find a class declaration by name
 */
declare function findClass(sourceFile: SourceFile, className: string): ClassDeclaration | undefined;
/**
 * Find a method in a class
 */
declare function findMethod(classDecl: ClassDeclaration, methodName: string): MethodDeclaration | undefined;
/**
 * Find a property in a class
 */
declare function findProperty(classDecl: ClassDeclaration, propertyName: string): PropertyDeclaration | undefined;
/**
 * Check if an import exists
 */
declare function hasImport(sourceFile: SourceFile, moduleSpecifier: string): boolean;
/**
 * Get import declaration for a module
 */
declare function getImport(sourceFile: SourceFile, moduleSpecifier: string): ImportDeclaration | undefined;
/**
 * Add a named import to a file
 */
declare function addNamedImport(sourceFile: SourceFile, moduleSpecifier: string, namedImport: string): boolean;
/**
 * Result of adding a locator property
 */
interface AddLocatorResult {
    /** Whether the property was added */
    added: boolean;
    /** Whether initialization was complete */
    initialized: boolean;
    /** Warning message if initialization was incomplete */
    warning?: string;
}
/**
 * Add a locator property to a class
 *
 * @returns Result object with added/initialized status and optional warning
 */
declare function addLocatorProperty(classDecl: ClassDeclaration, locator: ModuleLocator, options?: AstEditOptions): AddLocatorResult;
/**
 * Add a method to a class
 */
declare function addMethod(classDecl: ClassDeclaration, method: ModuleMethod, options?: AstEditOptions): boolean;
/**
 * Update an existing module file with new locators and methods
 */
declare function updateModuleFile(code: string, className: string, locators: ModuleLocator[], methods: ModuleMethod[], options?: AstEditOptions): AstEditResult;
/**
 * Merge two module files, preferring the second for conflicts
 */
declare function mergeModuleFiles(existingCode: string, newCode: string, className: string, options?: AstEditOptions): AstEditResult;
/**
 * Extract class structure from source code
 */
declare function extractClassStructure(code: string, className: string): {
    properties: string[];
    methods: string[];
    imports: string[];
} | null;
/**
 * Validate TypeScript code syntax
 */
declare function validateSyntax(code: string): {
    valid: boolean;
    errors: string[];
};

/**
 * Module registry entry
 */
interface RegistryEntry {
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
interface ModuleRegistry {
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
interface RegistryOptions {
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
interface RegistryUpdateResult {
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
declare function loadRegistry(indexPath: string): ModuleRegistry | null;
/**
 * Parse an index.ts file to extract module entries
 */
declare function parseIndexFile(content: string, _indexPath?: string): RegistryEntry[];
/**
 * Generate index file content from entries
 */
declare function generateIndexContent(entries: RegistryEntry[], options?: RegistryOptions): string;
/**
 * Add a module to the registry
 */
declare function addToRegistry(registry: ModuleRegistry, module: ModuleDefinition, filePath: string): RegistryEntry;
/**
 * Remove a module from the registry
 */
declare function removeFromRegistry(registry: ModuleRegistry, moduleNameOrPath: string): boolean;
/**
 * Update index file with new modules
 */
declare function updateIndexFile(indexPath: string, newModules: Array<{
    module: ModuleDefinition;
    filePath: string;
}>, options?: RegistryOptions): RegistryUpdateResult;
/**
 * Scan directory for module files and build registry
 */
declare function scanModulesDirectory(_dirPath: string, _pattern?: string): RegistryEntry[];
/**
 * Create a new empty registry
 */
declare function createRegistry(indexPath: string): ModuleRegistry;
/**
 * Save registry to disk
 */
declare function saveRegistry(registry: ModuleRegistry, options?: RegistryOptions): void;
/**
 * Find entry by module name
 */
declare function findEntry(registry: ModuleRegistry, moduleName: string): RegistryEntry | undefined;
/**
 * Find entry by scope
 */
declare function findEntriesByScope(registry: ModuleRegistry, scope: string): RegistryEntry[];
/**
 * Check if module exists in registry
 */
declare function hasModule(registry: ModuleRegistry, moduleName: string): boolean;
/**
 * Get all module names
 */
declare function getModuleNames(registry: ModuleRegistry): string[];
/**
 * Get registry statistics
 */
declare function getRegistryStats(registry: ModuleRegistry): {
    totalModules: number;
    byScope: Record<string, number>;
    byType: Record<string, number>;
};

export { type AddLocatorResult, type AstEditOptions, type AstEditResult, type GenerateModuleOptions, type GenerateModuleResult, type GenerateTestOptions, type GenerateTestResult, type ImportStatement, type MethodParam, type ModuleDefinition, type ModuleLocator, type ModuleMethod, type ModuleRegistry, type RegistryEntry, type RegistryOptions, type RegistryUpdateResult, VariantFeatures, VariantInfo, __test_checkFeature, addLocatorProperty, addMethod, addNamedImport, addToRegistry, createProject, createRegistry, extractClassStructure, extractModuleDefinition, findClass, findEntriesByScope, findEntry, findMethod, findProperty, generateIndexContent, generateModule, generateModuleCode, generateTest, generateTestCode, getImport, getModuleNames, getRegistryStats, hasImport, hasModule, loadRegistry, loadSourceFile, mergeModuleFiles, parseIndexFile, removeFromRegistry, saveRegistry, scanModulesDirectory, updateIndexFile, updateModuleFile, validateSyntax };
