/**
 * @module uncertainty/types
 * @description Type definitions for Uncertainty Quantification strategy
 */

import { TokenUsage } from '../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE DIMENSIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ConfidenceDimension = 'syntax' | 'pattern' | 'selector' | 'agreement';

export interface DimensionScore {
  dimension: ConfidenceDimension;
  score: number; // 0.0 - 1.0
  weight: number;
  reasoning: string;
  subScores?: SubScore[];
}

export interface SubScore {
  name: string;
  score: number;
  details?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNTAX VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export interface SyntaxValidationResult {
  valid: boolean;
  score: number;
  errors: SyntaxError[];
  warnings: SyntaxWarning[];
  typescript: TypeScriptValidation;
  playwright: PlaywrightValidation;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface SyntaxWarning {
  line: number;
  message: string;
  suggestion?: string;
}

export interface TypeScriptValidation {
  compiles: boolean;
  errors: SyntaxError[];
  typeInferenceScore: number;
}

export interface PlaywrightValidation {
  hasValidImports: boolean;
  usesTestFixtures: boolean;
  hasValidTestBlocks: boolean;
  apiUsageScore: number;
  deprecatedAPIs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN MATCHING
// ═══════════════════════════════════════════════════════════════════════════

export interface PatternMatchResult {
  score: number;
  matchedPatterns: MatchedPattern[];
  unmatchedElements: UnmatchedElement[];
  noveltyScore: number;
  consistencyScore: number;
}

export interface MatchedPattern {
  patternId: string;
  patternName: string;
  confidence: number;
  codeLocation: {
    startLine: number;
    endLine: number;
  };
  source: 'glossary' | 'llkb' | 'builtin' | 'inferred';
}

export interface UnmatchedElement {
  element: string;
  reason: string;
  suggestedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTOR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export type SelectorStrategy =
  | 'testId'
  | 'role'
  | 'text'
  | 'label'
  | 'placeholder'
  | 'title'
  | 'altText'
  | 'css'
  | 'xpath'
  | 'nth'
  | 'chain';

export interface SelectorAnalysisResult {
  score: number;
  selectors: SelectorInfo[];
  strategyDistribution: Record<SelectorStrategy, number>;
  stabilityScore: number;
  accessibilityScore: number;
  recommendations: SelectorRecommendation[];
}

export interface SelectorInfo {
  selector: string;
  strategy: SelectorStrategy;
  stabilityScore: number;
  specificity: number;
  hasTestId: boolean;
  usesRole: boolean;
  isFragile: boolean;
  fragilityReasons: string[];
  line: number;
}

export interface SelectorRecommendation {
  selector: string;
  currentStrategy: SelectorStrategy;
  suggestedStrategy: SelectorStrategy;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-SAMPLE AGREEMENT
// ═══════════════════════════════════════════════════════════════════════════

export interface AgreementAnalysisResult {
  score: number;
  sampleCount: number;
  structuralAgreement: number;
  selectorAgreement: number;
  flowAgreement: number;
  assertionAgreement: number;
  consensusCode?: string;
  disagreementAreas: DisagreementArea[];
}

export interface DisagreementArea {
  area: string;
  variants: string[];
  voteCounts: Record<string, number>;
  selectedVariant?: string;
  confidence: number;
}

export interface CodeSample {
  id: string;
  code: string;
  temperature: number;
  tokenUsage?: TokenUsage;
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERALL CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfidenceScore {
  overall: number;
  dimensions: DimensionScore[];
  threshold: ConfidenceThreshold;
  verdict: ConfidenceVerdict;
  blockedDimensions: ConfidenceDimension[];
  diagnostics: ConfidenceDiagnostics;
}

export type ConfidenceVerdict = 'ACCEPT' | 'REVIEW' | 'REJECT';

export interface ConfidenceThreshold {
  overall: number;
  perDimension: Record<ConfidenceDimension, number>;
  blockOnAnyBelow: number;
}

export interface ConfidenceDiagnostics {
  lowestDimension: {
    name: ConfidenceDimension;
    score: number;
  };
  highestDimension: {
    name: ConfidenceDimension;
    score: number;
  };
  improvementSuggestions: string[];
  riskAreas: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORING OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoringOptions {
  weights: DimensionWeights;
  thresholds: ConfidenceThreshold;
  enableMultiSampling: boolean;
  sampleCount: number;
  sampleTemperatures: number[];
}

export interface DimensionWeights {
  syntax: number;
  pattern: number;
  selector: number;
  agreement: number;
}

export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights = {
  syntax: 0.25,
  pattern: 0.25,
  selector: 0.30,
  agreement: 0.20,
};

export const DEFAULT_THRESHOLDS: ConfidenceThreshold = {
  overall: 0.7,
  perDimension: {
    syntax: 0.9,      // Syntax must be very high
    pattern: 0.6,
    selector: 0.7,
    agreement: 0.5,   // Agreement can be lower if single sample
  },
  blockOnAnyBelow: 0.4,
};

// ═══════════════════════════════════════════════════════════════════════════
// UNCERTAINTY CONFIG (imported from shared, re-exported for convenience)
// ═══════════════════════════════════════════════════════════════════════════

export type { UncertaintyConfig } from '../shared/config-validator.js';
