/**
 * AST-based Code Editing - Safely modify existing TypeScript files
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */
import { Project, SourceFile, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ImportDeclaration } from 'ts-morph';
import type { ModuleLocator, ModuleMethod } from './generateModule.js';
/**
 * Result of an AST edit operation
 */
export interface AstEditResult {
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
export interface AstEditOptions {
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
export declare function createProject(): Project;
/**
 * Load source file from code string
 */
export declare function loadSourceFile(project: Project, code: string, filename?: string): SourceFile;
/**
 * Find a class declaration by name
 */
export declare function findClass(sourceFile: SourceFile, className: string): ClassDeclaration | undefined;
/**
 * Find a method in a class
 */
export declare function findMethod(classDecl: ClassDeclaration, methodName: string): MethodDeclaration | undefined;
/**
 * Find a property in a class
 */
export declare function findProperty(classDecl: ClassDeclaration, propertyName: string): PropertyDeclaration | undefined;
/**
 * Check if an import exists
 */
export declare function hasImport(sourceFile: SourceFile, moduleSpecifier: string): boolean;
/**
 * Get import declaration for a module
 */
export declare function getImport(sourceFile: SourceFile, moduleSpecifier: string): ImportDeclaration | undefined;
/**
 * Add a named import to a file
 */
export declare function addNamedImport(sourceFile: SourceFile, moduleSpecifier: string, namedImport: string): boolean;
/**
 * Add a locator property to a class
 */
export declare function addLocatorProperty(classDecl: ClassDeclaration, locator: ModuleLocator, options?: AstEditOptions): boolean;
/**
 * Add a method to a class
 */
export declare function addMethod(classDecl: ClassDeclaration, method: ModuleMethod, options?: AstEditOptions): boolean;
/**
 * Update an existing module file with new locators and methods
 */
export declare function updateModuleFile(code: string, className: string, locators: ModuleLocator[], methods: ModuleMethod[], options?: AstEditOptions): AstEditResult;
/**
 * Merge two module files, preferring the second for conflicts
 */
export declare function mergeModuleFiles(existingCode: string, newCode: string, className: string, options?: AstEditOptions): AstEditResult;
/**
 * Extract class structure from source code
 */
export declare function extractClassStructure(code: string, className: string): {
    properties: string[];
    methods: string[];
    imports: string[];
} | null;
/**
 * Validate TypeScript code syntax
 */
export declare function validateSyntax(code: string): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=astEdit.d.ts.map