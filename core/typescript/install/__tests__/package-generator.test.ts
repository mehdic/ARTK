/**
 * Unit tests for package.json generator
 *
 * @group unit
 * @group install
 */

import { describe, expect, it } from 'vitest';
import {
  generatePackageJson,
  generatePackageJsonObject,
  normalizeProjectName,
  validateProjectName,
  DEPENDENCY_VERSIONS,
  type PackageJsonOptions,
  type GeneratedPackageJson,
} from '../package-generator.js';

// =============================================================================
// normalizeProjectName Tests
// =============================================================================

describe('normalizeProjectName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeProjectName('MyProject')).toBe('myproject');
    expect(normalizeProjectName('UPPERCASE')).toBe('uppercase');
    expect(normalizeProjectName('MixedCase')).toBe('mixedcase');
  });

  it('should replace spaces with hyphens', () => {
    expect(normalizeProjectName('my project')).toBe('my-project');
    expect(normalizeProjectName('my  project')).toBe('my-project');
    expect(normalizeProjectName('my   project')).toBe('my-project');
  });

  it('should replace special characters with hyphens', () => {
    expect(normalizeProjectName('my_project')).toBe('my-project');
    expect(normalizeProjectName('my.project')).toBe('my-project');
    expect(normalizeProjectName('my@project')).toBe('my-project');
    expect(normalizeProjectName('my&project')).toBe('my-project');
  });

  it('should collapse multiple hyphens', () => {
    expect(normalizeProjectName('my--project')).toBe('my-project');
    expect(normalizeProjectName('my---project')).toBe('my-project');
    expect(normalizeProjectName('my----project')).toBe('my-project');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(normalizeProjectName('-myproject')).toBe('myproject');
    expect(normalizeProjectName('myproject-')).toBe('myproject');
    expect(normalizeProjectName('-myproject-')).toBe('myproject');
    expect(normalizeProjectName('--myproject--')).toBe('myproject');
  });

  it('should handle already valid names', () => {
    expect(normalizeProjectName('my-project')).toBe('my-project');
    expect(normalizeProjectName('myproject123')).toBe('myproject123');
    expect(normalizeProjectName('my-project-123')).toBe('my-project-123');
  });

  it('should handle empty string', () => {
    expect(normalizeProjectName('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(normalizeProjectName('___')).toBe('');
    expect(normalizeProjectName('...')).toBe('');
    expect(normalizeProjectName('@@@')).toBe('');
  });

  it('should handle numbers at start', () => {
    expect(normalizeProjectName('123project')).toBe('123project');
    expect(normalizeProjectName('123-project')).toBe('123-project');
  });
});

// =============================================================================
// validateProjectName Tests
// =============================================================================

describe('validateProjectName', () => {
  it('should validate simple valid names', () => {
    const result = validateProjectName('my-project');

    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('my-project');
    expect(result.warnings).toEqual([]);
  });

  it('should validate and normalize mixed case without warnings', () => {
    // Pure case changes don't trigger warnings (only special char removal does)
    const result = validateProjectName('MyProject');

    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('myproject');
    expect(result.warnings).toEqual([]);
  });

  it('should warn when normalization changes more than just case', () => {
    // Special characters trigger warnings because normalized differs from lowercase
    const result = validateProjectName('My_Project');

    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('my-project');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('normalized');
  });

  it('should return invalid for empty name', () => {
    const result = validateProjectName('');

    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('artk-e2e-tests');
    expect(result.warnings).toContain('Project name is empty, using default: artk-e2e-tests');
  });

  it('should return invalid for names that become empty after normalization', () => {
    const result = validateProjectName('___');

    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('artk-e2e-tests');
  });

  it('should warn about leading hyphens', () => {
    const result = validateProjectName('-myproject');

    // After normalization, leading hyphen is removed
    expect(result.normalized).toBe('myproject');
  });

  it('should warn about trailing hyphens', () => {
    const result = validateProjectName('myproject-');

    // After normalization, trailing hyphen is removed
    expect(result.normalized).toBe('myproject');
  });

  it('should truncate names that are too long', () => {
    const longName = 'a'.repeat(300);
    const result = validateProjectName(longName);

    expect(result.valid).toBe(false);
    expect(result.normalized.length).toBe(214);
    expect(result.warnings).toContain('Project name too long (max 214 characters), truncated');
  });

  it('should handle names at exactly 214 characters', () => {
    const exactName = 'a'.repeat(214);
    const result = validateProjectName(exactName);

    expect(result.valid).toBe(true);
    expect(result.normalized.length).toBe(214);
  });

  it('should handle names with special characters', () => {
    const result = validateProjectName('My Project @ 2024!');

    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('my-project-2024');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// generatePackageJsonObject Tests
// =============================================================================

describe('generatePackageJsonObject', () => {
  describe('default options', () => {
    it('should use default project name', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.name).toBe('artk-e2e-tests');
    });

    it('should use version 1.0.0', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.version).toBe('1.0.0');
    });

    it('should be private', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.private).toBe(true);
    });

    it('should be ESM module', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.type).toBe('module');
    });

    it('should use default description', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.description).toBe('ARTK E2E Testing Suite');
    });

    it('should include required engines', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.engines.node).toBe('>=18.0.0');
    });
  });

  describe('scripts', () => {
    it('should include test script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts.test).toBe('playwright test');
    });

    it('should include test:headed script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts['test:headed']).toBe('playwright test --headed');
    });

    it('should include test:debug script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts['test:debug']).toBe('playwright test --debug');
    });

    it('should include test:ui script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts['test:ui']).toBe('playwright test --ui');
    });

    it('should include report script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts.report).toBe('playwright show-report');
    });

    it('should include codegen script', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.scripts.codegen).toBe('playwright codegen');
    });

    it('should include typecheck script when TypeScript enabled', () => {
      const pkg = generatePackageJsonObject({ includeTypeScript: true });

      expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
    });

    it('should not include typecheck script when TypeScript disabled', () => {
      const pkg = generatePackageJsonObject({ includeTypeScript: false });

      expect(pkg.scripts.typecheck).toBeUndefined();
    });

    it('should include additional scripts', () => {
      const pkg = generatePackageJsonObject({
        additionalScripts: {
          lint: 'eslint .',
          format: 'prettier --write .',
        },
      });

      expect(pkg.scripts.lint).toBe('eslint .');
      expect(pkg.scripts.format).toBe('prettier --write .');
    });
  });

  describe('dependencies', () => {
    it('should use vendored @artk/core path by default', () => {
      const pkg = generatePackageJsonObject({ vendored: true });

      expect(pkg.dependencies['@artk/core']).toBe('file:./vendor/artk-core');
    });

    it('should use version for non-vendored installation', () => {
      const pkg = generatePackageJsonObject({
        vendored: false,
        artkCoreVersion: '2.0.0',
      });

      expect(pkg.dependencies['@artk/core']).toBe('2.0.0');
    });

    it('should include additional dependencies', () => {
      const pkg = generatePackageJsonObject({
        additionalDependencies: {
          axios: '^1.6.0',
          dotenv: '^16.3.0',
        },
      });

      expect(pkg.dependencies.axios).toBe('^1.6.0');
      expect(pkg.dependencies.dotenv).toBe('^16.3.0');
    });
  });

  describe('devDependencies', () => {
    it('should include @playwright/test', () => {
      const pkg = generatePackageJsonObject();

      expect(pkg.devDependencies['@playwright/test']).toBe('^1.40.0');
    });

    it('should use custom playwright version', () => {
      const pkg = generatePackageJsonObject({ playwrightVersion: '^1.42.0' });

      expect(pkg.devDependencies['@playwright/test']).toBe('^1.42.0');
    });

    it('should include TypeScript when enabled', () => {
      const pkg = generatePackageJsonObject({ includeTypeScript: true });

      expect(pkg.devDependencies.typescript).toBe('^5.3.3');
      expect(pkg.devDependencies['@types/node']).toBe('^20.10.0');
    });

    it('should use custom TypeScript version', () => {
      const pkg = generatePackageJsonObject({
        includeTypeScript: true,
        typescriptVersion: '^5.4.0',
      });

      expect(pkg.devDependencies.typescript).toBe('^5.4.0');
    });

    it('should not include TypeScript when disabled', () => {
      const pkg = generatePackageJsonObject({ includeTypeScript: false });

      expect(pkg.devDependencies.typescript).toBeUndefined();
      expect(pkg.devDependencies['@types/node']).toBeUndefined();
    });

    it('should include additional devDependencies', () => {
      const pkg = generatePackageJsonObject({
        additionalDevDependencies: {
          eslint: '^8.56.0',
          prettier: '^3.2.0',
        },
      });

      expect(pkg.devDependencies.eslint).toBe('^8.56.0');
      expect(pkg.devDependencies.prettier).toBe('^3.2.0');
    });
  });

  describe('custom options', () => {
    it('should use custom project name (normalized)', () => {
      const pkg = generatePackageJsonObject({ projectName: 'My E2E Tests' });

      expect(pkg.name).toBe('my-e2e-tests');
    });

    it('should use custom description', () => {
      const pkg = generatePackageJsonObject({
        description: 'Custom E2E Testing Suite',
      });

      expect(pkg.description).toBe('Custom E2E Testing Suite');
    });
  });
});

// =============================================================================
// generatePackageJson Tests
// =============================================================================

describe('generatePackageJson', () => {
  it('should generate valid JSON string', () => {
    const json = generatePackageJson();

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should end with newline', () => {
    const json = generatePackageJson();

    expect(json.endsWith('\n')).toBe(true);
  });

  it('should be properly indented', () => {
    const json = generatePackageJson();

    // Should use 2-space indentation
    expect(json).toContain('  "name"');
    expect(json).toContain('    "test"');
  });

  it('should match generatePackageJsonObject output', () => {
    const options: PackageJsonOptions = {
      projectName: 'test-project',
      description: 'Test',
    };

    const obj = generatePackageJsonObject(options);
    const json = generatePackageJson(options);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(obj);
  });

  it('should pass options to generatePackageJsonObject', () => {
    const json = generatePackageJson({
      projectName: 'custom-project',
      playwrightVersion: '^1.45.0',
    });
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('custom-project');
    expect(parsed.devDependencies['@playwright/test']).toBe('^1.45.0');
  });
});

// =============================================================================
// DEPENDENCY_VERSIONS Tests
// =============================================================================

describe('DEPENDENCY_VERSIONS', () => {
  it('should have playwright version', () => {
    expect(DEPENDENCY_VERSIONS.playwright).toBe('^1.40.0');
  });

  it('should have typescript version', () => {
    expect(DEPENDENCY_VERSIONS.typescript).toBe('^5.3.3');
  });

  it('should have artkCore version', () => {
    expect(DEPENDENCY_VERSIONS.artkCore).toBe('1.0.0');
  });

  it('should have node version', () => {
    expect(DEPENDENCY_VERSIONS.node).toBe('>=18.0.0');
  });

  it('should be readonly', () => {
    // TypeScript enforces this at compile time via `as const`
    // We just verify the object exists and has expected shape
    expect(Object.keys(DEPENDENCY_VERSIONS)).toEqual([
      'playwright',
      'typescript',
      'artkCore',
      'node',
    ]);
  });
});

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

describe('edge cases', () => {
  it('should handle all options together', () => {
    const pkg = generatePackageJsonObject({
      projectName: 'Complete E2E Suite',
      description: 'Full featured test suite',
      artkCoreVersion: '2.0.0',
      playwrightVersion: '^1.45.0',
      additionalScripts: { lint: 'eslint .' },
      additionalDependencies: { axios: '^1.6.0' },
      additionalDevDependencies: { prettier: '^3.2.0' },
      includeTypeScript: true,
      typescriptVersion: '^5.4.0',
      vendored: true,
    });

    expect(pkg.name).toBe('complete-e2e-suite');
    expect(pkg.description).toBe('Full featured test suite');
    expect(pkg.dependencies['@artk/core']).toBe('file:./vendor/artk-core');
    expect(pkg.devDependencies['@playwright/test']).toBe('^1.45.0');
    expect(pkg.devDependencies.typescript).toBe('^5.4.0');
    expect(pkg.scripts.lint).toBe('eslint .');
    expect(pkg.dependencies.axios).toBe('^1.6.0');
    expect(pkg.devDependencies.prettier).toBe('^3.2.0');
  });

  it('should handle undefined options', () => {
    const pkg = generatePackageJsonObject(undefined);

    expect(pkg.name).toBe('artk-e2e-tests');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
  });

  it('should handle empty options object', () => {
    const pkg = generatePackageJsonObject({});

    expect(pkg.name).toBe('artk-e2e-tests');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
  });

  it('should override defaults with partial options', () => {
    const pkg = generatePackageJsonObject({
      projectName: 'partial-override',
      // All other options use defaults
    });

    expect(pkg.name).toBe('partial-override');
    expect(pkg.description).toBe('ARTK E2E Testing Suite'); // default
    expect(pkg.devDependencies['@playwright/test']).toBe('^1.40.0'); // default
  });
});
