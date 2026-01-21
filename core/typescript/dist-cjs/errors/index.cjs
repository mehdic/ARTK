'use strict';

// errors/config-error.ts
var ARTKConfigError = class _ARTKConfigError extends Error {
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
    this.name = "ARTKConfigError";
    this.field = field;
    this.suggestion = suggestion;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ARTKConfigError);
    }
  }
  /**
   * Format error as a human-readable string with field path and suggestion
   */
  toString() {
    let result = `${this.name}: ${this.message} (field: ${this.field})`;
    if (this.suggestion) {
      result += `
  Suggestion: ${this.suggestion}`;
    }
    return result;
  }
};

// errors/auth-error.ts
var ARTKAuthError = class _ARTKAuthError extends Error {
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
    this.name = "ARTKAuthError";
    this.role = role;
    this.phase = phase;
    this.idpResponse = idpResponse;
    this.remediation = remediation;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ARTKAuthError);
    }
  }
  /**
   * Format error as a human-readable string with context
   */
  toString() {
    let result = `${this.name}: ${this.message}
`;
    result += `  Role: ${this.role}
`;
    result += `  Phase: ${this.phase}`;
    if (this.idpResponse) {
      result += `
  IdP Response: ${this.idpResponse}`;
    }
    if (this.remediation) {
      result += `
  Remediation: ${this.remediation}`;
    }
    return result;
  }
};

// errors/storage-state-error.ts
var ARTKStorageStateError = class _ARTKStorageStateError extends Error {
  /**
   * Role associated with the storage state
   */
  role;
  /**
   * Path to the storage state file
   */
  path;
  /**
   * Cause of the storage state error
   */
  cause;
  constructor(message, role, path, cause) {
    super(message);
    this.name = "ARTKStorageStateError";
    this.role = role;
    this.path = path;
    this.cause = cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ARTKStorageStateError);
    }
  }
  /**
   * Format error as a human-readable string with context
   */
  toString() {
    return `${this.name}: ${this.message}
  Role: ${this.role}
  Path: ${this.path}
  Cause: ${this.cause}`;
  }
};

exports.ARTKAuthError = ARTKAuthError;
exports.ARTKConfigError = ARTKConfigError;
exports.ARTKStorageStateError = ARTKStorageStateError;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map