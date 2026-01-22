"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyParseError = exports.JourneyStatusSchema = exports.JourneyFrontmatterSchema = void 0;
exports.parseStructuredSteps = parseStructuredSteps;
exports.parseJourney = parseJourney;
exports.parseJourneyForAutoGen = parseJourneyForAutoGen;
exports.parseJourneyContent = parseJourneyContent;
exports.tryParseJourneyContent = tryParseJourneyContent;
/**
 * Journey Parser - Parse YAML frontmatter + markdown body
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const schema_js_1 = require("./schema.js");
Object.defineProperty(exports, "JourneyFrontmatterSchema", { enumerable: true, get: function () { return schema_js_1.JourneyFrontmatterSchema; } });
Object.defineProperty(exports, "JourneyStatusSchema", { enumerable: true, get: function () { return schema_js_1.JourneyStatusSchema; } });
const patterns_js_1 = require("../mapping/patterns.js");
const result_js_1 = require("../utils/result.js");
/**
 * Error thrown when journey parsing fails
 */
class JourneyParseError extends Error {
    filePath;
    cause;
    constructor(message, filePath, cause) {
        super(message);
        this.name = 'JourneyParseError';
        this.filePath = filePath;
        this.cause = cause;
    }
}
exports.JourneyParseError = JourneyParseError;
/**
 * Regex patterns for parsing
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content) {
    const match = FRONTMATTER_REGEX.exec(content);
    if (!match) {
        throw new Error('No YAML frontmatter found (content should start with ---)');
    }
    return {
        frontmatter: match[1],
        body: content.slice(match[0].length).trim(),
    };
}
/**
 * Parse acceptance criteria from markdown body
 */
function parseAcceptanceCriteria(body) {
    const criteria = [];
    // Find the Acceptance Criteria section
    const acSectionMatch = body.match(/##\s*Acceptance\s*Criteria\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!acSectionMatch) {
        return criteria;
    }
    const acSection = acSectionMatch[1];
    // Split by AC headers (### AC-N or ## AC-N)
    const acPattern = /^###?\s*(AC-\d+)[:\s]*(.*?)$/gim;
    const parts = [];
    let match;
    while ((match = acPattern.exec(acSection)) !== null) {
        parts.push({
            id: match[1].toUpperCase(),
            title: match[2].trim(),
            startIndex: match.index + match[0].length,
        });
    }
    // Extract content for each AC
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // Get content between this AC header and the next
        const contentStart = part.startIndex;
        const contentEnd = i + 1 < parts.length
            ? acSection.lastIndexOf('###', parts[i + 1].startIndex)
            : acSection.length;
        const content = acSection.slice(contentStart, contentEnd > contentStart ? contentEnd : acSection.length);
        // Extract bullet points as steps
        const steps = [];
        const bulletPattern = /^[-*]\s+(.+)$/gm;
        let bulletMatch;
        while ((bulletMatch = bulletPattern.exec(content)) !== null) {
            steps.push(bulletMatch[1].trim());
        }
        // Build raw content
        const headerMatch = acSection.match(new RegExp(`###?\\s*${part.id}[:\\s]*${part.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        const rawContent = headerMatch
            ? headerMatch[0] + content.slice(0, content.indexOf('\n###') > 0 ? content.indexOf('\n###') : content.length)
            : content;
        criteria.push({
            id: part.id,
            title: part.title,
            steps,
            rawContent: rawContent.trim(),
        });
    }
    return criteria;
}
/**
 * Parse procedural steps from markdown body
 */
function parseProceduralSteps(body) {
    const steps = [];
    // Find the Procedural Steps section
    const psMatch = body.match(/##\s*Procedural\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!psMatch) {
        return steps;
    }
    const psSection = psMatch[1];
    // Parse numbered steps
    const numberedPattern = /^\d+\.\s+(.+)$/gm;
    let match;
    let stepNumber = 1;
    while ((match = numberedPattern.exec(psSection)) !== null) {
        const text = match[1].trim();
        // Check for AC reference in text (e.g., "(AC-1)")
        const acRef = text.match(/\(AC-(\d+)\)/i);
        steps.push({
            number: stepNumber++,
            text: text.replace(/\s*\(AC-\d+\)\s*/gi, '').trim(),
            linkedAC: acRef ? `AC-${acRef[1]}` : undefined,
        });
    }
    // Also parse bullet points if no numbered steps
    if (steps.length === 0) {
        const bulletPattern = /^[-*]\s+(.+)$/gm;
        while ((match = bulletPattern.exec(psSection)) !== null) {
            const text = match[1].trim();
            const acRef = text.match(/\(AC-(\d+)\)/i);
            steps.push({
                number: stepNumber++,
                text: text.replace(/\s*\(AC-\d+\)\s*/gi, '').trim(),
                linkedAC: acRef ? `AC-${acRef[1]}` : undefined,
            });
        }
    }
    return steps;
}
/**
 * Parse data/environment notes from markdown body
 */
function parseDataNotes(body) {
    const notes = [];
    // Find Data/Environment section
    const dataMatch = body.match(/##\s*(Data|Environment|Data\/Environment)\s*(Notes?)?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!dataMatch) {
        return notes;
    }
    const dataSection = dataMatch[3];
    // Extract bullet points
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    let match;
    while ((match = bulletPattern.exec(dataSection)) !== null) {
        notes.push(match[1].trim());
    }
    return notes;
}
/**
 * Parse structured steps from markdown content
 * Parses the new structured format with Action/Wait for/Assert bullets
 * @param content - The markdown content containing structured steps
 * @returns Array of parsed structured steps
 */
function parseStructuredSteps(content) {
    const steps = [];
    // Split content by step headers
    const sections = content.split(/(?=^###\s*Step\s+\d+:)/m);
    for (const section of sections) {
        // Match the step header
        const headerMatch = section.match(/^###\s*Step\s+(\d+):\s*(.+)$/m);
        if (!headerMatch)
            continue;
        const step = {
            stepNumber: parseInt(headerMatch[1], 10),
            stepName: headerMatch[2].trim(),
            actions: [],
        };
        // Parse bullet points in this section
        let bulletMatch;
        // Create a fresh regex for each section to reset lastIndex
        const sectionBulletRegex = /^-\s*\*\*(Action|Wait for|Assert)\*\*:\s*(.+)$/gm;
        while ((bulletMatch = sectionBulletRegex.exec(section)) !== null) {
            const [, type, text] = bulletMatch;
            // Determine action type
            const actionType = type.toLowerCase() === 'action' ? 'action'
                : type.toLowerCase() === 'wait for' ? 'wait'
                    : 'assert';
            // Try to parse the text using pattern matching
            const primitive = (0, patterns_js_1.matchPattern)(text.trim());
            if (primitive) {
                // Extract meaningful info from the primitive
                let action = '';
                let target = '';
                let value;
                switch (primitive.type) {
                    case 'goto':
                        action = 'navigate';
                        target = primitive.url;
                        break;
                    case 'click':
                        action = 'click';
                        target = primitive.locator.value;
                        break;
                    case 'fill':
                        action = 'fill';
                        target = primitive.locator.value;
                        value = primitive.value.value;
                        break;
                    case 'select':
                        action = 'select';
                        target = primitive.locator.value;
                        value = primitive.option;
                        break;
                    case 'check':
                        action = 'check';
                        target = primitive.locator.value;
                        break;
                    case 'uncheck':
                        action = 'uncheck';
                        target = primitive.locator.value;
                        break;
                    case 'expectVisible':
                        action = 'expectVisible';
                        target = primitive.locator.value;
                        break;
                    case 'expectToast':
                        action = 'expectToast';
                        target = primitive.toastType || 'info';
                        value = primitive.message;
                        break;
                    case 'expectURL':
                        action = 'expectURL';
                        target = typeof primitive.pattern === 'string' ? primitive.pattern : primitive.pattern.source;
                        break;
                    case 'callModule':
                        action = `${primitive.module}.${primitive.method}`;
                        target = primitive.args?.join(', ') || '';
                        break;
                    case 'waitForURL':
                        action = 'waitForURL';
                        target = typeof primitive.pattern === 'string' ? primitive.pattern : primitive.pattern.source;
                        break;
                    case 'waitForLoadingComplete':
                        action = 'waitForLoadingComplete';
                        target = '';
                        break;
                    default:
                        // Fallback for unknown primitive types
                        action = text.trim();
                        target = '';
                }
                step.actions.push({
                    type: actionType,
                    action,
                    target,
                    value,
                });
            }
            else {
                // If pattern matching fails, store the raw text
                step.actions.push({
                    type: actionType,
                    action: text.trim(),
                    target: '',
                    value: undefined,
                });
            }
        }
        // Only add steps that have actions
        if (step.actions.length > 0) {
            steps.push(step);
        }
    }
    return steps;
}
/**
 * Parse a journey markdown file
 * @param filePath - Path to the journey file
 * @returns Parsed journey structure
 * @throws JourneyParseError if parsing fails
 */
function parseJourney(filePath) {
    const resolvedPath = (0, node_path_1.resolve)(filePath);
    if (!(0, node_fs_1.existsSync)(resolvedPath)) {
        throw new JourneyParseError(`Journey file not found: ${resolvedPath}`, resolvedPath);
    }
    let content;
    try {
        content = (0, node_fs_1.readFileSync)(resolvedPath, 'utf-8');
    }
    catch (err) {
        throw new JourneyParseError(`Failed to read journey file: ${resolvedPath}`, resolvedPath, err);
    }
    // Extract frontmatter and body
    let frontmatterStr;
    let body;
    try {
        const extracted = extractFrontmatter(content);
        frontmatterStr = extracted.frontmatter;
        body = extracted.body;
    }
    catch (err) {
        throw new JourneyParseError(`Invalid frontmatter in journey file: ${resolvedPath}`, resolvedPath, err);
    }
    // Parse YAML frontmatter
    let rawFrontmatter;
    try {
        rawFrontmatter = (0, yaml_1.parse)(frontmatterStr);
    }
    catch (err) {
        throw new JourneyParseError(`Invalid YAML in journey frontmatter: ${resolvedPath}`, resolvedPath, err);
    }
    // Validate frontmatter with Zod
    const result = schema_js_1.JourneyFrontmatterSchema.safeParse(rawFrontmatter);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new JourneyParseError(`Invalid journey frontmatter in ${resolvedPath}:\n${issues}`, resolvedPath, result.error);
    }
    // Parse body sections
    const acceptanceCriteria = parseAcceptanceCriteria(body);
    const proceduralSteps = parseProceduralSteps(body);
    const dataNotes = parseDataNotes(body);
    return {
        frontmatter: result.data,
        body,
        acceptanceCriteria,
        proceduralSteps,
        dataNotes,
        sourcePath: resolvedPath,
    };
}
/**
 * Parse and validate a journey for AutoGen (must be clarified)
 */
function parseJourneyForAutoGen(filePath) {
    const parsed = parseJourney(filePath);
    const validation = (0, schema_js_1.validateForAutoGen)(parsed.frontmatter);
    if (!validation.valid) {
        throw new JourneyParseError(`Journey not ready for AutoGen:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`, filePath);
    }
    return parsed;
}
/**
 * Parse journey from string content (for testing)
 */
function parseJourneyContent(content, virtualPath = 'virtual.journey.md') {
    // Extract frontmatter and body
    const { frontmatter: frontmatterStr, body } = extractFrontmatter(content);
    // Parse YAML frontmatter
    const rawFrontmatter = (0, yaml_1.parse)(frontmatterStr);
    // Validate frontmatter with Zod
    const result = schema_js_1.JourneyFrontmatterSchema.safeParse(rawFrontmatter);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new JourneyParseError(`Invalid journey frontmatter:\n${issues}`, virtualPath, result.error);
    }
    // Parse body sections
    const acceptanceCriteria = parseAcceptanceCriteria(body);
    const proceduralSteps = parseProceduralSteps(body);
    const dataNotes = parseDataNotes(body);
    return {
        frontmatter: result.data,
        body,
        acceptanceCriteria,
        proceduralSteps,
        dataNotes,
        sourcePath: virtualPath,
    };
}
/**
 * Parse journey from string content with Result type (no exceptions)
 *
 * This is the recommended way to parse journey content as it returns
 * structured errors via Result type instead of throwing exceptions.
 *
 * @param content - Raw markdown content to parse
 * @param virtualPath - Virtual path for error reporting (default: 'virtual.journey.md')
 * @returns Result with ParsedJourney on success or CodedError on failure
 *
 * @example
 * ```typescript
 * const result = tryParseJourneyContent(markdownContent);
 * if (result.success) {
 *   console.log('Parsed:', result.value.frontmatter.id);
 * } else {
 *   console.error(`[${result.error.code}] ${result.error.message}`);
 * }
 * ```
 */
function tryParseJourneyContent(content, virtualPath = 'virtual.journey.md') {
    // Extract frontmatter and body
    const frontmatterMatch = FRONTMATTER_REGEX.exec(content);
    if (!frontmatterMatch) {
        return (0, result_js_1.err)(new result_js_1.CodedError('FRONTMATTER_NOT_FOUND', 'No YAML frontmatter found (content should start with ---)', { path: virtualPath }));
    }
    const frontmatterStr = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length).trim();
    // Parse YAML frontmatter
    let rawFrontmatter;
    try {
        rawFrontmatter = (0, yaml_1.parse)(frontmatterStr);
    }
    catch (yamlError) {
        return (0, result_js_1.err)(new result_js_1.CodedError('YAML_PARSE_ERROR', 'Invalid YAML in journey frontmatter', {
            path: virtualPath,
            cause: yamlError instanceof Error ? yamlError.message : String(yamlError)
        }));
    }
    // Validate frontmatter with Zod
    const zodResult = schema_js_1.JourneyFrontmatterSchema.safeParse(rawFrontmatter);
    if (!zodResult.success) {
        const issues = zodResult.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
        return (0, result_js_1.err)(new result_js_1.CodedError('FRONTMATTER_VALIDATION_ERROR', `Invalid journey frontmatter: ${issues}`, {
            path: virtualPath,
            issues: zodResult.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
                code: i.code,
            }))
        }));
    }
    // Parse body sections
    const acceptanceCriteria = parseAcceptanceCriteria(body);
    const proceduralSteps = parseProceduralSteps(body);
    const dataNotes = parseDataNotes(body);
    return (0, result_js_1.ok)({
        frontmatter: zodResult.data,
        body,
        acceptanceCriteria,
        proceduralSteps,
        dataNotes,
        sourcePath: virtualPath,
    });
}
//# sourceMappingURL=parseJourney.js.map