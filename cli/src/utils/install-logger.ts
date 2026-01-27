/**
 * ARTK Install Logger
 *
 * Append-only log utility for tracking installation operations.
 * Logs are stored in .artk/install.log
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  InstallLogEntry,
  LogLevel,
  OperationType,
} from './variant-types.js';

/**
 * Maximum log file size before rotation (10MB).
 */
const MAX_LOG_SIZE = 10 * 1024 * 1024;

/**
 * Install logger class for managing installation logs.
 */
export class InstallLogger {
  private logPath: string;
  private artkDir: string;

  constructor(targetPath: string) {
    this.artkDir = path.join(targetPath, 'artk-e2e', '.artk');
    this.logPath = path.join(this.artkDir, 'install.log');
  }

  /**
   * Ensure the .artk directory exists.
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.artkDir)) {
      fs.mkdirSync(this.artkDir, { recursive: true });
    }
  }

  /**
   * Check if log rotation is needed.
   */
  private shouldRotate(): boolean {
    if (!fs.existsSync(this.logPath)) {
      return false;
    }

    const stats = fs.statSync(this.logPath);
    return stats.size >= MAX_LOG_SIZE;
  }

  /**
   * Rotate the log file if needed.
   */
  private rotateIfNeeded(): void {
    if (!this.shouldRotate()) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = path.join(
      this.artkDir,
      `install.${timestamp}.log`
    );

    fs.renameSync(this.logPath, rotatedPath);
  }

  /**
   * Write a log entry.
   */
  private write(entry: InstallLogEntry): void {
    this.ensureDirectory();
    this.rotateIfNeeded();

    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logPath, line, 'utf-8');
  }

  /**
   * Create a new log entry.
   */
  private createEntry(
    level: LogLevel,
    operation: OperationType,
    message: string,
    details?: Record<string, unknown>
  ): InstallLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      ...(details && { details }),
    };
  }

  /**
   * Log an INFO message.
   */
  info(
    operation: OperationType,
    message: string,
    details?: Record<string, unknown>
  ): void {
    this.write(this.createEntry('INFO', operation, message, details));
  }

  /**
   * Log a WARN message.
   */
  warn(
    operation: OperationType,
    message: string,
    details?: Record<string, unknown>
  ): void {
    this.write(this.createEntry('WARN', operation, message, details));
  }

  /**
   * Log an ERROR message.
   */
  error(
    operation: OperationType,
    message: string,
    details?: Record<string, unknown>
  ): void {
    this.write(this.createEntry('ERROR', operation, message, details));
  }

  /**
   * Log the start of an installation.
   */
  logInstallStart(variant: string, nodeVersion: number): void {
    this.info('install', 'Starting ARTK installation', {
      variant,
      nodeVersion,
      nodeVersionFull: process.version,
    });
  }

  /**
   * Log installation completion.
   */
  logInstallComplete(variant: string): void {
    this.info('install', 'ARTK installation completed successfully', {
      variant,
    });
  }

  /**
   * Log installation failure.
   */
  logInstallFailed(error: string, variant?: string): void {
    this.error('install', 'ARTK installation failed', {
      error,
      variant,
    });
  }

  /**
   * Log detection results.
   */
  logDetection(
    nodeVersion: number,
    moduleSystem: string,
    selectedVariant: string
  ): void {
    this.info('detect', 'Environment detected', {
      nodeVersion,
      moduleSystem,
      selectedVariant,
    });
  }

  /**
   * Log rollback start.
   */
  logRollbackStart(reason: string): void {
    this.warn('rollback', 'Starting rollback', { reason });
  }

  /**
   * Log rollback completion.
   */
  logRollbackComplete(): void {
    this.info('rollback', 'Rollback completed');
  }

  /**
   * Log upgrade start.
   */
  logUpgradeStart(fromVariant: string, toVariant: string): void {
    this.info('upgrade', 'Starting variant upgrade', {
      fromVariant,
      toVariant,
    });
  }

  /**
   * Log upgrade completion.
   */
  logUpgradeComplete(toVariant: string): void {
    this.info('upgrade', 'Variant upgrade completed', {
      variant: toVariant,
    });
  }

  /**
   * Read recent log entries.
   */
  readRecent(count: number = 50): InstallLogEntry[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const recentLines = lines.slice(-count);

    return recentLines
      .map((line) => {
        try {
          return JSON.parse(line) as InstallLogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is InstallLogEntry => entry !== null);
  }

  /**
   * Get path to the log file.
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Check if log file exists.
   */
  exists(): boolean {
    return fs.existsSync(this.logPath);
  }
}

/**
 * Create an install logger for the given target path.
 */
export function createInstallLogger(targetPath: string): InstallLogger {
  return new InstallLogger(targetPath);
}
