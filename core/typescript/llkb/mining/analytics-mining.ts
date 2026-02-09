/**
 * LLKB Analytics Mining Module
 *
 * Extracts analytics event tracking calls from source code to generate
 * test patterns for event verification.
 *
 * Supports:
 * - Google Analytics 4 (GA4/gtag)
 * - Mixpanel
 * - Segment
 * - Amplitude
 * - Custom analytics implementations
 *
 * @module llkb/mining/analytics-mining
 */

import { type MiningCache, scanAllSourceDirectories, type ScannedFile } from '../mining-cache.js';
import type { DiscoveredPattern } from '../pattern-generation.js';
import { randomUUID } from 'crypto';
import * as path from 'path';

// =============================================================================
// Constants
// =============================================================================

/** Maximum regex iterations to prevent ReDoS */
const MAX_REGEX_ITERATIONS = 10_000;

/** Default confidence for analytics patterns */
const ANALYTICS_PATTERN_CONFIDENCE = 0.70;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * An analytics event discovered in source code
 */
export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Analytics provider */
  provider: string;
  /** Optional event properties */
  properties?: string[];
  /** Source file where event was found */
  source: string;
}

/**
 * Result of analytics mining operation
 */
export interface AnalyticsMiningResult {
  /** Detected analytics provider */
  provider: 'ga4' | 'mixpanel' | 'segment' | 'amplitude' | 'custom' | 'unknown';
  /** Discovered analytics events */
  events: AnalyticsEvent[];
}

// =============================================================================
// Detection Patterns
// =============================================================================

/**
 * Patterns to detect analytics provider usage
 */
const ANALYTICS_PROVIDER_PATTERNS = {
  ga4: /gtag\s*\(\s*['"]event['"]|ReactGA\.event\(|window\.gtag\(/g,
  mixpanel: /mixpanel\.track\(|import.*mixpanel|from\s+['"]mixpanel['"]/g,
  segment: /analytics\.track\(|window\.analytics\.track\(|import.*@segment/g,
  amplitude: /amplitude\.logEvent\(|import.*@amplitude|Amplitude\.getInstance\(\)/g,
};

/**
 * Patterns to extract analytics event calls
 */
const ANALYTICS_EVENT_PATTERNS = {
  // GA4/gtag: gtag('event', 'eventName', {...})
  ga4Gtag: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/g,

  // React GA: ReactGA.event({ category: '...', action: '...' })
  reactGa: /ReactGA\.event\s*\(\s*\{[^}]*action\s*:\s*['"]([^'"]+)['"]/g,

  // Mixpanel: mixpanel.track('eventName', {...})
  mixpanel: /mixpanel\.track\s*\(\s*['"]([^'"]+)['"]/g,

  // Segment: analytics.track('eventName', {...})
  segment: /analytics\.track\s*\(\s*['"]([^'"]+)['"]/g,

  // Amplitude: amplitude.logEvent('eventName', {...})
  amplitude: /amplitude\.logEvent\s*\(\s*['"]([^'"]+)['"]/g,

  // Custom analytics: trackEvent('eventName'), logEvent('eventName')
  custom: /(?:trackEvent|logEvent|sendEvent)\s*\(\s*['"]([^'"]+)['"]/g,
};

/**
 * Patterns to extract event properties
 */
const EVENT_PROPERTIES_PATTERN = /\{\s*([^}]+)\s*\}/g;

// =============================================================================
// Mining Functions
// =============================================================================

/**
 * Mine analytics events from a project
 *
 * @param projectRoot - Project root directory
 * @param cache - Optional mining cache
 * @returns Analytics mining result
 */
export async function mineAnalyticsEvents(
  projectRoot: string,
  cache?: MiningCache
): Promise<AnalyticsMiningResult> {
  const resolvedRoot = path.resolve(projectRoot);

  // Create cache if not provided
  const miningCache = cache ?? new (await import('../mining-cache.js')).MiningCache();
  const shouldCleanup = !cache;

  try {
    // Scan all source files
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);

    // Detect which analytics provider is being used
    const provider = detectAnalyticsProvider(files);

    // Extract events based on detected provider
    const events = extractAnalyticsEvents(files, provider);

    return {
      provider,
      events,
    };
  } finally {
    // Clean up cache if we created it
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}

/**
 * Detect which analytics provider is being used
 */
function detectAnalyticsProvider(
  files: ScannedFile[]
): 'ga4' | 'mixpanel' | 'segment' | 'amplitude' | 'custom' | 'unknown' {
  const detectionScores: Record<string, number> = {
    ga4: 0,
    mixpanel: 0,
    segment: 0,
    amplitude: 0,
    custom: 0,
  };

  for (const file of files) {
    for (const [provider, pattern] of Object.entries(ANALYTICS_PROVIDER_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[provider]!++;
      }
    }

    // Check for custom analytics patterns
    const customPattern = /(?:trackEvent|logEvent|sendEvent)\s*\(/g;
    customPattern.lastIndex = 0;
    if (customPattern.test(file.content)) {
      detectionScores.custom!++;
    }
  }

  // Return provider with highest score
  let maxScore = 0;
  let detectedProvider: AnalyticsMiningResult['provider'] = 'unknown';

  for (const [provider, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedProvider = provider as AnalyticsMiningResult['provider'];
    }
  }

  return detectedProvider;
}

/**
 * Extract analytics events from source files
 */
function extractAnalyticsEvents(
  files: ScannedFile[],
  provider: AnalyticsMiningResult['provider']
): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const seenEvents = new Set<string>();

  for (const file of files) {
    // Try all patterns (provider detection is a hint, not strict)
    for (const [patternName, pattern] of Object.entries(ANALYTICS_EVENT_PATTERNS)) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      let iterations = 0;

      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS) {break;}

        const eventName = match[1];
        if (!eventName) {continue;}

        // Skip if already seen
        const eventId = `${eventName}:${file.path}`;
        if (seenEvents.has(eventId)) {continue;}
        seenEvents.add(eventId);

        // Try to extract event properties
        const properties = extractEventProperties(file.content, match.index);

        // Determine provider from pattern name
        let eventProvider = provider;
        if (patternName.includes('ga4') || patternName.includes('reactGa')) {
          eventProvider = 'ga4';
        } else if (patternName.includes('mixpanel')) {
          eventProvider = 'mixpanel';
        } else if (patternName.includes('segment')) {
          eventProvider = 'segment';
        } else if (patternName.includes('amplitude')) {
          eventProvider = 'amplitude';
        } else if (patternName.includes('custom')) {
          eventProvider = 'custom';
        }

        events.push({
          name: eventName,
          provider: eventProvider,
          properties,
          source: file.path,
        });
      }
    }
  }

  return events;
}

/**
 * Extract event properties from the code near a match
 */
function extractEventProperties(content: string, matchIndex: number): string[] | undefined {
  // Look for object literal after the event name (within 200 chars)
  const searchEnd = Math.min(matchIndex + 200, content.length);
  const snippet = content.slice(matchIndex, searchEnd);

  EVENT_PROPERTIES_PATTERN.lastIndex = 0;
  const propsMatch = EVENT_PROPERTIES_PATTERN.exec(snippet);

  if (!propsMatch) {return undefined;}

  // Extract property names (simple extraction, may not be perfect)
  const propsText = propsMatch[1]!;
  const propertyPattern = /(\w+)\s*:/g;
  const properties: string[] = [];

  let propMatch: RegExpExecArray | null;
  let iterations = 0;

  while ((propMatch = propertyPattern.exec(propsText)) !== null) {
    if (++iterations > MAX_REGEX_ITERATIONS) {break;}
    properties.push(propMatch[1]!);
  }

  return properties.length > 0 ? properties : undefined;
}

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate test patterns from analytics mining result
 *
 * @param result - Analytics mining result
 * @returns Array of discovered patterns
 */
export function generateAnalyticsPatterns(result: AnalyticsMiningResult): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  const seenPatterns = new Set<string>();

  for (const event of result.events) {
    // Generate label from event name
    const label = eventNameToLabel(event.name);

    // Pattern 1: "verify {event} tracked"
    const verifyTrackedPattern = `verify ${label} tracked`;
    const verifyTrackedKey = `${verifyTrackedPattern}:assert`;

    if (!seenPatterns.has(verifyTrackedKey)) {
      seenPatterns.add(verifyTrackedKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyTrackedPattern.toLowerCase(),
        originalText: verifyTrackedPattern,
        mappedPrimitive: 'assert',
        selectorHints: [],
        confidence: ANALYTICS_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'assertion',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }

    // Pattern 2: "trigger {event} event"
    const triggerEventPattern = `trigger ${label} event`;
    const triggerEventKey = `${triggerEventPattern}:click`;

    if (!seenPatterns.has(triggerEventKey)) {
      seenPatterns.add(triggerEventKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: triggerEventPattern.toLowerCase(),
        originalText: triggerEventPattern,
        mappedPrimitive: 'click',
        selectorHints: [],
        confidence: ANALYTICS_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'ui-interaction',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }
  }

  return patterns;
}

/**
 * Convert event name to human-readable label
 */
function eventNameToLabel(eventName: string): string {
  return eventName
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
