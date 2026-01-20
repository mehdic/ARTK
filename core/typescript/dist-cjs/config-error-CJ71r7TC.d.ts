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
declare class ARTKConfigError extends Error {
    /**
     * JSON path to the invalid field (e.g., 'auth.oidc.idpType')
     */
    readonly field: string;
    /**
     * Optional suggestion for fixing the error
     */
    readonly suggestion?: string;
    constructor(message: string, field: string, suggestion?: string);
    /**
     * Format error as a human-readable string with field path and suggestion
     */
    toString(): string;
}

export { ARTKConfigError as A };
