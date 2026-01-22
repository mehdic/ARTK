/**
 * ARTK Install Logger
 *
 * Append-only log utility for tracking installation operations.
 * Logs are stored in .artk/install.log
 */
import * as fs from 'fs';
import * as path from 'path';
/**
 * Maximum log file size before rotation (10MB).
 */
const MAX_LOG_SIZE = 10 * 1024 * 1024;
/**
 * Install logger class for managing installation logs.
 */
export class InstallLogger {
    logPath;
    artkDir;
    constructor(targetPath) {
        this.artkDir = path.join(targetPath, '.artk');
        this.logPath = path.join(this.artkDir, 'install.log');
    }
    /**
     * Ensure the .artk directory exists.
     */
    ensureDirectory() {
        if (!fs.existsSync(this.artkDir)) {
            fs.mkdirSync(this.artkDir, { recursive: true });
        }
    }
    /**
     * Check if log rotation is needed.
     */
    shouldRotate() {
        if (!fs.existsSync(this.logPath)) {
            return false;
        }
        const stats = fs.statSync(this.logPath);
        return stats.size >= MAX_LOG_SIZE;
    }
    /**
     * Rotate the log file if needed.
     */
    rotateIfNeeded() {
        if (!this.shouldRotate()) {
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = path.join(this.artkDir, `install.${timestamp}.log`);
        fs.renameSync(this.logPath, rotatedPath);
    }
    /**
     * Write a log entry.
     */
    write(entry) {
        this.ensureDirectory();
        this.rotateIfNeeded();
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logPath, line, 'utf-8');
    }
    /**
     * Create a new log entry.
     */
    createEntry(level, operation, message, details) {
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
    info(operation, message, details) {
        this.write(this.createEntry('INFO', operation, message, details));
    }
    /**
     * Log a WARN message.
     */
    warn(operation, message, details) {
        this.write(this.createEntry('WARN', operation, message, details));
    }
    /**
     * Log an ERROR message.
     */
    error(operation, message, details) {
        this.write(this.createEntry('ERROR', operation, message, details));
    }
    /**
     * Log the start of an installation.
     */
    logInstallStart(variant, nodeVersion) {
        this.info('install', 'Starting ARTK installation', {
            variant,
            nodeVersion,
            nodeVersionFull: process.version,
        });
    }
    /**
     * Log installation completion.
     */
    logInstallComplete(variant) {
        this.info('install', 'ARTK installation completed successfully', {
            variant,
        });
    }
    /**
     * Log installation failure.
     */
    logInstallFailed(error, variant) {
        this.error('install', 'ARTK installation failed', {
            error,
            variant,
        });
    }
    /**
     * Log detection results.
     */
    logDetection(nodeVersion, moduleSystem, selectedVariant) {
        this.info('detect', 'Environment detected', {
            nodeVersion,
            moduleSystem,
            selectedVariant,
        });
    }
    /**
     * Log rollback start.
     */
    logRollbackStart(reason) {
        this.warn('rollback', 'Starting rollback', { reason });
    }
    /**
     * Log rollback completion.
     */
    logRollbackComplete() {
        this.info('rollback', 'Rollback completed');
    }
    /**
     * Log upgrade start.
     */
    logUpgradeStart(fromVariant, toVariant) {
        this.info('upgrade', 'Starting variant upgrade', {
            fromVariant,
            toVariant,
        });
    }
    /**
     * Log upgrade completion.
     */
    logUpgradeComplete(toVariant) {
        this.info('upgrade', 'Variant upgrade completed', {
            variant: toVariant,
        });
    }
    /**
     * Read recent log entries.
     */
    readRecent(count = 50) {
        if (!fs.existsSync(this.logPath)) {
            return [];
        }
        const content = fs.readFileSync(this.logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const recentLines = lines.slice(-count);
        return recentLines
            .map((line) => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter((entry) => entry !== null);
    }
    /**
     * Get path to the log file.
     */
    getLogPath() {
        return this.logPath;
    }
    /**
     * Check if log file exists.
     */
    exists() {
        return fs.existsSync(this.logPath);
    }
}
/**
 * Create an install logger for the given target path.
 */
export function createInstallLogger(targetPath) {
    return new InstallLogger(targetPath);
}
//# sourceMappingURL=install-logger.js.map