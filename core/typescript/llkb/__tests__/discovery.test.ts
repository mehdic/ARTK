/**
 * Tests for LLKB Pattern Discovery Module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  analyzeSelectorSignals,
  detectFrameworks,
  detectUiLibraries,
  extractAuthHints,
  FRAMEWORK_PATTERNS,
  runDiscovery,
  saveAppProfile,
  UI_LIBRARY_PATTERNS,
} from '../discovery.js';

// Test fixtures directory
let tempDir: string;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'llkb-discovery-test-'));
}

function createPackageJson(dir: string, content: Record<string, unknown>): void {
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(content, null, 2));
}

function createFile(dir: string, filePath: string, content: string): void {
  const fullPath = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('Discovery Module', () => {
  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectFrameworks', () => {
    it('detects React from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      });

      const signals = detectFrameworks(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'react',
        version: '18.2.0',
      });
      expect(signals[0].confidence).toBeGreaterThan(0);
      expect(signals[0].evidence).toContain('package.json:react@^18.2.0');
    });

    it('detects Angular from package.json and angular.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/common': '^17.0.0',
        },
      });
      createFile(tempDir, 'angular.json', '{}');

      const signals = detectFrameworks(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'angular',
      });
      expect(signals[0].evidence).toContain('file:angular.json');
    });

    it('detects Vue from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          vue: '^3.3.0',
        },
      });

      const signals = detectFrameworks(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'vue',
        version: '3.3.0',
      });
    });

    it('detects Next.js from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      });

      const signals = detectFrameworks(tempDir);

      // Should detect both nextjs and react
      expect(signals.length).toBeGreaterThanOrEqual(1);
      const nextjs = signals.find(s => s.name === 'nextjs');
      expect(nextjs).toBeDefined();
    });

    it('returns empty array when no package.json exists', () => {
      const signals = detectFrameworks(tempDir);
      expect(signals).toHaveLength(0);
    });

    it('returns empty array for empty package.json', () => {
      createPackageJson(tempDir, {});

      const signals = detectFrameworks(tempDir);
      expect(signals).toHaveLength(0);
    });

    it('detects Svelte from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          svelte: '^4.0.0',
        },
      });

      const signals = detectFrameworks(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'svelte',
      });
    });

    it('sorts by confidence descending', () => {
      createPackageJson(tempDir, {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          vue: '^3.3.0',
        },
      });
      // Add React file to boost confidence
      createFile(tempDir, 'src/App.tsx', 'export default function App() {}');

      const signals = detectFrameworks(tempDir);

      // Should have both, with React higher due to more evidence
      expect(signals.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < signals.length; i++) {
        expect(signals[i - 1].confidence).toBeGreaterThanOrEqual(signals[i].confidence);
      }
    });
  });

  describe('detectUiLibraries', () => {
    it('detects MUI from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          '@mui/material': '^5.14.0',
          '@emotion/react': '^11.0.0',
          '@emotion/styled': '^11.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'mui',
      });
      expect(signals[0].confidence).toBeGreaterThan(0);
    });

    it('detects MUI enterprise version', () => {
      createPackageJson(tempDir, {
        dependencies: {
          '@mui/material': '^5.14.0',
          '@mui/x-data-grid-pro': '^6.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'mui',
        hasEnterprise: true,
      });
    });

    it('detects Ant Design from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          antd: '^5.0.0',
          '@ant-design/icons': '^5.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'antd',
      });
    });

    it('detects Chakra UI from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          '@chakra-ui/react': '^2.8.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'chakra',
      });
    });

    it('detects AG Grid from package.json', () => {
      createPackageJson(tempDir, {
        dependencies: {
          'ag-grid-community': '^30.0.0',
          'ag-grid-react': '^30.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'ag-grid',
      });
    });

    it('detects AG Grid enterprise', () => {
      createPackageJson(tempDir, {
        dependencies: {
          'ag-grid-community': '^30.0.0',
          'ag-grid-enterprise': '^30.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals).toHaveLength(1);
      expect(signals[0]).toMatchObject({
        name: 'ag-grid',
        hasEnterprise: true,
      });
    });

    it('detects multiple UI libraries', () => {
      createPackageJson(tempDir, {
        dependencies: {
          '@mui/material': '^5.14.0',
          'ag-grid-community': '^30.0.0',
          tailwindcss: '^3.0.0',
        },
      });

      const signals = detectUiLibraries(tempDir);

      expect(signals.length).toBeGreaterThanOrEqual(2);
      const names = signals.map(s => s.name);
      expect(names).toContain('mui');
      expect(names).toContain('ag-grid');
    });
  });

  describe('analyzeSelectorSignals', () => {
    it('detects data-testid as primary attribute', async () => {
      createFile(tempDir, 'src/App.tsx', `
        export function App() {
          return (
            <div data-testid="app-container">
              <button data-testid="submit-button">Submit</button>
              <input data-testid="email-input" />
            </div>
          );
        }
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.primaryAttribute).toBe('data-testid');
      expect(signals.coverage['data-testid']).toBeGreaterThan(0);
      expect(signals.sampleSelectors).toContain('app-container');
    });

    it('detects data-cy as primary attribute', async () => {
      createFile(tempDir, 'src/App.tsx', `
        export function App() {
          return (
            <div data-cy="app-container">
              <button data-cy="submit-button">Submit</button>
            </div>
          );
        }
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.primaryAttribute).toBe('data-cy');
    });

    it('detects kebab-case naming convention', async () => {
      createFile(tempDir, 'src/App.tsx', `
        <div data-testid="user-profile-card">
          <span data-testid="user-name-label"></span>
          <button data-testid="edit-profile-button"></button>
        </div>
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.namingConvention).toBe('kebab-case');
    });

    it('detects camelCase naming convention', async () => {
      createFile(tempDir, 'src/App.tsx', `
        <div data-testid="userProfileCard">
          <span data-testid="userNameLabel"></span>
          <button data-testid="editProfileButton"></button>
        </div>
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.namingConvention).toBe('camelCase');
    });

    it('returns default values when no src directory', async () => {
      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.primaryAttribute).toBe('data-testid');
      expect(signals.namingConvention).toBe('kebab-case');
      expect(signals.totalComponentsAnalyzed).toBe(0);
    });

    it('scans .vue files', async () => {
      createFile(tempDir, 'src/App.vue', `
        <template>
          <div data-test="app-container">
            <button data-test="submit-btn">Submit</button>
          </div>
        </template>
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.coverage['data-test']).toBeGreaterThan(0);
    });

    it('detects aria-label and role attributes', async () => {
      createFile(tempDir, 'src/App.tsx', `
        <div role="main">
          <button aria-label="Close dialog" role="button">X</button>
          <nav role="navigation" aria-label="Main navigation">
            <ul role="list"></ul>
          </nav>
        </div>
      `);

      const signals = await analyzeSelectorSignals(tempDir);

      expect(signals.coverage['role']).toBeGreaterThan(0);
      expect(signals.coverage['aria-label']).toBeGreaterThan(0);
    });
  });

  describe('extractAuthHints', () => {
    it('returns detected: false when no auth found', async () => {
      createFile(tempDir, 'src/App.tsx', 'export function App() { return <div>Hello</div>; }');

      const hints = await extractAuthHints(tempDir);

      expect(hints.detected).toBe(false);
    });

    it('detects auth from file names', async () => {
      createFile(tempDir, 'src/auth/login.tsx', `
        export function LoginPage() {
          return <form><input name="username" /><input name="password" /></form>;
        }
      `);

      const hints = await extractAuthHints(tempDir);

      expect(hints.detected).toBe(true);
      expect(hints.type).toBe('form');
    });

    it('detects OIDC auth type', async () => {
      createFile(tempDir, 'src/auth/auth.ts', `
        import { oidcSettings } from './config';
        const authConfig = {
          authority: 'https://auth.example.com',
          client_id: 'my-app',
          redirect_uri: '/callback',
          response_type: 'id_token',
        };
      `);

      const hints = await extractAuthHints(tempDir);

      expect(hints.detected).toBe(true);
      expect(hints.type).toBe('oidc');
    });

    it('reads auth from ARTK discovery output', async () => {
      fs.mkdirSync(path.join(tempDir, '.artk'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.artk', 'discovery.json'),
        JSON.stringify({
          auth: {
            type: 'oauth',
            loginRoute: '/login',
            selectors: {
              usernameField: '[data-testid="email"]',
              passwordField: '[data-testid="password"]',
              submitButton: '[data-testid="login-btn"]',
            },
            bypassAvailable: true,
            bypassMethod: '?oauthEnabled=false',
          },
        })
      );

      const hints = await extractAuthHints(tempDir);

      expect(hints.detected).toBe(true);
      expect(hints.type).toBe('oauth');
      expect(hints.loginRoute).toBe('/login');
      expect(hints.bypassAvailable).toBe(true);
      expect(hints.selectors).toHaveProperty('usernameField');
    });

    it('detects login route from source code', async () => {
      createFile(tempDir, 'src/auth/auth-config.ts', `
        export const authConfig = {
          loginUrl: '/login',
          logoutUrl: '/logout',
        };
      `);

      const hints = await extractAuthHints(tempDir);

      expect(hints.detected).toBe(true);
      expect(hints.loginRoute).toBe('/login');
    });
  });

  describe('runDiscovery', () => {
    it('returns complete profile for React+MUI project', async () => {
      createPackageJson(tempDir, {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          '@mui/material': '^5.14.0',
        },
      });
      createFile(tempDir, 'src/App.tsx', `
        export function App() {
          return <div data-testid="app">Hello</div>;
        }
      `);

      const result = await runDiscovery(tempDir);

      expect(result.success).toBe(true);
      expect(result.profile).not.toBeNull();
      expect(result.profile?.frameworks[0]?.name).toBe('react');
      expect(result.profile?.uiLibraries[0]?.name).toBe('mui');
      expect(result.profile?.selectorSignals.primaryAttribute).toBe('data-testid');
    });

    it('returns error for non-existent project', async () => {
      const result = await runDiscovery('/non/existent/path');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles missing package.json gracefully', async () => {
      const result = await runDiscovery(tempDir);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.profile?.frameworks).toHaveLength(0);
    });
  });

  describe('saveAppProfile', () => {
    it('saves profile to disk', () => {
      const profile = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        projectRoot: tempDir,
        frameworks: [{ name: 'react', confidence: 0.95, evidence: ['package.json:react'] }],
        uiLibraries: [],
        selectorSignals: {
          primaryAttribute: 'data-testid',
          namingConvention: 'kebab-case' as const,
          coverage: {},
          totalComponentsAnalyzed: 0,
          sampleSelectors: [],
        },
        auth: { detected: false },
        runtime: { validated: false, scanUrl: null, domSampleCount: 0 },
      };

      const outputDir = path.join(tempDir, '.artk', 'llkb');
      saveAppProfile(profile, outputDir);

      const savedPath = path.join(outputDir, 'discovered-profile.json');
      expect(fs.existsSync(savedPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(savedPath, 'utf-8')) as { frameworks: Array<{ name: string }> };
      expect(saved.frameworks[0].name).toBe('react');
    });

    it('creates output directory if missing', () => {
      const profile = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        projectRoot: tempDir,
        frameworks: [],
        uiLibraries: [],
        selectorSignals: {
          primaryAttribute: 'data-testid',
          namingConvention: 'kebab-case' as const,
          coverage: {},
          totalComponentsAnalyzed: 0,
          sampleSelectors: [],
        },
        auth: { detected: false },
        runtime: { validated: false, scanUrl: null, domSampleCount: 0 },
      };

      const outputDir = path.join(tempDir, 'deep', 'nested', 'llkb');
      saveAppProfile(profile, outputDir);

      expect(fs.existsSync(path.join(outputDir, 'discovered-profile.json'))).toBe(true);
    });
  });

  describe('Pattern Constants', () => {
    it('has framework patterns defined', () => {
      expect(Object.keys(FRAMEWORK_PATTERNS)).toContain('react');
      expect(Object.keys(FRAMEWORK_PATTERNS)).toContain('angular');
      expect(Object.keys(FRAMEWORK_PATTERNS)).toContain('vue');
      expect(Object.keys(FRAMEWORK_PATTERNS)).toContain('nextjs');
    });

    it('has UI library patterns defined', () => {
      expect(Object.keys(UI_LIBRARY_PATTERNS)).toContain('mui');
      expect(Object.keys(UI_LIBRARY_PATTERNS)).toContain('antd');
      expect(Object.keys(UI_LIBRARY_PATTERNS)).toContain('chakra');
      expect(Object.keys(UI_LIBRARY_PATTERNS)).toContain('ag-grid');
    });
  });
});
