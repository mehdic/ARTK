"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTKConfigError = void 0;
/**
 * Configuration validation error
 *
 * Thrown when configuration validation fails, providing detailed information
 * about the invalid field and suggested fixes.
 *
 * @example
 * ```typescript
 * throw new ARTKConfigError(
 *   'Invalid auth provider',
 *   'auth.provider',
 *   'Did you mean: oidc, form, token, custom?'
 * );
 * ```
 */
class ARTKConfigError extends Error {
    /**
     * JSON path to the invalid field (e.g., 'auth.oidc.idpType')
     */
    field;
    /**
     * Optional suggestion for fixing the error
     */
    suggestion;
    constructor(message, field, suggestion) {
        super(message);
        this.name = 'ARTKConfigError';
        this.field = field;
        this.suggestion = suggestion;
        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ARTKConfigError);
        }
    }
    /**
     * Format error as a human-readable string with field path and suggestion
     */
    toString() {
        let result = `${this.name}: ${this.message} (field: ${this.field})`;
        if (this.suggestion) {
            result += `\n  Suggestion: ${this.suggestion}`;
        }
        return result;
    }
}
exports.ARTKConfigError = ARTKConfigError;
//# sourceMappingURL=config-error.js.map