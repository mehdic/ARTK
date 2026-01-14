import type { IRJourney, LocatorSpec } from '../ir/types.js';
/**
 * Locator definition for a module
 */
export interface ModuleLocator {
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
export interface MethodParam {
    name: string;
    type: string;
    optional?: boolean;
    defaultValue?: string;
}
/**
 * Method definition for a module
 */
export interface ModuleMethod {
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
export interface ModuleDefinition {
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
export interface GenerateModuleOptions {
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
export interface GenerateModuleResult {
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
export declare function generateModule(journey: IRJourney, options?: GenerateModuleOptions): GenerateModuleResult;
/**
 * Generate module code as a string (convenience function)
 */
export declare function generateModuleCode(journey: IRJourney): string;
/**
 * Extract module definition from journey without generating code
 */
export declare function extractModuleDefinition(journey: IRJourney, options?: GenerateModuleOptions): ModuleDefinition;
//# sourceMappingURL=generateModule.d.ts.map