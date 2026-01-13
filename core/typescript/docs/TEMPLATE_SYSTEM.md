# ARTK Template System

## Overview

The ARTK Template System automatically generates foundation modules (auth, config, navigation) that are fully compatible with your project's module system (CommonJS or ESM). This eliminates the need for manual post-generation fixes.

## Features

- **Automatic Module Detection**: Detects CommonJS vs ESM from package.json and tsconfig.json
- **Template Variable Substitution**: Dynamic code generation with `{{VARIABLE}}` syntax
- **Conditional Blocks**: `{{#if VAR}}...{{/if}}` for variant-specific code
- **Built-in Validation**: Automatic validation with rollback on failure
- **Transactional Generation**: Atomic operations with automatic cleanup
- **Comprehensive Testing**: 265+ tests ensuring reliability

## How It Works

### 1. Environment Detection

The system detects your project's module system by examining:
- `package.json` → `"type": "module"` (ESM) or absence/commonjs (CommonJS)
- `tsconfig.json` → `compilerOptions.module` value
- Runtime checks for `import.meta` support

```bash
# Automatic detection during bootstrap
./scripts/bootstrap.sh /path/to/your-project

# Or manual variant specification
./scripts/bootstrap.sh /path/to/your-project --template-variant=esm
```

### 2. Template Selection

Based on detection, the system selects the appropriate template variant:

```
core/typescript/templates/
├── commonjs/
│   ├── auth/login.ts       # CommonJS-optimized
│   ├── config/env.ts
│   └── navigation/nav.ts
└── esm/
    ├── auth/login.ts       # ESM-optimized
    ├── config/env.ts
    └── navigation/nav.ts
```

### 3. Template Processing

Templates contain variables that get replaced during generation:

**Template (before):**
```typescript
/**
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 */
import type { AuthConfig } from '{{artkCorePath}}/types/auth';

export function loadAuthConfig(): AuthConfig {
  const projectRoot = '{{projectRoot}}';
  const configFile = path.join(projectRoot, '{{configPath}}/auth.yml');
  // ...
}
```

**Generated (after):**
```typescript
/**
 * Generated for: my-project
 * Generated at: 2026-01-13T15:00:00.000Z
 */
import type { AuthConfig } from '../../vendor/artk-core/types/auth';

export function loadAuthConfig(): AuthConfig {
  const projectRoot = '/Users/me/projects/my-project';
  const configFile = path.join(projectRoot, 'artk-e2e/config/auth.yml');
  // ...
}
```

### 4. Validation & Rollback

After generation, the system validates all files:

```typescript
// Validation rules check:
✓ import.meta usage (ESM only)
✓ __dirname usage (CommonJS only)
✓ Import path compatibility
✓ Dependency compatibility
```

If validation fails, the system automatically:
1. Deletes all generated files
2. Restores backups (if overwriting existing files)
3. Logs detailed error messages

## Template Variables

Available in all templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `projectName` | Project directory name | `my-project` |
| `projectRoot` | Absolute path to project | `/Users/me/projects/my-project` |
| `artkRoot` | Absolute path to ARTK repo | `/Users/me/ARTK` |
| `moduleSystem` | Detected module system | `esm` or `commonjs` |
| `nodeVersion` | Node.js version | `18.12.1` |
| `packageType` | package.json type field | `module` or `commonjs` |
| `tsConfigModule` | TypeScript module setting | `ES2022`, `CommonJS` |
| `baseURL` | Test environment base URL | `https://app.example.com` |
| `authProvider` | Authentication type | `oidc`, `oauth`, `basic` |
| `artkCorePath` | Relative path to @artk/core | `../../vendor/artk-core` |
| `configPath` | Config directory path | `artk-e2e/config` |
| `authStatePath` | Auth storage path | `artk-e2e/.auth-states` |
| `generatedAt` | ISO timestamp | `2026-01-13T15:00:00.000Z` |
| `artkVersion` | ARTK version | `1.0.0` |
| `templateVariant` | Selected variant | `esm` or `commonjs` |

## Template Syntax

### Variable Substitution

```typescript
const projectName = '{{projectName}}';
const version = '{{artkVersion}}';
```

### Conditional Blocks

```typescript
{{#if moduleSystem}}
// This appears if moduleSystem is truthy
{{/if}}
```

### Comments

```typescript
{{! This is a template comment - removed during processing }}
const code = 'hello';
```

## Programmatic Usage

### Generate Single Module

```typescript
import { generateFromTemplate, createTemplateContext } from '@artk/core/templates';

const context = createTemplateContext({
  projectRoot: '/path/to/project',
  projectName: 'my-project',
  moduleSystem: 'esm',
  templateVariant: 'esm',
  // ... other fields
});

const result = await generateFromTemplate(
  'auth/login.ts',          // Module name
  'esm',                     // Variant
  '/path/to/output.ts',      // Target path
  context,
  {
    validateBefore: true,    // Validate template syntax
    validateAfter: true,     // Validate generated code
    createBackup: true,      // Backup existing files
    rollbackOnFailure: true, // Auto-rollback on error
    dryRun: false,          // Set true to preview
    verbose: true           // Show detailed logs
  }
);

if (result.success) {
  console.log('Generated:', result.filePath);
} else {
  console.error('Failed:', result.error);
}
```

### Generate All Foundation Modules

```typescript
import { generateFoundationModules, createTemplateContext } from '@artk/core/templates';

const context = createTemplateContext({
  projectRoot: '/path/to/project',
  // ... other fields
});

const result = await generateFoundationModules(
  '/path/to/project',
  'esm',
  context,
  { verbose: true, validateAfter: true }
);

console.log(`Generated ${result.filesGenerated.length} files`);
console.log(`Failed ${result.filesFailed.length} files`);
```

### Batch Generation with Custom List

```typescript
import { generateBatch } from '@artk/core/templates';

const templates = [
  { moduleName: 'auth/login.ts', targetPath: '/path/to/auth/login.ts' },
  { moduleName: 'config/env.ts', targetPath: '/path/to/config/env.ts' },
];

const result = await generateBatch(
  templates,
  'esm',
  '/path/to/output-dir',
  context,
  {
    validateAfter: true,
    rollbackOnFailure: true,
    continueOnError: false,  // Stop at first error
    verbose: true
  }
);
```

## CLI Usage

The `generate-foundation.ts` script is automatically called by bootstrap:

```bash
# Automatic during bootstrap
./scripts/bootstrap.sh /path/to/project

# Manual invocation
node core/typescript/scripts/generate-foundation.ts \
  --projectRoot=/path/to/project \
  --variant=esm \
  --verbose

# With auto-detection
node core/typescript/scripts/generate-foundation.ts \
  --projectRoot=/path/to/project \
  --verbose
```

**CLI Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--projectRoot` | Target project path | Required |
| `--variant` | Template variant (esm/commonjs) | Auto-detected |
| `--verbose` | Show detailed output | false |
| `--skipValidation` | Skip validation step | false |
| `--dryRun` | Preview without writing | false |

## Directory Structure

After generation, your project will have:

```
your-project/
├── artk-e2e/
│   ├── foundation/
│   │   ├── auth/
│   │   │   └── login.ts         # ✅ Correct module system
│   │   ├── config/
│   │   │   └── env.ts           # ✅ Correct module system
│   │   └── navigation/
│   │       └── nav.ts           # ✅ Correct module system
│   ├── vendor/
│   │   └── artk-core/           # @artk/core library
│   ├── config/
│   │   ├── auth.yml
│   │   └── environments.yml
│   └── .auth-states/
├── .artk/
│   ├── context.json             # Generation metadata
│   ├── logs/
│   │   └── template-generation.log
│   └── validation-results.json  # Validation history
└── package.json
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) if you have existing ARTK installations.

## Advanced Topics

### Creating Custom Templates

Templates must follow the structure:

```
templates/
└── {variant}/
    └── {module-name}.ts
```

Template requirements:
- Use `{{VARIABLE}}` for substitution
- Include conditional blocks for variant-specific code
- Add template header with metadata
- Follow TypeScript/ESM/CommonJS best practices

### Extending Template Context

You can add custom variables to the template context:

```typescript
const context = createTemplateContext({
  projectRoot: '/path/to/project',
  projectName: 'my-project',
  // ... standard fields
});

// Add custom variables
context.customField = 'custom-value';

// Now {{customField}} is available in templates
```

### Validation Configuration

Customize validation strictness:

```typescript
const result = await generateFoundationModules(
  projectRoot,
  variant,
  context,
  {
    validateAfter: true,
    strictness: {
      'import-meta-usage': 'error',    // Fail on errors
      'dirname-usage': 'error',        // Fail on errors
      'import-paths': 'warning',       // Continue with warnings
      'dependency-compat': 'ignore'    // Skip this rule
    }
  }
);
```

## Performance

Typical generation times:

- Single module: ~50-100ms
- All foundation modules (3 files): ~150-300ms
- Validation (3 files): ~200-500ms
- **Total end-to-end: ~400-800ms**

Validation timeout: 10 seconds (configurable)

## Related Documentation

- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Template Variable Reference](./TEMPLATE_VARIABLES.md)

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [CLAUDE.md](/CLAUDE.md) in repo root
3. Check test files in `tests/templates/` for examples
4. Create an issue in the ARTK repository
