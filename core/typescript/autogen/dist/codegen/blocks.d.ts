/**
 * Managed Blocks - Alternative to AST editing for simpler code regeneration
 * @see research/2026-01-03_autogen-remaining-features-plan.md Feature 4
 */
/**
 * Block markers for generated code boundaries
 */
export declare const BLOCK_START = "// ARTK:BEGIN GENERATED";
export declare const BLOCK_END = "// ARTK:END GENERATED";
export declare const BLOCK_ID_PATTERN: RegExp;
/**
 * Represents a managed block of generated code
 */
export interface ManagedBlock {
    /** Optional identifier for the block */
    id?: string;
    /** Starting line number (0-indexed) */
    startLine: number;
    /** Ending line number (0-indexed) */
    endLine: number;
    /** Content between markers (excluding markers themselves) */
    content: string;
}
/**
 * Information about a malformed block
 */
export interface BlockWarning {
    /** Type of warning */
    type: 'nested' | 'unclosed';
    /** Line number where the issue occurred */
    line: number;
    /** Human-readable message */
    message: string;
}
/**
 * Result of extracting managed blocks from code
 */
export interface BlockExtractionResult {
    /** All managed blocks found */
    blocks: ManagedBlock[];
    /** Code outside of managed blocks */
    preservedCode: string[];
    /** Whether any blocks were found */
    hasBlocks: boolean;
    /** Warnings about malformed blocks */
    warnings: BlockWarning[];
}
/**
 * Options for injecting managed blocks
 */
export interface InjectBlocksOptions {
    /** Existing file content */
    existingCode: string;
    /** New blocks to inject */
    newBlocks: Array<{
        id?: string;
        content: string;
    }>;
    /** Whether to preserve block order (default: true) */
    preserveOrder?: boolean;
}
/**
 * Extract managed blocks from existing code
 *
 * @param code - Source code to analyze
 * @returns Extraction result with blocks and preserved code
 *
 * @example
 * ```typescript
 * const result = extractManagedBlocks(`
 *   // User code
 *   // ARTK:BEGIN GENERATED id=test-1
 *   test('example', () => {});
 *   // ARTK:END GENERATED
 *   // More user code
 * `);
 * // result.blocks.length === 1
 * // result.blocks[0].id === 'test-1'
 * ```
 */
export declare function extractManagedBlocks(code: string): BlockExtractionResult;
/**
 * Inject managed blocks into code, preserving user code outside blocks
 *
 * Behavior:
 * - If existing code has no blocks: append new blocks at end
 * - If existing code has blocks: replace matching blocks by ID
 * - If block ID not found: append new block at end
 * - All code outside blocks is preserved
 *
 * @param options - Injection options
 * @returns Updated code with injected blocks
 *
 * @example
 * ```typescript
 * const result = injectManagedBlocks({
 *   existingCode: `
 *     // User helper
 *     // ARTK:BEGIN GENERATED id=old-test
 *     test('old', () => {});
 *     // ARTK:END GENERATED
 *   `,
 *   newBlocks: [
 *     { id: 'old-test', content: "test('new', () => {});" }
 *   ]
 * });
 * // result contains replaced block with new content
 * ```
 */
export declare function injectManagedBlocks(options: InjectBlocksOptions): string;
//# sourceMappingURL=blocks.d.ts.map