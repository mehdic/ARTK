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
export declare class ARTKAuthError extends Error {
    /**
     * Role that failed to authenticate
     */
    readonly role: string;
    /**
     * Phase where authentication failed
     */
    readonly phase: 'navigation' | 'credentials' | 'mfa' | 'callback';
    /**
     * Optional IdP response or error message
     */
    readonly idpResponse?: string;
    /**
     * Optional remediation steps to fix the error
     */
    readonly remediation?: string;
    constructor(message: string, role: string, phase: 'navigation' | 'credentials' | 'mfa' | 'callback', idpResponse?: string, remediation?: string);
    /**
     * Format error as a human-readable string with context
     */
    toString(): string;
}
//# sourceMappingURL=auth-error.d.ts.map