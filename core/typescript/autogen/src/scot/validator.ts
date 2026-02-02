/**
 * @module scot/validator
 * @description Validate SCoT plans for correctness and completeness
 */

import {
  SCoTPlan,
  SCoTStructure,
  SCoTAtomicStep,
  SCoTValidationResult,
  SCoTValidationError,
  SCoTConfig,
  isSequential,
  isBranch,
  isLoop,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

export function validateSCoTPlan(plan: SCoTPlan, config: SCoTConfig): SCoTValidationResult {
  const errors: SCoTValidationError[] = [];
  const warnings: string[] = [];

  // Check basic plan structure
  if (!plan.journeyId) {
    errors.push({
      path: 'journeyId',
      message: 'Plan must have a journeyId',
      severity: 'error',
    });
  }

  if (!plan.structures || plan.structures.length === 0) {
    errors.push({
      path: 'structures',
      message: 'Plan must have at least one structure',
      severity: 'error',
    });
  }

  // Check structure count limit
  if (plan.structures.length > config.maxStructures) {
    errors.push({
      path: 'structures',
      message: `Plan has ${plan.structures.length} structures, exceeds maximum of ${config.maxStructures}`,
      severity: 'error',
    });
  }

  // Check confidence threshold
  if (plan.confidence < config.minConfidence) {
    errors.push({
      path: 'confidence',
      message: `Plan confidence ${plan.confidence.toFixed(2)} is below minimum ${config.minConfidence}`,
      severity: 'error',
    });
  }

  // Validate each structure
  plan.structures.forEach((structure, index) => {
    const structureErrors = validateStructure(structure, `structures[${index}]`);
    errors.push(...structureErrors);
  });

  // Check for empty reasoning (warning only)
  if (!plan.reasoning || plan.reasoning.trim().length < 10) {
    warnings.push('Plan reasoning is missing or too short');
  }

  // Check for warnings in the plan
  if (plan.warnings && plan.warnings.length > 0) {
    warnings.push(...plan.warnings.map(w => `LLM warning: ${w}`));
  }

  // Check for potential infinite loops
  const loopWarnings = checkForInfiniteLoops(plan.structures);
  warnings.push(...loopWarnings);

  // Check for unreachable code
  const unreachableWarnings = checkForUnreachableCode(plan.structures);
  warnings.push(...unreachableWarnings);

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateStructure(structure: SCoTStructure, path: string): SCoTValidationError[] {
  const errors: SCoTValidationError[] = [];

  // Check description
  if (!structure.description || structure.description.trim().length === 0) {
    errors.push({
      path: `${path}.description`,
      message: 'Structure must have a description',
      severity: 'warning',
    });
  }

  if (isSequential(structure)) {
    errors.push(...validateSequential(structure, path));
  } else if (isBranch(structure)) {
    errors.push(...validateBranch(structure, path));
  } else if (isLoop(structure)) {
    errors.push(...validateLoop(structure, path));
  }

  return errors;
}

function validateSequential(structure: { steps: SCoTAtomicStep[] }, path: string): SCoTValidationError[] {
  const errors: SCoTValidationError[] = [];

  if (!structure.steps || structure.steps.length === 0) {
    errors.push({
      path: `${path}.steps`,
      message: 'Sequential structure must have at least one step',
      severity: 'error',
    });
    return errors;
  }

  structure.steps.forEach((step, index) => {
    errors.push(...validateStep(step, `${path}.steps[${index}]`));
  });

  return errors;
}

function validateBranch(
  structure: { condition: unknown; thenBranch: SCoTAtomicStep[]; elseBranch?: SCoTAtomicStep[] },
  path: string
): SCoTValidationError[] {
  const errors: SCoTValidationError[] = [];

  // Check condition
  if (!structure.condition) {
    errors.push({
      path: `${path}.condition`,
      message: 'Branch structure must have a condition',
      severity: 'error',
    });
  }

  // Check thenBranch
  if (!structure.thenBranch || structure.thenBranch.length === 0) {
    errors.push({
      path: `${path}.thenBranch`,
      message: 'Branch structure must have at least one step in thenBranch',
      severity: 'error',
    });
  } else {
    structure.thenBranch.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.thenBranch[${index}]`));
    });
  }

  // Validate elseBranch if present
  if (structure.elseBranch) {
    structure.elseBranch.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.elseBranch[${index}]`));
    });
  }

  return errors;
}

function validateLoop(
  structure: { iterator: unknown; body: SCoTAtomicStep[]; maxIterations?: number },
  path: string
): SCoTValidationError[] {
  const errors: SCoTValidationError[] = [];

  // Check iterator
  if (!structure.iterator) {
    errors.push({
      path: `${path}.iterator`,
      message: 'Loop structure must have an iterator',
      severity: 'error',
    });
  }

  // Check body
  if (!structure.body || structure.body.length === 0) {
    errors.push({
      path: `${path}.body`,
      message: 'Loop structure must have at least one step in body',
      severity: 'error',
    });
  } else {
    structure.body.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.body[${index}]`));
    });
  }

  // Check maxIterations
  if (structure.maxIterations !== undefined && structure.maxIterations <= 0) {
    errors.push({
      path: `${path}.maxIterations`,
      message: 'Loop maxIterations must be positive',
      severity: 'error',
    });
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateStep(step: SCoTAtomicStep, path: string): SCoTValidationError[] {
  const errors: SCoTValidationError[] = [];

  if (!step.action || step.action.trim().length === 0) {
    errors.push({
      path: `${path}.action`,
      message: 'Step must have an action',
      severity: 'error',
    });
  }

  // Validate action-specific requirements
  const action = step.action.toLowerCase();

  if (['click', 'fill', 'select', 'check', 'uncheck', 'hover', 'focus'].includes(action)) {
    if (!step.target) {
      errors.push({
        path: `${path}.target`,
        message: `${action} action requires a target`,
        severity: 'warning',
      });
    }
  }

  if (['fill', 'type', 'input'].includes(action)) {
    if (!step.value && !step.target?.includes('=')) {
      errors.push({
        path: `${path}.value`,
        message: `${action} action should have a value`,
        severity: 'warning',
      });
    }
  }

  if (['assert', 'expect', 'verify'].includes(action)) {
    if (!step.assertion && !step.target) {
      errors.push({
        path: `${path}.assertion`,
        message: `${action} action should have an assertion or target`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED CHECKS
// ═══════════════════════════════════════════════════════════════════════════

function checkForInfiniteLoops(structures: SCoTStructure[]): string[] {
  const warnings: string[] = [];

  structures.forEach((structure, index) => {
    if (isLoop(structure)) {
      // Check if loop has no max iterations and no clear exit condition
      if (!structure.maxIterations) {
        warnings.push(
          `Loop at index ${index} has no maxIterations limit - could potentially loop indefinitely`
        );
      }

      // Check if loop body has any assertions or conditions that could break
      const hasBreakCondition = structure.body.some(
        step => ['assert', 'expect', 'verify', 'break'].includes(step.action.toLowerCase())
      );
      if (!hasBreakCondition && !structure.maxIterations) {
        warnings.push(
          `Loop at index ${index} has no break condition or iteration limit`
        );
      }
    }
  });

  return warnings;
}

function checkForUnreachableCode(structures: SCoTStructure[]): string[] {
  const warnings: string[] = [];

  structures.forEach((structure, index) => {
    if (isBranch(structure)) {
      // Check for always-true or always-false conditions
      const condition = structure.condition;
      if (condition.expression) {
        const expr = condition.expression.toLowerCase();
        if (expr === 'true' || expr === '1' || expr === 'always') {
          warnings.push(
            `Branch at index ${index} has always-true condition - elseBranch may be unreachable`
          );
        }
        if (expr === 'false' || expr === '0' || expr === 'never') {
          warnings.push(
            `Branch at index ${index} has always-false condition - thenBranch may be unreachable`
          );
        }
      }
    }
  });

  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK VALIDATION (for confidence check only)
// ═══════════════════════════════════════════════════════════════════════════

export function quickValidateConfidence(plan: SCoTPlan, minConfidence: number): boolean {
  return plan.confidence >= minConfidence;
}

export function getValidationSummary(result: SCoTValidationResult): string {
  const errorCount = result.errors.filter(e => e.severity === 'error').length;
  const warningCount = result.errors.filter(e => e.severity === 'warning').length + result.warnings.length;

  if (result.valid) {
    if (warningCount > 0) {
      return `Valid with ${warningCount} warning(s)`;
    }
    return 'Valid';
  }

  return `Invalid: ${errorCount} error(s), ${warningCount} warning(s)`;
}
