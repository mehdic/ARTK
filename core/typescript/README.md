# ARTK Core v1 - TypeScript Implementation

**Version**: 1.0.0
**Release Date**: 2025-12-29

## Overview

ARTK Core v1 is a vendorable Playwright infrastructure library that provides config-driven test setup, OIDC authentication with storage state management, pre-built fixtures, accessibility-first locators, common assertions, test data management, and journey-aware reporting.

## Architecture

This library is organized into 8 core modules:

- **config/** - Config System (YAML loading, validation, environment variable resolution)
- **auth/** - Auth System (OIDC providers, storage state management, MFA support)
- **fixtures/** - Test Fixtures (authenticatedPage, apiContext, testData, runId)
- **locators/** - Locator Utilities (accessibility-first element location strategies)
- **assertions/** - Assertion Helpers (toast, table, form, loading state assertions)
- **data/** - Data Harness (namespacing, cleanup, test isolation)
- **reporters/** - Reporters (journey mapping, PII masking, ARTK-specific formats)
- **harness/** - Playwright Harness (config factory, project setup)

## Requirements

- **Node.js**: 18.0.0 or higher
- **Playwright**: 1.40.0 or higher
- **TypeScript**: 5.3 or higher

## Dependencies

### Core Dependencies
- `@playwright/test` - Playwright testing framework
- `zod` - Schema validation
- `yaml` - YAML config parsing
- `otplib` - TOTP generation for MFA

### Dev Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Unit testing framework
- `tsup` - Build tool
- `eslint` - Code linting
- `prettier` - Code formatting

## Development

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:unit
```

### Build

```bash
# Build the library for distribution
npm run build
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck
```

## Project Structure

```
core/typescript/
├── config/              # Config System module
├── harness/             # Playwright Harness module
├── auth/                # Auth System module
├── fixtures/            # Fixtures module
├── locators/            # Locators module
├── assertions/          # Assertions module
├── data/                # Data Harness module
├── reporters/           # Reporters module
├── types/               # Shared types
├── errors/              # Error classes
├── utils/               # Utilities
├── index.ts             # Main entry point
├── version.json         # Version tracking
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vitest.config.ts     # Vitest config
├── tsup.config.ts       # tsup build config
├── .eslintrc.js         # ESLint config
└── .prettierrc          # Prettier config
```

## Usage

This library is designed to be vendored (copied) into target Playwright projects rather than installed via npm. This approach provides:

- Full control over the code
- Offline operation capability
- Easy customization for project-specific needs
- No dependency on npm registry availability

### Import Examples

```typescript
// Import from main entry
import { loadConfig, createPlaywrightConfig } from '@artk/core';

// Import from specific modules
import { loadConfig } from '@artk/core/config';
import { test, expect } from '@artk/core/fixtures';
import { byRole, byLabel } from '@artk/core/locators';
import { expectToast } from '@artk/core/assertions';
```

## License

MIT

## Documentation

For complete documentation, see:
- `/specs/001-artk-core-v1/spec.md` - Feature specification
- `/specs/001-artk-core-v1/plan.md` - Implementation plan
- `/specs/001-artk-core-v1/tasks.md` - Task breakdown
