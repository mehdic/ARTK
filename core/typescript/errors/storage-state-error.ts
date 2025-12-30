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
export class ARTKStorageStateError extends Error {
  /**
   * Role associated with the storage state
   */
  public readonly role: string;

  /**
   * Path to the storage state file
   */
  public readonly path: string;

  /**
   * Cause of the storage state error
   */
  public readonly cause: 'missing' | 'expired' | 'corrupted' | 'invalid';

  constructor(
    message: string,
    role: string,
    path: string,
    cause: 'missing' | 'expired' | 'corrupted' | 'invalid'
  ) {
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
  public override toString(): string {
    return `${this.name}: ${this.message}\n  Role: ${this.role}\n  Path: ${this.path}\n  Cause: ${this.cause}`;
  }
}
