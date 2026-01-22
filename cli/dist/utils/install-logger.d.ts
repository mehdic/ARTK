/**
 * ARTK Install Logger
 *
 * Append-only log utility for tracking installation operations.
 * Logs are stored in .artk/install.log
 */
import type { InstallLogEntry, OperationType } from './variant-types.js';
/**
 * Install logger class for managing installation logs.
 */
export declare class InstallLogger {
    private logPath;
    private artkDir;
    constructor(targetPath: string);
    /**
     * Ensure the .artk directory exists.
     */
    private ensureDirectory;
    /**
     * Check if log rotation is needed.
     */
    private shouldRotate;
    /**
     * Rotate the log file if needed.
     */
    private rotateIfNeeded;
    /**
     * Write a log entry.
     */
    private write;
    /**
     * Create a new log entry.
     */
    private createEntry;
    /**
     * Log an INFO message.
     */
    info(operation: OperationType, message: string, details?: Record<string, unknown>): void;
    /**
     * Log a WARN message.
     */
    warn(operation: OperationType, message: string, details?: Record<string, unknown>): void;
    /**
     * Log an ERROR message.
     */
    error(operation: OperationType, message: string, details?: Record<string, unknown>): void;
    /**
     * Log the start of an installation.
     */
    logInstallStart(variant: string, nodeVersion: number): void;
    /**
     * Log installation completion.
     */
    logInstallComplete(variant: string): void;
    /**
     * Log installation failure.
     */
    logInstallFailed(error: string, variant?: string): void;
    /**
     * Log detection results.
     */
    logDetection(nodeVersion: number, moduleSystem: string, selectedVariant: string): void;
    /**
     * Log rollback start.
     */
    logRollbackStart(reason: string): void;
    /**
     * Log rollback completion.
     */
    logRollbackComplete(): void;
    /**
     * Log upgrade start.
     */
    logUpgradeStart(fromVariant: string, toVariant: string): void;
    /**
     * Log upgrade completion.
     */
    logUpgradeComplete(toVariant: string): void;
    /**
     * Read recent log entries.
     */
    readRecent(count?: number): InstallLogEntry[];
    /**
     * Get path to the log file.
     */
    getLogPath(): string;
    /**
     * Check if log file exists.
     */
    exists(): boolean;
}
/**
 * Create an install logger for the given target path.
 */
export declare function createInstallLogger(targetPath: string): InstallLogger;
//# sourceMappingURL=install-logger.d.ts.map