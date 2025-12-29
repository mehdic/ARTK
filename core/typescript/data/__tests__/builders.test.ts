/**
 * Unit tests for DataBuilder
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DataBuilder } from '../builders.js';

// Test implementation of DataBuilder
interface TestUser {
  username: string;
  email: string;
  fullName: string;
  active: boolean;
}

class TestUserBuilder extends DataBuilder<TestUser> {
  private username = 'testuser';
  private email = 'test@example.com';
  private fullName = 'Test User';
  private active = true;

  withUsername(username: string): this {
    this.username = username;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withFullName(fullName: string): this {
    this.fullName = fullName;
    return this;
  }

  withActive(active: boolean): this {
    this.active = active;
    return this;
  }

  build(): TestUser {
    return {
      username: this.namespacedValue(this.username),
      email: this.namespacedValue(this.email),
      fullName: this.namespacedValue(this.fullName),
      active: this.active,
    };
  }

  buildForApi(): Record<string, unknown> {
    return {
      username: this.namespacedValue(this.username),
      email: this.namespacedValue(this.email),
      full_name: this.namespacedValue(this.fullName), // Snake case for API
      active: this.active,
    };
  }
}

describe('DataBuilder', () => {
  let builder: TestUserBuilder;

  beforeEach(() => {
    builder = new TestUserBuilder();
  });

  describe('build', () => {
    it('should build object with default values', () => {
      const user = builder.build();

      expect(user).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        active: true,
      });
    });

    it('should build object with custom values', () => {
      const user = builder
        .withUsername('john')
        .withEmail('john@example.com')
        .withFullName('John Doe')
        .withActive(false)
        .build();

      expect(user).toEqual({
        username: 'john',
        email: 'john@example.com',
        fullName: 'John Doe',
        active: false,
      });
    });

    it('should support fluent API', () => {
      const user = builder.withUsername('jane').withEmail('jane@example.com').build();

      expect(user.username).toBe('jane');
      expect(user.email).toBe('jane@example.com');
    });
  });

  describe('withNamespace', () => {
    it('should apply namespace to string values', () => {
      const user = builder.withNamespace('abc123').build();

      expect(user.username).toBe('testuser [artk-abc123]');
      expect(user.email).toBe('test@example.com [artk-abc123]');
      expect(user.fullName).toBe('Test User [artk-abc123]');
      expect(user.active).toBe(true); // Boolean not namespaced
    });

    it('should apply namespace with custom config', () => {
      const user = builder
        .withNamespace('abc123', { prefix: '(test-', suffix: ')' })
        .build();

      expect(user.username).toBe('testuser (test-abc123)');
      expect(user.email).toBe('test@example.com (test-abc123)');
      expect(user.fullName).toBe('Test User (test-abc123)');
    });

    it('should work with custom values and namespace', () => {
      const user = builder
        .withNamespace('xyz789')
        .withUsername('john')
        .withEmail('john@example.com')
        .build();

      expect(user.username).toBe('john [artk-xyz789]');
      expect(user.email).toBe('john@example.com [artk-xyz789]');
    });

    it('should support fluent API with namespace', () => {
      const user = builder
        .withUsername('jane')
        .withNamespace('abc123')
        .withEmail('jane@example.com')
        .build();

      expect(user.username).toBe('jane [artk-abc123]');
      expect(user.email).toBe('jane@example.com [artk-abc123]');
    });

    it('should not namespace when runId is not set', () => {
      const user = builder.withUsername('john').build();

      expect(user.username).toBe('john');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('buildForApi', () => {
    it('should build API representation with default values', () => {
      const apiUser = builder.buildForApi?.();

      expect(apiUser).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User', // Snake case
        active: true,
      });
    });

    it('should apply namespace to API representation', () => {
      const apiUser = builder.withNamespace('abc123').buildForApi?.();

      expect(apiUser).toEqual({
        username: 'testuser [artk-abc123]',
        email: 'test@example.com [artk-abc123]',
        full_name: 'Test User [artk-abc123]',
        active: true,
      });
    });

    it('should use custom values in API representation', () => {
      const apiUser = builder
        .withUsername('john')
        .withEmail('john@example.com')
        .withFullName('John Doe')
        .buildForApi?.();

      expect(apiUser).toEqual({
        username: 'john',
        email: 'john@example.com',
        full_name: 'John Doe',
        active: true,
      });
    });
  });

  describe('namespacedValue', () => {
    it('should return original value when no namespace set', () => {
      const user = builder.build();

      expect(user.username).toBe('testuser');
    });

    it('should return namespaced value when namespace set', () => {
      const user = builder.withNamespace('abc123').build();

      expect(user.username).toBe('testuser [artk-abc123]');
    });

    it('should handle empty strings', () => {
      const user = builder.withNamespace('abc123').withUsername('').build();

      expect(user.username).toBe(' [artk-abc123]');
    });

    it('should handle strings with spaces', () => {
      const user = builder
        .withNamespace('abc123')
        .withFullName('John Michael Doe')
        .build();

      expect(user.fullName).toBe('John Michael Doe [artk-abc123]');
    });

    it('should handle strings with special characters', () => {
      const user = builder
        .withNamespace('abc123')
        .withEmail('john+test@example.com')
        .build();

      expect(user.email).toBe('john+test@example.com [artk-abc123]');
    });
  });

  describe('builder reusability', () => {
    it('should allow building multiple objects with same instance', () => {
      // Create first user
      builder.withUsername('user1').build();

      // Create second user - builder state persists!
      const user2 = builder.withUsername('user2').build();

      // Both refer to same builder state (last value wins)
      expect(user2.username).toBe('user2');

      // To use builder multiple times, create new instances
      const builder1 = new TestUserBuilder();
      const builder2 = new TestUserBuilder();

      const userA = builder1.withUsername('userA').build();
      const userB = builder2.withUsername('userB').build();

      expect(userA.username).toBe('userA');
      expect(userB.username).toBe('userB');
    });

    it('should allow namespace to be changed', () => {
      // Build with first namespace
      builder.withNamespace('aaa');
      const user1 = builder.build();

      // Change namespace and rebuild
      builder.withNamespace('bbb');
      const user2 = builder.build();

      // Second namespace wins (builder is mutable)
      expect(user1.username).toBe('testuser [artk-aaa]');
      expect(user2.username).toBe('testuser [artk-bbb]');
    });
  });

  describe('edge cases', () => {
    it('should handle very long runIds', () => {
      const longRunId = 'a'.repeat(100);
      const user = builder.withNamespace(longRunId).build();

      expect(user.username).toContain(longRunId);
    });

    it('should handle unicode characters in values', () => {
      const user = builder
        .withNamespace('abc123')
        .withFullName('José García')
        .build();

      expect(user.fullName).toBe('José García [artk-abc123]');
    });

    it('should handle emojis in values', () => {
      const user = builder
        .withNamespace('abc123')
        .withUsername('user😀')
        .build();

      expect(user.username).toBe('user😀 [artk-abc123]');
    });
  });
});

// Test for builder without buildForApi
class SimpleBuilder extends DataBuilder<{ name: string }> {
  private name = 'test';

  withName(name: string): this {
    this.name = name;
    return this;
  }

  build(): { name: string } {
    return { name: this.namespacedValue(this.name) };
  }
}

describe('DataBuilder without buildForApi', () => {
  it('should work without buildForApi method', () => {
    const builder = new SimpleBuilder();
    const result = builder.withName('test').build();

    expect(result).toEqual({ name: 'test' });
  });

  it('should apply namespace without buildForApi', () => {
    const builder = new SimpleBuilder();
    const result = builder.withNamespace('abc123').withName('test').build();

    expect(result).toEqual({ name: 'test [artk-abc123]' });
  });
});
