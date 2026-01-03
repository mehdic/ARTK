/**
 * Tests for ARTK init-playbook prompt
 * Validates that P1 cross-cutting issues are properly addressed:
 * 1. Migration guidance for existing Journey System installations
 * 2. Orphan file cleanup guidance for old .github/instructions/*.instructions.md files
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_PATH = path.join(__dirname, '..', 'artk.init-playbook.md');

describe('ARTK init-playbook prompt', () => {
  let promptContent: string;

  beforeAll(() => {
    promptContent = fs.readFileSync(PROMPT_PATH, 'utf-8');
  });

  describe('Migration guidance for existing Journey System installations', () => {
    it('should include migration detection section in Part 3', () => {
      expect(promptContent).toContain('### 8A) Detect old Journey System installations (migration guidance)');
    });

    it('should detect indicators of old/legacy Journey System', () => {
      expect(promptContent).toContain('**Indicators of old/legacy Journey System:**');
      expect(promptContent).toContain('`journeys/journeys.config.yml` exists but is missing new fields');
      expect(promptContent).toContain('Missing Core installation');
    });

    it('should include migration detection logic', () => {
      expect(promptContent).toContain('**Migration detection logic:**');
      expect(promptContent).toContain('core.journeys.installDir not in artk.config.yml');
      expect(promptContent).toContain('<coreInstallDir>/core.manifest.json does not exist');
    });

    it('should provide clear migration guidance to users', () => {
      expect(promptContent).toContain('**Migration guidance to provide:**');
      expect(promptContent).toContain('Detected existing Journey System installation (older version)');
      expect(promptContent).toContain('Your existing Journey files (.md) are safe and will be preserved');
    });

    it('should explain Core-based architecture benefits', () => {
      expect(promptContent).toContain('Core schema and tools installed at');
      expect(promptContent).toContain('Wrapper scripts that call Core tools');
      expect(promptContent).toContain('Pinned Core version in artk.config.yml');
    });

    it('should list migration actions', () => {
      expect(promptContent).toContain('**Migration actions (if user confirms yes):**');
      expect(promptContent).toContain('Back up existing `journeys.config.yml` to `journeys.config.yml.backup`');
      expect(promptContent).toContain('Run validation on existing Journey files');
    });

    it('should provide yes/no/review options', () => {
      expect(promptContent).toContain('Proceed with migration? [yes/no/review]:');
      expect(promptContent).toContain('**If user selects review:**');
      expect(promptContent).toContain('**If user selects no:**');
    });
  });

  describe('Orphan file cleanup guidance', () => {
    it('should include orphan file detection section in Step 7', () => {
      expect(promptContent).toContain('### 7A) Detect and cleanup orphan instruction files');
    });

    it('should detect orphaned instruction files', () => {
      expect(promptContent).toContain('**Check for:** `.github/instructions/*.instructions.md` files');
      expect(promptContent).toContain('artk.instructions.md');
      expect(promptContent).toContain('journeys.instructions.md');
    });

    it('should define what makes a file orphaned', () => {
      expect(promptContent).toContain('These files are **orphaned** if:');
      expect(promptContent).toContain('They contain ARTK-related content');
      expect(promptContent).toContain('They were created by previous ARTK versions (before single-file consolidation)');
    });

    it('should include migration approach steps', () => {
      expect(promptContent).toContain('**Migration approach:**');
      expect(promptContent).toContain('List detected orphan files');
      expect(promptContent).toContain('Show user a summary of what content they contain');
      expect(promptContent).toContain('Should I migrate their ARTK content and remove them?');
    });

    it('should provide example orphan detection output', () => {
      expect(promptContent).toContain('**Example orphan detection output:**');
      expect(promptContent).toContain('Found orphan instruction files from older ARTK:');
      expect(promptContent).toContain('These are no longer needed (ARTK now uses single copilot-instructions.md)');
    });

    it('should reference consolidated single-file approach', () => {
      expect(promptContent).toContain('single `.github/copilot-instructions.md` file');
      expect(promptContent).toContain('### 7B) Create/Update `.github/copilot-instructions.md`');
    });
  });

  describe('Integration with existing workflow', () => {
    it('should maintain Part 3 structure', () => {
      expect(promptContent).toContain('# PART 3: JOURNEY SYSTEM (Conditional — only if journeySystem=true)');
      expect(promptContent).toContain('## Step 8 — Detect existing Journey Instance');
      expect(promptContent).toContain('## Step 9 — Detect installed ARTK Core (Journeys)');
    });

    it('should maintain Step 7 structure', () => {
      expect(promptContent).toContain('## Step 7 — Generate Copilot instructions');
      expect(promptContent).toContain('**IMPORTANT:** All ARTK instructions go in a SINGLE file');
    });

    it('should preserve non-negotiables', () => {
      expect(promptContent).toContain('## Non-negotiables (permanent guardrails)');
      expect(promptContent).toContain('**Idempotent + safe.** Never delete files.');
    });
  });

  describe('Documentation quality', () => {
    it('should include clear warning symbols', () => {
      expect(promptContent).toMatch(/⚠️.*Found orphan instruction files/);
      expect(promptContent).toMatch(/⚠️.*Detected existing Journey System installation/);
    });

    it('should provide actionable steps', () => {
      const step8AMatch = promptContent.match(/### 8A\) Detect old Journey System installations.*?## Step 9/s);
      expect(step8AMatch).toBeTruthy();
      if (step8AMatch) {
        expect(step8AMatch[0]).toContain('Migration actions');
        expect(step8AMatch[0]).toContain('Back up existing');
      }
    });

    it('should be well-structured with proper markdown hierarchy', () => {
      // Check that subsections are properly nested under main sections
      const step7Section = promptContent.match(/## Step 7 —.*?---/s);
      expect(step7Section).toBeTruthy();
      if (step7Section) {
        expect(step7Section[0]).toContain('### 7A)');
        expect(step7Section[0]).toContain('### 7B)');
      }
    });
  });
});
