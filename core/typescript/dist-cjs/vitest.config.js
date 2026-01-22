"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
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
            '@': (0, path_1.resolve)(__dirname, './'),
            '@/config': (0, path_1.resolve)(__dirname, './config'),
            '@/auth': (0, path_1.resolve)(__dirname, './auth'),
            '@/fixtures': (0, path_1.resolve)(__dirname, './fixtures'),
            '@/locators': (0, path_1.resolve)(__dirname, './locators'),
            '@/assertions': (0, path_1.resolve)(__dirname, './assertions'),
            '@/data': (0, path_1.resolve)(__dirname, './data'),
            '@/reporters': (0, path_1.resolve)(__dirname, './reporters'),
            '@/harness': (0, path_1.resolve)(__dirname, './harness'),
            '@/types': (0, path_1.resolve)(__dirname, './types'),
            '@/errors': (0, path_1.resolve)(__dirname, './errors'),
            '@/utils': (0, path_1.resolve)(__dirname, './utils')
        }
    }
});
//# sourceMappingURL=vitest.config.js.map