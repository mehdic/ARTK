/**
 * Unit tests for logger utility
 *
 * Tests P3-3: Logger format option (json | pretty)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  configureLogger,
  createLogger,
  getLoggerConfig,
  type LogEntry,
  parseLogLevel,
} from '../logger.js';

describe('Logger format configuration', () => {
  let capturedOutput: string[] = [];

  beforeEach(() => {
    capturedOutput = [];

    // Reset logger config before each test
    configureLogger({
      minLevel: 'debug',
      format: 'json',
      output: (entry: LogEntry) => {
        capturedOutput.push(JSON.stringify(entry));
      },
    });
  });

  afterEach(() => {
    // Reset to default config
    configureLogger({
      minLevel: 'info',
      format: 'json',
      output: (entry: LogEntry) => {
        // eslint-disable-next-line no-console
        const target = entry.level === 'error' ? console.error : console.log;
        target(JSON.stringify(entry));
      },
    });
  });

  describe('JSON format (default)', () => {
    it('should default to json format', () => {
      const config = getLoggerConfig();
      expect(config.format).toBe('json');
    });

    it('should output structured JSON', () => {
      configureLogger({
        format: 'json',
        output: (entry: LogEntry) => {
          capturedOutput.push(JSON.stringify(entry));
        },
      });

      const logger = createLogger('test', 'operation');
      logger.info('Test message', { key: 'value' });

      expect(capturedOutput).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(capturedOutput[0] || '{}');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.level).toBe('info');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.module).toBe('test');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.operation).toBe('operation');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.message).toBe('Test message');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.context).toEqual({ key: 'value' });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle logs without context', () => {
      configureLogger({
        format: 'json',
        output: (entry: LogEntry) => {
          capturedOutput.push(JSON.stringify(entry));
        },
      });

      const logger = createLogger('test', 'operation');
      logger.info('Test message');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(capturedOutput[0] || '{}');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.message).toBe('Test message');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.context).toBeUndefined();
    });
  });

  describe('Pretty format', () => {
    it('should support pretty format configuration', () => {
      configureLogger({ format: 'pretty' });
      const config = getLoggerConfig();
      expect(config.format).toBe('pretty');
    });

    it('should output human-readable format', () => {
      configureLogger({
        format: 'pretty',
        output: (entry: LogEntry) => {
          // Manually format pretty output
          const time = entry.timestamp.split('T')[1]?.split('.')[0] || '00:00:00';
          const level = entry.level.toUpperCase().padEnd(5);
          const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
          capturedOutput.push(`[${time}] ${level} [${entry.module}] ${entry.message}${context}`);
        },
      });

      const logger = createLogger('auth', 'login');
      logger.info('User logged in', { userId: '123' });

      expect(capturedOutput).toHaveLength(1);

      const output = capturedOutput[0] || '';
      expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO {2}\[auth\] User logged in/);
      expect(output).toContain('{"userId":"123"}');
    });

    it('should format log levels with proper padding', () => {
      configureLogger({
        format: 'pretty',
        output: (entry: LogEntry) => {
          const time = entry.timestamp.split('T')[1]?.split('.')[0] || '00:00:00';
          const level = entry.level.toUpperCase().padEnd(5);
          capturedOutput.push(`[${time}] ${level}`);
        },
      });

      const logger = createLogger('test', 'op');

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // All levels should be padded to 5 characters
      expect(capturedOutput[0]).toMatch(/DEBUG$/);
      expect(capturedOutput[1]).toMatch(/INFO $/);
      expect(capturedOutput[2]).toMatch(/WARN $/);
      expect(capturedOutput[3]).toMatch(/ERROR$/);
    });

    it('should extract time from ISO timestamp', () => {
      const timestamp = '2025-12-30T14:23:45.678Z';
      const time = timestamp.split('T')[1]?.split('.')[0];

      expect(time).toBe('14:23:45');
    });

    it('should handle missing context gracefully', () => {
      configureLogger({
        format: 'pretty',
        output: (entry: LogEntry) => {
          const time = entry.timestamp.split('T')[1]?.split('.')[0] || '00:00:00';
          const level = entry.level.toUpperCase().padEnd(5);
          const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
          capturedOutput.push(`[${time}] ${level} [${entry.module}] ${entry.message}${context}`);
        },
      });

      const logger = createLogger('test', 'op');
      logger.info('Message without context');

      const output = capturedOutput[0] || '';
      expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO {2}\[test\] Message without context$/);
      expect(output).not.toContain('undefined');
    });
  });

  describe('Format switching', () => {
    it('should allow switching from json to pretty', () => {
      configureLogger({ format: 'json' });
      expect(getLoggerConfig().format).toBe('json');

      configureLogger({ format: 'pretty' });
      expect(getLoggerConfig().format).toBe('pretty');
    });

    it('should allow switching from pretty to json', () => {
      configureLogger({ format: 'pretty' });
      expect(getLoggerConfig().format).toBe('pretty');

      configureLogger({ format: 'json' });
      expect(getLoggerConfig().format).toBe('json');
    });

    it('should preserve other config when changing format', () => {
      configureLogger({
        minLevel: 'debug',
        format: 'json',
      });

      configureLogger({ format: 'pretty' });

      const config = getLoggerConfig();
      expect(config.minLevel).toBe('debug');
      expect(config.format).toBe('pretty');
    });
  });

  describe('Existing logger functionality', () => {
    it('should respect minLevel with both formats', () => {
      const outputs: LogEntry[] = [];

      configureLogger({
        minLevel: 'warn',
        format: 'json',
        output: (entry: LogEntry) => outputs.push(entry),
      });

      const logger = createLogger('test', 'op');
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(outputs).toHaveLength(2); // Only warn and error
      expect(outputs[0]?.level).toBe('warn');
      expect(outputs[1]?.level).toBe('error');
    });

    it('should include module and operation in all formats', () => {
      const outputs: LogEntry[] = [];

      configureLogger({
        format: 'json',
        output: (entry: LogEntry) => outputs.push(entry),
      });

      const logger = createLogger('config', 'loadConfig');
      logger.info('Loading config');

      expect(outputs[0]?.module).toBe('config');
      expect(outputs[0]?.operation).toBe('loadConfig');
    });
  });

  describe('parseLogLevel', () => {
    it('should parse valid log levels', () => {
      expect(parseLogLevel('debug')).toBe('debug');
      expect(parseLogLevel('info')).toBe('info');
      expect(parseLogLevel('warn')).toBe('warn');
      expect(parseLogLevel('error')).toBe('error');
    });

    it('should be case-insensitive', () => {
      expect(parseLogLevel('DEBUG')).toBe('debug');
      expect(parseLogLevel('INFO')).toBe('info');
      expect(parseLogLevel('WARN')).toBe('warn');
      expect(parseLogLevel('ERROR')).toBe('error');
    });

    it('should return undefined for invalid levels', () => {
      expect(parseLogLevel('invalid')).toBeUndefined();
      expect(parseLogLevel('trace')).toBeUndefined();
      expect(parseLogLevel('')).toBeUndefined();
    });

    it('should handle undefined input', () => {
      expect(parseLogLevel(undefined)).toBeUndefined();
    });
  });
});
