"use strict";
/**
 * LLKB Cross-Journey Detection Module
 *
 * This module provides functions to detect duplicate patterns across
 * multiple journey test files and identify extraction opportunities.
 *
 * @module llkb/detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDuplicatesAcrossFiles = detectDuplicatesAcrossFiles;
exports.detectDuplicatesInFile = detectDuplicatesInFile;
exports.findUnusedComponentOpportunities = findUnusedComponentOpportunities;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const normalize_js_1 = require("./normalize.js");
const similarity_js_1 = require("./similarity.js");
const inference_js_1 = require("./inference.js");
// =============================================================================
// Constants
// =============================================================================
/** Default file extensions to scan */
const DEFAULT_EXTENSIONS = ['.ts', '.js'];
/** Default directories to exclude */
const DEFAULT_EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage'];
/** Regex to extract test.step blocks */
const TEST_STEP_REGEX = /(?:await\s+)?test\.step\s*\(\s*(['"`])(.+?)\1\s*,\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
/** Regex to extract journey ID from file */
const JOURNEY_ID_REGEX = /(?:JRN|jrn)[-_]?(\d+)/i;
// =============================================================================
// File Parsing Functions
// =============================================================================
/**
 * Extract journey ID from file path or content
 */
function extractJourneyId(filePath, content) {
    // Try filename first
    const fileMatch = path.basename(filePath).match(JOURNEY_ID_REGEX);
    if (fileMatch && fileMatch[1]) {
        return `JRN-${fileMatch[1].padStart(4, '0')}`;
    }
    // Try content
    const contentMatch = content.match(JOURNEY_ID_REGEX);
    if (contentMatch && contentMatch[1]) {
        return `JRN-${contentMatch[1].padStart(4, '0')}`;
    }
    // Generate from filename
    const basename = path.basename(filePath, path.extname(filePath));
    return `JRN-${basename.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20)}`;
}
/**
 * Parse test.step blocks from file content
 */
function parseTestSteps(filePath, content) {
    const steps = [];
    const journeyId = extractJourneyId(filePath, content);
    // Reset regex
    TEST_STEP_REGEX.lastIndex = 0;
    let match;
    while ((match = TEST_STEP_REGEX.exec(content)) !== null) {
        const stepName = match[2];
        const stepCode = match[3];
        // Skip if we didn't capture properly
        if (!stepName || !stepCode)
            continue;
        const trimmedCode = stepCode.trim();
        // Calculate line numbers
        const beforeMatch = content.slice(0, match.index);
        const lineStart = beforeMatch.split('\n').length;
        const lineEnd = lineStart + match[0].split('\n').length - 1;
        // Only include steps with actual code (not just comments)
        const codeWithoutComments = trimmedCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        if (codeWithoutComments.length > 0) {
            steps.push({
                file: filePath,
                journeyId,
                stepName,
                code: trimmedCode,
                lineStart,
                lineEnd,
            });
        }
    }
    return steps;
}
/**
 * Recursively find test files in directory
 */
function findTestFiles(dir, extensions, excludeDirs) {
    const files = [];
    if (!fs.existsSync(dir)) {
        return files;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
                files.push(...findTestFiles(fullPath, extensions, excludeDirs));
            }
        }
        else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
                // Look for test files specifically
                if (entry.name.includes('.spec.') ||
                    entry.name.includes('.test.') ||
                    entry.name.includes('.e2e.')) {
                    files.push(fullPath);
                }
            }
        }
    }
    return files;
}
// =============================================================================
// Duplicate Detection Functions
// =============================================================================
/**
 * Group similar patterns together
 */
function groupSimilarPatterns(steps, similarityThreshold, minLines) {
    const groups = new Map();
    const normalizedByStep = new Map();
    // Normalize all steps
    for (const step of steps) {
        const normalized = (0, normalize_js_1.normalizeCode)(step.code);
        const lineCount = (0, normalize_js_1.countLines)(step.code);
        // Skip steps that are too short
        if (lineCount < minLines) {
            continue;
        }
        normalizedByStep.set(step, normalized);
    }
    // Group by similarity
    const processed = new Set();
    for (const [step, normalized] of normalizedByStep) {
        if (processed.has(step))
            continue;
        const hash = (0, normalize_js_1.hashCode)(normalized);
        let foundGroup = false;
        // Check if this is similar to an existing group
        for (const [groupHash, groupSteps] of groups) {
            const firstGroupStep = groupSteps[0];
            if (!firstGroupStep)
                continue;
            const groupNormalized = normalizedByStep.get(firstGroupStep);
            if (!groupNormalized)
                continue;
            const similarity = (0, similarity_js_1.calculateSimilarity)(normalized, groupNormalized);
            if (similarity >= similarityThreshold) {
                const existingGroup = groups.get(groupHash);
                if (existingGroup) {
                    existingGroup.push(step);
                }
                processed.add(step);
                foundGroup = true;
                break;
            }
        }
        // Create new group if no match found
        if (!foundGroup) {
            groups.set(hash, [step]);
            processed.add(step);
        }
    }
    return groups;
}
/**
 * Convert step groups to duplicate groups with metadata
 */
function buildDuplicateGroups(stepGroups, minOccurrences) {
    const duplicateGroups = [];
    for (const [hash, steps] of stepGroups) {
        // Only include groups with multiple occurrences
        if (steps.length < minOccurrences) {
            continue;
        }
        const uniqueJourneys = new Set(steps.map((s) => s.journeyId)).size;
        const uniqueFiles = new Set(steps.map((s) => s.file)).size;
        // Calculate internal similarity (average pairwise similarity)
        let totalSimilarity = 0;
        let pairs = 0;
        for (let i = 0; i < steps.length; i++) {
            for (let j = i + 1; j < steps.length; j++) {
                const stepI = steps[i];
                const stepJ = steps[j];
                if (!stepI || !stepJ)
                    continue;
                const sim = (0, similarity_js_1.calculateSimilarity)((0, normalize_js_1.normalizeCode)(stepI.code), (0, normalize_js_1.normalizeCode)(stepJ.code));
                totalSimilarity += sim;
                pairs++;
            }
        }
        const internalSimilarity = pairs > 0 ? totalSimilarity / pairs : 1.0;
        // Collect original samples (up to 3)
        const originalSamples = steps.slice(0, 3).map((s) => s.code);
        // Infer category from first step
        const firstStep = steps[0];
        if (!firstStep)
            continue;
        const category = (0, inference_js_1.inferCategory)(firstStep.code);
        // Convert to TestStep format
        const occurrences = steps.map((s) => ({
            file: s.file,
            journey: s.journeyId,
            stepName: s.stepName,
            code: s.code,
            normalizedCode: (0, normalize_js_1.normalizeCode)(s.code),
            hash: (0, normalize_js_1.hashCode)((0, normalize_js_1.normalizeCode)(s.code)),
            lineStart: s.lineStart,
            lineEnd: s.lineEnd,
        }));
        duplicateGroups.push({
            patternHash: hash,
            normalizedCode: (0, normalize_js_1.normalizeCode)(firstStep.code),
            originalSamples,
            occurrences,
            uniqueJourneys,
            uniqueFiles,
            category,
            internalSimilarity,
        });
    }
    // Sort by number of occurrences (descending)
    return duplicateGroups.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
/**
 * Detect duplicate patterns across multiple test files
 *
 * Scans test files for test.step blocks, normalizes the code,
 * and groups similar patterns to identify extraction opportunities.
 *
 * @param testDir - Directory containing test files
 * @param options - Detection options
 * @returns Duplicate detection result with groups and candidates
 *
 * @example
 * ```typescript
 * const result = detectDuplicatesAcrossFiles(
 *   'artk-e2e/tests',
 *   { similarityThreshold: 0.8, minOccurrences: 2 }
 * );
 * console.log(`Found ${result.duplicatePatterns} duplicate patterns`);
 * ```
 */
function detectDuplicatesAcrossFiles(testDir, options = {}) {
    const { similarityThreshold = 0.8, minOccurrences = 2, minLines = 3, extensions = DEFAULT_EXTENSIONS, excludeDirs = DEFAULT_EXCLUDE_DIRS, } = options;
    // Find all test files
    const testFiles = findTestFiles(testDir, extensions, excludeDirs);
    // Parse all test steps
    const allSteps = [];
    for (const file of testFiles) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const steps = parseTestSteps(file, content);
            allSteps.push(...steps);
        }
        catch (error) {
            // Skip files that can't be read
            console.warn(`Warning: Could not read file ${file}`);
        }
    }
    // Group similar patterns
    const stepGroups = groupSimilarPatterns(allSteps, similarityThreshold, minLines);
    // Build duplicate groups
    const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
    // Count unique patterns (groups with 1 occurrence)
    const uniquePatterns = Array.from(stepGroups.values()).filter((g) => g.length === 1).length;
    // Convert to extraction candidates format
    const extractionCandidates = duplicateGroups.map((group) => ({
        pattern: group.normalizedCode,
        originalCode: group.originalSamples[0] || group.normalizedCode,
        occurrences: group.occurrences.length,
        journeys: [...new Set(group.occurrences.map((o) => o.journey))],
        files: [...new Set(group.occurrences.map((o) => o.file))],
        category: group.category,
        score: (group.occurrences.length * 0.3 + group.uniqueJourneys * 0.4 + group.internalSimilarity * 0.3),
        recommendation: group.occurrences.length >= 3 ? 'EXTRACT_NOW' :
            group.occurrences.length >= 2 ? 'CONSIDER' : 'SKIP',
    }));
    return {
        totalSteps: allSteps.length,
        uniquePatterns,
        duplicatePatterns: duplicateGroups.length,
        duplicateGroups,
        extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
        filesAnalyzed: testFiles,
    };
}
/**
 * Detect duplicates within a single file
 *
 * @param filePath - Path to the test file
 * @param options - Detection options
 * @returns Duplicate detection result
 */
function detectDuplicatesInFile(filePath, options = {}) {
    const { similarityThreshold = 0.8, minOccurrences = 2, minLines = 2, // Lower threshold for single file
     } = options;
    if (!fs.existsSync(filePath)) {
        return {
            totalSteps: 0,
            uniquePatterns: 0,
            duplicatePatterns: 0,
            duplicateGroups: [],
            extractionCandidates: [],
            filesAnalyzed: [],
        };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const steps = parseTestSteps(filePath, content);
    // Group similar patterns
    const stepGroups = groupSimilarPatterns(steps, similarityThreshold, minLines);
    // Build duplicate groups
    const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
    // Count unique patterns
    const uniquePatterns = Array.from(stepGroups.values()).filter((g) => g.length === 1).length;
    // Convert to extraction candidates
    const extractionCandidates = duplicateGroups.map((group) => {
        const firstOccurrence = group.occurrences[0];
        return {
            pattern: group.normalizedCode,
            originalCode: group.originalSamples[0] || group.normalizedCode,
            occurrences: group.occurrences.length,
            journeys: firstOccurrence ? [firstOccurrence.journey] : [],
            files: [filePath],
            category: group.category,
            score: group.occurrences.length * 0.5 + group.internalSimilarity * 0.5,
            recommendation: group.occurrences.length >= 2 ? 'CONSIDER' : 'SKIP',
        };
    });
    return {
        totalSteps: steps.length,
        uniquePatterns,
        duplicatePatterns: duplicateGroups.length,
        duplicateGroups,
        extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
        filesAnalyzed: [filePath],
    };
}
/**
 * Find patterns in test files that match existing components
 *
 * Useful for identifying code that should be refactored to use components.
 *
 * @param testDir - Directory containing test files
 * @param components - Existing components to match against
 * @param options - Detection options
 * @returns Array of matches with component and location
 */
function findUnusedComponentOpportunities(testDir, components, options = {}) {
    const { similarityThreshold = 0.6, // Lower threshold for opportunities
    extensions = DEFAULT_EXTENSIONS, excludeDirs = DEFAULT_EXCLUDE_DIRS, } = options;
    const testFiles = findTestFiles(testDir, extensions, excludeDirs);
    const opportunities = new Map();
    // Initialize map for each component
    for (const component of components) {
        if (!component.archived) {
            opportunities.set(component.id, []);
        }
    }
    // Scan all test files
    for (const file of testFiles) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const steps = parseTestSteps(file, content);
            for (const step of steps) {
                const normalizedStep = (0, normalize_js_1.normalizeCode)(step.code);
                // Compare against each component
                for (const component of components) {
                    if (component.archived)
                        continue;
                    const normalizedComponent = (0, normalize_js_1.normalizeCode)(component.source.originalCode);
                    const similarity = (0, similarity_js_1.calculateSimilarity)(normalizedStep, normalizedComponent);
                    if (similarity >= similarityThreshold) {
                        const componentOpportunities = opportunities.get(component.id);
                        if (componentOpportunities) {
                            componentOpportunities.push({
                                file: step.file,
                                stepName: step.stepName,
                                similarity,
                                lineStart: step.lineStart,
                                lineEnd: step.lineEnd,
                            });
                        }
                    }
                }
            }
        }
        catch {
            // Skip unreadable files
        }
    }
    // Convert to result format
    return components
        .filter((c) => {
        if (c.archived)
            return false;
        const ops = opportunities.get(c.id);
        return ops && ops.length > 0;
    })
        .map((component) => ({
        component,
        matches: (opportunities.get(component.id) || []).sort((a, b) => b.similarity - a.similarity),
    }))
        .sort((a, b) => b.matches.length - a.matches.length);
}
//# sourceMappingURL=detection.js.map