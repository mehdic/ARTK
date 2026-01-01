/**
 * Unit tests for target resolver
 *
 * @group unit
 * @group targets
 */

import { describe, expect, it } from 'vitest';
import {
  TargetResolver,
  TargetNotFoundError,
  EnvironmentNotFoundError,
  createTargetResolver,
  resolveTarget,
  getTargetUrl,
  getTargetNames,
  validateTargetEnvironments,
  configTargetToArtkTarget,
  filterTargetsByType,
  getTargetStorageStatePath,
  type TargetResolverOptions,
  type ResolvedTarget,
} from '../target-resolver.js';
import type { ArtkConfig, ArtkConfigTarget } from '../../types/config.js';

// =============================================================================
// Test Data
// =============================================================================

function createMockConfig(overrides?: Partial<ArtkConfig>): ArtkConfig {
  return {
    schemaVersion: '2.0',
    project: {
      name: 'test-project',
    },
    targets: [
      {
        name: 'user-portal',
        path: '../frontend',
        type: 'react-spa',
        description: 'User Portal',
        environments: {
          local: { baseUrl: 'http://localhost:3000' },
          staging: { baseUrl: 'https://staging.example.com' },
          production: { baseUrl: 'https://example.com' },
        },
      },
      {
        name: 'admin-portal',
        path: '../admin',
        type: 'react-spa',
        environments: {
          local: { baseUrl: 'http://localhost:3001' },
          staging: { baseUrl: 'https://staging-admin.example.com' },
        },
      },
    ],
    defaults: {
      target: 'user-portal',
      environment: 'local',
    },
    ...overrides,
  };
}

// =============================================================================
// TargetNotFoundError Tests
// =============================================================================

describe('TargetNotFoundError', () => {
  it('should create error with target name', () => {
    const error = new TargetNotFoundError('unknown', ['a', 'b']);

    expect(error.name).toBe('TargetNotFoundError');
    expect(error.targetName).toBe('unknown');
    expect(error.availableTargets).toEqual(['a', 'b']);
  });

  it('should include available targets in message', () => {
    const error = new TargetNotFoundError('unknown', ['user', 'admin']);

    expect(error.message).toContain('unknown');
    expect(error.message).toContain('user, admin');
  });

  it('should handle empty available targets', () => {
    const error = new TargetNotFoundError('unknown', []);

    expect(error.message).toContain('(none)');
  });

  it('should be instance of Error', () => {
    const error = new TargetNotFoundError('unknown', []);

    expect(error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// EnvironmentNotFoundError Tests
// =============================================================================

describe('EnvironmentNotFoundError', () => {
  it('should create error with target and environment names', () => {
    const error = new EnvironmentNotFoundError('user', 'prod', ['local', 'staging']);

    expect(error.name).toBe('EnvironmentNotFoundError');
    expect(error.targetName).toBe('user');
    expect(error.environment).toBe('prod');
    expect(error.availableEnvironments).toEqual(['local', 'staging']);
  });

  it('should include target and environment in message', () => {
    const error = new EnvironmentNotFoundError('user', 'prod', ['local', 'staging']);

    expect(error.message).toContain('prod');
    expect(error.message).toContain('user');
    expect(error.message).toContain('local, staging');
  });

  it('should handle empty available environments', () => {
    const error = new EnvironmentNotFoundError('user', 'prod', []);

    expect(error.message).toContain('(none)');
  });

  it('should be instance of Error', () => {
    const error = new EnvironmentNotFoundError('user', 'prod', []);

    expect(error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// TargetResolver Tests
// =============================================================================

describe('TargetResolver', () => {
  describe('constructor', () => {
    it('should initialize with config defaults', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.getTargetNames()).toEqual(['user-portal', 'admin-portal']);
    });

    it('should use config default target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.getDefaultTarget();

      expect(target?.name).toBe('user-portal');
    });

    it('should use config default environment', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const url = resolver.getUrl('user-portal');

      expect(url).toBe('http://localhost:3000');
    });

    it('should use options to override defaults', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config, {
        defaultTarget: 'admin-portal',
        defaultEnvironment: 'staging',
      });

      const url = resolver.getUrl();

      expect(url).toBe('https://staging-admin.example.com');
    });
  });

  describe('resolve', () => {
    it('should resolve target by name', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.resolve('user-portal');

      expect(target).not.toBeNull();
      expect(target?.name).toBe('user-portal');
      expect(target?.path).toBe('../frontend');
      expect(target?.type).toBe('react-spa');
    });

    it('should resolve default target when name not provided', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.resolve();

      expect(target?.name).toBe('user-portal');
    });

    it('should throw when target not found and throwOnMissing is true', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config, { throwOnMissing: true });

      expect(() => resolver.resolve('unknown')).toThrow(TargetNotFoundError);
    });

    it('should return null when target not found and throwOnMissing is false', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config, { throwOnMissing: false });

      const target = resolver.resolve('unknown');

      expect(target).toBeNull();
    });

    it('should throw when no default target and name not provided', () => {
      const config = createMockConfig({
        defaults: { target: '', environment: 'local' },
      });
      const resolver = new TargetResolver(config, { throwOnMissing: true });

      expect(() => resolver.resolve()).toThrow(TargetNotFoundError);
    });

    it('should return null when no default and throwOnMissing is false', () => {
      const config = createMockConfig({
        defaults: { target: '', environment: 'local' },
      });
      const resolver = new TargetResolver(config, {
        throwOnMissing: false,
        defaultTarget: '',
      });

      const target = resolver.resolve();

      expect(target).toBeNull();
    });

    it('should include isDefault property', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const defaultTarget = resolver.resolve('user-portal');
      const otherTarget = resolver.resolve('admin-portal');

      expect(defaultTarget?.isDefault).toBe(true);
      expect(otherTarget?.isDefault).toBe(false);
    });

    it('should include available environments', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.resolve('user-portal');

      expect(target?.availableEnvironments).toEqual(['local', 'staging', 'production']);
    });

    it('should include original configTarget', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.resolve('user-portal');

      expect(target?.configTarget.name).toBe('user-portal');
      expect(target?.configTarget.environments).toHaveProperty('local');
    });
  });

  describe('getUrl', () => {
    it('should return URL for target and environment', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const url = resolver.getUrl('user-portal', 'staging');

      expect(url).toBe('https://staging.example.com');
    });

    it('should use default environment when not specified', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const url = resolver.getUrl('user-portal');

      expect(url).toBe('http://localhost:3000');
    });

    it('should use default target when not specified', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const url = resolver.getUrl(undefined, 'staging');

      expect(url).toBe('https://staging.example.com');
    });

    it('should throw when target not found', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(() => resolver.getUrl('unknown')).toThrow(TargetNotFoundError);
    });

    it('should throw when environment not found', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(() => resolver.getUrl('user-portal', 'unknown')).toThrow(
        EnvironmentNotFoundError
      );
    });

    it('should throw when target exists but environment missing', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      // admin-portal doesn't have production environment
      expect(() => resolver.getUrl('admin-portal', 'production')).toThrow(
        EnvironmentNotFoundError
      );
    });
  });

  describe('getTargetNames', () => {
    it('should return all target names', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const names = resolver.getTargetNames();

      expect(names).toEqual(['user-portal', 'admin-portal']);
    });

    it('should return empty array for config with no targets', () => {
      const config = createMockConfig({ targets: [] });
      const resolver = new TargetResolver(config);

      const names = resolver.getTargetNames();

      expect(names).toEqual([]);
    });
  });

  describe('getAllTargets', () => {
    it('should return all resolved targets', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const targets = resolver.getAllTargets();

      expect(targets.length).toBe(2);
      expect(targets[0]?.name).toBe('user-portal');
      expect(targets[1]?.name).toBe('admin-portal');
    });

    it('should return empty array for config with no targets', () => {
      const config = createMockConfig({ targets: [] });
      const resolver = new TargetResolver(config);

      const targets = resolver.getAllTargets();

      expect(targets).toEqual([]);
    });
  });

  describe('getDefaultTarget', () => {
    it('should return default target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const target = resolver.getDefaultTarget();

      expect(target?.name).toBe('user-portal');
    });

    it('should return null when no default target', () => {
      const config = createMockConfig({
        defaults: { target: '', environment: 'local' },
      });
      const resolver = new TargetResolver(config, {
        throwOnMissing: false,
        defaultTarget: '',
      });

      const target = resolver.getDefaultTarget();

      expect(target).toBeNull();
    });
  });

  describe('hasTarget', () => {
    it('should return true for existing target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.hasTarget('user-portal')).toBe(true);
      expect(resolver.hasTarget('admin-portal')).toBe(true);
    });

    it('should return false for non-existing target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.hasTarget('unknown')).toBe(false);
    });
  });

  describe('hasEnvironment', () => {
    it('should return true for existing environment', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.hasEnvironment('user-portal', 'local')).toBe(true);
      expect(resolver.hasEnvironment('user-portal', 'staging')).toBe(true);
      expect(resolver.hasEnvironment('user-portal', 'production')).toBe(true);
    });

    it('should return false for non-existing environment', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.hasEnvironment('user-portal', 'unknown')).toBe(false);
      expect(resolver.hasEnvironment('admin-portal', 'production')).toBe(false);
    });

    it('should return false for non-existing target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      expect(resolver.hasEnvironment('unknown', 'local')).toBe(false);
    });
  });

  describe('getEnvironments', () => {
    it('should return environments for target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const envs = resolver.getEnvironments('user-portal');

      expect(envs).toEqual(['local', 'staging', 'production']);
    });

    it('should return empty array for non-existing target', () => {
      const config = createMockConfig();
      const resolver = new TargetResolver(config);

      const envs = resolver.getEnvironments('unknown');

      expect(envs).toEqual([]);
    });
  });
});

// =============================================================================
// createTargetResolver Tests
// =============================================================================

describe('createTargetResolver', () => {
  it('should create resolver instance', () => {
    const config = createMockConfig();
    const resolver = createTargetResolver(config);

    expect(resolver).toBeInstanceOf(TargetResolver);
  });

  it('should pass options to resolver', () => {
    const config = createMockConfig();
    const resolver = createTargetResolver(config, {
      defaultTarget: 'admin-portal',
    });

    const target = resolver.getDefaultTarget();

    expect(target?.name).toBe('admin-portal');
  });
});

// =============================================================================
// resolveTarget Tests
// =============================================================================

describe('resolveTarget', () => {
  it('should resolve target by name', () => {
    const config = createMockConfig();

    const target = resolveTarget(config, 'user-portal');

    expect(target?.name).toBe('user-portal');
  });

  it('should return null for unknown target', () => {
    const config = createMockConfig();

    const target = resolveTarget(config, 'unknown');

    expect(target).toBeNull();
  });

  it('should resolve default target when name not provided', () => {
    const config = createMockConfig();

    const target = resolveTarget(config);

    expect(target?.name).toBe('user-portal');
  });
});

// =============================================================================
// getTargetUrl Tests
// =============================================================================

describe('getTargetUrl', () => {
  it('should return URL for target and environment', () => {
    const config = createMockConfig();

    const url = getTargetUrl(config, 'user-portal', 'staging');

    expect(url).toBe('https://staging.example.com');
  });

  it('should use default environment when not specified', () => {
    const config = createMockConfig();

    const url = getTargetUrl(config, 'user-portal');

    expect(url).toBe('http://localhost:3000');
  });

  it('should throw for unknown target', () => {
    const config = createMockConfig();

    expect(() => getTargetUrl(config, 'unknown')).toThrow(TargetNotFoundError);
  });

  it('should throw for unknown environment', () => {
    const config = createMockConfig();

    expect(() => getTargetUrl(config, 'user-portal', 'unknown')).toThrow(
      EnvironmentNotFoundError
    );
  });
});

// =============================================================================
// getTargetNames Tests
// =============================================================================

describe('getTargetNames (function)', () => {
  it('should return all target names', () => {
    const config = createMockConfig();

    const names = getTargetNames(config);

    expect(names).toEqual(['user-portal', 'admin-portal']);
  });

  it('should return empty array for no targets', () => {
    const config = createMockConfig({ targets: [] });

    const names = getTargetNames(config);

    expect(names).toEqual([]);
  });
});

// =============================================================================
// validateTargetEnvironments Tests
// =============================================================================

describe('validateTargetEnvironments', () => {
  it('should return valid when all targets have required environments', () => {
    const config = createMockConfig();

    const result = validateTargetEnvironments(config, ['local']);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return invalid when targets missing required environments', () => {
    const config = createMockConfig();

    const result = validateTargetEnvironments(config, ['local', 'production']);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.target).toBe('admin-portal');
    expect(result.errors[0]?.missing).toEqual(['production']);
  });

  it('should report multiple missing environments', () => {
    const config = createMockConfig();

    const result = validateTargetEnvironments(config, ['local', 'production', 'qa']);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it('should return valid for empty required list', () => {
    const config = createMockConfig();

    const result = validateTargetEnvironments(config, []);

    expect(result.valid).toBe(true);
  });

  it('should return valid for empty targets', () => {
    const config = createMockConfig({ targets: [] });

    const result = validateTargetEnvironments(config, ['local']);

    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// configTargetToArtkTarget Tests
// =============================================================================

describe('configTargetToArtkTarget', () => {
  it('should convert config target to ArtkTarget', () => {
    const configTarget: ArtkConfigTarget = {
      name: 'user-portal',
      path: '../frontend',
      type: 'react-spa',
      description: 'User Portal',
      environments: {
        local: { baseUrl: 'http://localhost:3000' },
      },
    };

    const target = configTargetToArtkTarget(configTarget);

    expect(target.name).toBe('user-portal');
    expect(target.path).toBe('../frontend');
    expect(target.type).toBe('react-spa');
    expect(target.description).toBe('User Portal');
    expect(target.detected_by).toEqual([]);
  });

  it('should use provided detectedBy', () => {
    const configTarget: ArtkConfigTarget = {
      name: 'portal',
      path: './src',
      type: 'vue-spa',
      environments: {},
    };

    const target = configTargetToArtkTarget(configTarget, ['package-dependency:vue']);

    expect(target.detected_by).toEqual(['package-dependency:vue']);
  });

  it('should not include environments in result', () => {
    const configTarget: ArtkConfigTarget = {
      name: 'portal',
      path: './src',
      type: 'angular',
      environments: {
        local: { baseUrl: 'http://localhost' },
      },
    };

    const target = configTargetToArtkTarget(configTarget);

    // ArtkTarget doesn't have environments property
    expect((target as any).environments).toBeUndefined();
  });
});

// =============================================================================
// filterTargetsByType Tests
// =============================================================================

describe('filterTargetsByType', () => {
  it('should filter targets by type', () => {
    const config = createMockConfig({
      targets: [
        {
          name: 'react-app',
          path: './react',
          type: 'react-spa',
          environments: { local: { baseUrl: 'http://localhost:3000' } },
        },
        {
          name: 'vue-app',
          path: './vue',
          type: 'vue-spa',
          environments: { local: { baseUrl: 'http://localhost:3001' } },
        },
        {
          name: 'another-react',
          path: './react2',
          type: 'react-spa',
          environments: { local: { baseUrl: 'http://localhost:3002' } },
        },
      ],
    });

    const reactTargets = filterTargetsByType(config, 'react-spa');

    expect(reactTargets.length).toBe(2);
    expect(reactTargets[0]?.name).toBe('react-app');
    expect(reactTargets[1]?.name).toBe('another-react');
  });

  it('should return empty array when no matches', () => {
    const config = createMockConfig();

    const targets = filterTargetsByType(config, 'angular');

    expect(targets).toEqual([]);
  });
});

// =============================================================================
// getTargetStorageStatePath Tests
// =============================================================================

describe('getTargetStorageStatePath', () => {
  it('should return default storage state path', () => {
    const config = createMockConfig();

    const path = getTargetStorageStatePath(config, 'user-portal');

    expect(path).toBe('.auth-states/user-portal/default.json');
  });

  it('should use custom role', () => {
    const config = createMockConfig();

    const path = getTargetStorageStatePath(config, 'user-portal', 'admin');

    expect(path).toBe('.auth-states/user-portal/admin.json');
  });

  it('should use custom storage state directory', () => {
    const config = createMockConfig({
      auth: {
        storageStateDir: 'custom-auth',
        enabled: true,
        roles: {},
      },
    });

    const path = getTargetStorageStatePath(config, 'user-portal');

    expect(path).toBe('custom-auth/user-portal/default.json');
  });

  it('should use default directory when auth not configured', () => {
    const config = createMockConfig({ auth: undefined });

    const path = getTargetStorageStatePath(config, 'portal');

    expect(path).toBe('.auth-states/portal/default.json');
  });
});
