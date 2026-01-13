import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'index.ts',
    'config/index.ts',
    'auth/index.ts',
    'fixtures/index.ts',
    'locators/index.ts',
    'assertions/index.ts',
    'data/index.ts',
    'reporters/index.ts',
    'harness/index.ts',
    'errors/index.ts',
    'utils/index.ts',
    'types/index.ts',
    'detection/index.ts',
    'targets/index.ts',
    'install/index.ts',
    'schemas/index.ts',
    'compat/index.ts',
    'validation/index.ts'
  ],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  treeshake: true,
  minify: false,
  target: 'es2022',
  tsconfig: './tsconfig.json'
});
