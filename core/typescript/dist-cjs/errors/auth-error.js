"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTKAuthError = void 0;
/**
 * Authentication failure error
 *
 * Thrown when authentication fails, providing detailed information about
 * the failure phase, role, IdP response, and remediation steps.
 *
 * @example
 * ```typescript
 * throw new ARTKAuthError(
 *   'Failed to authenticate user',
 *   'admin',
 *   'credentials',
 *   'Invalid username or password',
 *   'Verify ADMIN_USERNAME and ADMIN_PASSWORD environment variables are set correctly'
 * );
 * ```
 */
class ARTKAuthError extends Error {
    /**
     * Role that failed to authenticate
     */
    role;
    /**
     * Phase where authentication failed
     */
    phase;
    /**
     * Optional IdP response or error message
     */
    idpResponse;
    /**
     * Optional remediation steps to fix the error
     */
    remediation;
    constructor(message, role, phase, idpResponse, remediation) {
        super(message);
        this.name = 'ARTKAuthError';
        this.role = role;
        this.phase = phase;
        this.idpResponse = idpResponse;
        this.remediation = remediation;
        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ARTKAuthError);
        }
    }
    /**
     * Format error as a human-readable string with context
     */
    toString() {
        let result = `${this.name}: ${this.message}\n`;
        result += `  Role: ${this.role}\n`;
        result += `  Phase: ${this.phase}`;
        if (this.idpResponse) {
            result += `\n  IdP Response: ${this.idpResponse}`;
        }
        if (this.remediation) {
            result += `\n  Remediation: ${this.remediation}`;
        }
        return result;
    }
}
exports.ARTKAuthError = ARTKAuthError;
//# sourceMappingURL=auth-error.js.map