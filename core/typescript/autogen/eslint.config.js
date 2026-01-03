import playwright from 'eslint-plugin-playwright';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint,
      playwright,
    },
    rules: {
      // Playwright best practices - enforced in generated code
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'warn',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-useless-not': 'warn',
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-nested-step': 'error',
      'playwright/valid-expect': 'error',

      // General code quality
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // CLI files can use console.log for output
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test files can use some patterns that are forbidden in generated code
    files: ['tests/**/*.ts'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
      'no-console': 'off',
    },
  },
];
