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
    const warnings = [];
    let inBlock = false;
    let currentBlock = null;
    let blockContent = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for block start
        if (line.includes(BLOCK_START)) {
            if (inBlock) {
                // Nested block detected - close the previous block and warn
                const message = `Nested managed block detected at line ${i + 1}. Previous block starting at line ${(currentBlock?.startLine ?? 0) + 1} will be closed.`;
                console.warn(message);
                warnings.push({
                    type: 'nested',
                    line: i + 1,
                    message,
                });
                // Save the incomplete previous block
                if (currentBlock) {
                    blocks.push({
                        ...currentBlock,
                        endLine: i - 1,
                        content: blockContent.join('\n'),
                    });
                }
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
        const message = `Unclosed managed block starting at line ${(currentBlock.startLine ?? 0) + 1} - block will be ignored`;
        console.warn(message);
        warnings.push({
            type: 'unclosed',
            line: (currentBlock.startLine ?? 0) + 1,
            message,
        });
    }
    return {
        blocks,
        preservedCode,
        hasBlocks: blocks.length > 0,
        warnings,
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
export function wrapInBlock(content, id) {
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
    // Track id-less blocks separately by position to avoid ambiguous matching
    let idLessBlockIndex = 0;
    const idLessNewBlocks = newBlocks.filter(b => !b.id);
    const processedIdLessIndices = new Set();
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
            let replacement;
            if (currentBlockId) {
                // Match by ID for blocks with IDs
                replacement = newBlocks.find(b => b.id === currentBlockId);
                if (replacement) {
                    processedIds.add(currentBlockId);
                }
            }
            else {
                // Match id-less blocks by position
                if (idLessBlockIndex < idLessNewBlocks.length) {
                    replacement = idLessNewBlocks[idLessBlockIndex];
                    processedIdLessIndices.add(idLessBlockIndex);
                }
                idLessBlockIndex++;
            }
            if (replacement) {
                result.push(wrapInBlock(replacement.content, replacement.id));
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
    for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];
        if (block.id) {
            // Check if this ID was processed
            if (!processedIds.has(block.id)) {
                result.push('');
                result.push(wrapInBlock(block.content, block.id));
            }
        }
        else {
            // Check if this id-less block was processed (by its index in idLessNewBlocks)
            const idLessIndex = idLessNewBlocks.indexOf(block);
            if (!processedIdLessIndices.has(idLessIndex)) {
                result.push('');
                result.push(wrapInBlock(block.content, block.id));
            }
        }
    }
    return result.join('\n');
}
//# sourceMappingURL=blocks.js.map