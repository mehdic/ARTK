"use strict";
/**
 * Rollback Transaction Logic
 * T060: Implement rollback transaction logic (FR-033)
 *
 * Provides write-to-temp-then-rename pattern and rollback functionality
 * for atomic file generation with automatic cleanup on validation failure.
 *
 * @module @artk/core/validation/rollback
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTransaction = startTransaction;
exports.trackGeneratedFile = trackGeneratedFile;
exports.trackOriginalFile = trackOriginalFile;
exports.commitTransaction = commitTransaction;
exports.rollbackTransaction = rollbackTransaction;
exports.generateRollbackMessage = generateRollbackMessage;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Create a backup directory for this transaction
 */
function createBackupDir() {
    const tempDir = os.tmpdir();
    const backupDir = path.join(tempDir, '.artk-backup-' + Date.now());
    fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
}
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
function startTransaction() {
    return {
        generatedFiles: [],
        originalFiles: new Map(),
        startTime: Date.now(),
    };
}
/**
 * Track a newly generated file
 *
 * Call this for each file created during generation.
 * On rollback, these files will be deleted.
 *
 * @param tx - The current transaction
 * @param filePath - Absolute path to the generated file
 */
function trackGeneratedFile(tx, filePath) {
    // Avoid duplicates
    if (!tx.generatedFiles.includes(filePath)) {
        tx.generatedFiles.push(filePath);
    }
}
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
function trackOriginalFile(tx, filePath) {
    // Don't track the same file twice
    if (tx.originalFiles.has(filePath)) {
        return tx.originalFiles.get(filePath) || null;
    }
    // Only backup if file exists
    if (!fs.existsSync(filePath)) {
        return null;
    }
    // Create backup
    const backupDir = createBackupDir();
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName + '.' + Date.now() + '.bak');
    try {
        fs.copyFileSync(filePath, backupPath);
        tx.originalFiles.set(filePath, backupPath);
        return backupPath;
    }
    catch (error) {
        // If backup fails, don't track it
        console.warn(`Failed to backup ${filePath}: ${error}`);
        return null;
    }
}
/**
 * Commit the transaction
 *
 * Call this when validation passes. Cleans up backup files
 * and clears the transaction state.
 *
 * @param tx - The transaction to commit
 */
function commitTransaction(tx) {
    // Clean up backup files
    for (const [, backupPath] of tx.originalFiles) {
        try {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            // Try to remove backup directory if empty
            const backupDir = path.dirname(backupPath);
            if (fs.existsSync(backupDir)) {
                const files = fs.readdirSync(backupDir);
                if (files.length === 0) {
                    fs.rmdirSync(backupDir);
                }
            }
        }
        catch {
            // Ignore cleanup errors
        }
    }
    // Clear transaction state
    tx.generatedFiles.length = 0;
    tx.originalFiles.clear();
}
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
function rollbackTransaction(tx) {
    const result = {
        success: true,
        removedFiles: [],
        restoredFiles: [],
        failedFiles: [],
    };
    // Remove generated files
    for (const filePath of tx.generatedFiles) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                result.removedFiles.push(filePath);
            }
        }
        catch (error) {
            result.success = false;
            result.failedFiles.push({
                file: filePath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // Restore original files from backups
    for (const [originalPath, backupPath] of tx.originalFiles) {
        try {
            if (fs.existsSync(backupPath)) {
                // Ensure directory exists
                const dir = path.dirname(originalPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Restore the backup
                fs.copyFileSync(backupPath, originalPath);
                result.restoredFiles.push(originalPath);
                // Clean up backup
                fs.unlinkSync(backupPath);
                // Try to remove backup directory if empty
                const backupDir = path.dirname(backupPath);
                if (fs.existsSync(backupDir)) {
                    const files = fs.readdirSync(backupDir);
                    if (files.length === 0) {
                        fs.rmdirSync(backupDir);
                    }
                }
            }
        }
        catch (error) {
            result.success = false;
            result.failedFiles.push({
                file: originalPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // Clear transaction state
    tx.generatedFiles.length = 0;
    tx.originalFiles.clear();
    return result;
}
/**
 * Generate a rollback confirmation message
 *
 * @param result - The rollback result
 * @returns Human-readable message describing the rollback
 */
function generateRollbackMessage(result) {
    const lines = [];
    if (result.success) {
        lines.push('Rollback completed successfully.');
    }
    else {
        lines.push('Rollback completed with some failures.');
    }
    if (result.removedFiles.length > 0) {
        lines.push(`\nRemoved ${result.removedFiles.length} generated file(s):`);
        for (const file of result.removedFiles) {
            lines.push(`  - ${file}`);
        }
    }
    if (result.restoredFiles.length > 0) {
        lines.push(`\nRestored ${result.restoredFiles.length} original file(s):`);
        for (const file of result.restoredFiles) {
            lines.push(`  - ${file}`);
        }
    }
    if (result.failedFiles.length > 0) {
        lines.push(`\nFailed to rollback ${result.failedFiles.length} file(s):`);
        for (const { file, error } of result.failedFiles) {
            lines.push(`  - ${file}: ${error}`);
        }
        lines.push('\nManual cleanup may be required for the above files.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=rollback.js.map