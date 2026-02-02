/**
 * @module uncertainty/confidence-scorer
 * @description Multi-dimensional confidence scoring for generated code
 */

import { TokenUsage } from '../shared/types.js';
import { CostTracker } from '../shared/cost-tracker.js';
import { UncertaintyConfig } from '../shared/config-validator.js';
import {
  ConfidenceScore,
  ConfidenceDimension,
  ConfidenceVerdict,
  ConfidenceThreshold,
  ConfidenceDiagnostics,
  DimensionScore,
  DimensionWeights,
  CodeSample,
  AgreementAnalysisResult,
  DisagreementArea,
  DEFAULT_DIMENSION_WEIGHTS,
  DEFAULT_THRESHOLDS,
} from './types.js';
import { validateSyntax, createSyntaxDimensionScore } from './syntax-validator.js';
import { matchPatterns, createPatternDimensionScore, PatternDefinition } from './pattern-matcher.js';
import { analyzeSelectors, createSelectorDimensionScore } from './selector-analyzer.js';

// ═══════════════════════════════════════════════════════════════════════════
// LLM CLIENT INTERFACE (for multi-sampling)
// ═══════════════════════════════════════════════════════════════════════════

export interface UncertaintyLLMClient {
  generateSample(
    _prompt: string,
    _systemPrompt: string,
    _temperature: number,
    _maxTokens: number
  ): Promise<{ code: string; tokenUsage: TokenUsage }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CONFIDENCE SCORER
// ═══════════════════════════════════════════════════════════════════════════

export interface ScorerOptions {
  config: UncertaintyConfig;
  llmClient?: UncertaintyLLMClient;
  costTracker?: CostTracker;
  customPatterns?: PatternDefinition[];
  llkbPatterns?: PatternDefinition[];
}

/**
 * Calculate confidence score for generated code
 */
export async function calculateConfidence(
  code: string,
  options: ScorerOptions
): Promise<ConfidenceScore> {
  const {
    config,
    llmClient,
    costTracker,
    customPatterns,
    llkbPatterns,
  } = options;

  const weights: DimensionWeights = config.weights ? {
    syntax: config.weights.syntax,
    pattern: config.weights.pattern,
    selector: config.weights.selector,
    agreement: config.weights.agreement,
  } : DEFAULT_DIMENSION_WEIGHTS;

  // Convert config thresholds to internal format
  const thresholds: ConfidenceThreshold = config.thresholds ? {
    overall: config.thresholds.autoAccept,
    perDimension: {
      syntax: config.thresholds.minimumPerDimension,
      pattern: config.thresholds.minimumPerDimension,
      selector: config.thresholds.minimumPerDimension,
      agreement: config.thresholds.minimumPerDimension,
    },
    blockOnAnyBelow: config.thresholds.block,
  } : DEFAULT_THRESHOLDS;

  // Calculate each dimension
  const dimensions: DimensionScore[] = [];

  // 1. Syntax validation
  const syntaxResult = validateSyntax(code);
  const syntaxScore = createSyntaxDimensionScore(syntaxResult);
  syntaxScore.weight = weights.syntax;
  dimensions.push(syntaxScore);

  // 2. Pattern matching
  const patternResult = matchPatterns(code, {
    customPatterns,
    llkbPatterns,
    includeBuiltins: true,
  });
  const patternScore = createPatternDimensionScore(patternResult);
  patternScore.weight = weights.pattern;
  dimensions.push(patternScore);

  // 3. Selector analysis
  const selectorResult = analyzeSelectors(code);
  const selectorScore = createSelectorDimensionScore(selectorResult);
  selectorScore.weight = weights.selector;
  dimensions.push(selectorScore);

  // 4. Multi-sample agreement (if enabled and LLM client provided)
  let agreementScore: DimensionScore;
  if (config.sampling?.enabled && llmClient && config.sampling.sampleCount > 1) {
    // Check cost budget
    const estimatedTokens = config.sampling.sampleCount * 4000;
    if (costTracker?.wouldExceedLimit(estimatedTokens)) {
      // Skip multi-sampling due to cost
      agreementScore = createDefaultAgreementScore('Cost limit would be exceeded');
    } else {
      // Multi-sampling is expensive, so we create a placeholder for now
      // In a real implementation, this would call the LLM multiple times
      agreementScore = createDefaultAgreementScore('Multi-sampling disabled for single code input');
    }
  } else {
    agreementScore = createDefaultAgreementScore('Multi-sampling not enabled');
  }
  agreementScore.weight = weights.agreement;
  dimensions.push(agreementScore);

  // Calculate overall score
  const overall = calculateOverallScore(dimensions);

  // Determine verdict
  const { verdict, blockedDimensions } = determineVerdict(dimensions, thresholds);

  // Create diagnostics
  const diagnostics = createDiagnostics(dimensions);

  return {
    overall,
    dimensions,
    threshold: thresholds,
    verdict,
    blockedDimensions,
    diagnostics,
  };
}

/**
 * Calculate confidence with multiple samples
 */
export async function calculateConfidenceWithSamples(
  samples: CodeSample[],
  options: ScorerOptions
): Promise<ConfidenceScore> {
  if (samples.length === 0) {
    throw new Error('At least one sample is required');
  }

  if (samples.length === 1) {
    // Single sample - just calculate normally
    const sample = samples[0]!;
    return calculateConfidence(sample.code, options);
  }

  const { config, customPatterns, llkbPatterns } = options;
  const weights: DimensionWeights = config.weights ? {
    syntax: config.weights.syntax,
    pattern: config.weights.pattern,
    selector: config.weights.selector,
    agreement: config.weights.agreement,
  } : DEFAULT_DIMENSION_WEIGHTS;

  // Convert config thresholds to internal format
  const thresholds: ConfidenceThreshold = config.thresholds ? {
    overall: config.thresholds.autoAccept,
    perDimension: {
      syntax: config.thresholds.minimumPerDimension,
      pattern: config.thresholds.minimumPerDimension,
      selector: config.thresholds.minimumPerDimension,
      agreement: config.thresholds.minimumPerDimension,
    },
    blockOnAnyBelow: config.thresholds.block,
  } : DEFAULT_THRESHOLDS;

  // Calculate scores for each sample
  const sampleScores = samples.map(sample => ({
    sample,
    syntax: validateSyntax(sample.code),
    patterns: matchPatterns(sample.code, { customPatterns, llkbPatterns }),
    selectors: analyzeSelectors(sample.code),
  }));

  // Use median scores for syntax, pattern, selector
  const syntaxScores = sampleScores.map(s => s.syntax.score).sort((a, b) => a - b);
  const patternScores = sampleScores.map(s => s.patterns.score).sort((a, b) => a - b);
  const selectorScores = sampleScores.map(s => s.selectors.score).sort((a, b) => a - b);

  const medianIndex = Math.floor(samples.length / 2);

  // Create dimension scores with median values
  const dimensions: DimensionScore[] = [
    {
      dimension: 'syntax',
      score: syntaxScores[medianIndex] ?? 0,
      weight: weights.syntax,
      reasoning: `Median of ${samples.length} samples`,
      subScores: [],
    },
    {
      dimension: 'pattern',
      score: patternScores[medianIndex] ?? 0,
      weight: weights.pattern,
      reasoning: `Median of ${samples.length} samples`,
      subScores: [],
    },
    {
      dimension: 'selector',
      score: selectorScores[medianIndex] ?? 0,
      weight: weights.selector,
      reasoning: `Median of ${samples.length} samples`,
      subScores: [],
    },
  ];

  // Calculate agreement score
  const agreementResult = analyzeAgreement(samples.map(s => s.code));
  const agreementScore: DimensionScore = {
    dimension: 'agreement',
    score: agreementResult.score,
    weight: weights.agreement,
    reasoning: `Agreement across ${samples.length} samples`,
    subScores: [
      { name: 'Structural', score: agreementResult.structuralAgreement },
      { name: 'Selector', score: agreementResult.selectorAgreement },
      { name: 'Flow', score: agreementResult.flowAgreement },
      { name: 'Assertion', score: agreementResult.assertionAgreement },
    ],
  };
  dimensions.push(agreementScore);

  // Calculate overall and verdict
  const overall = calculateOverallScore(dimensions);
  const { verdict, blockedDimensions } = determineVerdict(dimensions, thresholds);
  const diagnostics = createDiagnostics(dimensions);

  return {
    overall,
    dimensions,
    threshold: thresholds,
    verdict,
    blockedDimensions,
    diagnostics,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGREEMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeAgreement(codes: string[]): AgreementAnalysisResult {
  if (codes.length < 2) {
    return {
      score: 1.0,
      sampleCount: codes.length,
      structuralAgreement: 1.0,
      selectorAgreement: 1.0,
      flowAgreement: 1.0,
      assertionAgreement: 1.0,
      disagreementAreas: [],
    };
  }

  // Extract comparable features from each sample
  const features = codes.map(code => extractCodeFeatures(code));

  // Calculate agreement for each aspect
  const structuralAgreement = calculateStructuralAgreement(features);
  const selectorAgreement = calculateSelectorAgreement(features);
  const flowAgreement = calculateFlowAgreement(features);
  const assertionAgreement = calculateAssertionAgreement(features);

  // Find disagreement areas
  const disagreementAreas = findDisagreementAreas(features);

  // Overall agreement score
  const score = (
    structuralAgreement * 0.3 +
    selectorAgreement * 0.3 +
    flowAgreement * 0.2 +
    assertionAgreement * 0.2
  );

  // Select consensus code (most common structure)
  const consensusCode = selectConsensusCode(codes, features);

  return {
    score,
    sampleCount: codes.length,
    structuralAgreement,
    selectorAgreement,
    flowAgreement,
    assertionAgreement,
    consensusCode,
    disagreementAreas,
  };
}

interface CodeFeatures {
  testCount: number;
  stepCount: number;
  selectorStrategies: string[];
  assertions: string[];
  flowStructure: string;
}

function extractCodeFeatures(code: string): CodeFeatures {
  return {
    testCount: (code.match(/test\s*\(/g) || []).length,
    stepCount: (code.match(/test\.step\s*\(/g) || []).length,
    selectorStrategies: extractSelectorStrategies(code),
    assertions: extractAssertions(code),
    flowStructure: extractFlowStructure(code),
  };
}

function extractSelectorStrategies(code: string): string[] {
  const strategies: string[] = [];
  if (/getByTestId/.test(code)) strategies.push('testId');
  if (/getByRole/.test(code)) strategies.push('role');
  if (/getByText/.test(code)) strategies.push('text');
  if (/getByLabel/.test(code)) strategies.push('label');
  if (/locator\(/.test(code)) strategies.push('css');
  return strategies;
}

function extractAssertions(code: string): string[] {
  const assertions: string[] = [];
  const assertionMatches = code.match(/expect\([^)]+\)\.\w+/g) || [];
  for (const match of assertionMatches) {
    const method = match.match(/\.(\w+)$/)?.[1] || '';
    if (method) assertions.push(method);
  }
  return assertions;
}

function extractFlowStructure(code: string): string {
  // Create a simplified flow representation
  const actions: string[] = [];

  // Navigation
  if (/page\.goto/.test(code)) actions.push('navigate');

  // Interactions
  if (/\.click/.test(code)) actions.push('click');
  if (/\.fill/.test(code)) actions.push('fill');
  if (/\.selectOption/.test(code)) actions.push('select');

  // Waits
  if (/waitFor/.test(code)) actions.push('wait');

  // Assertions
  if (/expect\(/.test(code)) actions.push('assert');

  return actions.join('->');
}

function calculateStructuralAgreement(features: CodeFeatures[]): number {
  if (features.length < 2) return 1.0;

  // Compare test counts
  const testCounts = features.map(f => f.testCount);
  const testCountAgreement = calculateValueAgreement(testCounts);

  // Compare step counts
  const stepCounts = features.map(f => f.stepCount);
  const stepCountAgreement = calculateValueAgreement(stepCounts);

  return (testCountAgreement + stepCountAgreement) / 2;
}

function calculateSelectorAgreement(features: CodeFeatures[]): number {
  if (features.length < 2) return 1.0;

  // Calculate Jaccard similarity
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const featureI = features[i];
      const featureJ = features[j];
      if (featureI && featureJ) {
        const set1 = new Set(featureI.selectorStrategies);
        const set2 = new Set(featureJ.selectorStrategies);
        totalSimilarity += jaccardSimilarity(set1, set2);
        comparisons++;
      }
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
}

function calculateFlowAgreement(features: CodeFeatures[]): number {
  if (features.length < 2) return 1.0;

  // Compare flow structures
  const flows = features.map(f => f.flowStructure);
  const uniqueFlows = new Set(flows);

  // If all flows are the same, perfect agreement
  if (uniqueFlows.size === 1) return 1.0;

  // Calculate based on majority
  const flowCounts = new Map<string, number>();
  for (const flow of flows) {
    flowCounts.set(flow, (flowCounts.get(flow) || 0) + 1);
  }

  const maxCount = Math.max(...flowCounts.values());
  return maxCount / flows.length;
}

function calculateAssertionAgreement(features: CodeFeatures[]): number {
  if (features.length < 2) return 1.0;

  // Compare assertions
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const featureI = features[i];
      const featureJ = features[j];
      if (featureI && featureJ) {
        const set1 = new Set(featureI.assertions);
        const set2 = new Set(featureJ.assertions);
        totalSimilarity += jaccardSimilarity(set1, set2);
        comparisons++;
      }
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
}

function calculateValueAgreement(values: number[]): number {
  if (values.length < 2) return 1.0;

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === 0) return 1.0;
  return min / max; // Higher when values are similar
}

function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1.0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function findDisagreementAreas(features: CodeFeatures[]): DisagreementArea[] {
  const areas: DisagreementArea[] = [];

  // Check selector strategy disagreement
  const allStrategies = features.map(f => f.selectorStrategies.join(','));
  if (new Set(allStrategies).size > 1) {
    const voteCounts: Record<string, number> = {};
    for (const s of allStrategies) {
      voteCounts[s] = (voteCounts[s] || 0) + 1;
    }
    const voteValues = Object.values(voteCounts);
    areas.push({
      area: 'Selector Strategies',
      variants: [...new Set(allStrategies)],
      voteCounts,
      confidence: voteValues.length > 0 ? Math.max(...voteValues) / features.length : 0,
    });
  }

  // Check flow disagreement
  const flows = features.map(f => f.flowStructure);
  if (new Set(flows).size > 1) {
    const voteCounts: Record<string, number> = {};
    for (const f of flows) {
      voteCounts[f] = (voteCounts[f] || 0) + 1;
    }
    const voteValues = Object.values(voteCounts);
    areas.push({
      area: 'Test Flow',
      variants: [...new Set(flows)],
      voteCounts,
      confidence: voteValues.length > 0 ? Math.max(...voteValues) / features.length : 0,
    });
  }

  return areas;
}

function selectConsensusCode(codes: string[], features: CodeFeatures[]): string {
  // Select the code with the most common structure
  const structures = features.map(f => JSON.stringify({
    testCount: f.testCount,
    stepCount: f.stepCount,
    flow: f.flowStructure,
  }));

  const structureCounts = new Map<string, number>();
  for (const s of structures) {
    structureCounts.set(s, (structureCounts.get(s) || 0) + 1);
  }

  let maxCount = 0;
  let consensusStructure = structures[0] || '';
  for (const [structure, count] of structureCounts) {
    if (count > maxCount) {
      maxCount = count;
      consensusStructure = structure;
    }
  }

  // Return the first code with the consensus structure
  const index = structures.indexOf(consensusStructure);
  return codes[index] || codes[0] || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateOverallScore(dimensions: DimensionScore[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of dimensions) {
    weightedSum += dim.score * dim.weight;
    totalWeight += dim.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function determineVerdict(
  dimensions: DimensionScore[],
  thresholds: ConfidenceThreshold
): { verdict: ConfidenceVerdict; blockedDimensions: ConfidenceDimension[] } {
  const blockedDimensions: ConfidenceDimension[] = [];

  // Check each dimension against its threshold
  for (const dim of dimensions) {
    const dimThreshold = thresholds.perDimension[dim.dimension];
    // Block if below the absolute minimum OR below the per-dimension threshold
    if (dim.score < thresholds.blockOnAnyBelow || dim.score < dimThreshold) {
      blockedDimensions.push(dim.dimension);
    }
  }

  // Determine verdict
  if (blockedDimensions.length > 0) {
    return { verdict: 'REJECT', blockedDimensions };
  }

  const overall = calculateOverallScore(dimensions);
  if (overall >= thresholds.overall) {
    return { verdict: 'ACCEPT', blockedDimensions: [] };
  }

  return { verdict: 'REVIEW', blockedDimensions: [] };
}

function createDiagnostics(dimensions: DimensionScore[]): ConfidenceDiagnostics {
  // Find lowest and highest dimensions
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  // Generate improvement suggestions
  const suggestions: string[] = [];
  for (const dim of dimensions) {
    if (dim.score < 0.7) {
      suggestions.push(...generateSuggestions(dim));
    }
  }

  // Identify risk areas
  const riskAreas: string[] = [];
  for (const dim of dimensions) {
    if (dim.score < 0.5) {
      riskAreas.push(`Low ${dim.dimension} score (${Math.round(dim.score * 100)}%)`);
    }
  }

  return {
    lowestDimension: lowest ? {
      name: lowest.dimension,
      score: lowest.score,
    } : { name: 'syntax' as const, score: 0 },
    highestDimension: highest ? {
      name: highest.dimension,
      score: highest.score,
    } : { name: 'syntax' as const, score: 0 },
    improvementSuggestions: suggestions.slice(0, 5),
    riskAreas,
  };
}

function generateSuggestions(dim: DimensionScore): string[] {
  switch (dim.dimension) {
    case 'syntax':
      return [
        'Fix TypeScript compilation errors',
        'Use proper Playwright imports',
        'Ensure all brackets are balanced',
      ];
    case 'pattern':
      return [
        'Use recognized Playwright patterns',
        'Follow established test structure',
        'Add test.step() for better organization',
      ];
    case 'selector':
      return [
        'Use data-testid attributes for stability',
        'Prefer getByRole for accessibility',
        'Avoid CSS selectors with class names',
      ];
    case 'agreement':
      return [
        'Increase sample count for better consensus',
        'Review disagreement areas manually',
      ];
    default:
      return [];
  }
}

function createDefaultAgreementScore(reason: string): DimensionScore {
  return {
    dimension: 'agreement',
    score: 0.7, // Neutral score when not using multi-sampling
    weight: 0.2,
    reasoning: reason,
    subScores: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR QUICK CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick confidence check (single dimension)
 */
export function quickConfidenceCheck(
  code: string,
  dimension: ConfidenceDimension
): number {
  switch (dimension) {
    case 'syntax':
      return validateSyntax(code).score;
    case 'pattern':
      return matchPatterns(code).score;
    case 'selector':
      return analyzeSelectors(code).score;
    case 'agreement':
      return 0.7; // Cannot calculate without multiple samples
  }
}

/**
 * Check if code passes minimum confidence
 */
export function passesMinimumConfidence(
  code: string,
  minOverall: number = 0.7,
  minPerDimension: number = 0.4
): boolean {
  const syntaxScore = validateSyntax(code).score;
  if (syntaxScore < minPerDimension) return false;

  const patternScore = matchPatterns(code).score;
  if (patternScore < minPerDimension) return false;

  const selectorScore = analyzeSelectors(code).score;
  if (selectorScore < minPerDimension) return false;

  // Calculate approximate overall
  const overall = (syntaxScore + patternScore + selectorScore) / 3;
  return overall >= minOverall;
}

/**
 * Get blocking issues (reasons code would be rejected)
 */
export function getBlockingIssues(code: string): string[] {
  const issues: string[] = [];

  const syntax = validateSyntax(code);
  if (syntax.errors.length > 0) {
    issues.push(`${syntax.errors.length} syntax error(s)`);
  }

  const selectors = analyzeSelectors(code);
  const fragileCount = selectors.selectors.filter(s => s.isFragile).length;
  if (fragileCount > selectors.selectors.length * 0.5) {
    issues.push(`${fragileCount} fragile selector(s)`);
  }

  return issues;
}
