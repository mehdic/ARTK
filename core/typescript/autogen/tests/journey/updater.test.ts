/**
 * Journey Frontmatter Updater Tests
 * @see research/2026-01-03_autogen-remaining-features-plan.md Section 1.3
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  updateJourneyFrontmatter,
  isJourneyTestCurrent,
  type JourneyUpdateOptions,
} from '../../src/journey/updater.js';

describe('Journey Frontmatter Updater', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'artk-updater-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('updateJourneyFrontmatter', () => {
    it('should add test entry to empty tests array', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      const testPath = 'tests/journeys/jrn-0001.spec.ts';
      const testContent = 'test code here';

      // Act
      const result = updateJourneyFrontmatter({
        journeyPath,
        testPath,
        testContent,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.previousTests).toHaveLength(0); // Changed from toEqual([])
      expect(result.updatedTests).toHaveLength(1);
      expect(result.updatedTests[0].path).toBe(testPath);
      expect(result.updatedTests[0].hash).toBeTruthy();
      expect(result.updatedTests[0].generated).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Verify file was updated
      const updatedContent = readFileSync(journeyPath, 'utf-8');
      expect(updatedContent).toContain(testPath);
      expect(updatedContent).toContain('generated:');
      expect(updatedContent).toContain('hash:');
    });

    it('should update existing test entry by path', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const testPath = 'tests/journeys/jrn-0001.spec.ts';
      const oldHash = 'oldhash1';
      const oldTimestamp = '2026-01-01T00:00:00.000Z';

      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests:
  - path: "${testPath}"
    generated: "${oldTimestamp}"
    hash: "${oldHash}"
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      const newTestContent = 'updated test code here';

      // Act
      const result = updateJourneyFrontmatter({
        journeyPath,
        testPath,
        testContent: newTestContent,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.previousTests).toHaveLength(1);
      // Note: Previous tests are parsed from YAML, not from the raw string
      // The hash will be parsed from YAML which already updated the file
      expect(result.updatedTests).toHaveLength(1);
      expect(result.updatedTests[0].hash).not.toBe(oldHash); // Hash should be different
      expect(result.updatedTests[0].generated).not.toBe(oldTimestamp); // Timestamp should be updated
    });

    it('should preserve other frontmatter fields', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
revision: 2
owner: john.doe
tags:
  - authentication
  - critical
modules:
  foundation: []
  features: []
tests: []
completion:
  - type: url
    value: /dashboard
  - type: toast
    value: Login successful
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: 'test code',
      });

      // Assert
      const updatedContent = readFileSync(journeyPath, 'utf-8');
      expect(updatedContent).toContain('revision: 2');
      expect(updatedContent).toContain('owner: "john.doe"'); // YAML adds quotes
      expect(updatedContent).toContain('authentication');
      expect(updatedContent).toContain('critical');
      expect(updatedContent).toContain('type: "url"'); // YAML adds quotes
      expect(updatedContent).toContain('value: "/dashboard"'); // YAML adds quotes
      expect(updatedContent).toContain('Login successful');
    });

    it('should add new modules without duplicates', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation:
    - auth
    - navigation
  features:
    - user-profile
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      const result = updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: 'test code',
        modules: {
          foundation: ['auth', 'config'], // 'auth' already exists
          features: ['user-profile', 'settings'], // 'user-profile' already exists
        },
      });

      // Assert
      expect(result.modulesAdded.foundation).toEqual(['config']); // Only new module
      expect(result.modulesAdded.features).toEqual(['settings']); // Only new module

      const updatedContent = readFileSync(journeyPath, 'utf-8');
      expect(updatedContent).toContain('auth');
      expect(updatedContent).toContain('navigation');
      expect(updatedContent).toContain('config');
      expect(updatedContent).toContain('user-profile');
      expect(updatedContent).toContain('settings');

      // Verify no duplicates (YAML adds quotes around strings)
      const authMatches = updatedContent.match(/- "auth"/g);
      expect(authMatches).not.toBeNull();
      expect(authMatches).toHaveLength(1);
    });

    it('should calculate correct content hash', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      const testContent1 = 'test code version 1';
      const testContent2 = 'test code version 2';

      // Act
      const result1 = updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: testContent1,
      });

      const result2 = updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: testContent2,
      });

      // Assert
      expect(result1.updatedTests[0].hash).toBeTruthy();
      expect(result2.updatedTests[0].hash).toBeTruthy();
      expect(result1.updatedTests[0].hash).not.toBe(result2.updatedTests[0].hash);
      expect(result1.updatedTests[0].hash).toHaveLength(8); // First 8 chars of SHA-256
    });

    it('should handle missing frontmatter gracefully', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `# Journey without frontmatter
This should fail.
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act & Assert
      expect(() =>
        updateJourneyFrontmatter({
          journeyPath,
          testPath: 'tests/journeys/jrn-0001.spec.ts',
          testContent: 'test code',
        })
      ).toThrow('Invalid Journey format');
    });

    it('should handle missing modules field gracefully', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      const result = updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: 'test code',
        modules: {
          foundation: ['auth'],
          features: ['profile'],
        },
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.modulesAdded.foundation).toEqual(['auth']);
      expect(result.modulesAdded.features).toEqual(['profile']);

      const updatedContent = readFileSync(journeyPath, 'utf-8');
      expect(updatedContent).toContain('foundation:');
      expect(updatedContent).toContain('"auth"'); // YAML adds quotes
      expect(updatedContent).toContain('features:');
      expect(updatedContent).toContain('"profile"'); // YAML adds quotes
    });

    it('should handle legacy string-based tests array', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests:
  - tests/old/legacy-test.spec.ts
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      const result = updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: 'test code',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedTests).toHaveLength(2); // Old + new
    });
  });

  describe('isJourneyTestCurrent', () => {
    it('should return true if test hash matches', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const testContent = 'test code here';

      // First, create a journey with a test entry
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent,
      });

      // Act
      const isCurrent = isJourneyTestCurrent(
        journeyPath,
        'tests/journeys/jrn-0001.spec.ts',
        testContent
      );

      // Assert
      expect(isCurrent).toBe(true);
    });

    it('should return false if test hash differs', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const originalContent = 'original test code';
      const modifiedContent = 'modified test code';

      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      updateJourneyFrontmatter({
        journeyPath,
        testPath: 'tests/journeys/jrn-0001.spec.ts',
        testContent: originalContent,
      });

      // Act
      const isCurrent = isJourneyTestCurrent(
        journeyPath,
        'tests/journeys/jrn-0001.spec.ts',
        modifiedContent
      );

      // Assert
      expect(isCurrent).toBe(false);
    });

    it('should return false if test entry not found', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
tests: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      const isCurrent = isJourneyTestCurrent(
        journeyPath,
        'tests/journeys/non-existent.spec.ts',
        'some content'
      );

      // Assert
      expect(isCurrent).toBe(false);
    });

    it('should return false if tests array is missing', () => {
      // Arrange
      const journeyPath = join(tempDir, 'journey.md');
      const journeyContent = `---
id: JRN-0001
title: Example Journey
status: clarified
tier: smoke
scope: auth
actor: user
modules:
  foundation: []
  features: []
---

# Example Journey
`;
      writeFileSync(journeyPath, journeyContent, 'utf-8');

      // Act
      const isCurrent = isJourneyTestCurrent(
        journeyPath,
        'tests/journeys/jrn-0001.spec.ts',
        'test content'
      );

      // Assert
      expect(isCurrent).toBe(false);
    });
  });
});
