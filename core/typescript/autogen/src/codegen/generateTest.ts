/**
 * Test Generator - Generate Playwright test files from IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 12
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import type { IRJourney, IRPrimitive, ValueSpec } from '../ir/types.js';
import { toPlaywrightLocator } from '../selectors/priority.js';
import { injectManagedBlocks } from './blocks.js';
import { updateJourneyFrontmatter } from '../journey/updater.js';
import { escapeRegex } from '../utils/escaping.js';

// Get current directory for template path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Import statement for generated test
 */
export interface ImportStatement {
  members: string[];
  from: string;
}

/**
 * Options for test generation
 */
export interface GenerateTestOptions {
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
}

/**
 * Result of test generation
 */
export interface GenerateTestResult {
  /** Generated test code */
  code: string;
  /** Journey ID */
  journeyId: string;
  /** Suggested filename */
  filename: string;
  /** Imports used */
  imports: ImportStatement[];
}

/**
 * Escape string for use in generated code
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
 * Render a value spec to code
 */
function renderValue(value: ValueSpec): string {
  switch (value.type) {
    case 'literal':
      return `'${escapeString(value.value)}'`;
    case 'actor':
      return `actor.${value.value}`;
    case 'runId':
      return 'runId';
    case 'generated':
      return `\`${value.value}\``;
    case 'testData':
      return `testData.${value.value}`;
    default:
      return `'${escapeString(value.value)}'`;
  }
}

/**
 * Render an IR primitive to Playwright code
 */
function renderPrimitive(primitive: IRPrimitive, indent = ''): string {
  switch (primitive.type) {
    // Navigation
    case 'goto':
      return `${indent}await page.goto('${escapeString(primitive.url)}');`;

    case 'waitForURL':
      const urlPattern = typeof primitive.pattern === 'string'
        ? `/${escapeRegex(primitive.pattern)}/`
        : primitive.pattern.toString();
      return `${indent}await page.waitForURL(${urlPattern});`;

    case 'waitForResponse':
      return `${indent}await page.waitForResponse(resp => resp.url().includes('${escapeString(primitive.urlPattern)}'));`;

    case 'waitForLoadingComplete':
      return `${indent}await page.waitForLoadState('networkidle');`;

    // Interactions
    case 'click':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click();`;

    case 'fill':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.fill(${renderValue(primitive.value)});`;

    case 'select':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.selectOption('${escapeString(primitive.option)}');`;

    case 'check':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.check();`;

    case 'uncheck':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.uncheck();`;

    case 'press':
      if (primitive.locator) {
        return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.press('${primitive.key}');`;
      }
      return `${indent}await page.keyboard.press('${primitive.key}');`;

    case 'hover':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.hover();`;

    case 'focus':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.focus();`;

    case 'clear':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.clear();`;

    case 'upload':
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.setInputFiles([${primitive.files.map(f => `'${escapeString(f)}'`).join(', ')}]);`;

    // Assertions
    case 'expectVisible':
      const visibleTimeout = primitive.timeout ? `, { timeout: ${primitive.timeout} }` : '';
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeVisible(${visibleTimeout ? `{ timeout: ${primitive.timeout} }` : ''});`;

    case 'expectNotVisible':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeVisible();`;

    case 'expectHidden':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeHidden();`;

    case 'expectText':
      const textPattern = typeof primitive.text === 'string'
        ? `'${escapeString(primitive.text)}'`
        : primitive.text.toString();
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveText(${textPattern});`;

    case 'expectValue':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveValue('${escapeString(primitive.value)}');`;

    case 'expectChecked':
      if (primitive.checked === false) {
        return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeChecked();`;
      }
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeChecked();`;

    case 'expectEnabled':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeEnabled();`;

    case 'expectDisabled':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeDisabled();`;

    case 'expectURL':
      const urlExpectPattern = typeof primitive.pattern === 'string'
        ? `/${escapeRegex(primitive.pattern)}/`
        : primitive.pattern.toString();
      return `${indent}await expect(page).toHaveURL(${urlExpectPattern});`;

    case 'expectTitle':
      const titlePattern = typeof primitive.title === 'string'
        ? `'${escapeString(primitive.title)}'`
        : primitive.title.toString();
      return `${indent}await expect(page).toHaveTitle(${titlePattern});`;

    case 'expectCount':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveCount(${primitive.count});`;

    case 'expectContainsText':
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toContainText('${escapeString(primitive.text)}');`;

    // Signals
    case 'expectToast':
      const toastSelector = primitive.message
        ? `getByText('${escapeString(primitive.message)}')`
        : `getByRole('alert')`;
      return `${indent}await expect(page.${toastSelector}).toBeVisible();`;

    case 'dismissModal':
      return `${indent}await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;

    case 'acceptAlert':
      return `${indent}page.on('dialog', dialog => dialog.accept());`;

    case 'dismissAlert':
      return `${indent}page.on('dialog', dialog => dialog.dismiss());`;

    // Module calls
    case 'callModule':
      const args = primitive.args ? primitive.args.map(a => JSON.stringify(a)).join(', ') : '';
      return `${indent}await ${primitive.module}.${primitive.method}(${args ? `page, ${args}` : 'page'});`;

    // Blocked - must throw to fail the test
    case 'blocked':
      return `${indent}// ARTK BLOCKED: ${primitive.reason}\n${indent}// Source: ${escapeString(primitive.sourceText)}\n${indent}throw new Error('ARTK BLOCKED: ${escapeString(primitive.reason)}');`;

    default:
      return `${indent}// Unknown primitive type: ${(primitive as { type: string }).type}`;
  }
}

/**
 * Load the default test template
 */
function loadDefaultTemplate(): string {
  const templatePath = join(__dirname, 'templates', 'test.ejs');
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Collect module imports from journey
 */
function collectImports(journey: IRJourney): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const moduleImports = new Map<string, Set<string>>();

  // Collect module calls from all steps
  for (const step of journey.steps) {
    for (const action of step.actions) {
      if (action.type === 'callModule') {
        const module = action.module;
        if (!moduleImports.has(module)) {
          moduleImports.set(module, new Set());
        }
        // Import the module itself
        moduleImports.get(module)!.add(module);
      }
    }
  }

  // Convert to import statements
  for (const [module, members] of moduleImports) {
    imports.push({
      members: Array.from(members),
      from: `@modules/${module}`,
    });
  }

  return imports;
}

/**
 * Generate Playwright test code from IR Journey
 */
export function generateTest(
  journey: IRJourney,
  options: GenerateTestOptions = {}
): GenerateTestResult {
  const { templatePath, imports: additionalImports = [], strategy = 'full', existingCode } = options;

  // Load template
  const template = templatePath
    ? readFileSync(templatePath, 'utf-8')
    : loadDefaultTemplate();

  // Collect imports
  const imports = [...collectImports(journey), ...additionalImports];

  // Render template
  let code = ejs.render(template, {
    journey,
    imports,
    renderPrimitive,
    escapeString,
    escapeRegex,
  });

  // Apply strategy-specific processing
  if (strategy === 'blocks' && existingCode) {
    // Use managed blocks strategy: inject generated code into existing file
    const testBlock = {
      id: `test-${journey.id}`,
      content: code.trim(),
    };

    code = injectManagedBlocks({
      existingCode,
      newBlocks: [testBlock],
    });
  } else if (strategy === 'ast' && existingCode) {
    // AST strategy would use astEdit.ts (not implemented in this task)
    // For now, fall back to full regeneration
    console.warn('AST strategy not yet implemented for blocks integration, using full generation');
  }

  // Generate filename
  const filename = `${journey.id.toLowerCase()}.spec.ts`;

  // Update journey frontmatter if requested
  if (options.updateJourney && options.journeyPath) {
    try {
      const testPath = options.outputPath || filename;

      // Extract module names from journey metadata
      const modules = {
        foundation: journey.moduleDependencies?.foundation || [],
        features: journey.moduleDependencies?.feature || [], // Note: IR uses 'feature' (singular)
      };

      updateJourneyFrontmatter({
        journeyPath: options.journeyPath,
        testPath,
        testContent: code,
        modules,
      });
    } catch (error) {
      // Log error but don't fail test generation
      console.error(
        `Warning: Failed to update journey frontmatter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    code,
    journeyId: journey.id,
    filename,
    imports,
  };
}

/**
 * Generate test code as a string (convenience function)
 */
export function generateTestCode(journey: IRJourney): string {
  return generateTest(journey).code;
}
