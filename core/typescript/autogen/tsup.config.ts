import { defineConfig } from 'tsup';

const entries = [
  'src/index.ts',
  'src/cli/index.ts',
  'src/codegen/index.ts',
  'src/config/index.ts',
  'src/heal/index.ts',
  'src/ir/index.ts',
  'src/journey/index.ts',
  'src/mapping/index.ts',
  'src/selectors/index.ts',
  'src/validate/index.ts',
  'src/verify/index.ts',
  'src/variants/index.ts'
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
  tsconfig: './tsconfig.json'
});
