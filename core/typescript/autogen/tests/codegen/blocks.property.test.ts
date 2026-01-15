/**
 * Property-based tests for managed blocks functionality
 *
 * Uses fast-check to generate arbitrary inputs and verify invariants
 * that should hold for any combination of blocks.
 *
 * @see research/2026-01-15_code_quality_standards.md Category 5 (Data Structure Bugs)
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  extractManagedBlocks,
  injectManagedBlocks,
  wrapInBlock,
  BLOCK_START,
  BLOCK_END,
} from '../../src/codegen/blocks.js';

/**
 * Arbitrary for generating valid block IDs
 * Block IDs should be alphanumeric with hyphens and underscores
 */
const blockIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

/**
 * Arbitrary for generating block content
 * Content should not contain block markers to avoid confusion
 */
const blockContentArb = fc.string({ minLength: 0, maxLength: 500 })
  .filter(s => !s.includes(BLOCK_START) && !s.includes(BLOCK_END));

/**
 * Arbitrary for generating a single managed block
 */
const managedBlockArb = fc.record({
  id: fc.option(blockIdArb, { nil: undefined }),
  content: blockContentArb,
});

/**
 * Arbitrary for generating an array of managed blocks
 */
const blocksArrayArb = fc.array(managedBlockArb, { minLength: 0, maxLength: 10 });

/**
 * Arbitrary for generating code that might be outside blocks
 */
const preservedCodeArb = fc.string({ minLength: 0, maxLength: 200 })
  .filter(s => !s.includes(BLOCK_START) && !s.includes(BLOCK_END));

describe('Managed Blocks - Property-Based Tests', () => {
  describe('wrapInBlock', () => {
    it('should always produce output containing the content', () => {
      fc.assert(
        fc.property(blockContentArb, fc.option(blockIdArb, { nil: undefined }), (content, id) => {
          const wrapped = wrapInBlock(content, id);
          expect(wrapped).toContain(content);
        })
      );
    });

    it('should always include START and END markers', () => {
      fc.assert(
        fc.property(blockContentArb, fc.option(blockIdArb, { nil: undefined }), (content, id) => {
          const wrapped = wrapInBlock(content, id);
          expect(wrapped).toContain(BLOCK_START);
          expect(wrapped).toContain(BLOCK_END);
        })
      );
    });

    it('should include ID in marker when provided', () => {
      fc.assert(
        fc.property(blockContentArb, blockIdArb, (content, id) => {
          const wrapped = wrapInBlock(content, id);
          expect(wrapped).toContain(`id=${id}`);
        })
      );
    });

    it('should not include id= when ID is undefined', () => {
      fc.assert(
        fc.property(blockContentArb, (content) => {
          const wrapped = wrapInBlock(content, undefined);
          expect(wrapped).not.toContain('id=');
        })
      );
    });
  });

  describe('extractManagedBlocks', () => {
    it('should always return an array of blocks', () => {
      fc.assert(
        fc.property(fc.string(), (code) => {
          const result = extractManagedBlocks(code);
          expect(Array.isArray(result.blocks)).toBe(true);
          expect(Array.isArray(result.preservedCode)).toBe(true);
          expect(typeof result.hasBlocks).toBe('boolean');
        })
      );
    });

    it('hasBlocks should be true iff blocks array is non-empty', () => {
      fc.assert(
        fc.property(fc.string(), (code) => {
          const result = extractManagedBlocks(code);
          expect(result.hasBlocks).toBe(result.blocks.length > 0);
        })
      );
    });

    it('should extract the same number of blocks as START markers (for well-formed input)', () => {
      fc.assert(
        fc.property(blocksArrayArb, (blocks) => {
          // Generate well-formed code
          const code = blocks.map(b => wrapInBlock(b.content, b.id)).join('\n\n');
          const result = extractManagedBlocks(code);
          expect(result.blocks.length).toBe(blocks.length);
        })
      );
    });

    it('should preserve block IDs when extracting', () => {
      fc.assert(
        fc.property(blocksArrayArb.filter(arr => arr.every(b => b.id !== undefined)), (blocks) => {
          const code = blocks.map(b => wrapInBlock(b.content, b.id)).join('\n\n');
          const result = extractManagedBlocks(code);

          for (let i = 0; i < blocks.length; i++) {
            expect(result.blocks[i].id).toBe(blocks[i].id);
          }
        })
      );
    });

    it('should preserve block content when extracting', () => {
      fc.assert(
        fc.property(blocksArrayArb, (blocks) => {
          const code = blocks.map(b => wrapInBlock(b.content, b.id)).join('\n\n');
          const result = extractManagedBlocks(code);

          for (let i = 0; i < blocks.length; i++) {
            expect(result.blocks[i].content).toBe(blocks[i].content);
          }
        })
      );
    });
  });

  describe('injectManagedBlocks', () => {
    it('should include all new block contents in output', () => {
      fc.assert(
        fc.property(preservedCodeArb, blocksArrayArb, (existingCode, newBlocks) => {
          const result = injectManagedBlocks({ existingCode, newBlocks });

          for (const block of newBlocks) {
            expect(result).toContain(block.content);
          }
        })
      );
    });

    it('should preserve code outside blocks', () => {
      fc.assert(
        fc.property(
          preservedCodeArb.filter(s => s.trim().length > 0),
          blocksArrayArb,
          (existingCode, newBlocks) => {
            const result = injectManagedBlocks({ existingCode, newBlocks });
            // At minimum, the preserved code should appear somewhere in output
            // (might be split across lines)
            const normalizedExisting = existingCode.replace(/\s+/g, ' ').trim();
            const normalizedResult = result.replace(/\s+/g, ' ').trim();

            if (normalizedExisting.length > 0) {
              // Check that words from existing code appear in result
              const words = normalizedExisting.split(' ').filter(w => w.length > 2);
              for (const word of words.slice(0, 5)) { // Check first 5 significant words
                if (!word.includes('/') && !word.includes('*')) {
                  // Skip comment markers
                  expect(normalizedResult.toLowerCase()).toContain(word.toLowerCase());
                }
              }
            }
          }
        )
      );
    });

    it('should replace blocks with matching IDs', () => {
      // Use non-trivial unique content that won't appear in markers
      const uniqueContentArb = fc.string({ minLength: 5, maxLength: 100 })
        .filter(s =>
          !s.includes(BLOCK_START) &&
          !s.includes(BLOCK_END) &&
          !s.includes('ARTK') &&
          !s.includes('GENERATED') &&
          s.trim().length >= 5
        );

      fc.assert(
        fc.property(
          blockIdArb,
          uniqueContentArb,
          uniqueContentArb,
          (id, oldContent, newContent) => {
            fc.pre(oldContent !== newContent); // Only test when content differs
            fc.pre(!newContent.includes(oldContent)); // New content shouldn't contain old
            fc.pre(!oldContent.includes(newContent)); // Old content shouldn't contain new

            const existingCode = wrapInBlock(oldContent, id);
            const result = injectManagedBlocks({
              existingCode,
              newBlocks: [{ id, content: newContent }],
            });

            expect(result).toContain(newContent);
            expect(result).not.toContain(oldContent);
          }
        )
      );
    });

    it('should append new blocks that have no matching ID in existing code', () => {
      fc.assert(
        fc.property(
          blockIdArb,
          blockIdArb,
          blockContentArb,
          blockContentArb,
          (existingId, newId, existingContent, newContent) => {
            fc.pre(existingId !== newId); // IDs must differ

            const existingCode = wrapInBlock(existingContent, existingId);
            const result = injectManagedBlocks({
              existingCode,
              newBlocks: [{ id: newId, content: newContent }],
            });

            // Both blocks should be present
            expect(result).toContain(existingContent);
            expect(result).toContain(newContent);
            expect(result).toContain(`id=${existingId}`);
            expect(result).toContain(`id=${newId}`);
          }
        )
      );
    });

    it('output should be valid input for extractManagedBlocks (roundtrip)', () => {
      fc.assert(
        fc.property(preservedCodeArb, blocksArrayArb, (existingCode, newBlocks) => {
          const injected = injectManagedBlocks({ existingCode, newBlocks });
          const extracted = extractManagedBlocks(injected);

          // Should not produce warnings for well-formed output
          expect(extracted.warnings).toHaveLength(0);
        })
      );
    });
  });

  describe('id-less blocks handling', () => {
    it('should handle multiple id-less blocks by position', () => {
      fc.assert(
        fc.property(
          fc.array(blockContentArb, { minLength: 1, maxLength: 5 }),
          fc.array(blockContentArb, { minLength: 1, maxLength: 5 }),
          (existingContents, newContents) => {
            // Create existing code with id-less blocks
            const existingCode = existingContents
              .map(c => wrapInBlock(c, undefined))
              .join('\n\n');

            // Create new blocks (also id-less)
            const newBlocks = newContents.map(c => ({ content: c }));

            const result = injectManagedBlocks({
              existingCode,
              newBlocks,
            });

            // All new content should appear
            for (const content of newContents) {
              expect(result).toContain(content);
            }

            // Result should be well-formed
            const extracted = extractManagedBlocks(result);
            expect(extracted.warnings).toHaveLength(0);
          }
        )
      );
    });

    it('should not mix up id-less and id-ed blocks', () => {
      fc.assert(
        fc.property(
          blockIdArb,
          blockContentArb,
          blockContentArb,
          (id, idContent, idLessContent) => {
            // Create existing code with mixed blocks
            const existingCode = [
              wrapInBlock(idLessContent, undefined),
              wrapInBlock(idContent, id),
            ].join('\n\n');

            // Replace both
            const result = injectManagedBlocks({
              existingCode,
              newBlocks: [
                { content: 'new-idless' },
                { id, content: 'new-with-id' },
              ],
            });

            expect(result).toContain('new-idless');
            expect(result).toContain('new-with-id');
            expect(result).toContain(`id=${id}`);

            // Verify structure
            const extracted = extractManagedBlocks(result);
            const idBlock = extracted.blocks.find(b => b.id === id);
            expect(idBlock?.content).toBe('new-with-id');
          }
        )
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty inputs gracefully', () => {
      fc.assert(
        fc.property(fc.constant(''), fc.constant([]), (existingCode, newBlocks) => {
          const result = injectManagedBlocks({ existingCode, newBlocks });
          expect(result).toBe('');
        })
      );
    });

    it('should handle very long content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1000, maxLength: 5000 })
            .filter(s => !s.includes(BLOCK_START) && !s.includes(BLOCK_END)),
          blockIdArb,
          (longContent, id) => {
            const result = injectManagedBlocks({
              existingCode: '',
              newBlocks: [{ id, content: longContent }],
            });

            expect(result).toContain(longContent);

            const extracted = extractManagedBlocks(result);
            expect(extracted.blocks[0].content).toBe(longContent);
          }
        )
      );
    });

    it('should handle special characters in content', () => {
      // Generate strings that contain special characters
      const specialCharsArb = fc.string({ minLength: 1, maxLength: 100 })
        .filter(s =>
          /[\n\t !@#$%^&*()[\]{}|;:'",.<>?/\\`~]/.test(s) &&
          !s.includes(BLOCK_START) &&
          !s.includes(BLOCK_END)
        );

      fc.assert(
        fc.property(specialCharsArb, blockIdArb, (content, id) => {
          const result = injectManagedBlocks({
            existingCode: '',
            newBlocks: [{ id, content }],
          });

          const extracted = extractManagedBlocks(result);
          expect(extracted.blocks[0].content).toBe(content);
        })
      );
    });

    it('should maintain block count when replacing all blocks', () => {
      fc.assert(
        fc.property(
          fc.array(managedBlockArb.map(b => ({ ...b, id: undefined })), { minLength: 1, maxLength: 5 }),
          (blocks) => {
            // Create initial code
            const initial = blocks.map(b => wrapInBlock(b.content, undefined)).join('\n\n');

            // Create same number of new blocks
            const newBlocks = blocks.map((_b, i) => ({
              content: `replacement-${i}`,
            }));

            const result = injectManagedBlocks({
              existingCode: initial,
              newBlocks,
            });

            const extracted = extractManagedBlocks(result);
            // Should have at least as many blocks as we injected
            expect(extracted.blocks.length).toBeGreaterThanOrEqual(newBlocks.length);
          }
        )
      );
    });
  });

  describe('invariants', () => {
    it('extractManagedBlocks(wrapInBlock(c, id)) should yield that block', () => {
      fc.assert(
        fc.property(blockContentArb, fc.option(blockIdArb, { nil: undefined }), (content, id) => {
          const wrapped = wrapInBlock(content, id);
          const extracted = extractManagedBlocks(wrapped);

          expect(extracted.blocks).toHaveLength(1);
          expect(extracted.blocks[0].id).toBe(id);
          expect(extracted.blocks[0].content).toBe(content);
        })
      );
    });

    it('inject followed by extract should yield consistent blocks', () => {
      fc.assert(
        fc.property(
          blocksArrayArb.filter(arr => arr.length > 0 && arr.every(b => b.id !== undefined)),
          (blocks) => {
            // Ensure unique IDs
            const uniqueIds = new Set(blocks.map(b => b.id));
            fc.pre(uniqueIds.size === blocks.length);

            const injected = injectManagedBlocks({
              existingCode: '',
              newBlocks: blocks,
            });

            const extracted = extractManagedBlocks(injected);

            // Should have same number of blocks
            expect(extracted.blocks.length).toBe(blocks.length);

            // Each injected block should be extractable
            for (const block of blocks) {
              const found = extracted.blocks.find(b => b.id === block.id);
              expect(found).toBeDefined();
              expect(found?.content).toBe(block.content);
            }
          }
        )
      );
    });
  });
});
