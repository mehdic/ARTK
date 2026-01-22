"use strict";
/**
 * LLKB Context Injection
 *
 * Functions for filtering and prioritizing LLKB data based on journey context.
 * Used to inject relevant lessons, components, and patterns into prompts.
 *
 * @module @artk/llkb/context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelevantContext = getRelevantContext;
exports.extractKeywords = extractKeywords;
exports.formatContextForPrompt = formatContextForPrompt;
exports.getRelevantScopes = getRelevantScopes;
const normalize_js_1 = require("./normalize.js");
// =============================================================================
// Constants
// =============================================================================
/** Default maximum lessons to include in context */
const DEFAULT_MAX_LESSONS = 10;
/** Default maximum components to include in context */
const DEFAULT_MAX_COMPONENTS = 10;
// =============================================================================
// Relevance Calculation
// =============================================================================
/**
 * Calculate relevance score for a lesson
 */
function calculateLessonRelevance(lesson, journey, appProfile) {
    let score = 0;
    const reasons = [];
    // Base confidence contributes to score
    score += lesson.metrics.confidence * 0.3;
    // Scope matching
    if (lesson.scope === 'universal') {
        score += 0.2;
        reasons.push('universal scope');
    }
    else if (appProfile && lesson.scope === `framework:${appProfile.application.framework}`) {
        score += 0.25;
        reasons.push(`framework match: ${appProfile.application.framework}`);
    }
    else if (lesson.scope === 'app-specific') {
        score += 0.15;
        reasons.push('app-specific');
    }
    // Tag matching
    const journeyKeywords = journey.keywords || extractKeywords(journey);
    if (lesson.tags && lesson.tags.length > 0) {
        const matchingTags = lesson.tags.filter((tag) => journeyKeywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase())));
        if (matchingTags.length > 0) {
            score += Math.min(matchingTags.length * 0.1, 0.3);
            reasons.push(`tags: ${matchingTags.join(', ')}`);
        }
    }
    // Journey ID matching
    if (lesson.journeyIds && lesson.journeyIds.length > 0) {
        if (lesson.journeyIds.includes(journey.id)) {
            score += 0.25;
            reasons.push('same journey');
        }
        else {
            // Check if lesson was used in similar scopes
            const journeyScopePattern = journey.scope.toLowerCase();
            const matchingJourneys = lesson.journeyIds.filter((jid) => jid.toLowerCase().includes(journeyScopePattern));
            if (matchingJourneys.length > 0) {
                score += 0.15;
                reasons.push(`similar journeys: ${matchingJourneys.length}`);
            }
        }
    }
    // Category matching
    if (journey.categories && journey.categories.includes(lesson.category)) {
        score += 0.15;
        reasons.push(`category: ${lesson.category}`);
    }
    // Trigger keyword matching
    const triggerTokens = (0, normalize_js_1.tokenize)(lesson.trigger);
    const triggerMatches = journeyKeywords.filter((kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())));
    if (triggerMatches.length > 0) {
        score += Math.min(triggerMatches.length * 0.05, 0.15);
        reasons.push(`trigger match: ${triggerMatches.slice(0, 2).join(', ')}`);
    }
    // Recency bonus
    if (lesson.metrics.lastSuccess) {
        const daysSinceSuccess = daysSince(lesson.metrics.lastSuccess);
        if (daysSinceSuccess < 7) {
            score += 0.1;
            reasons.push('recently successful');
        }
        else if (daysSinceSuccess < 30) {
            score += 0.05;
        }
    }
    // Success rate bonus
    if (lesson.metrics.successRate >= 0.9) {
        score += 0.1;
        reasons.push('high success rate');
    }
    return { score: Math.min(score, 1.0), reasons };
}
/**
 * Calculate relevance score for a component
 */
function calculateComponentRelevance(component, journey, appProfile) {
    let score = 0;
    const reasons = [];
    // Base success rate contributes to score
    score += component.metrics.successRate * 0.3;
    // Scope matching
    if (component.scope === 'universal') {
        score += 0.2;
        reasons.push('universal scope');
    }
    else if (appProfile && component.scope === `framework:${appProfile.application.framework}`) {
        score += 0.25;
        reasons.push(`framework match: ${appProfile.application.framework}`);
    }
    else if (appProfile &&
        component.scope === `framework:${appProfile.application.dataGrid}` &&
        appProfile.application.dataGrid !== 'none') {
        score += 0.25;
        reasons.push(`data grid match: ${appProfile.application.dataGrid}`);
    }
    // Category matching
    if (journey.categories && journey.categories.includes(component.category)) {
        score += 0.2;
        reasons.push(`category: ${component.category}`);
    }
    // Description similarity
    const journeyKeywords = journey.keywords || extractKeywords(journey);
    const descTokens = (0, normalize_js_1.tokenize)(component.description);
    const contextMatches = journeyKeywords.filter((kw) => [...descTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())));
    if (contextMatches.length > 0) {
        score += Math.min(contextMatches.length * 0.05, 0.2);
        reasons.push(`context match: ${contextMatches.slice(0, 3).join(', ')}`);
    }
    // Usage frequency bonus
    if (component.metrics.totalUses > 10) {
        score += 0.15;
        reasons.push('widely used');
    }
    else if (component.metrics.totalUses > 3) {
        score += 0.1;
        reasons.push('commonly used');
    }
    // Success rate
    if (component.metrics.successRate >= 0.95) {
        score += 0.1;
        reasons.push('high reliability');
    }
    return { score: Math.min(score, 1.0), reasons };
}
// =============================================================================
// Context Filtering
// =============================================================================
/**
 * Get relevant LLKB context for a journey
 *
 * @param journey - Journey context for filtering
 * @param lessons - All available lessons
 * @param components - All available components
 * @param config - LLKB configuration
 * @param appProfile - Application profile
 * @param patterns - Pattern files
 * @returns Filtered and prioritized context
 */
function getRelevantContext(journey, lessons, components, config, appProfile = null, patterns = {}) {
    const maxLessons = DEFAULT_MAX_LESSONS;
    const maxComponents = DEFAULT_MAX_COMPONENTS;
    // Extract keywords from journey if not provided
    const journeyWithKeywords = {
        ...journey,
        keywords: journey.keywords || extractKeywords(journey),
    };
    // Score and filter lessons
    const scoredLessons = lessons
        .filter((l) => !l.archived)
        .map((lesson) => {
        const { score, reasons } = calculateLessonRelevance(lesson, journeyWithKeywords, appProfile);
        return { ...lesson, relevanceScore: score, matchReasons: reasons };
    })
        .filter((l) => l.relevanceScore > 0.2)
        .sort((a, b) => {
        if (config.injection.prioritizeByConfidence) {
            // Sort by confidence first, then relevance
            return b.metrics.confidence - a.metrics.confidence || b.relevanceScore - a.relevanceScore;
        }
        return b.relevanceScore - a.relevanceScore;
    })
        .slice(0, maxLessons);
    // Score and filter components
    const scoredComponents = components
        .filter((c) => !c.archived)
        .map((component) => {
        const { score, reasons } = calculateComponentRelevance(component, journeyWithKeywords, appProfile);
        return { ...component, relevanceScore: score, matchReasons: reasons };
    })
        .filter((c) => c.relevanceScore > 0.2)
        .sort((a, b) => {
        if (config.injection.prioritizeByConfidence) {
            return b.metrics.successRate - a.metrics.successRate || b.relevanceScore - a.relevanceScore;
        }
        return b.relevanceScore - a.relevanceScore;
    })
        .slice(0, maxComponents);
    // Extract relevant quirks from lessons
    const quirks = extractRelevantQuirks(lessons, journeyWithKeywords);
    // Extract relevant selector patterns
    const selectorPatterns = extractRelevantSelectorPatterns(patterns.selectors, journeyWithKeywords, appProfile);
    // Extract relevant timing patterns
    const timingPatterns = extractRelevantTimingPatterns(patterns.timing, journeyWithKeywords);
    // Calculate summary
    const summary = calculateSummary(scoredLessons, scoredComponents, quirks);
    return {
        lessons: scoredLessons,
        components: scoredComponents,
        quirks,
        selectorPatterns,
        timingPatterns,
        summary,
    };
}
/**
 * Extract relevant app quirks from quirk-category lessons
 */
function extractRelevantQuirks(lessons, journey) {
    const quirks = [];
    for (const lesson of lessons) {
        // Check if lesson is a quirk category
        if (lesson.category === 'quirk') {
            // Check if it matches the journey scope, routes, or keywords
            const journeyKeywords = journey.keywords || extractKeywords(journey);
            const triggerTokens = (0, normalize_js_1.tokenize)(lesson.trigger);
            const patternTokens = (0, normalize_js_1.tokenize)(lesson.pattern);
            const matchesScope = lesson.journeyIds.some((jid) => journey.scope.toLowerCase().includes(jid.toLowerCase()) ||
                jid.toLowerCase().includes(journey.scope.toLowerCase())) ||
                journeyKeywords.some((kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())) ||
                    [...patternTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))) ||
                (journey.routes &&
                    journey.routes.some((route) => lesson.journeyIds.some((jid) => route.toLowerCase().includes(jid.toLowerCase()))));
            if (matchesScope) {
                quirks.push({
                    id: lesson.id,
                    component: lesson.title,
                    location: lesson.journeyIds.join(', ') || lesson.scope,
                    quirk: lesson.trigger,
                    impact: `Confidence: ${Math.round(lesson.metrics.confidence * 100)}%`,
                    workaround: lesson.pattern,
                });
            }
        }
    }
    return quirks.slice(0, 5); // Limit to 5 quirks
}
/**
 * Extract relevant selector patterns
 */
function extractRelevantSelectorPatterns(selectorPatterns, journey, appProfile) {
    if (!selectorPatterns)
        return [];
    const relevant = [];
    for (const pattern of selectorPatterns.selectorPatterns || []) {
        // Check if pattern applies to journey or app profile
        const matchesApp = appProfile &&
            pattern.applicableTo.some((app) => app === appProfile.application.framework ||
                app === appProfile.application.dataGrid ||
                app === appProfile.application.uiLibrary);
        const matchesKeywords = journey.keywords &&
            pattern.applicableTo.some((app) => journey.keywords.some((kw) => app.toLowerCase().includes(kw.toLowerCase())));
        if (matchesApp || matchesKeywords || pattern.confidence >= 0.9) {
            relevant.push({
                id: pattern.id,
                name: pattern.name,
                template: pattern.template,
                confidence: pattern.confidence,
            });
        }
    }
    return relevant.slice(0, 5);
}
/**
 * Extract relevant timing patterns
 */
function extractRelevantTimingPatterns(timingPatterns, journey) {
    if (!timingPatterns)
        return [];
    const relevant = [];
    for (const pattern of timingPatterns.asyncPatterns || []) {
        // Check if pattern context matches journey keywords
        const contextTokens = (0, normalize_js_1.tokenize)(pattern.context);
        const journeyKeywords = journey.keywords || [];
        const matches = journeyKeywords.some((kw) => [...contextTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())));
        if (matches) {
            relevant.push({
                id: pattern.id,
                name: pattern.name,
                pattern: pattern.pattern,
                recommendation: pattern.recommendation,
            });
        }
    }
    return relevant.slice(0, 5);
}
/**
 * Calculate context summary
 */
function calculateSummary(lessons, components, quirks) {
    const avgLessonConfidence = lessons.length > 0
        ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length
        : 0;
    const avgComponentSuccessRate = components.length > 0
        ? components.reduce((sum, c) => sum + c.metrics.successRate, 0) / components.length
        : 0;
    // Count categories
    const categoryCounts = {};
    for (const lesson of lessons) {
        categoryCounts[lesson.category] = (categoryCounts[lesson.category] || 0) + 1;
    }
    for (const component of components) {
        categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
    }
    const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
    return {
        totalLessons: lessons.length,
        totalComponents: components.length,
        totalQuirks: quirks.length,
        avgLessonConfidence,
        avgComponentSuccessRate,
        topCategories,
    };
}
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Extract keywords from journey context
 */
function extractKeywords(journey) {
    const keywords = [];
    // Extract from title
    const titleTokens = journey.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
    keywords.push(...titleTokens);
    // Extract from scope
    keywords.push(journey.scope.toLowerCase());
    // Extract from routes
    if (journey.routes) {
        for (const route of journey.routes) {
            const routeParts = route
                .split('/')
                .filter((p) => p && p.length > 2)
                .map((p) => p.toLowerCase());
            keywords.push(...routeParts);
        }
    }
    // Deduplicate
    return [...new Set(keywords)];
}
/**
 * Calculate days since a date
 */
function daysSince(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}
/**
 * Format context for prompt injection
 *
 * @param context - Relevant context to format
 * @param journey - Journey context
 * @returns Markdown-formatted context string
 */
function formatContextForPrompt(context, journey) {
    const lines = [];
    lines.push(`## LLKB Context (Auto-Injected for ${journey.id})`);
    lines.push('');
    // Components section
    if (context.components.length > 0) {
        lines.push(`### Available Components (Top ${context.components.length} for this scope)`);
        lines.push('');
        lines.push('| Component | File | Success Rate | Description |');
        lines.push('|-----------|------|--------------|-------------|');
        for (const comp of context.components) {
            const successRate = Math.round(comp.metrics.successRate * 100);
            const description = comp.description.slice(0, 50) + (comp.description.length > 50 ? '...' : '');
            lines.push(`| ${comp.name} | ${comp.filePath} | ${successRate}% | ${description} |`);
        }
        lines.push('');
        lines.push('**Import Example:**');
        lines.push('```typescript');
        // Group by file path directory
        const byPath = {};
        for (const comp of context.components) {
            const importPath = comp.filePath.replace(/\.ts$/, '').replace(/^\.\//, '');
            if (!byPath[importPath])
                byPath[importPath] = [];
            byPath[importPath].push(comp.name);
        }
        for (const [path, names] of Object.entries(byPath)) {
            lines.push(`import { ${names.join(', ')} } from './${path}';`);
        }
        lines.push('```');
        lines.push('');
    }
    // Lessons section
    if (context.lessons.length > 0) {
        lines.push(`### Relevant Lessons (Top ${context.lessons.length})`);
        lines.push('');
        for (let i = 0; i < context.lessons.length; i++) {
            const lesson = context.lessons[i];
            if (!lesson)
                continue;
            const confidence = lesson.metrics.confidence >= 0.8
                ? 'HIGH'
                : lesson.metrics.confidence >= 0.5
                    ? 'MEDIUM'
                    : 'LOW';
            lines.push(`${i + 1}. **[${confidence}] ${lesson.id}: ${lesson.title}**`);
            lines.push(`   - Trigger: ${lesson.trigger}`);
            lines.push(`   - Pattern: \`${lesson.pattern.slice(0, 100)}${lesson.pattern.length > 100 ? '...' : ''}\``);
            lines.push('');
        }
    }
    // Quirks section
    if (context.quirks.length > 0) {
        lines.push('### Known Quirks for This Scope');
        lines.push('');
        for (const quirk of context.quirks) {
            lines.push(`- **${quirk.id} (${quirk.component})**: ${quirk.quirk}`);
            if (quirk.workaround) {
                lines.push(`  - Workaround: ${quirk.workaround}`);
            }
        }
        lines.push('');
    }
    lines.push('---');
    return lines.join('\n');
}
/**
 * Get scopes relevant to the app profile
 */
function getRelevantScopes(appProfile) {
    const scopes = ['universal', 'app-specific'];
    if (appProfile) {
        if (appProfile.application.framework !== 'other') {
            scopes.push(`framework:${appProfile.application.framework}`);
        }
        if (appProfile.application.dataGrid !== 'none') {
            scopes.push(`framework:${appProfile.application.dataGrid}`);
        }
        if (appProfile.application.uiLibrary !== 'custom' && appProfile.application.uiLibrary !== 'none') {
            scopes.push(`framework:${appProfile.application.uiLibrary}`);
        }
    }
    return scopes;
}
//# sourceMappingURL=context.js.map