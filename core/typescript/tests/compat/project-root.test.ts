/**
 * Unit tests for resolveProjectRoot compatibility function
 * T031: Unit test for resolveProjectRoot()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented
import { resolveProjectRoot, findPackageJson } from '../../compat/project-root.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('resolveProjectRoot', () => {
  it('should return the project root directory', () => {
    const result = resolveProjectRoot();
    expect(typeof result).toBe('string');
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('should return a directory containing package.json', () => {
    const result = resolveProjectRoot();
    const packageJsonPath = path.join(result, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
  });

  it('should return the @artk/core package root when called from tests', () => {
    const result = resolveProjectRoot();
    // Should be the core/typescript directory
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(result, 'package.json'), 'utf8')
    );
    expect(packageJson.name).toBe('@artk/core');
  });

  it('should return consistent results on repeated calls', () => {
    const first = resolveProjectRoot();
    const second = resolveProjectRoot();
    expect(first).toBe(second);
  });
});

describe('findPackageJson', () => {
  let tempDir: string;
  let nestedDir: string;

  beforeEach(() => {
    // Create a nested directory structure with package.json at root
    tempDir = path.join(__dirname, '../fixtures/temp-project-' + Date.now());
    nestedDir = path.join(tempDir, 'src', 'modules', 'deep');
    fs.mkdirSync(nestedDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should find package.json in the same directory', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test' })
    );

    const result = findPackageJson(tempDir);
    expect(result).toBe(path.join(tempDir, 'package.json'));
  });

  it('should find package.json in parent directories', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test' })
    );

    // Start from deeply nested directory
    const result = findPackageJson(nestedDir);
    expect(result).toBe(path.join(tempDir, 'package.json'));
  });

  it('should return null if no package.json found', () => {
    // tempDir has no package.json
    // Note: This might find a package.json higher up in the real filesystem
    // We test with a path that's unlikely to have one
    const result = findPackageJson('/tmp/nonexistent-' + Date.now());
    expect(result).toBeNull();
  });

  it('should stop at filesystem root', () => {
    // This should not throw and should return null or find a system package.json
    const result = findPackageJson('/');
    // Result depends on system - might be null or might find a package.json
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should handle relative paths by converting to absolute', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test' })
    );

    // Test that findPackageJson resolves relative paths correctly
    // by passing the tempDir relative to __dirname
    const relativePath = path.relative(process.cwd(), tempDir);
    const result = findPackageJson(relativePath);
    expect(result).toBe(path.join(tempDir, 'package.json'));
  });
});
