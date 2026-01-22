"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTKStorageStateError = void 0;
/**
 * Storage state error
 *
 * Thrown when storage state operations fail (loading, validation, corruption).
 *
 * @example
 * ```typescript
 * throw new ARTKStorageStateError(
 *   'Storage state file is expired',
 *   'admin',
 *   '.auth-states/admin.json',
 *   'expired'
 * );
 * ```
 */
class ARTKStorageStateError extends Error {
    constructor(message, role, path, cause) {
        super(message);
        this.name = 'ARTKStorageStateError';
        this.role = role;
        this.path = path;
        this.cause = cause;
        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ARTKStorageStateError);
        }
    }
    /**
     * Format error as a human-readable string with context
     */
    toString() {
        return `${this.name}: ${this.message}\n  Role: ${this.role}\n  Path: ${this.path}\n  Cause: ${this.cause}`;
    }
}
exports.ARTKStorageStateError = ARTKStorageStateError;
//# sourceMappingURL=storage-state-error.js.map