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
export class ARTKAuthError extends Error {
  /**
   * Role that failed to authenticate
   */
  public readonly role: string;

  /**
   * Phase where authentication failed
   */
  public readonly phase: 'navigation' | 'credentials' | 'mfa' | 'callback';

  /**
   * Optional IdP response or error message
   */
  public readonly idpResponse?: string;

  /**
   * Optional remediation steps to fix the error
   */
  public readonly remediation?: string;

  constructor(
    message: string,
    role: string,
    phase: 'navigation' | 'credentials' | 'mfa' | 'callback',
    idpResponse?: string,
    remediation?: string
  ) {
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
  public override toString(): string {
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
