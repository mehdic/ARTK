/**
 * Data Harness Module
 *
 * Provides test data isolation, namespacing, cleanup, and builder utilities.
 *
 * Features:
 * - Unique run ID generation for test isolation (FR-025)
 * - Namespacing utilities for parallel test execution (FR-026)
 * - Cleanup manager with priority ordering (FR-027, FR-028)
 * - Abstract DataBuilder base class
 * - Data API client for HTTP operations
 * - Factory utilities for test data creation
 *
 * @module data
 */

// Types
export type {
  CleanupEntry,
  CleanupOptions,
  CleanupContext,
  NamespaceConfig,
  DataApiOptions,
  DataFactory,
  SequencedFactory,
} from './types.js';

// Namespace utilities
export {
  generateRunId,
  namespace,
  parseNamespace,
  isNamespaced,
} from './namespace.js';

// Cleanup management
export { CleanupManager } from './cleanup.js';

// Data builders
export { DataBuilder } from './builders.js';

// API client
export { DataApiClient } from './api-client.js';

// Factory utilities
export {
  createFactory,
  createSequencedFactory,
  createCustomFactory,
} from './factories.js';
