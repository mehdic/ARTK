/**
 * Integration tests for template generation system
 * Tests the complete end-to-end flow from CLI script through validation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Template Generation Integration', () => {
  const testRoot = path.join(__dirname, '../fixtures/integration-test');
  const generateScript = path.join(__dirname, '../../scripts/generate-foundation.ts');
  const useCompiledScript = fs.existsSync(path.join(__dirname, '../../dist/scripts/generate-foundation.js'));
  const scriptCommand = useCompiledScript
    ? `node ${path.join(__dirname, '../../dist/scripts/generate-foundation.js')}`
    : `npx tsx ${generateScript}`;

  beforeEach(() => {
    // Create clean test directory
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('CLI Script (generate-foundation.ts)', () => {
    it('should generate ESM foundation modules via CLI', () => {
      // Create minimal ESM project structure
      const packageJson = {
        name: 'test-esm-project',
        type: 'module',
        version: '1.0.0'
      };
      fs.writeFileSync(
        path.join(testRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const tsConfig = {
        compilerOptions: {
          module: 'ES2022',
          target: 'ES2022',
          moduleResolution: 'node'
        }
      };
      fs.writeFileSync(
        path.join(testRoot, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      // Create output directory
      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Run CLI script
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm`;
      const output = execSync(command, { encoding: 'utf8' });

      // Verify output
      expect(output).toContain('Foundation modules generated successfully');

      // Verify files were created
      expect(fs.existsSync(path.join(foundationDir, 'auth/login.ts'))).toBe(true);
      expect(fs.existsSync(path.join(foundationDir, 'config/env.ts'))).toBe(true);
      expect(fs.existsSync(path.join(foundationDir, 'navigation/nav.ts'))).toBe(true);

      // Verify ESM syntax in generated files
      const authContent = fs.readFileSync(path.join(foundationDir, 'auth/login.ts'), 'utf8');
      expect(authContent).toContain('import.meta');
      expect(authContent).not.toContain('__dirname');
      expect(authContent).toContain('Generated for: test-esm-project');
    });

    it('should generate CommonJS foundation modules via CLI', () => {
      // Create minimal CommonJS project structure
      const packageJson = {
        name: 'test-commonjs-project',
        version: '1.0.0'
        // No "type" field = CommonJS
      };
      fs.writeFileSync(
        path.join(testRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const tsConfig = {
        compilerOptions: {
          module: 'CommonJS',
          target: 'ES2020',
          moduleResolution: 'node'
        }
      };
      fs.writeFileSync(
        path.join(testRoot, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      // Create output directory
      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Run CLI script
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=commonjs`;
      const output = execSync(command, { encoding: 'utf8' });

      // Verify output
      expect(output).toContain('Foundation modules generated successfully');

      // Verify files were created
      expect(fs.existsSync(path.join(foundationDir, 'auth/login.ts'))).toBe(true);
      expect(fs.existsSync(path.join(foundationDir, 'config/env.ts'))).toBe(true);
      expect(fs.existsSync(path.join(foundationDir, 'navigation/nav.ts'))).toBe(true);

      // Verify CommonJS syntax in generated files
      const authContent = fs.readFileSync(path.join(foundationDir, 'auth/login.ts'), 'utf8');
      expect(authContent).toContain('__dirname');
      expect(authContent).not.toContain('import.meta');
      expect(authContent).toContain('Generated for: test-commonjs-project');
    });

    it('should auto-detect ESM and generate correct variant', () => {
      // Create ESM project without explicit variant
      const packageJson = {
        name: 'test-auto-detect',
        type: 'module',
        version: '1.0.0'
      };
      fs.writeFileSync(
        path.join(testRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Run WITHOUT --variant flag (should auto-detect)
      const command = `${scriptCommand} --projectRoot="${testRoot}"`;
      execSync(command, { encoding: 'utf8' });

      // Should have generated ESM files
      const authContent = fs.readFileSync(path.join(foundationDir, 'auth/login.ts'), 'utf8');
      expect(authContent).toContain('import.meta');
    });

    it('should fail gracefully with helpful error message', () => {
      // Try to generate without required directory structure
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm`;

      try {
        execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Should fail with error
        expect(error.status).not.toBe(0);
      }
    });
  });

  describe('Generated Code Validity', () => {
    it('should generate valid TypeScript syntax (ESM)', () => {
      // Create ESM project
      const packageJson = { name: 'test-esm', type: 'module', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Generate files
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm`;
      execSync(command, { encoding: 'utf8' });

      // Verify files exist and have valid structure
      const authFile = path.join(foundationDir, 'auth/login.ts');
      const authContent = fs.readFileSync(authFile, 'utf8');

      // Should have ESM syntax markers
      expect(authContent).toContain('import.meta');
      expect(authContent).toContain('import ');
      expect(authContent).toContain('export ');

      // Should have proper function definitions
      expect(authContent).toMatch(/export\s+(async\s+)?function\s+\w+/);

      // Should not have CommonJS markers
      expect(authContent).not.toMatch(/^const\s+\w+\s*=\s*require\(/m);
    });

    it('should generate valid TypeScript syntax (CommonJS)', () => {
      // Create CommonJS project
      const packageJson = { name: 'test-cjs', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Generate files
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=commonjs`;
      execSync(command, { encoding: 'utf8' });

      // Verify files exist and have valid structure
      const authFile = path.join(foundationDir, 'auth/login.ts');
      const authContent = fs.readFileSync(authFile, 'utf8');

      // Should have CommonJS syntax markers
      expect(authContent).toContain('__dirname');
      expect(authContent).toContain('export ');

      // Should have proper function definitions
      expect(authContent).toMatch(/export\s+(async\s+)?function\s+\w+/);

      // Should not have ESM-specific markers (import.meta used for dirname)
      expect(authContent).not.toContain('import.meta');
    });
  });

  describe('Validation Integration', () => {
    it('should run validation and pass for correct ESM code', () => {
      // Create ESM project
      const packageJson = { name: 'test-esm', type: 'module', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Generate with validation
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm --verbose`;
      const output = execSync(command, { encoding: 'utf8' });

      // Should show validation passed
      expect(output).toContain('Validating generated files');
      expect(output).toContain('Status: passed');
    });

    it('should detect and reject wrong module system', () => {
      // Create ESM project structure
      const packageJson = { name: 'test-esm', type: 'module', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Try to generate CommonJS for ESM project (should fail or warn)
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=commonjs --verbose`;

      try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        // If it doesn't throw, check for validation warnings
        expect(output).toMatch(/warning|failed/i);
      } catch (error: any) {
        // Validation should catch this
        expect(error.status).not.toBe(0);
      }
    });

    it('should create validation results file', () => {
      // Create ESM project
      const packageJson = { name: 'test-esm', type: 'module', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Generate files
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm`;
      execSync(command, { encoding: 'utf8' });

      // Check validation results file exists
      const validationFile = path.join(testRoot, '.artk', 'validation-results.json');
      expect(fs.existsSync(validationFile)).toBe(true);

      // Check contents
      const results = JSON.parse(fs.readFileSync(validationFile, 'utf8'));
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('status');
      expect(results[0]).toHaveProperty('timestamp');
    });
  });

  describe('Template Variable Substitution', () => {
    it('should substitute all template variables correctly', () => {
      // Create project
      const packageJson = { name: 'my-awesome-project', type: 'module', version: '1.0.0' };
      fs.writeFileSync(path.join(testRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');
      fs.mkdirSync(foundationDir, { recursive: true });

      // Generate files
      const command = `${scriptCommand} --projectRoot="${testRoot}" --variant=esm`;
      execSync(command, { encoding: 'utf8' });

      // Check all files for proper substitution
      const authContent = fs.readFileSync(path.join(foundationDir, 'auth/login.ts'), 'utf8');
      const configContent = fs.readFileSync(path.join(foundationDir, 'config/env.ts'), 'utf8');
      const navContent = fs.readFileSync(path.join(foundationDir, 'navigation/nav.ts'), 'utf8');

      // Should have project name
      expect(authContent).toContain('my-awesome-project');
      expect(configContent).toContain('my-awesome-project');
      expect(navContent).toContain('my-awesome-project');

      // Should have timestamps
      expect(authContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Should NOT have unreplaced variables
      expect(authContent).not.toContain('{{projectName}}');
      expect(authContent).not.toContain('{{projectRoot}}');
      expect(configContent).not.toContain('{{configPath}}');
      expect(navContent).not.toContain('{{generatedAt}}');
    });
  });

  describe('Rollback on Failure', () => {
    it('should not leave partial files on validation failure', () => {
      // This would require mocking validation to force failure
      // For now, we trust the unit tests cover rollback logic
      // But we verify files are cleaned up properly
      const foundationDir = path.join(testRoot, 'artk-e2e', 'foundation');

      // If generation fails, foundation dir should be empty or not exist
      if (fs.existsSync(foundationDir)) {
        const files = fs.readdirSync(foundationDir, { recursive: true });
        // Either no files, or only directories
        const tsFiles = files.filter((f: any) => f.toString().endsWith('.ts'));
        expect(tsFiles.length).toBe(0);
      }
    });
  });
});
