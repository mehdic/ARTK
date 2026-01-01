/**
 * @module types
 * @description Shared types index for ARTK Core v1.
 *
 * This barrel export provides common types used across multiple modules
 * for the ARTK E2E independent architecture.
 *
 * @example
 * ```typescript
 * import {
 *   ArtkTarget,
 *   ArtkContext,
 *   ArtkConfig,
 *   ArtkAuthConfig,
 *   DetectionResult,
 *   SubmoduleStatus,
 *   // Zod schemas
 *   ArtkContextSchema,
 *   ArtkConfigSchema,
 *   validateArtkContext,
 *   validateArtkConfig
 * } from '@artk/core/types';
 * ```
 */

// Target types
export * from './target.js';

// Context types (inter-prompt communication)
export * from './context.js';

// Config types (artk.config.yml)
export * from './config.js';

// Auth types
export * from './auth.js';

// Detection types (frontend detection heuristics)
export * from './detection.js';

// Submodule types (git submodule state)
export * from './submodule.js';

// Zod schemas and validation helpers
export * from './schemas.js';
