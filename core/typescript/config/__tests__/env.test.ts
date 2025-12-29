/**
 * Unit tests for environment variable resolution
 *
 * Tests FR-003: Resolve env vars using ${VAR_NAME} and ${VAR_NAME:-default} syntax
 */

import { describe, expect, it } from 'vitest';

import {
  createMissingEnvVarsError,
  EnvVarNotFoundError,
  type EnvVarRef,
  findEnvVarRefs,
  getMissingEnvVars,
  hasEnvVarRefs,
  parseEnvVarRef,
  resolveEnvVarRef,
  resolveEnvVars,
  resolveEnvVarsInObject,
} from '../env.js';

describe('parseEnvVarRef', () => {
  it('parses simple variable reference', () => {
    const result = parseEnvVarRef('${BASE_URL}');

    expect(result).toEqual({
      match: '${BASE_URL}',
      varName: 'BASE_URL',
      defaultValue: undefined,
      hasDefault: false,
    });
  });

  it('parses variable with default value', () => {
    const result = parseEnvVarRef('${PORT:-8080}');

    expect(result).toEqual({
      match: '${PORT:-8080}',
      varName: 'PORT',
      defaultValue: '8080',
      hasDefault: true,
    });
  });

  it('parses variable with empty default value', () => {
    const result = parseEnvVarRef('${EMPTY:-}');

    expect(result).toEqual({
      match: '${EMPTY:-}',
      varName: 'EMPTY',
      defaultValue: '',
      hasDefault: true,
    });
  });

  it('parses variable with complex default value', () => {
    const result = parseEnvVarRef('${URL:-https://example.com/api}');

    expect(result).toEqual({
      match: '${URL:-https://example.com/api}',
      varName: 'URL',
      defaultValue: 'https://example.com/api',
      hasDefault: true,
    });
  });

  it('handles underscore in variable names', () => {
    const result = parseEnvVarRef('${MY_VAR_NAME}');

    expect(result).toEqual({
      match: '${MY_VAR_NAME}',
      varName: 'MY_VAR_NAME',
      defaultValue: undefined,
      hasDefault: false,
    });
  });

  it('handles numbers in variable names (after first char)', () => {
    const result = parseEnvVarRef('${VAR_123}');

    expect(result).toEqual({
      match: '${VAR_123}',
      varName: 'VAR_123',
      defaultValue: undefined,
      hasDefault: false,
    });
  });

  it('returns undefined for non-env-var strings', () => {
    expect(parseEnvVarRef('plain text')).toBeUndefined();
    expect(parseEnvVarRef('${}')).toBeUndefined();
    expect(parseEnvVarRef('$VAR')).toBeUndefined();
    expect(parseEnvVarRef('${123}')).toBeUndefined();
    expect(parseEnvVarRef('prefix${VAR}')).toBeUndefined();
  });
});

describe('findEnvVarRefs', () => {
  it('finds single reference', () => {
    const refs = findEnvVarRefs('https://${HOST}/api');

    expect(refs).toHaveLength(1);
    expect(refs[0]).toEqual({
      match: '${HOST}',
      varName: 'HOST',
      defaultValue: undefined,
      hasDefault: false,
    });
  });

  it('finds multiple references', () => {
    const refs = findEnvVarRefs('https://${HOST}:${PORT}/api');

    expect(refs).toHaveLength(2);
    expect(refs[0]?.varName).toBe('HOST');
    expect(refs[1]?.varName).toBe('PORT');
  });

  it('finds references with defaults', () => {
    const refs = findEnvVarRefs('https://${HOST:-localhost}:${PORT:-8080}');

    expect(refs).toHaveLength(2);
    expect(refs[0]).toMatchObject({
      varName: 'HOST',
      defaultValue: 'localhost',
      hasDefault: true,
    });
    expect(refs[1]).toMatchObject({
      varName: 'PORT',
      defaultValue: '8080',
      hasDefault: true,
    });
  });

  it('returns empty array for no references', () => {
    expect(findEnvVarRefs('plain text')).toEqual([]);
    expect(findEnvVarRefs('')).toEqual([]);
  });

  it('handles mixed references with and without defaults', () => {
    const refs = findEnvVarRefs('${REQUIRED}:${OPTIONAL:-default}');

    expect(refs).toHaveLength(2);
    expect(refs[0]?.hasDefault).toBe(false);
    expect(refs[1]?.hasDefault).toBe(true);
  });
});

describe('hasEnvVarRefs', () => {
  it('returns true for strings with env var references', () => {
    expect(hasEnvVarRefs('${VAR}')).toBe(true);
    expect(hasEnvVarRefs('prefix ${VAR} suffix')).toBe(true);
    expect(hasEnvVarRefs('${VAR:-default}')).toBe(true);
  });

  it('returns false for strings without env var references', () => {
    expect(hasEnvVarRefs('plain text')).toBe(false);
    expect(hasEnvVarRefs('')).toBe(false);
    expect(hasEnvVarRefs('$VAR')).toBe(false);
    expect(hasEnvVarRefs('${}')).toBe(false);
  });
});

describe('resolveEnvVarRef', () => {
  const testEnv: Record<string, string | undefined> = {
    HOST: 'api.example.com',
    PORT: '3000',
    EMPTY: '',
  };

  it('resolves defined variable', () => {
    const ref: EnvVarRef = {
      match: '${HOST}',
      varName: 'HOST',
      hasDefault: false,
    };

    expect(resolveEnvVarRef(ref, { env: testEnv })).toBe('api.example.com');
  });

  it('uses default when variable is undefined', () => {
    const ref: EnvVarRef = {
      match: '${UNDEFINED:-fallback}',
      varName: 'UNDEFINED',
      defaultValue: 'fallback',
      hasDefault: true,
    };

    expect(resolveEnvVarRef(ref, { env: testEnv })).toBe('fallback');
  });

  it('uses default when variable is empty', () => {
    const ref: EnvVarRef = {
      match: '${EMPTY:-fallback}',
      varName: 'EMPTY',
      defaultValue: 'fallback',
      hasDefault: true,
    };

    expect(resolveEnvVarRef(ref, { env: testEnv })).toBe('fallback');
  });

  it('throws when required variable is missing', () => {
    const ref: EnvVarRef = {
      match: '${MISSING}',
      varName: 'MISSING',
      hasDefault: false,
    };

    expect(() => resolveEnvVarRef(ref, { env: testEnv })).toThrow(EnvVarNotFoundError);
  });

  it('does not throw when throwOnMissing is false', () => {
    const ref: EnvVarRef = {
      match: '${MISSING}',
      varName: 'MISSING',
      hasDefault: false,
    };

    expect(resolveEnvVarRef(ref, { env: testEnv, throwOnMissing: false })).toBe('${MISSING}');
  });

  it('includes field path in error', () => {
    const ref: EnvVarRef = {
      match: '${MISSING}',
      varName: 'MISSING',
      hasDefault: false,
    };

    try {
      resolveEnvVarRef(ref, { env: testEnv, fieldPath: 'auth.oidc.loginUrl' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvVarNotFoundError);
      expect((error as EnvVarNotFoundError).fieldPath).toBe('auth.oidc.loginUrl');
    }
  });
});

describe('resolveEnvVars', () => {
  const testEnv: Record<string, string | undefined> = {
    HOST: 'api.example.com',
    PORT: '3000',
    PATH: '/api/v1',
  };

  it('resolves single variable', () => {
    expect(resolveEnvVars('https://${HOST}', { env: testEnv })).toBe('https://api.example.com');
  });

  it('resolves multiple variables', () => {
    expect(resolveEnvVars('https://${HOST}:${PORT}${PATH}', { env: testEnv })).toBe(
      'https://api.example.com:3000/api/v1'
    );
  });

  it('applies default values', () => {
    expect(resolveEnvVars('${MISSING:-default}', { env: testEnv })).toBe('default');
  });

  it('returns unchanged string when no variables', () => {
    expect(resolveEnvVars('plain text', { env: testEnv })).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(resolveEnvVars('', { env: testEnv })).toBe('');
  });

  it('throws for missing required variable', () => {
    expect(() => resolveEnvVars('${MISSING}', { env: testEnv })).toThrow(EnvVarNotFoundError);
  });
});

describe('resolveEnvVarsInObject', () => {
  const testEnv: Record<string, string | undefined> = {
    HOST: 'api.example.com',
    PORT: '3000',
    USERNAME: 'admin',
  };

  it('resolves variables in flat object', () => {
    const obj = {
      host: '${HOST}',
      port: '${PORT:-8080}',
    };

    const result = resolveEnvVarsInObject(obj, { env: testEnv });

    expect(result).toEqual({
      host: 'api.example.com',
      port: '3000',
    });
  });

  it('resolves variables in nested object', () => {
    const obj = {
      server: {
        host: '${HOST}',
        port: '${PORT}',
      },
      auth: {
        username: '${USERNAME}',
      },
    };

    const result = resolveEnvVarsInObject(obj, { env: testEnv });

    expect(result).toEqual({
      server: {
        host: 'api.example.com',
        port: '3000',
      },
      auth: {
        username: 'admin',
      },
    });
  });

  it('resolves variables in arrays', () => {
    const obj = {
      hosts: ['${HOST}', 'localhost'],
    };

    const result = resolveEnvVarsInObject(obj, { env: testEnv });

    expect(result).toEqual({
      hosts: ['api.example.com', 'localhost'],
    });
  });

  it('preserves non-string values', () => {
    const obj = {
      port: 3000,
      enabled: true,
      timeout: null,
    };

    const result = resolveEnvVarsInObject(obj, { env: testEnv });

    expect(result).toEqual(obj);
  });

  it('handles null and undefined', () => {
    expect(resolveEnvVarsInObject(null, { env: testEnv })).toBeNull();
    expect(resolveEnvVarsInObject(undefined, { env: testEnv })).toBeUndefined();
  });

  it('includes correct field paths in errors', () => {
    const obj = {
      server: {
        host: '${MISSING}',
      },
    };

    try {
      resolveEnvVarsInObject(obj, { env: testEnv });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvVarNotFoundError);
      expect((error as EnvVarNotFoundError).fieldPath).toBe('server.host');
    }
  });

  it('includes correct field paths for array elements', () => {
    const obj = {
      hosts: ['localhost', '${MISSING}'],
    };

    try {
      resolveEnvVarsInObject(obj, { env: testEnv });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvVarNotFoundError);
      expect((error as EnvVarNotFoundError).fieldPath).toBe('hosts[1]');
    }
  });
});

describe('getMissingEnvVars', () => {
  const testEnv: Record<string, string | undefined> = {
    DEFINED: 'value',
  };

  it('returns empty array when all variables are defined', () => {
    const obj = {
      value: '${DEFINED}',
    };

    expect(getMissingEnvVars(obj, testEnv)).toEqual([]);
  });

  it('returns empty array for variables with defaults', () => {
    const obj = {
      value: '${MISSING:-default}',
    };

    expect(getMissingEnvVars(obj, testEnv)).toEqual([]);
  });

  it('returns missing variables without defaults', () => {
    const obj = {
      value: '${MISSING}',
    };

    expect(getMissingEnvVars(obj, testEnv)).toEqual([
      { varName: 'MISSING', fieldPath: 'value' },
    ]);
  });

  it('returns all missing variables with paths', () => {
    const obj = {
      server: {
        host: '${HOST}',
        port: '${PORT}',
      },
      auth: {
        token: '${TOKEN}',
      },
    };

    const missing = getMissingEnvVars(obj, testEnv);

    expect(missing).toHaveLength(3);
    expect(missing).toContainEqual({ varName: 'HOST', fieldPath: 'server.host' });
    expect(missing).toContainEqual({ varName: 'PORT', fieldPath: 'server.port' });
    expect(missing).toContainEqual({ varName: 'TOKEN', fieldPath: 'auth.token' });
  });

  it('handles arrays correctly', () => {
    const obj = {
      hosts: ['localhost', '${MISSING}'],
    };

    expect(getMissingEnvVars(obj, testEnv)).toEqual([
      { varName: 'MISSING', fieldPath: 'hosts[1]' },
    ]);
  });

  it('handles strings directly', () => {
    expect(getMissingEnvVars('${MISSING}', testEnv)).toEqual([
      { varName: 'MISSING', fieldPath: '' },
    ]);
  });

  it('treats empty string as missing', () => {
    const envWithEmpty = { ...testEnv, EMPTY: '' };
    const obj = { value: '${EMPTY}' };

    expect(getMissingEnvVars(obj, envWithEmpty)).toEqual([
      { varName: 'EMPTY', fieldPath: 'value' },
    ]);
  });
});

describe('createMissingEnvVarsError', () => {
  it('creates error for single missing variable', () => {
    const error = createMissingEnvVarsError([
      { varName: 'BASE_URL', fieldPath: 'app.baseUrl' },
    ]);

    expect(error.message).toContain('Missing required environment variable: BASE_URL');
    expect(error.field).toBe('app.baseUrl');
    expect(error.suggestion).toContain('Set the BASE_URL environment variable');
  });

  it('creates error for multiple missing variables', () => {
    const error = createMissingEnvVarsError([
      { varName: 'HOST', fieldPath: 'server.host' },
      { varName: 'PORT', fieldPath: 'server.port' },
      { varName: 'HOST', fieldPath: 'backup.host' },
    ]);

    expect(error.message).toContain('Missing required environment variables: HOST, PORT');
    expect(error.field).toBe('server.host, server.port, backup.host');
    expect(error.suggestion).toContain('Set these environment variables');
  });
});

describe('EnvVarNotFoundError', () => {
  it('creates error with variable name', () => {
    const error = new EnvVarNotFoundError('BASE_URL');

    expect(error.name).toBe('EnvVarNotFoundError');
    expect(error.varName).toBe('BASE_URL');
    expect(error.fieldPath).toBeUndefined();
    expect(error.message).toContain('BASE_URL');
  });

  it('creates error with field path', () => {
    const error = new EnvVarNotFoundError('BASE_URL', 'app.baseUrl');

    expect(error.varName).toBe('BASE_URL');
    expect(error.fieldPath).toBe('app.baseUrl');
  });
});
