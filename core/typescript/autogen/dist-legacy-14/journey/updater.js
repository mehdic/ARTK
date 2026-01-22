"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJourneyFrontmatter = updateJourneyFrontmatter;
exports.isJourneyTestCurrent = isJourneyTestCurrent;
/**
 * Journey Frontmatter Updater - Enable bi-directional traceability
 * @see research/2026-01-03_autogen-remaining-features-plan.md Section 1
 */
const node_fs_1 = require("node:fs");
const yaml_1 = require("yaml");
const node_crypto_1 = require("node:crypto");
/**
 * Split journey content into frontmatter and body
 */
function splitJourneyContent(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        throw new Error('Invalid Journey format: missing frontmatter delimiters (content should be wrapped in --- ... ---)');
    }
    return {
        frontmatter: match[1],
        body: match[2],
    };
}
/**
 * Calculate SHA-256 hash of content (first 8 characters)
 */
function calculateContentHash(content) {
    return (0, node_crypto_1.createHash)('sha256').update(content).digest('hex').substring(0, 8);
}
/**
 * Update Journey frontmatter with generated test info
 *
 * This enables bi-directional traceability by:
 * 1. Recording which tests were generated from this Journey
 * 2. Tracking when tests were generated
 * 3. Detecting test changes via content hash
 * 4. Linking module dependencies
 *
 * @param options - Update options
 * @returns Update result with previous and new state
 * @throws Error if journey file is invalid or cannot be written
 */
function updateJourneyFrontmatter(options) {
    const { journeyPath, testPath, testContent, modules = { foundation: [], features: [] }, } = options;
    // Read journey file
    const content = (0, node_fs_1.readFileSync)(journeyPath, 'utf-8');
    // Split frontmatter and body
    const { frontmatter, body } = splitJourneyContent(content);
    // Parse YAML frontmatter
    const parsed = (0, yaml_1.parse)(frontmatter);
    // Store previous state (deep copy to avoid mutation)
    const previousTests = Array.isArray(parsed.tests)
        ? parsed.tests.map((t) => typeof t === 'string' ? { path: t, generated: '', hash: '' } : { ...t })
        : [];
    // Calculate content hash
    const hash = calculateContentHash(testContent);
    // Create/update test entry
    const testEntry = {
        path: testPath,
        generated: new Date().toISOString(),
        hash,
    };
    // Ensure tests array exists
    if (!Array.isArray(parsed.tests)) {
        parsed.tests = [];
    }
    // Find existing test entry by path
    const existingIndex = parsed.tests.findIndex((t) => typeof t === 'string'
        ? t === testPath
        : t.path === testPath);
    // Update or add test entry
    if (existingIndex >= 0) {
        parsed.tests[existingIndex] = testEntry;
    }
    else {
        parsed.tests.push(testEntry);
    }
    // Update modules
    const modulesAdded = {
        foundation: [],
        features: [],
    };
    // Ensure modules structure exists
    if (!parsed.modules || typeof parsed.modules !== 'object') {
        parsed.modules = { foundation: [], features: [] };
    }
    const parsedModules = parsed.modules;
    // Ensure foundation and features arrays exist
    if (!Array.isArray(parsedModules.foundation)) {
        parsedModules.foundation = [];
    }
    if (!Array.isArray(parsedModules.features)) {
        parsedModules.features = [];
    }
    // Add foundation modules (deduplicate)
    if (modules.foundation) {
        const existingFoundation = new Set(parsedModules.foundation);
        for (const mod of modules.foundation) {
            if (!existingFoundation.has(mod)) {
                modulesAdded.foundation.push(mod);
                parsedModules.foundation.push(mod);
            }
        }
        // Sort for consistency
        parsedModules.foundation.sort();
    }
    // Add feature modules (deduplicate)
    if (modules.features) {
        const existingFeatures = new Set(parsedModules.features);
        for (const mod of modules.features) {
            if (!existingFeatures.has(mod)) {
                modulesAdded.features.push(mod);
                parsedModules.features.push(mod);
            }
        }
        // Sort for consistency
        parsedModules.features.sort();
    }
    // Reconstruct file with updated frontmatter
    const newFrontmatter = (0, yaml_1.stringify)(parsed, {
        lineWidth: 0, // Prevent line wrapping
        defaultKeyType: 'PLAIN',
        defaultStringType: 'QUOTE_DOUBLE',
    });
    const newContent = `---\n${newFrontmatter}---\n${body}`;
    // Write back to file
    (0, node_fs_1.writeFileSync)(journeyPath, newContent, 'utf-8');
    return {
        success: true,
        previousTests,
        updatedTests: parsed.tests,
        modulesAdded,
    };
}
/**
 * Check if a Journey's test is up-to-date based on content hash
 *
 * @param journeyPath - Path to the journey file
 * @param testPath - Path to the test file to check
 * @param testContent - Current content of the test file
 * @returns True if the test hash matches the recorded hash
 */
function isJourneyTestCurrent(journeyPath, testPath, testContent) {
    const content = (0, node_fs_1.readFileSync)(journeyPath, 'utf-8');
    const { frontmatter } = splitJourneyContent(content);
    const parsed = (0, yaml_1.parse)(frontmatter);
    if (!Array.isArray(parsed.tests)) {
        return false;
    }
    // Find test entry
    const testEntry = parsed.tests.find((t) => typeof t === 'string' ? t === testPath : t.path === testPath);
    if (!testEntry || typeof testEntry === 'string') {
        return false;
    }
    // Calculate current hash
    const currentHash = calculateContentHash(testContent);
    return testEntry.hash === currentHash;
}
//# sourceMappingURL=updater.js.map