"use strict";
/**
 * @module types/detection
 * @description Detection type definitions for ARTK E2E independent architecture.
 * Defines types for frontend detection heuristics during /init.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDetectionResult = isDetectionResult;
// Note: Signal weights and confidence thresholds are defined in detection/signals.ts
// Import SIGNAL_WEIGHTS, CONFIDENCE_THRESHOLDS, and getConfidenceFromScore from there.
// This file only contains type definitions to avoid duplication.
/**
 * Type guard to check if a value is a valid DetectionResult.
 */
function isDetectionResult(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check path
    if (typeof obj.path !== 'string')
        return false;
    // Check relativePath
    if (typeof obj.relativePath !== 'string')
        return false;
    // Check confidence
    if (!['high', 'medium', 'low'].includes(obj.confidence)) {
        return false;
    }
    // Check type
    if (!['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other'].includes(obj.type)) {
        return false;
    }
    // Check signals
    if (!Array.isArray(obj.signals))
        return false;
    if (!obj.signals.every((s) => typeof s === 'string'))
        return false;
    // Check score
    if (typeof obj.score !== 'number')
        return false;
    // Check detailedSignals (required array of DetectionSignal objects)
    if (!Array.isArray(obj.detailedSignals))
        return false;
    if (!obj.detailedSignals.every((s) => typeof s === 'object' &&
        s !== null &&
        typeof s.type === 'string' &&
        typeof s.source === 'string' &&
        typeof s.weight === 'number')) {
        return false;
    }
    return true;
}
//# sourceMappingURL=detection.js.map