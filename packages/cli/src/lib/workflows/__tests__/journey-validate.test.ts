/**
 * Tests for journey validation logic
 *
 * These tests verify the logic that was previously pseudocode in prompts.
 * Now it's testable TypeScript.
 */

import { describe, it, expect } from 'vitest';
import {
  parseJourneyFrontmatter,
  validateJourneyForImplementation,
  validateBatchMode,
  validateLearningMode,
  parseJourneyList,
  isPathSafe,
  isValidJourneyId,
  validateBatchSize,
} from '../journey-validate.js';
import { JourneyInfo, BATCH_LIMITS } from '../types.js';

describe('isPathSafe (path traversal protection)', () => {
  it('allows paths within root', () => {
    expect(isPathSafe('/root/sub/file.txt', '/root')).toBe(true);
    expect(isPathSafe('/root/deep/nested/file.txt', '/root')).toBe(true);
  });

  it('allows root path itself', () => {
    expect(isPathSafe('/root', '/root')).toBe(true);
  });

  it('rejects paths outside root', () => {
    expect(isPathSafe('/other/file.txt', '/root')).toBe(false);
    expect(isPathSafe('/root/../other/file.txt', '/root')).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(isPathSafe('/root/sub/../../etc/passwd', '/root')).toBe(false);
    expect(isPathSafe('/root/../root/../etc/passwd', '/root')).toBe(false);
  });

  it('rejects sibling paths that start similarly', () => {
    // /root-other should NOT be allowed when root is /root
    expect(isPathSafe('/root-other/file.txt', '/root')).toBe(false);
  });

  // Windows-specific tests (run on all platforms for logic validation)
  it('handles normalized paths correctly', () => {
    // These tests validate the logic even on non-Windows
    expect(isPathSafe('/project/artk-e2e/journeys/clarified/JRN-0001.md', '/project/artk-e2e')).toBe(true);
    expect(isPathSafe('/project/artk-e2e/../artk-e2e/journeys/JRN-0001.md', '/project/artk-e2e')).toBe(true);
  });

  it('handles URL-encoded paths (treated as literal)', () => {
    // URL-encoded paths are treated as literal folder names by the filesystem
    // %2e%2e is literally a folder named "%2e%2e", not ".."
    // This is safe because the filesystem doesn't decode URL encoding
    expect(isPathSafe('/root/%2e%2e/etc/passwd', '/root')).toBe(true);
    // But actual traversal should still fail
    expect(isPathSafe('/root/../etc/passwd', '/root')).toBe(false);
  });
});

describe('isValidJourneyId', () => {
  it('accepts valid JRN-XXXX format', () => {
    expect(isValidJourneyId('JRN-0001')).toBe(true);
    expect(isValidJourneyId('JRN-9999')).toBe(true);
    expect(isValidJourneyId('JRN-0000')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidJourneyId('JRN-001')).toBe(false); // Too few digits
    expect(isValidJourneyId('JRN-00001')).toBe(false); // Too many digits
    expect(isValidJourneyId('jrn-0001')).toBe(false); // Lowercase
    expect(isValidJourneyId('JRNX-0001')).toBe(false); // Wrong prefix
    expect(isValidJourneyId('0001')).toBe(false); // Missing prefix
    expect(isValidJourneyId('')).toBe(false); // Empty
    expect(isValidJourneyId('../JRN-0001')).toBe(false); // Path injection attempt
  });
});

describe('parseJourneyFrontmatter', () => {
  it('extracts frontmatter from valid markdown with Zod validation', () => {
    const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tests: []
---

# Journey Content`;

    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        id: 'JRN-0001',
        title: 'Test Journey',
        status: 'clarified',
        tests: [],
      });
    }
  });

  it('provides default for optional tests field', () => {
    const content = `---
id: JRN-0001
title: Test Journey
status: clarified
---

# Journey Content`;

    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tests).toEqual([]);
    }
  });

  it('returns failure for missing frontmatter', () => {
    const content = '# No Frontmatter';
    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('frontmatter');
    }
  });

  it('returns failure for invalid YAML', () => {
    const content = `---
invalid: [unclosed
---`;
    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('YAML');
    }
  });

  it('returns failure with details for invalid journey ID format', () => {
    const content = `---
id: INVALID-ID
title: Test Journey
status: clarified
---`;
    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid frontmatter schema');
      expect(result.details).toBeDefined();
      expect(result.details?.some(d => d.includes('id'))).toBe(true);
    }
  });

  it('returns failure for missing required fields', () => {
    const content = `---
title: Missing ID and Status
---`;
    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toBeDefined();
    }
  });

  it('returns failure for invalid status', () => {
    const content = `---
id: JRN-0001
title: Test
status: invalid-status
---`;
    const result = parseJourneyFrontmatter(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toBeDefined();
      expect(result.details?.some(d => d.includes('status'))).toBe(true);
    }
  });
});

describe('validateJourneyForImplementation', () => {
  it('accepts clarified journeys', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'clarified',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts defined journeys with warning', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'defined',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'Journey is "defined" but not "clarified". Consider running /artk.journey-clarify first for better test generation.'
    );
  });

  it('rejects proposed journeys', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'proposed',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('proposed');
  });

  it('rejects quarantined journeys', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'quarantined',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('quarantined');
  });

  it('rejects deprecated journeys', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'deprecated',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('deprecated');
  });

  it('warns for already implemented journeys', () => {
    const journey: JourneyInfo = {
      id: 'JRN-0001',
      path: '/path/to/journey.md',
      status: 'implemented',
      title: 'Test Journey',
      tests: ['test.spec.ts'],
    };

    const result = validateJourneyForImplementation(journey);
    // Implemented is not in validStatuses, but we warn instead of error
    expect(result.warnings[0]).toContain('already implemented');
  });

  it('rejects invalid journey ID format', () => {
    const journey: JourneyInfo = {
      id: 'INVALID',
      path: '/path/to/journey.md',
      status: 'clarified',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('does not match pattern');
  });

  it('rejects missing journey ID', () => {
    const journey: JourneyInfo = {
      id: '',
      path: '/path/to/journey.md',
      status: 'clarified',
      title: 'Test Journey',
      tests: [],
    };

    const result = validateJourneyForImplementation(journey);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('missing required field: id');
  });
});

describe('validateBatchMode', () => {
  it('accepts serial mode', () => {
    const result = validateBatchMode('serial');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('serial');
  });

  it('rejects parallel mode with explicit error', () => {
    const result = validateBatchMode('parallel');
    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('serial'); // Fallback
    expect(result.error).toContain('not yet implemented');
  });

  it('normalizes to lowercase', () => {
    const result = validateBatchMode('SERIAL');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('serial');
  });

  it('trims whitespace', () => {
    const result = validateBatchMode('  serial  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('serial');
  });

  it('maps deprecated subagent to serial with warning', () => {
    const result = validateBatchMode('subagent');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('serial');
    expect(result.warning).toContain('deprecated');
  });

  it('accepts empty string as default (serial)', () => {
    const result = validateBatchMode('');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('serial');
  });

  it('rejects invalid modes with fallback to serial', () => {
    const result = validateBatchMode('invalid');
    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('serial'); // Safe fallback
    expect(result.error).toContain('Unknown batch mode');
  });
});

describe('validateLearningMode', () => {
  it('accepts strict mode', () => {
    const result = validateLearningMode('strict');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('strict');
  });

  it('accepts batch mode', () => {
    const result = validateLearningMode('batch');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('batch');
  });

  it('accepts none mode', () => {
    const result = validateLearningMode('none');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('none');
  });

  it('normalizes to lowercase', () => {
    const result = validateLearningMode('STRICT');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('strict');
  });

  it('trims whitespace', () => {
    const result = validateLearningMode('  batch  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('batch');
  });

  it('rejects invalid modes with fallback to strict', () => {
    const result = validateLearningMode('invalid');
    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('strict'); // Safe fallback
  });
});

describe('parseJourneyList', () => {
  it('parses single journey ID', () => {
    const result = parseJourneyList('JRN-0001');
    expect(result).toEqual(['JRN-0001']);
  });

  it('parses comma-separated IDs', () => {
    const result = parseJourneyList('JRN-0001,JRN-0002,JRN-0003');
    expect(result).toEqual(['JRN-0001', 'JRN-0002', 'JRN-0003']);
  });

  it('parses forward ranges', () => {
    const result = parseJourneyList('JRN-0001..JRN-0003');
    expect(result).toEqual(['JRN-0001', 'JRN-0002', 'JRN-0003']);
  });

  it('parses backward ranges (handles reversed order)', () => {
    const result = parseJourneyList('JRN-0010..JRN-0007');
    expect(result).toEqual(['JRN-0007', 'JRN-0008', 'JRN-0009', 'JRN-0010']);
  });

  it('handles mixed input', () => {
    const result = parseJourneyList('JRN-0001,JRN-0005..JRN-0007');
    expect(result).toEqual(['JRN-0001', 'JRN-0005', 'JRN-0006', 'JRN-0007']);
  });

  it('handles whitespace', () => {
    const result = parseJourneyList('JRN-0001 , JRN-0002');
    expect(result).toEqual(['JRN-0001', 'JRN-0002']);
  });

  it('ignores invalid IDs', () => {
    const result = parseJourneyList('JRN-0001,invalid,JRN-0002');
    expect(result).toEqual(['JRN-0001', 'JRN-0002']);
  });

  it('returns empty array for empty input', () => {
    const result = parseJourneyList('');
    expect(result).toEqual([]);
  });

  it('deduplicates overlapping ranges', () => {
    const result = parseJourneyList('JRN-0001..JRN-0003,JRN-0002..JRN-0004');
    expect(result).toEqual(['JRN-0001', 'JRN-0002', 'JRN-0003', 'JRN-0004']);
  });

  it('deduplicates repeated IDs', () => {
    const result = parseJourneyList('JRN-0001,JRN-0001,JRN-0001');
    expect(result).toEqual(['JRN-0001']);
  });

  it('sorts results numerically', () => {
    const result = parseJourneyList('JRN-0010,JRN-0001,JRN-0005');
    expect(result).toEqual(['JRN-0001', 'JRN-0005', 'JRN-0010']);
  });

  it('ignores path traversal attempts in IDs', () => {
    const result = parseJourneyList('../JRN-0001,JRN-0002/../../../etc/passwd,JRN-0003');
    expect(result).toEqual(['JRN-0003']);
  });
});

describe('validateBatchSize', () => {
  it('accepts valid batch sizes', () => {
    expect(validateBatchSize(1).valid).toBe(true);
    expect(validateBatchSize(5).valid).toBe(true);
    expect(validateBatchSize(BATCH_LIMITS.SOFT_LIMIT).valid).toBe(true);
  });

  it('warns for batches exceeding soft limit', () => {
    const result = validateBatchSize(BATCH_LIMITS.SOFT_LIMIT + 1);
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Consider using smaller batches');
  });

  it('rejects batches exceeding hard limit', () => {
    const result = validateBatchSize(BATCH_LIMITS.HARD_LIMIT + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Too many journeys');
  });

  it('rejects zero or negative counts', () => {
    expect(validateBatchSize(0).valid).toBe(false);
    expect(validateBatchSize(-1).valid).toBe(false);
  });
});
