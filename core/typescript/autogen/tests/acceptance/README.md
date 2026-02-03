# Acceptance Tests - Full Pipeline E2E Testing

This directory contains **acceptance tests** that validate the complete AutoGen pipeline end-to-end, including LLM/AI-generated code.

## Why Separate from Integration Tests?

| Test Type | What It Tests | Deterministic? | Speed |
|-----------|--------------|----------------|-------|
| Unit Tests (`tests/`) | Individual functions | Yes | Fast |
| Integration Tests (`tests/integration/`) | Module interactions, CLI execution | Yes | Medium |
| **Acceptance Tests** (`tests/acceptance/`) | Full pipeline with LLM | **No** | Slow |

Acceptance tests involve LLM code generation, which is **non-deterministic**. This requires:
- Human verification OR
- Structural validation (syntax, imports, required patterns) OR
- Golden file comparison with fuzzy matching

## Running Acceptance Tests

### Quick Validation (Structural Checks Only)
```bash
cd core/typescript/autogen
npm run test:acceptance -- --structural-only
```

### Full E2E with Human Verification
```bash
npm run test:acceptance -- --interactive
```

### Against Specific Journey
```bash
npm run test:acceptance -- --journey journeys/login.md
```

## Acceptance Test Structure

Each acceptance test is a **scenario** defined in a checklist file:

```
tests/acceptance/
├── README.md                    # This file
├── runner.ts                    # Test runner/orchestrator
├── checklists/
│   ├── stage-analyze.yml        # Checklist for analyze stage
│   ├── stage-plan.yml           # Checklist for plan stage
│   ├── stage-generate.yml       # Checklist for generate stage
│   ├── stage-run.yml            # Checklist for run stage
│   └── stage-refine.yml         # Checklist for refine stage
├── scenarios/
│   ├── happy-path-login.yml     # Full scenario: login flow
│   ├── happy-path-crud.yml      # Full scenario: CRUD operations
│   └── error-recovery.yml       # Scenario: error handling
└── fixtures/
    ├── journeys/                # Test journey files
    └── expected/                # Expected outputs (golden files)
```

## Checklist Format

Checklists use YAML with verification criteria:

```yaml
# stage-analyze.yml
stage: analyze
description: Verify analyze command produces valid analysis

checks:
  - id: ANAL-001
    name: "Analysis JSON created"
    type: file_exists
    path: ".artk/autogen/analysis.json"

  - id: ANAL-002
    name: "Journey metadata extracted"
    type: json_contains
    path: ".artk/autogen/analysis.json"
    field: "journeyId"

  - id: ANAL-003
    name: "Steps parsed correctly"
    type: json_array_length
    path: ".artk/autogen/analysis.json"
    field: "steps"
    min: 1

  - id: ANAL-004
    name: "State updated to analyzed"
    type: state_equals
    expected_stage: "analyzed"

errors:
  - id: ANAL-ERR-001
    name: "Invalid journey rejected"
    type: exit_code
    expected: 1
    input: "invalid-journey.md"
```

## Scenario Format

Scenarios orchestrate multiple stages:

```yaml
# happy-path-login.yml
name: "Happy Path: Login Flow"
description: "Complete pipeline for a simple login journey"

journey: "fixtures/journeys/login.md"

stages:
  - stage: analyze
    checklist: "checklists/stage-analyze.yml"
    timeout: 30s

  - stage: plan
    checklist: "checklists/stage-plan.yml"
    timeout: 60s

  - stage: generate
    checklist: "checklists/stage-generate.yml"
    timeout: 120s
    # LLM-specific checks
    llm_checks:
      - type: code_compiles
      - type: imports_valid
      - type: test_structure_valid

  - stage: run
    checklist: "checklists/stage-run.yml"
    timeout: 300s
    # May fail - that's expected for first run
    allow_failure: true

  - stage: refine
    checklist: "checklists/stage-refine.yml"
    timeout: 120s
    max_iterations: 3
    # Refinement continues until tests pass or max iterations

verification:
  - type: all_tests_pass
    description: "Final test suite should pass"
  - type: coverage_minimum
    value: 80%
    description: "Step coverage >= 80%"
```

## Check Types

| Type | Description | Parameters |
|------|-------------|------------|
| `file_exists` | File must exist | `path` |
| `file_not_exists` | File must not exist | `path` |
| `json_contains` | JSON has field | `path`, `field` |
| `json_array_length` | Array length check | `path`, `field`, `min`/`max` |
| `state_equals` | Pipeline state check | `expected_stage` |
| `exit_code` | Command exit code | `expected` |
| `code_compiles` | TypeScript compiles | - |
| `imports_valid` | All imports resolve | - |
| `test_structure_valid` | Has describe/it blocks | - |
| `output_contains` | Output has text | `pattern` |
| `human_verify` | Requires human | `prompt` |

## Human Verification Mode

When running with `--interactive`, checks marked `human_verify` will pause:

```
┌─────────────────────────────────────────────────────────┐
│ HUMAN VERIFICATION REQUIRED                              │
├─────────────────────────────────────────────────────────┤
│ Check: GEN-005 - Generated code is semantically correct  │
│                                                          │
│ Generated test file: tests/login.spec.ts                 │
│                                                          │
│ Please verify:                                           │
│ 1. Test steps match journey steps                        │
│ 2. Assertions are meaningful                             │
│ 3. No obvious logic errors                               │
│                                                          │
│ [P]ass  [F]ail  [S]kip  [V]iew file                      │
└─────────────────────────────────────────────────────────┘
```

## Creating New Scenarios

1. Create journey fixture in `fixtures/journeys/`
2. Create scenario YAML in `scenarios/`
3. Run: `npm run test:acceptance -- --scenario scenarios/my-scenario.yml`

## CI/CD Integration

For CI, use structural checks only (no LLM):

```yaml
# .github/workflows/test.yml
- name: Run acceptance tests (structural)
  run: npm run test:acceptance -- --structural-only --ci
```

For full validation (with LLM), run manually or in dedicated pipeline with human review.
