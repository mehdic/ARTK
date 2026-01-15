/**
 * Managed Blocks - Alternative to AST editing for simpler code regeneration
 * @see research/2026-01-03_autogen-remaining-features-plan.md Feature 4
 */
/**
 * Block markers for generated code boundaries
 */
export const BLOCK_START = '// ARTK:BEGIN GENERATED';
export const BLOCK_END = '// ARTK:END GENERATED';
export const BLOCK_ID_PATTERN = /ARTK:BEGIN GENERATED(?:\s+id=([a-zA-Z0-9_-]+))?/;
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
export function extractManagedBlocks(code) {
    const lines = code.split('\n');
    const blocks = [];
    const preservedCode = [];
    let inBlock = false;
    let currentBlock = null;
    let blockContent = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for block start
        if (line.includes(BLOCK_START)) {
            if (inBlock) {
                // Nested block detected - treat as malformed
                console.warn(`Nested managed block detected at line ${i + 1}`);
            }
            inBlock = true;
            const match = line.match(BLOCK_ID_PATTERN);
            currentBlock = {
                id: match?.[1],
                startLine: i,
            };
            blockContent = [];
            continue;
        }
        // Check for block end
        if (line.includes(BLOCK_END) && inBlock) {
            inBlock = false;
            if (currentBlock) {
                blocks.push({
                    ...currentBlock,
                    endLine: i,
                    content: blockContent.join('\n'),
                });
            }
            currentBlock = null;
            blockContent = [];
            continue;
        }
        // Collect content
        if (inBlock) {
            blockContent.push(line);
        }
        else {
            preservedCode.push(line);
        }
    }
    // Handle unclosed block
    if (inBlock && currentBlock) {
        console.warn('Unclosed managed block detected - block will be ignored');
    }
    return {
        blocks,
        preservedCode,
        hasBlocks: blocks.length > 0,
    };
}
/**
 * Wrap content in managed block markers
 *
 * @param content - Code to wrap
 * @param id - Optional block identifier
 * @returns Wrapped content with markers
 *
 * @example
 * ```typescript
 * const wrapped = wrapInBlock("test('foo', () => {});", 'test-foo');
 * // Returns:
 * // // ARTK:BEGIN GENERATED id=test-foo
 * // test('foo', () => {});
 * // // ARTK:END GENERATED
 * ```
 */
function wrapInBlock(content, id) {
    const startMarker = id
        ? `${BLOCK_START} id=${id}`
        : BLOCK_START;
    return `${startMarker}\n${content}\n${BLOCK_END}`;
}
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
export function injectManagedBlocks(options) {
    const { existingCode, newBlocks } = options;
    // If no existing code, just wrap new blocks
    if (!existingCode.trim()) {
        return newBlocks
            .map(block => wrapInBlock(block.content, block.id))
            .join('\n\n');
    }
    const { preservedCode, hasBlocks } = extractManagedBlocks(existingCode);
    if (!hasBlocks) {
        // No existing blocks - append new blocks at end
        const preserved = preservedCode.join('\n').trim();
        const newContent = newBlocks
            .map(block => wrapInBlock(block.content, block.id))
            .join('\n\n');
        return preserved ? `${preserved}\n\n${newContent}` : newContent;
    }
    // Replace existing blocks by ID, preserve structure
    const result = [];
    const processedIds = new Set();
    // Re-scan to maintain structure
    const lines = existingCode.split('\n');
    let inBlock = false;
    let currentBlockId;
    let skipUntilEnd = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(BLOCK_START)) {
            inBlock = true;
            const match = line.match(BLOCK_ID_PATTERN);
            currentBlockId = match?.[1];
            // Find replacement block
            const replacement = newBlocks.find(b => b.id === currentBlockId);
            if (replacement) {
                result.push(wrapInBlock(replacement.content, replacement.id));
                processedIds.add(currentBlockId || '');
                skipUntilEnd = true;
            }
            else {
                // Keep original block
                result.push(line);
                skipUntilEnd = false;
            }
            continue;
        }
        if (line.includes(BLOCK_END) && inBlock) {
            inBlock = false;
            if (!skipUntilEnd) {
                result.push(line);
            }
            currentBlockId = undefined;
            skipUntilEnd = false;
            continue;
        }
        // Add content
        if (!inBlock) {
            result.push(line);
        }
        else if (!skipUntilEnd) {
            result.push(line);
        }
    }
    // Append new blocks that weren't replacements
    for (const block of newBlocks) {
        if (!processedIds.has(block.id || '')) {
            result.push('');
            result.push(wrapInBlock(block.content, block.id));
        }
    }
    return result.join('\n');
}
//# sourceMappingURL=blocks.js.map