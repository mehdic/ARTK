/**
 * @module install/package-generator
 * @description Package.json generator for ARTK E2E isolated installation.
 *
 * Generates a minimal package.json with only essential dependencies:
 * - @artk/core (vendored)
 * - @playwright/test
 *
 * @example
 * ```typescript
 * import { generatePackageJson, PackageJsonOptions } from '@artk/core/install';
 *
 * const packageJson = generatePackageJson({
 *   projectName: 'my-e2e-tests',
 *   artkCoreVersion: '1.0.0',
 *   playwrightVersion: '^1.57.0',
 * });
 *
 * await fs.writeFile('artk-e2e/package.json', packageJson);
 * ```
 */

/**
 * Options for generating package.json.
 */
export interface PackageJsonOptions {
  /**
   * Name of the E2E test project.
   * Will be normalized to lowercase-kebab-case.
   * @default 'artk-e2e-tests'
   */
  projectName?: string;

  /**
   * Description for the package.
   * @default 'ARTK E2E Testing Suite'
   */
  description?: string;

  /**
   * Version of @artk/core to use.
   * @default '1.0.0'
   */
  artkCoreVersion?: string;

  /**
   * Version of @playwright/test to use.
   * @default '^1.57.0'
   */
  playwrightVersion?: string;

  /**
   * Additional npm scripts to include.
   */
  additionalScripts?: Record<string, string>;

  /**
   * Additional dependencies to include.
   */
  additionalDependencies?: Record<string, string>;

  /**
   * Additional devDependencies to include.
   */
  additionalDevDependencies?: Record<string, string>;

  /**
   * Whether to include TypeScript configuration.
   * @default true
   */
  includeTypeScript?: boolean;

  /**
   * TypeScript version to use.
   * @default '^5.3.3'
   */
  typescriptVersion?: string;

  /**
   * Whether this is a vendored installation (uses local path).
   * @default true
   */
  vendored?: boolean;
}

/**
 * Default options for package.json generation.
 */
const DEFAULT_OPTIONS: Required<PackageJsonOptions> = {
  projectName: 'artk-e2e-tests',
  description: 'ARTK E2E Testing Suite',
  artkCoreVersion: '1.0.0',
  playwrightVersion: '^1.57.0',
  additionalScripts: {},
  additionalDependencies: {},
  additionalDevDependencies: {},
  includeTypeScript: true,
  typescriptVersion: '^5.3.3',
  vendored: true,
};

/**
 * Generated package.json structure.
 */
export interface GeneratedPackageJson {
  name: string;
  version: string;
  private: boolean;
  type: 'module';
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines: {
    node: string;
  };
}

/**
 * Normalizes a project name to lowercase-kebab-case.
 *
 * @param name - Project name to normalize
 * @returns Normalized project name
 */
export function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a package.json object for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Package.json object
 */
export function generatePackageJsonObject(
  options?: PackageJsonOptions
): GeneratedPackageJson {
  const opts: Required<PackageJsonOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const projectName = normalizeProjectName(opts.projectName);

  // Base scripts
  const scripts: Record<string, string> = {
    test: 'playwright test',
    'test:headed': 'playwright test --headed',
    'test:debug': 'playwright test --debug',
    'test:ui': 'playwright test --ui',
    report: 'playwright show-report',
    codegen: 'playwright codegen',
    ...opts.additionalScripts,
  };

  // Add target-specific test scripts (can be added later by config)
  // scripts['test:user-portal'] = 'playwright test --grep @user-portal';

  // Dependencies
  const dependencies: Record<string, string> = {
    // For vendored installation, use local path
    '@artk/core': opts.vendored
      ? 'file:./vendor/artk-core'
      : opts.artkCoreVersion,
    ...opts.additionalDependencies,
  };

  // Dev dependencies
  const devDependencies: Record<string, string> = {
    '@playwright/test': opts.playwrightVersion,
    ...opts.additionalDevDependencies,
  };

  // Add TypeScript if requested
  if (opts.includeTypeScript) {
    devDependencies['typescript'] = opts.typescriptVersion;
    devDependencies['@types/node'] = '^20.10.0';

    // Add typecheck script
    scripts['typecheck'] = 'tsc --noEmit';
  }

  return {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    description: opts.description,
    scripts,
    dependencies,
    devDependencies,
    engines: {
      node: '>=18.0.0',
    },
  };
}

/**
 * Generates a package.json string for ARTK E2E installation.
 *
 * @param options - Generation options
 * @returns Formatted package.json string
 */
export function generatePackageJson(options?: PackageJsonOptions): string {
  const packageJson = generatePackageJsonObject(options);
  return JSON.stringify(packageJson, null, 2) + '\n';
}

/**
 * Validates a project name.
 *
 * @param name - Project name to validate
 * @returns Validation result with normalized name
 */
export function validateProjectName(name: string): {
  valid: boolean;
  normalized: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const normalized = normalizeProjectName(name);

  // Check if normalization changed the name
  if (normalized !== name.toLowerCase()) {
    warnings.push(
      `Project name normalized from "${name}" to "${normalized}"`
    );
  }

  // Check for empty name
  if (normalized.length === 0) {
    return {
      valid: false,
      normalized: 'artk-e2e-tests',
      warnings: ['Project name is empty, using default: artk-e2e-tests'],
    };
  }

  // Check for npm naming issues
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    warnings.push('Project name should not start or end with hyphens');
  }

  if (normalized.length > 214) {
    return {
      valid: false,
      normalized: normalized.substring(0, 214),
      warnings: ['Project name too long (max 214 characters), truncated'],
    };
  }

  return {
    valid: true,
    normalized,
    warnings,
  };
}

/**
 * Default versions for ARTK E2E dependencies.
 */
export const DEPENDENCY_VERSIONS = {
  playwright: '^1.57.0',
  typescript: '^5.3.3',
  artkCore: '1.0.0',
  node: '>=18.0.0',
} as const;
