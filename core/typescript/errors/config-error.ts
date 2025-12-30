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
export class ARTKConfigError extends Error {
  /**
   * JSON path to the invalid field (e.g., 'auth.oidc.idpType')
   */
  public readonly field: string;

  /**
   * Optional suggestion for fixing the error
   */
  public readonly suggestion?: string;

  constructor(message: string, field: string, suggestion?: string) {
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
  public override toString(): string {
    let result = `${this.name}: ${this.message} (field: ${this.field})`;
    if (this.suggestion) {
      result += `\n  Suggestion: ${this.suggestion}`;
    }
    return result;
  }
}
