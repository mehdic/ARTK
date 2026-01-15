/**
 * AST-based Code Editing - Safely modify existing TypeScript files
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */
import { Project, SyntaxKind, ScriptTarget, ModuleKind, } from 'ts-morph';
/**
 * Create a ts-morph project for editing
 */
export function createProject() {
    return new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
            target: ScriptTarget.ESNext,
            module: ModuleKind.ESNext,
            strict: true,
        },
    });
}
/**
 * Load source file from code string
 */
export function loadSourceFile(project, code, filename = 'temp.ts') {
    return project.createSourceFile(filename, code, { overwrite: true });
}
/**
 * Find a class declaration by name
 */
export function findClass(sourceFile, className) {
    return sourceFile.getClass(className);
}
/**
 * Find a method in a class
 */
export function findMethod(classDecl, methodName) {
    return classDecl.getMethod(methodName);
}
/**
 * Find a property in a class
 */
export function findProperty(classDecl, propertyName) {
    return classDecl.getProperty(propertyName);
}
/**
 * Check if an import exists
 */
export function hasImport(sourceFile, moduleSpecifier) {
    return sourceFile.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === moduleSpecifier);
}
/**
 * Get import declaration for a module
 */
export function getImport(sourceFile, moduleSpecifier) {
    return sourceFile.getImportDeclarations().find(imp => imp.getModuleSpecifierValue() === moduleSpecifier);
}
/**
 * Add a named import to a file
 */
export function addNamedImport(sourceFile, moduleSpecifier, namedImport) {
    const existingImport = getImport(sourceFile, moduleSpecifier);
    if (existingImport) {
        // Check if the named import already exists
        const namedImports = existingImport.getNamedImports();
        const exists = namedImports.some(ni => ni.getName() === namedImport);
        if (!exists) {
            existingImport.addNamedImport(namedImport);
            return true;
        }
        return false;
    }
    // Add new import declaration
    sourceFile.addImportDeclaration({
        moduleSpecifier,
        namedImports: [namedImport],
    });
    return true;
}
/**
 * Add a locator property to a class
 */
export function addLocatorProperty(classDecl, locator, options = {}) {
    const existing = findProperty(classDecl, locator.name);
    if (existing) {
        if (options.preserveExisting) {
            return false;
        }
        existing.remove();
    }
    // Add readonly property declaration
    classDecl.addProperty({
        name: locator.name,
        isReadonly: true,
        type: 'Locator',
        docs: locator.description ? [{ description: locator.description }] : undefined,
    });
    // Find constructor and add initialization
    const constructor = classDecl.getConstructors()[0];
    if (!constructor) {
        console.warn(`Cannot add locator initialization for '${locator.name}': class '${classDecl.getName()}' has no constructor`);
        return true; // Property was added, but initialization was not possible
    }
    const initStatement = `this.${locator.name} = page.${locator.playwright};`;
    // Check if initialization already exists
    const body = constructor.getBody();
    if (body) {
        const existingInit = body.getDescendantsOfKind(SyntaxKind.ExpressionStatement)
            .find(stmt => stmt.getText().includes(`this.${locator.name}`));
        if (!existingInit) {
            constructor.addStatements(initStatement);
        }
    }
    return true;
}
/**
 * Add a method to a class
 */
export function addMethod(classDecl, method, options = {}) {
    const existing = findMethod(classDecl, method.name);
    if (existing) {
        if (options.preserveExisting) {
            return false;
        }
        existing.remove();
    }
    // Add the method
    classDecl.addMethod({
        name: method.name,
        isAsync: true,
        parameters: method.params.map(p => ({
            name: p.name,
            type: p.type,
            hasQuestionToken: p.optional,
            initializer: p.defaultValue,
        })),
        returnType: `Promise<${method.returnType}>`,
        docs: [{ description: method.description }],
        statements: method.body.join('\n'),
    });
    return true;
}
/**
 * Update an existing module file with new locators and methods
 */
export function updateModuleFile(code, className, locators, methods, options = {}) {
    const project = createProject();
    const sourceFile = loadSourceFile(project, code);
    const changes = [];
    const warnings = [];
    // Find the class
    const classDecl = findClass(sourceFile, className);
    if (!classDecl) {
        return {
            modified: false,
            changes: [],
            code,
            warnings: [`Class '${className}' not found in source file`],
        };
    }
    // Ensure Locator import exists
    if (options.addImports !== false) {
        if (addNamedImport(sourceFile, '@playwright/test', 'Locator')) {
            changes.push('Added Locator import');
        }
        if (addNamedImport(sourceFile, '@playwright/test', 'expect')) {
            changes.push('Added expect import');
        }
    }
    // Add locators
    for (const locator of locators) {
        const added = addLocatorProperty(classDecl, locator, options);
        if (added) {
            changes.push(`Added locator: ${locator.name}`);
        }
        else if (options.preserveExisting) {
            warnings.push(`Skipped existing locator: ${locator.name}`);
        }
    }
    // Add methods
    for (const method of methods) {
        const added = addMethod(classDecl, method, options);
        if (added) {
            changes.push(`Added method: ${method.name}`);
        }
        else if (options.preserveExisting) {
            warnings.push(`Skipped existing method: ${method.name}`);
        }
    }
    // Format if requested
    if (options.formatOutput !== false) {
        sourceFile.formatText();
    }
    return {
        modified: changes.length > 0,
        changes,
        code: sourceFile.getFullText(),
        warnings,
    };
}
/**
 * Extract method body text safely
 */
function extractMethodBodyText(method) {
    const body = method.getBody();
    if (!body)
        return '';
    // Get the text between { and }
    const fullText = body.getText();
    // Remove the braces and trim
    const inner = fullText.slice(1, -1).trim();
    return inner;
}
/**
 * Merge two module files, preferring the second for conflicts
 */
export function mergeModuleFiles(existingCode, newCode, className, options = {}) {
    const project = createProject();
    const existingFile = loadSourceFile(project, existingCode, 'existing.ts');
    const newFile = loadSourceFile(project, newCode, 'new.ts');
    const changes = [];
    const warnings = [];
    // Find classes
    const existingClass = findClass(existingFile, className);
    const newClass = findClass(newFile, className);
    if (!existingClass) {
        return {
            modified: false,
            changes: [],
            code: existingCode,
            warnings: [`Class '${className}' not found in existing file`],
        };
    }
    if (!newClass) {
        return {
            modified: false,
            changes: [],
            code: existingCode,
            warnings: [`Class '${className}' not found in new file`],
        };
    }
    // Merge imports
    const newImports = newFile.getImportDeclarations();
    for (const imp of newImports) {
        const moduleSpec = imp.getModuleSpecifierValue();
        for (const namedImp of imp.getNamedImports()) {
            if (addNamedImport(existingFile, moduleSpec, namedImp.getName())) {
                changes.push(`Added import: ${namedImp.getName()} from ${moduleSpec}`);
            }
        }
    }
    // Merge properties
    const newProperties = newClass.getProperties();
    for (const prop of newProperties) {
        const propName = prop.getName();
        const existingProp = findProperty(existingClass, propName);
        if (!existingProp) {
            existingClass.addProperty({
                name: propName,
                isReadonly: prop.isReadonly(),
                type: prop.getType().getText(),
            });
            changes.push(`Added property: ${propName}`);
        }
        else if (!options.preserveExisting) {
            existingProp.remove();
            existingClass.addProperty({
                name: propName,
                isReadonly: prop.isReadonly(),
                type: prop.getType().getText(),
            });
            changes.push(`Updated property: ${propName}`);
        }
        else {
            warnings.push(`Skipped existing property: ${propName}`);
        }
    }
    // Merge methods
    const newMethods = newClass.getMethods();
    for (const method of newMethods) {
        const methodName = method.getName();
        const existingMethod = findMethod(existingClass, methodName);
        if (!existingMethod) {
            existingClass.addMethod({
                name: methodName,
                isAsync: method.isAsync(),
                parameters: method.getParameters().map(p => ({
                    name: p.getName(),
                    type: p.getType().getText(),
                    hasQuestionToken: p.hasQuestionToken(),
                    initializer: p.getInitializer()?.getText(),
                })),
                returnType: method.getReturnType().getText(),
                statements: extractMethodBodyText(method),
            });
            changes.push(`Added method: ${methodName}`);
        }
        else if (!options.preserveExisting) {
            existingMethod.remove();
            existingClass.addMethod({
                name: methodName,
                isAsync: method.isAsync(),
                parameters: method.getParameters().map(p => ({
                    name: p.getName(),
                    type: p.getType().getText(),
                    hasQuestionToken: p.hasQuestionToken(),
                    initializer: p.getInitializer()?.getText(),
                })),
                returnType: method.getReturnType().getText(),
                statements: extractMethodBodyText(method),
            });
            changes.push(`Updated method: ${methodName}`);
        }
        else {
            warnings.push(`Skipped existing method: ${methodName}`);
        }
    }
    // Format
    if (options.formatOutput !== false) {
        existingFile.formatText();
    }
    return {
        modified: changes.length > 0,
        changes,
        code: existingFile.getFullText(),
        warnings,
    };
}
/**
 * Extract class structure from source code
 */
export function extractClassStructure(code, className) {
    const project = createProject();
    const sourceFile = loadSourceFile(project, code);
    const classDecl = findClass(sourceFile, className);
    if (!classDecl) {
        return null;
    }
    return {
        properties: classDecl.getProperties().map(p => p.getName()),
        methods: classDecl.getMethods().map(m => m.getName()),
        imports: sourceFile.getImportDeclarations()
            .flatMap(imp => imp.getNamedImports().map(ni => ni.getName())),
    };
}
/**
 * Validate TypeScript code syntax
 */
export function validateSyntax(code) {
    const project = createProject();
    try {
        const sourceFile = loadSourceFile(project, code);
        const diagnostics = sourceFile.getPreEmitDiagnostics();
        const errors = diagnostics
            .filter(d => d.getCategory() === 1) // Error category
            .map(d => d.getMessageText().toString());
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: [error.message],
        };
    }
}
//# sourceMappingURL=astEdit.js.map