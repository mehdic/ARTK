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
declare class ARTKAuthError extends Error {
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
declare class ARTKStorageStateError extends Error {
    /**
     * Role associated with the storage state
     */
    readonly role: string;
    /**
     * Path to the storage state file
     */
    readonly path: string;
    /**
     * Cause of the storage state error
     */
    readonly cause: 'missing' | 'expired' | 'corrupted' | 'invalid';
    constructor(message: string, role: string, path: string, cause: 'missing' | 'expired' | 'corrupted' | 'invalid');
    /**
     * Format error as a human-readable string with context
     */
    toString(): string;
}

export { ARTKAuthError as A, ARTKStorageStateError as a };
