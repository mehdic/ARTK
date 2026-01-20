import { defineConfig } from 'tsup';

const entries = [
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
  'validation/index.ts',
  'grid/index.ts',
  'llkb/index.ts'
];

// Default ESM build
export default defineConfig([
  // ESM build (default)
  {
    entry: entries,
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
  }
]);

// Export CJS config for build:cjs script
export const cjsConfig = defineConfig({
  entry: entries,
  format: ['cjs'],
  dts: false, // ESM build already generates .d.ts
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist-cjs',
  treeshake: true,
  minify: false,
  target: 'es2022',
  tsconfig: './tsconfig.json',
  // Strip ESM-only code
  esbuildOptions(options) {
    options.define = {
      ...options.define,
      // This doesn't actually strip __ESM_ONLY blocks, we still need the script
    };
  }
});
