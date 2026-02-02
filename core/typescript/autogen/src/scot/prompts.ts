/**
 * @module scot/prompts
 * @description LLM prompt templates for SCoT planning
 */

import { JourneyInput } from './planner.js';

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const SCOT_SYSTEM_PROMPT = `You are an expert test automation architect specializing in Playwright E2E tests.

Your task is to analyze a Journey specification and create a Structured Chain-of-Thought (SCoT) plan using these programming structures:

## SEQUENTIAL Structure
For linear, step-by-step actions that must happen in order:
\`\`\`
SEQUENTIAL: <description>
1. <action>
2. <action>
3. <action>
\`\`\`

## BRANCH Structure
For conditional logic where different paths may be taken:
\`\`\`
BRANCH: <condition description>
IF <condition> THEN
  - <action if true>
  - <another action if true>
ELSE
  - <action if false>
ENDIF
\`\`\`

## LOOP Structure
For repeated actions over a collection or until a condition:
\`\`\`
LOOP: <iteration description>
FOR EACH <variable> IN <collection>
  - <action with variable>
ENDFOR
\`\`\`

## Guidelines
1. Use SEQUENTIAL for straightforward test flows
2. Use BRANCH when the test may take different paths (e.g., MFA prompt, error handling)
3. Use LOOP when iterating over table rows, list items, or form fields
4. Each step should be atomic and testable
5. Include assertions as steps (e.g., "Verify redirect to dashboard")
6. Consider edge cases and potential failure points

## Output Format
Your response MUST be valid JSON:
\`\`\`json
{
  "reasoning": "Brief explanation of your understanding of the test flow",
  "confidence": 0.85,
  "plan": [
    {
      "type": "sequential",
      "description": "Login flow",
      "steps": [
        {"action": "navigate", "target": "/login"},
        {"action": "fill", "target": "username field", "value": "test user"},
        {"action": "fill", "target": "password field", "value": "password"},
        {"action": "click", "target": "submit button"},
        {"action": "assert", "assertion": "redirect to dashboard"}
      ]
    },
    {
      "type": "branch",
      "description": "Handle optional MFA",
      "condition": {"element": "MFA prompt", "state": "visible"},
      "thenBranch": [
        {"action": "fill", "target": "TOTP code field", "value": "generated code"},
        {"action": "click", "target": "verify button"}
      ]
    }
  ],
  "warnings": ["MFA handling may need specific TOTP generator setup"]
}
\`\`\`

## Confidence Scoring
- 0.9-1.0: Clear, unambiguous journey with well-defined steps
- 0.7-0.9: Minor ambiguities but overall clear intent
- 0.5-0.7: Several ambiguities or missing details
- Below 0.5: Too vague to create reliable test

Be precise, thorough, and focus on creating a plan that maps directly to Playwright actions.`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function createUserPrompt(journey: JourneyInput): string {
  const parts: string[] = [];

  // Header
  parts.push(`# Journey: ${journey.id}`);
  parts.push(`## ${journey.title}`);
  parts.push('');

  // Description
  if (journey.description) {
    parts.push(`### Description`);
    parts.push(journey.description);
    parts.push('');
  }

  // Tier
  if (journey.tier) {
    parts.push(`**Tier:** ${journey.tier}`);
    parts.push('');
  }

  // Steps
  parts.push(`### Steps`);
  for (const step of journey.steps) {
    parts.push(`${step.number}. ${step.text}`);
    if (step.substeps && step.substeps.length > 0) {
      for (const substep of step.substeps) {
        parts.push(`   - ${substep}`);
      }
    }
  }
  parts.push('');

  // Acceptance Criteria
  if (journey.acceptanceCriteria && journey.acceptanceCriteria.length > 0) {
    parts.push(`### Acceptance Criteria`);
    for (const criterion of journey.acceptanceCriteria) {
      parts.push(`- ${criterion}`);
    }
    parts.push('');
  }

  // Raw markdown if available (for additional context)
  if (journey.rawMarkdown) {
    parts.push(`### Additional Context (Raw Markdown)`);
    parts.push('```markdown');
    parts.push(journey.rawMarkdown);
    parts.push('```');
    parts.push('');
  }

  // Instructions
  parts.push(`---`);
  parts.push(`Create a SCoT plan for this journey. Output your response as valid JSON.`);

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CORRECTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export function createErrorCorrectionPrompt(
  originalResponse: string,
  error: string
): string {
  return `Your previous response had a parsing error:

**Error:** ${error}

**Your response:**
\`\`\`
${originalResponse.substring(0, 1000)}${originalResponse.length > 1000 ? '...' : ''}
\`\`\`

Please fix the JSON and respond with ONLY valid JSON (no markdown code blocks, no explanation).
The JSON must match this structure:
{
  "reasoning": "string",
  "confidence": number (0-1),
  "plan": [...],
  "warnings": [...]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEW-SHOT EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

export const FEW_SHOT_EXAMPLES = {
  simpleLogin: {
    input: `# Journey: J-AUTH-001
## User Login
### Steps
1. Navigate to login page
2. Enter username
3. Enter password
4. Click login button
5. Verify dashboard is displayed`,
    output: {
      reasoning: "Simple login flow with standard username/password authentication",
      confidence: 0.95,
      plan: [
        {
          type: "sequential",
          description: "Standard login flow",
          steps: [
            { action: "navigate", target: "/login" },
            { action: "fill", target: "username field", value: "test_user" },
            { action: "fill", target: "password field", value: "password" },
            { action: "click", target: "login button" },
            { action: "assert", assertion: "dashboard is visible" }
          ]
        }
      ],
      warnings: []
    }
  },
  loginWithMFA: {
    input: `# Journey: J-AUTH-002
## Login with Optional MFA
### Steps
1. Navigate to login page
2. Enter credentials
3. Submit login form
4. If MFA prompt appears, enter TOTP code
5. Verify successful login`,
    output: {
      reasoning: "Login with conditional MFA handling - need to check if MFA prompt appears",
      confidence: 0.85,
      plan: [
        {
          type: "sequential",
          description: "Initial login",
          steps: [
            { action: "navigate", target: "/login" },
            { action: "fill", target: "username", value: "test_user" },
            { action: "fill", target: "password", value: "password" },
            { action: "click", target: "submit button" }
          ]
        },
        {
          type: "branch",
          description: "Handle MFA if prompted",
          condition: { element: "MFA prompt", state: "visible" },
          thenBranch: [
            { action: "fill", target: "TOTP code field", value: "generated_totp" },
            { action: "click", target: "verify button" }
          ]
        },
        {
          type: "sequential",
          description: "Verify login success",
          steps: [
            { action: "assert", assertion: "user is logged in" }
          ]
        }
      ],
      warnings: ["TOTP code generation requires proper test setup"]
    }
  },
  tableIteration: {
    input: `# Journey: J-DATA-001
## Verify All Table Rows
### Steps
1. Navigate to data table page
2. For each row in the table, verify the status column shows "Active"
3. Verify total row count matches expected`,
    output: {
      reasoning: "Table iteration test - need to loop through rows and verify status",
      confidence: 0.80,
      plan: [
        {
          type: "sequential",
          description: "Navigate to table",
          steps: [
            { action: "navigate", target: "/data-table" },
            { action: "wait", target: "table is loaded" }
          ]
        },
        {
          type: "loop",
          description: "Verify each row status",
          iterator: { variable: "row", collection: "table rows", maxIterations: 100 },
          body: [
            { action: "assert", assertion: "row status is Active" }
          ]
        },
        {
          type: "sequential",
          description: "Verify total",
          steps: [
            { action: "assert", assertion: "row count matches expected" }
          ]
        }
      ],
      warnings: ["Large tables may require pagination handling"]
    }
  }
};
