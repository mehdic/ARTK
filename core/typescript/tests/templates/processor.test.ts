/**
 * Unit tests for Template Processor
 * Tests variable substitution and template processing
 */
import { describe, it, expect } from 'vitest';
import {
  processTemplate,
  validateTemplateSyntax,
  extractVariables,
  createTemplateContext
} from '../../src/templates/processor';
import type { TemplateContext } from '../../src/templates/types';

describe('Template Processor', () => {
  const basicContext: TemplateContext = {
    projectName: 'test-project',
    projectRoot: '/Users/test/project',
    artkRoot: 'artk-e2e',
    moduleSystem: 'esm',
    nodeVersion: '18.0.0',
    packageType: 'module',
    tsConfigModule: 'ESNext',
    baseURL: 'http://localhost:3000',
    authProvider: 'oidc',
    artkCorePath: '@artk/core',
    configPath: 'artk-e2e/config',
    authStatePath: '.auth-states',
    generatedAt: '2026-01-13T00:00:00Z',
    artkVersion: '1.0.0',
    templateVariant: 'esm'
  };

  describe('processTemplate', () => {
    it('should substitute simple variables', () => {
      const template = 'Project: {{projectName}}, Root: {{projectRoot}}';
      const result = processTemplate(template, basicContext);

      expect(result).toBe('Project: test-project, Root: /Users/test/project');
    });

    it('should substitute multiple occurrences of same variable', () => {
      const template = '{{projectName}} {{projectName}} {{projectName}}';
      const result = processTemplate(template, basicContext);

      expect(result).toBe('test-project test-project test-project');
    });

    it('should substitute all context variables', () => {
      const template = `
        Name: {{projectName}}
        Root: {{projectRoot}}
        System: {{moduleSystem}}
        Node: {{nodeVersion}}
      `;
      const result = processTemplate(template, basicContext);

      expect(result).toContain('Name: test-project');
      expect(result).toContain('Root: /Users/test/project');
      expect(result).toContain('System: esm');
      expect(result).toContain('Node: 18.0.0');
    });

    it('should throw error for undefined variable', () => {
      const template = '{{undefinedVariable}}';

      expect(() => processTemplate(template, basicContext)).toThrow(
        /Template variable 'undefinedVariable' is not defined/
      );
    });

    it('should list available variables in error message', () => {
      const template = '{{missing}}';

      expect(() => processTemplate(template, basicContext)).toThrow(
        /Available variables: projectName/
      );
    });
  });

  describe('removeComments', () => {
    it('should remove template comments', () => {
      const template = 'Code {{! this is a comment }} more code';
      const result = processTemplate(template, basicContext);

      expect(result).toBe('Code  more code');
      expect(result).not.toContain('this is a comment');
    });

    it('should remove multiple comments', () => {
      const template = '{{! comment 1 }} text {{! comment 2 }}';
      const result = processTemplate(template, basicContext);

      expect(result).toBe(' text ');
    });

    it('should remove multiline comments', () => {
      const template = `
        {{!
          This is a long
          multiline comment
        }}
        Code
      `;
      const result = processTemplate(template, basicContext);

      expect(result).not.toContain('This is a long');
      expect(result).toContain('Code');
    });
  });

  describe('processConditionals', () => {
    it('should include block when condition is truthy', () => {
      const template = '{{#if moduleSystem}}ESM code{{/if}}';
      const result = processTemplate(template, basicContext);

      expect(result).toBe('ESM code');
    });

    it('should exclude block when condition is falsy', () => {
      const template = '{{#if packageType}}Has type{{/if}}';
      const contextNoType = { ...basicContext, packageType: undefined };
      const result = processTemplate(template, contextNoType);

      expect(result).toBe('');
    });

    it('should handle boolean true', () => {
      const template = '{{#if useFeature}}Feature enabled{{/if}}';
      const result = processTemplate(template, { ...basicContext, useFeature: 'true' });

      expect(result).toBe('Feature enabled');
    });

    it('should handle boolean false', () => {
      const template = '{{#if useFeature}}Feature enabled{{/if}}';
      const result = processTemplate(template, { ...basicContext, useFeature: 'false' });

      expect(result).toBe('');
    });

    it('should handle empty string as falsy', () => {
      const template = '{{#if emptyVar}}Not shown{{/if}}';
      const result = processTemplate(template, { ...basicContext, emptyVar: '' });

      expect(result).toBe('');
    });

    it('should handle nested content in conditional', () => {
      const template = `
        {{#if moduleSystem}}
        import { foo } from 'bar';
        export function test() {
          return "{{projectName}}";
        }
        {{/if}}
      `;
      const result = processTemplate(template, basicContext);

      expect(result).toContain('import { foo }');
      expect(result).toContain('return "test-project"');
    });
  });

  describe('validateTemplateSyntax', () => {
    it('should validate correct syntax', () => {
      const template = '{{projectName}} {{#if moduleSystem}}code{{/if}}';
      const result = validateTemplateSyntax(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect unclosed conditional', () => {
      const template = '{{#if moduleSystem}}code';
      const result = validateTemplateSyntax(template);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Mismatched conditional blocks');
    });

    it('should detect extra closing tag', () => {
      const template = 'code{{/if}}';
      const result = validateTemplateSyntax(template);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Mismatched conditional blocks');
    });

    it('should detect malformed variable tag', () => {
      const template = '{{projectName';
      const result = validateTemplateSyntax(template);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Malformed template tags');
    });

    it('should allow multiple conditionals', () => {
      const template = '{{#if a}}A{{/if}} {{#if b}}B{{/if}}';
      const result = validateTemplateSyntax(template);

      expect(result.valid).toBe(true);
    });
  });

  describe('extractVariables', () => {
    it('should extract simple variables', () => {
      const template = '{{projectName}} and {{moduleSystem}}';
      const variables = extractVariables(template);

      expect(variables).toContain('projectName');
      expect(variables).toContain('moduleSystem');
      expect(variables).toHaveLength(2);
    });

    it('should extract variables from conditionals', () => {
      const template = '{{#if useFeature}}{{projectName}}{{/if}}';
      const variables = extractVariables(template);

      expect(variables).toContain('useFeature');
      expect(variables).toContain('projectName');
    });

    it('should not duplicate variables', () => {
      const template = '{{projectName}} {{projectName}} {{projectName}}';
      const variables = extractVariables(template);

      expect(variables).toEqual(['projectName']);
    });

    it('should ignore comments', () => {
      const template = '{{! This mentions projectName but is a comment }}{{actualVar}}';
      const variables = extractVariables(template);

      expect(variables).toContain('actualVar');
      expect(variables).not.toContain('projectName');
    });

    it('should extract from complex template', () => {
      const template = `
        /**
         * {{projectName}}
         * Generated: {{generatedAt}}
         */
        {{#if moduleSystem}}
        const root = '{{projectRoot}}';
        {{/if}}
      `;
      const variables = extractVariables(template);

      expect(variables).toContain('projectName');
      expect(variables).toContain('generatedAt');
      expect(variables).toContain('moduleSystem');
      expect(variables).toContain('projectRoot');
    });
  });

  describe('createTemplateContext', () => {
    it('should create context with defaults', () => {
      const context = createTemplateContext({});

      expect(context.projectName).toBe('artk-project');
      expect(context.moduleSystem).toBe('commonjs');
      expect(context.baseURL).toBe('http://localhost:3000');
      expect(context.authProvider).toBe('oidc');
    });

    it('should override defaults with provided values', () => {
      const context = createTemplateContext({
        projectName: 'my-project',
        moduleSystem: 'esm'
      });

      expect(context.projectName).toBe('my-project');
      expect(context.moduleSystem).toBe('esm');
    });

    it('should preserve extra fields', () => {
      const context = createTemplateContext({
        customField: 'custom-value'
      } as any);

      expect(context.customField).toBe('custom-value');
    });

    it('should generate timestamp', () => {
      const context = createTemplateContext({});

      expect(context.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use current Node version', () => {
      const context = createTemplateContext({});

      expect(context.nodeVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Integration: Full Template Processing', () => {
    it('should process real template with all features', () => {
      const template = `
/**
 * {{! Auto-generated, do not edit directly }}
 * Project: {{projectName}}
 * Generated: {{generatedAt}}
 */
{{#if moduleSystem}}
import type { Config } from '{{artkCorePath}}/types';
{{/if}}

const projectRoot = '{{projectRoot}}';
const baseURL = '{{baseURL}}';

{{#if authProvider}}
// Using {{authProvider}} authentication
const authConfig = loadAuth('{{authProvider}}');
{{/if}}
      `.trim();

      const result = processTemplate(template, basicContext);

      // Comment removed
      expect(result).not.toContain('Auto-generated');

      // Variables substituted
      expect(result).toContain('Project: test-project');
      expect(result).toContain("const projectRoot = '/Users/test/project'");
      expect(result).toContain("const baseURL = 'http://localhost:3000'");

      // Conditionals processed
      expect(result).toContain("import type { Config } from '@artk/core/types'");
      expect(result).toContain('Using oidc authentication');
      expect(result).toContain("loadAuth('oidc')");
    });
  });
});
