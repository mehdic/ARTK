"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModule = generateModule;
exports.generateModuleCode = generateModuleCode;
exports.extractModuleDefinition = extractModuleDefinition;
/**
 * Module Generator - Generate Page Object modules from IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */
const node_fs_1 = require("node:fs");
const ejs_1 = __importDefault(require("ejs"));
const priority_js_1 = require("../selectors/priority.js");
const version_js_1 = require("../utils/version.js");
const paths_js_1 = require("../utils/paths.js");
/**
 * Convert a scope/name to PascalCase class name
 */
function toPascalCase(str) {
    return str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
/**
 * Convert a name to camelCase
 */
function toCamelCase(str) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
/**
 * Generate a unique locator name from a locator spec
 */
function generateLocatorName(spec, existingNames) {
    let baseName;
    // Generate base name from spec
    switch (spec.strategy) {
        case 'role':
            baseName = spec.options?.name
                ? `${toCamelCase(spec.options.name)}${toPascalCase(spec.value)}`
                : `${toCamelCase(spec.value)}Element`;
            break;
        case 'label':
        case 'placeholder':
        case 'text':
            baseName = `${toCamelCase(spec.value)}Field`;
            break;
        case 'testid':
            baseName = toCamelCase(spec.value);
            break;
        case 'css':
            // Extract meaningful name from CSS selector
            const match = spec.value.match(/[#.]?([a-zA-Z][a-zA-Z0-9_-]*)/);
            baseName = match ? toCamelCase(match[1]) : 'element';
            break;
        default:
            baseName = 'element';
    }
    // Ensure uniqueness
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
        name = `${baseName}${counter}`;
        counter++;
    }
    existingNames.add(name);
    return name;
}
/**
 * Extract locators from journey primitives
 */
function extractLocators(journey) {
    const locators = [];
    const existingNames = new Set();
    const seenSpecs = new Map();
    // Helper to process a primitive
    const processPrimitive = (primitive) => {
        // Check if primitive has a locator
        const locatorSpec = primitive.locator;
        if (!locatorSpec)
            return;
        // Create a unique key for the locator spec
        const specKey = JSON.stringify(locatorSpec);
        if (seenSpecs.has(specKey))
            return;
        const name = generateLocatorName(locatorSpec, existingNames);
        const playwrightLocator = (0, priority_js_1.toPlaywrightLocator)(locatorSpec);
        const locator = {
            name,
            playwright: playwrightLocator,
            spec: locatorSpec,
            description: `Locator for ${locatorSpec.strategy}: ${locatorSpec.value}`,
        };
        locators.push(locator);
        seenSpecs.set(specKey, locator);
    };
    // Process setup
    if (journey.setup) {
        for (const primitive of journey.setup) {
            processPrimitive(primitive);
        }
    }
    // Process steps
    for (const step of journey.steps) {
        for (const action of step.actions) {
            processPrimitive(action);
        }
        for (const assertion of step.assertions) {
            processPrimitive(assertion);
        }
    }
    // Process cleanup
    if (journey.cleanup) {
        for (const primitive of journey.cleanup) {
            processPrimitive(primitive);
        }
    }
    return locators;
}
/**
 * Generate methods from journey steps
 */
function generateMethods(journey, locators) {
    const methods = [];
    const locatorMap = new Map();
    // Build locator lookup map
    for (const locator of locators) {
        const specKey = JSON.stringify(locator.spec);
        locatorMap.set(specKey, locator.name);
    }
    // Helper to get locator reference
    const getLocatorRef = (spec) => {
        const specKey = JSON.stringify(spec);
        const locatorName = locatorMap.get(specKey);
        return locatorName ? `this.${locatorName}` : `this.page.${(0, priority_js_1.toPlaywrightLocator)(spec)}`;
    };
    // Generate a method for each step
    for (const step of journey.steps) {
        const methodName = toCamelCase(step.id.replace(/[^a-zA-Z0-9]/g, '_'));
        const body = [];
        // Add actions
        for (const action of step.actions) {
            const line = primitiveToMethodLine(action, getLocatorRef);
            if (line) {
                body.push(line);
            }
        }
        // Add assertions
        for (const assertion of step.assertions) {
            const line = primitiveToMethodLine(assertion, getLocatorRef);
            if (line) {
                body.push(line);
            }
        }
        if (body.length > 0) {
            methods.push({
                name: methodName,
                description: step.description,
                params: [],
                returnType: 'void',
                body,
            });
        }
    }
    return methods;
}
/**
 * Convert a primitive to a method body line
 */
function primitiveToMethodLine(primitive, getLocatorRef) {
    switch (primitive.type) {
        // Navigation
        case 'goto':
            return `await this.page.goto('${escapeString(primitive.url)}');`;
        case 'waitForURL':
            const urlPattern = typeof primitive.pattern === 'string'
                ? `'${escapeString(primitive.pattern)}'`
                : primitive.pattern.toString();
            return `await this.page.waitForURL(${urlPattern});`;
        case 'waitForLoadingComplete':
            return `await this.page.waitForLoadState('networkidle');`;
        // Interactions
        case 'click':
            return `await ${getLocatorRef(primitive.locator)}.click();`;
        case 'fill':
            const value = primitive.value.type === 'literal'
                ? `'${escapeString(primitive.value.value)}'`
                : primitive.value.value;
            return `await ${getLocatorRef(primitive.locator)}.fill(${value});`;
        case 'select':
            return `await ${getLocatorRef(primitive.locator)}.selectOption('${escapeString(primitive.option)}');`;
        case 'check':
            return `await ${getLocatorRef(primitive.locator)}.check();`;
        case 'uncheck':
            return `await ${getLocatorRef(primitive.locator)}.uncheck();`;
        case 'press':
            if (primitive.locator) {
                return `await ${getLocatorRef(primitive.locator)}.press('${primitive.key}');`;
            }
            return `await this.page.keyboard.press('${primitive.key}');`;
        case 'hover':
            return `await ${getLocatorRef(primitive.locator)}.hover();`;
        case 'focus':
            return `await ${getLocatorRef(primitive.locator)}.focus();`;
        case 'clear':
            return `await ${getLocatorRef(primitive.locator)}.clear();`;
        // Assertions (using expect)
        case 'expectVisible':
            return `await expect(${getLocatorRef(primitive.locator)}).toBeVisible();`;
        case 'expectNotVisible':
            return `await expect(${getLocatorRef(primitive.locator)}).not.toBeVisible();`;
        case 'expectText':
            const textPattern = typeof primitive.text === 'string'
                ? `'${escapeString(primitive.text)}'`
                : primitive.text.toString();
            return `await expect(${getLocatorRef(primitive.locator)}).toHaveText(${textPattern});`;
        case 'expectValue':
            return `await expect(${getLocatorRef(primitive.locator)}).toHaveValue('${escapeString(primitive.value)}');`;
        case 'expectEnabled':
            return `await expect(${getLocatorRef(primitive.locator)}).toBeEnabled();`;
        case 'expectDisabled':
            return `await expect(${getLocatorRef(primitive.locator)}).toBeDisabled();`;
        // Blocked - must throw to fail the test
        case 'blocked':
            return `// ARTK BLOCKED: ${primitive.reason}\n    throw new Error('ARTK BLOCKED: ${primitive.reason}');`;
        default:
            return null;
    }
}
/**
 * Escape string for code generation
 */
function escapeString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
/**
 * Load the default module template
 */
function loadDefaultTemplate() {
    const templatePath = (0, paths_js_1.getTemplatePath)('module.ejs');
    return (0, node_fs_1.readFileSync)(templatePath, 'utf-8');
}
/**
 * Generate Page Object module from IR Journey
 */
function generateModule(journey, options = {}) {
    const { templatePath, suffix = 'Page' } = options;
    // Load template
    const template = templatePath
        ? (0, node_fs_1.readFileSync)(templatePath, 'utf-8')
        : loadDefaultTemplate();
    // Generate module/class names
    const moduleName = toPascalCase(journey.scope);
    const className = `${moduleName}${suffix}`;
    // Extract locators and generate methods
    const locators = extractLocators(journey);
    const methods = generateMethods(journey, locators);
    // Create module definition
    const moduleDef = {
        moduleName,
        className,
        scope: journey.scope,
        locators,
        methods,
    };
    // Render template with version branding
    const code = ejs_1.default.render(template, {
        ...moduleDef,
        version: (0, version_js_1.getPackageVersion)(),
        timestamp: (0, version_js_1.getGeneratedTimestamp)(),
    });
    // Generate filename
    const filename = `${journey.scope.toLowerCase()}.page.ts`;
    return {
        code,
        moduleName,
        filename,
        locators,
        methods,
    };
}
/**
 * Generate module code as a string (convenience function)
 */
function generateModuleCode(journey) {
    return generateModule(journey).code;
}
/**
 * Extract module definition from journey without generating code
 */
function extractModuleDefinition(journey, options = {}) {
    const { suffix = 'Page' } = options;
    const moduleName = toPascalCase(journey.scope);
    const className = `${moduleName}${suffix}`;
    const locators = extractLocators(journey);
    const methods = generateMethods(journey, locators);
    return {
        moduleName,
        className,
        scope: journey.scope,
        locators,
        methods,
    };
}
//# sourceMappingURL=generateModule.js.map