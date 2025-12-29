import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/types.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/config': resolve(__dirname, './config'),
      '@/auth': resolve(__dirname, './auth'),
      '@/fixtures': resolve(__dirname, './fixtures'),
      '@/locators': resolve(__dirname, './locators'),
      '@/assertions': resolve(__dirname, './assertions'),
      '@/data': resolve(__dirname, './data'),
      '@/reporters': resolve(__dirname, './reporters'),
      '@/harness': resolve(__dirname, './harness'),
      '@/types': resolve(__dirname, './types'),
      '@/errors': resolve(__dirname, './errors'),
      '@/utils': resolve(__dirname, './utils')
    }
  }
});
