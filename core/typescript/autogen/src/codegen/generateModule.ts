/**
 * Module Generator - Generate Page Object modules from IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import type { IRJourney, IRPrimitive, LocatorSpec } from '../ir/types.js';
import { toPlaywrightLocator } from '../selectors/priority.js';

// Get current directory for template path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Convert a scope/name to PascalCase class name
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a name to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate a unique locator name from a locator spec
 */
function generateLocatorName(spec: LocatorSpec, existingNames: Set<string>): string {
  let baseName: string;

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
function extractLocators(journey: IRJourney): ModuleLocator[] {
  const locators: ModuleLocator[] = [];
  const existingNames = new Set<string>();
  const seenSpecs = new Map<string, ModuleLocator>();

  // Helper to process a primitive
  const processPrimitive = (primitive: IRPrimitive) => {
    // Check if primitive has a locator
    const locatorSpec = (primitive as { locator?: LocatorSpec }).locator;
    if (!locatorSpec) return;

    // Create a unique key for the locator spec
    const specKey = JSON.stringify(locatorSpec);
    if (seenSpecs.has(specKey)) return;

    const name = generateLocatorName(locatorSpec, existingNames);
    const playwrightLocator = toPlaywrightLocator(locatorSpec);

    const locator: ModuleLocator = {
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
function generateMethods(journey: IRJourney, locators: ModuleLocator[]): ModuleMethod[] {
  const methods: ModuleMethod[] = [];
  const locatorMap = new Map<string, string>();

  // Build locator lookup map
  for (const locator of locators) {
    const specKey = JSON.stringify(locator.spec);
    locatorMap.set(specKey, locator.name);
  }

  // Helper to get locator reference
  const getLocatorRef = (spec: LocatorSpec): string => {
    const specKey = JSON.stringify(spec);
    const locatorName = locatorMap.get(specKey);
    return locatorName ? `this.${locatorName}` : `this.page.${toPlaywrightLocator(spec)}`;
  };

  // Generate a method for each step
  for (const step of journey.steps) {
    const methodName = toCamelCase(step.id.replace(/[^a-zA-Z0-9]/g, '_'));
    const body: string[] = [];

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
function primitiveToMethodLine(
  primitive: IRPrimitive,
  getLocatorRef: (spec: LocatorSpec) => string
): string | null {
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
function escapeString(str: string): string {
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
function loadDefaultTemplate(): string {
  const templatePath = join(__dirname, 'templates', 'module.ejs');
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Generate Page Object module from IR Journey
 */
export function generateModule(
  journey: IRJourney,
  options: GenerateModuleOptions = {}
): GenerateModuleResult {
  const { templatePath, suffix = 'Page' } = options;

  // Load template
  const template = templatePath
    ? readFileSync(templatePath, 'utf-8')
    : loadDefaultTemplate();

  // Generate module/class names
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;

  // Extract locators and generate methods
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);

  // Create module definition
  const moduleDef: ModuleDefinition = {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods,
  };

  // Render template
  const code = ejs.render(template, {
    ...moduleDef,
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
export function generateModuleCode(journey: IRJourney): string {
  return generateModule(journey).code;
}

/**
 * Extract module definition from journey without generating code
 */
export function extractModuleDefinition(
  journey: IRJourney,
  options: GenerateModuleOptions = {}
): ModuleDefinition {
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
