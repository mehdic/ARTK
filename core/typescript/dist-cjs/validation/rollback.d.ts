/**
 * Rollback Transaction Logic
 * T060: Implement rollback transaction logic (FR-033)
 *
 * Provides write-to-temp-then-rename pattern and rollback functionality
 * for atomic file generation with automatic cleanup on validation failure.
 *
 * @module @artk/core/validation/rollback
 */
import type { GenerationTransaction, RollbackResult } from '../types/validation-result.js';
/**
 * Start a new generation transaction
 *
 * @returns A new transaction object for tracking generated files
 *
 * @example
 * ```typescript
 * const tx = startTransaction();
 * trackGeneratedFile(tx, '/path/to/new/file.ts');
 * // ... generate files ...
 * if (validationFailed) {
 *   rollbackTransaction(tx);
 * } else {
 *   commitTransaction(tx);
 * }
 * ```
 */
export declare function startTransaction(): GenerationTransaction;
/**
 * Track a newly generated file
 *
 * Call this for each file created during generation.
 * On rollback, these files will be deleted.
 *
 * @param tx - The current transaction
 * @param filePath - Absolute path to the generated file
 */
export declare function trackGeneratedFile(tx: GenerationTransaction, filePath: string): void;
/**
 * Track an existing file before modification
 *
 * Call this before modifying an existing file.
 * Creates a backup that will be restored on rollback.
 *
 * @param tx - The current transaction
 * @param filePath - Absolute path to the existing file
 * @returns Path to the backup file, or null if file doesn't exist
 */
export declare function trackOriginalFile(tx: GenerationTransaction, filePath: string): string | null;
/**
 * Commit the transaction
 *
 * Call this when validation passes. Cleans up backup files
 * and clears the transaction state.
 *
 * @param tx - The transaction to commit
 */
export declare function commitTransaction(tx: GenerationTransaction): void;
/**
 * Rollback the transaction
 *
 * Call this when validation fails. Removes generated files
 * and restores original files from backups.
 *
 * @param tx - The transaction to rollback
 * @returns Result object with lists of removed, restored, and failed files
 *
 * @example
 * ```typescript
 * const result = rollbackTransaction(tx);
 * if (result.success) {
 *   console.log('Rollback complete');
 *   console.log('Removed:', result.removedFiles);
 *   console.log('Restored:', result.restoredFiles);
 * } else {
 *   console.error('Some files could not be rolled back:', result.failedFiles);
 * }
 * ```
 */
export declare function rollbackTransaction(tx: GenerationTransaction): RollbackResult;
/**
 * Generate a rollback confirmation message
 *
 * @param result - The rollback result
 * @returns Human-readable message describing the rollback
 */
export declare function generateRollbackMessage(result: RollbackResult): string;
export type { GenerationTransaction, RollbackResult };
//# sourceMappingURL=rollback.d.ts.map