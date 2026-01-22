"use strict";
/**
 * Reporters module barrel export for ARTK Core v1
 *
 * This module provides:
 * - ARTKReporter: Custom Playwright reporter with journey mapping
 * - Journey mapping utilities: Map tests to Journey definitions
 * - Artifact utilities: Save screenshots with PII masking
 * - PII masking utilities: Mask sensitive data in screenshots
 *
 * @module reporters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePiiSelectors = exports.validatePiiSelectors = exports.removePiiMasking = exports.maskPiiInScreenshot = exports.validateArtifactPath = exports.getArtifactExtension = exports.ensureArtifactDir = exports.saveScreenshot = exports.writeARTKReport = exports.generateARTKReport = exports.ARTKReporter = exports.createJourneyReport = exports.calculateJourneyStatus = exports.groupTestsByJourney = exports.mapTestToJourney = exports.extractJourneyId = void 0;
// Journey mapping
var journey_reporter_js_1 = require("./journey-reporter.js");
Object.defineProperty(exports, "extractJourneyId", { enumerable: true, get: function () { return journey_reporter_js_1.extractJourneyId; } });
Object.defineProperty(exports, "mapTestToJourney", { enumerable: true, get: function () { return journey_reporter_js_1.mapTestToJourney; } });
Object.defineProperty(exports, "groupTestsByJourney", { enumerable: true, get: function () { return journey_reporter_js_1.groupTestsByJourney; } });
Object.defineProperty(exports, "calculateJourneyStatus", { enumerable: true, get: function () { return journey_reporter_js_1.calculateJourneyStatus; } });
Object.defineProperty(exports, "createJourneyReport", { enumerable: true, get: function () { return journey_reporter_js_1.createJourneyReport; } });
// ARTK Reporter
var artk_reporter_js_1 = require("./artk-reporter.js");
Object.defineProperty(exports, "ARTKReporter", { enumerable: true, get: function () { return artk_reporter_js_1.ARTKReporter; } });
Object.defineProperty(exports, "generateARTKReport", { enumerable: true, get: function () { return artk_reporter_js_1.generateARTKReport; } });
Object.defineProperty(exports, "writeARTKReport", { enumerable: true, get: function () { return artk_reporter_js_1.writeARTKReport; } });
// Artifact utilities
var artifacts_js_1 = require("./artifacts.js");
Object.defineProperty(exports, "saveScreenshot", { enumerable: true, get: function () { return artifacts_js_1.saveScreenshot; } });
Object.defineProperty(exports, "ensureArtifactDir", { enumerable: true, get: function () { return artifacts_js_1.ensureArtifactDir; } });
Object.defineProperty(exports, "getArtifactExtension", { enumerable: true, get: function () { return artifacts_js_1.getArtifactExtension; } });
Object.defineProperty(exports, "validateArtifactPath", { enumerable: true, get: function () { return artifacts_js_1.validateArtifactPath; } });
// PII masking
var masking_js_1 = require("./masking.js");
Object.defineProperty(exports, "maskPiiInScreenshot", { enumerable: true, get: function () { return masking_js_1.maskPiiInScreenshot; } });
Object.defineProperty(exports, "removePiiMasking", { enumerable: true, get: function () { return masking_js_1.removePiiMasking; } });
Object.defineProperty(exports, "validatePiiSelectors", { enumerable: true, get: function () { return masking_js_1.validatePiiSelectors; } });
Object.defineProperty(exports, "sanitizePiiSelectors", { enumerable: true, get: function () { return masking_js_1.sanitizePiiSelectors; } });
//# sourceMappingURL=index.js.map