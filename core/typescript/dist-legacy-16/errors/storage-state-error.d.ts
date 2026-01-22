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
export declare class ARTKStorageStateError extends Error {
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
//# sourceMappingURL=storage-state-error.d.ts.map