# ARTK Lessons Learned Knowledge Base (LLKB)

**Date:** 2026-01-16
**Topic:** System for capturing, persisting, and reusing test automation lessons across journeys

---

## Executive Summary

When `/journey-verify` runs, it discovers app-specific issues, fixes them, and generalizes learnings. Currently, these learnings are lost between sessions. This proposal creates a **Lessons Learned Knowledge Base (LLKB)** that:

1. **Captures** issues discovered and fixed during verification
2. **Generalizes** patterns that apply to the entire application
3. **Injects** relevant lessons into future journey creation prompts
4. **Evolves** as the system learns more about the specific application

This is essentially implementing the [Reflexion framework](https://lilianweng.github.io/posts/2023-06-23-agent/) for test automation - agents that learn from past mistakes.

---

## Research Findings

### Industry Best Practices

#### 1. Self-Healing Test Automation Patterns

From [Functionize](https://www.functionize.com/automated-testing/self-healing-test-automation) and [Katalon](https://katalon.com/resources-center/blog/self-healing-test-automation):

- **Multi-attribute fingerprinting**: Store multiple identifiers per element (ID, label, text, class, position, context)
- **Selector priority matrix**: Semantic > Structural > Content-based > ML-generated
- **Confidence scoring**: Probabilistic models assess healing confidence, flagging uncertain cases for human review
- **Element identifier redundancy**: Maintain fallback locator lists

#### 2. Lessons Learned Database Structure

From [PMP Classes](https://pmp-classes.com/editorial/creating-a-lessons-learned-database-for-capturing-valuable-insights/) and [Inspenet](https://inspenet.com/en/articulo/lessons-learned-in-continuous-improvement/):

A proper lessons learned system includes:
1. **Collection** - Identification of facts, data, and experiences
2. **Classification** - By type (technical, organizational, operational)
3. **Evaluation** - Review impact and prioritization
4. **Validation** - Review by experts or internal committees
5. **Implementation** - Application of recommended improvements
6. **Monitoring** - Follow-up on compliance and effectiveness
7. **Feedback** - Database updates and final communication

#### 3. LLM Memory Systems

From [Letta](https://www.letta.com/blog/agent-memory) and [Lilian Weng's research](https://lilianweng.github.io/posts/2023-06-23-agent/):

- **Reflexion Framework**: After each trial, agents reflect on mistakes, write brief reflections, store in episodic memory, consult in future trials
- **Memory Types**:
  - **Episodic**: Examples of desired behavior (past successes)
  - **Procedural**: Instructions for how to do things (patterns)
  - **Semantic**: Facts and domain knowledge (app-specific rules)
- **Context Engineering**: "Most agent failures are not model failures anymore, they are context failures"

#### 4. Flaky Test Detection Patterns

From [Medium - AI-Enhanced Playwright](https://medium.com/@thilinijayasekara97/how-we-reduced-flaky-tests-by-70-with-ai-enhanced-playwright-automation-9474b1c46a22):

- ML models trained on historical execution data predict which tests are likely to fail
- Anomaly detection classifies issues as: environment issue, script fragility, or product defect
- Studies show flaky tests waste 6-8 hours of engineering time per week

---

## Benefits Analysis

### Immediate Benefits

| Benefit | Impact | Metric |
|---------|--------|--------|
| **Reduced verification cycles** | Tests pass on first attempt | -50% verify iterations |
| **Faster journey implementation** | Known patterns pre-applied | -30% implementation time |
| **Consistent test quality** | Same patterns across all tests | Uniform code style |
| **Reduced flakiness** | Known flaky patterns avoided | -70% flaky tests |
| **Knowledge retention** | Learnings survive sessions | Persistent improvements |

### Long-term Benefits

1. **Application DNA**: Build a complete profile of the app's testing quirks
2. **Onboarding acceleration**: New team members benefit from accumulated knowledge
3. **Pattern library**: Reusable solutions for common problems
4. **Predictive testing**: Anticipate issues before they occur
5. **Continuous improvement**: System gets smarter over time

---

## Proposed Architecture

### File Structure

```
<ARTK_ROOT>/
├── .artk/
│   ├── context.json              # Existing context file
│   ├── llkb/                     # Lessons Learned Knowledge Base
│   │   ├── config.yml            # LLKB configuration
│   │   ├── lessons.json          # Core lessons database
│   │   ├── patterns/             # Categorized pattern files
│   │   │   ├── selectors.json    # Selector patterns
│   │   │   ├── timing.json       # Async/timing patterns
│   │   │   ├── data.json         # Test data patterns
│   │   │   ├── auth.json         # Authentication patterns
│   │   │   └── app-specific.json # App-specific quirks
│   │   ├── history/              # Historical learning events
│   │   │   └── 2026-01-16.jsonl  # Daily learning log
│   │   └── analytics.json        # Usage and effectiveness stats
```

### Core Schema: `lessons.json`

```json
{
  "version": "1.0.0",
  "appProfile": {
    "name": "ITSS",
    "framework": "angular",
    "uiLibrary": "ag-grid",
    "authProvider": "azure-ad",
    "lastUpdated": "2026-01-16T10:30:00Z"
  },
  "lessons": [
    {
      "id": "L001",
      "category": "selector",
      "severity": "high",
      "title": "AG Grid cells require aria-based selectors",
      "problem": "CSS class selectors on AG Grid cells are dynamically generated and change between renders",
      "solution": "Use role-based selectors: getByRole('gridcell', { name: /.../ }) or aria-rowindex/aria-colindex",
      "codePattern": {
        "bad": "page.locator('.ag-cell-value')",
        "good": "page.getByRole('gridcell', { name: expectedValue })"
      },
      "applicableTo": ["ag-grid", "data-tables"],
      "confidence": 0.95,
      "occurrences": 12,
      "firstSeen": "2026-01-10T14:22:00Z",
      "lastApplied": "2026-01-16T09:15:00Z",
      "source": {
        "journey": "JRN-0003",
        "file": "tests/smoke/jrn-0003.spec.ts",
        "line": 42
      },
      "validation": {
        "autoValidated": true,
        "humanReviewed": false,
        "effectivenessScore": 0.92
      }
    }
  ],
  "globalRules": [
    {
      "id": "GR001",
      "rule": "Always wait for AG Grid overlay to disappear before interacting with cells",
      "reason": "Grid shows loading overlay that intercepts clicks",
      "implementation": "await grid.waitForDataLoaded()"
    }
  ],
  "appQuirks": [
    {
      "id": "AQ001",
      "component": "DatePicker",
      "quirk": "DatePicker dropdown requires 100ms delay after opening",
      "workaround": "Use expect.poll() to wait for date options to be interactive",
      "permanent": false,
      "issueLink": "https://github.com/org/app/issues/123"
    }
  ]
}
```

### Pattern Categories

#### 1. Selector Patterns (`patterns/selectors.json`)

```json
{
  "version": "1.0.0",
  "patterns": [
    {
      "id": "SEL001",
      "name": "AG Grid Enterprise Row Selection",
      "context": "When selecting rows in AG Grid with enterprise features",
      "problem": "Row selection checkbox not reliably clickable",
      "solution": "Use aria-rowindex to locate row, then find checkbox within",
      "template": "page.locator(`[aria-rowindex=\"${rowIndex}\"]`).getByRole('checkbox')",
      "tags": ["ag-grid", "enterprise", "row-selection"]
    }
  ],
  "selectorPriority": {
    "comment": "App-specific selector priority based on learnings",
    "order": [
      { "type": "data-testid", "reliability": 0.98, "note": "App uses data-testid consistently" },
      { "type": "role+name", "reliability": 0.95, "note": "Good ARIA support" },
      { "type": "aria-label", "reliability": 0.90 },
      { "type": "text-content", "reliability": 0.75, "note": "Some dynamic text" },
      { "type": "css-class", "reliability": 0.40, "note": "Classes are minified in prod" }
    ]
  },
  "avoidSelectors": [
    { "pattern": ".ag-cell-*", "reason": "Dynamic AG Grid classes" },
    { "pattern": "[class*='_']", "reason": "CSS module hashed classes" },
    { "pattern": ".ng-*", "reason": "Angular internal classes" }
  ]
}
```

#### 2. Timing Patterns (`patterns/timing.json`)

```json
{
  "version": "1.0.0",
  "asyncPatterns": [
    {
      "id": "ASYNC001",
      "name": "Toast notification timing",
      "context": "Success/error toasts after form submission",
      "problem": "Toast appears with variable delay (100-500ms)",
      "solution": "Use expectToast with retry logic",
      "template": "await expectToast(page, { message: /success/i, timeout: 5000 })",
      "avgDelay": 250,
      "maxObservedDelay": 800
    }
  ],
  "loadingIndicators": [
    {
      "component": "DataGrid",
      "indicator": "[data-loading='true']",
      "avgLoadTime": 1200,
      "maxObservedTime": 5000
    },
    {
      "component": "FormSubmit",
      "indicator": "button[disabled]",
      "avgLoadTime": 800
    }
  ],
  "networkPatterns": [
    {
      "endpoint": "/api/orders",
      "avgResponseTime": 450,
      "p95ResponseTime": 1200,
      "retryRecommended": true
    }
  ]
}
```

#### 3. Data Patterns (`patterns/data.json`)

```json
{
  "version": "1.0.0",
  "testDataPatterns": [
    {
      "id": "DATA001",
      "entity": "Order",
      "strategy": "api-seed",
      "setupEndpoint": "POST /api/test/orders",
      "cleanupEndpoint": "DELETE /api/test/orders/{id}",
      "namespacePattern": "TEST-{runId}-{timestamp}",
      "requiredFields": ["customerId", "productId", "quantity"],
      "constraints": {
        "quantity": { "min": 1, "max": 100 },
        "customerId": { "pattern": "CUST-*", "note": "Must exist in test DB" }
      }
    }
  ],
  "existingTestData": {
    "comment": "Known test accounts and data that can be reused",
    "accounts": [
      { "role": "admin", "username": "test-admin@example.com", "note": "Read-only, don't modify" },
      { "role": "user", "username": "test-user@example.com" }
    ],
    "fixtures": [
      { "name": "sample-orders", "count": 50, "refreshSchedule": "nightly" }
    ]
  }
}
```

#### 4. Auth Patterns (`patterns/auth.json`)

```json
{
  "version": "1.0.0",
  "authFlow": {
    "type": "azure-ad-oidc",
    "entryPoint": "/login",
    "redirectPattern": "login.microsoftonline.com",
    "mfaRequired": false,
    "sessionDuration": 3600,
    "storageStateValid": 1800
  },
  "authLessons": [
    {
      "id": "AUTH001",
      "problem": "Storage state expires mid-test on long journeys",
      "solution": "Refresh storage state if journey > 15 minutes",
      "implementation": "Check token expiry before long operations"
    }
  ],
  "roleConfigs": {
    "admin": {
      "capabilities": ["crud-all", "admin-panel"],
      "restrictions": []
    },
    "user": {
      "capabilities": ["read-own", "create-order"],
      "restrictions": ["cannot-delete", "no-admin-panel"]
    }
  }
}
```

#### 5. App-Specific Quirks (`patterns/app-specific.json`)

```json
{
  "version": "1.0.0",
  "componentQuirks": [
    {
      "id": "QUIRK001",
      "component": "OrderForm",
      "location": "/orders/new",
      "quirk": "Form validation fires on blur, not on change",
      "impact": "Must tab out of field before checking validation errors",
      "workaround": "await field.blur(); await expect(errorMsg).toBeVisible();"
    },
    {
      "id": "QUIRK002",
      "component": "SearchDropdown",
      "quirk": "Dropdown options load asynchronously after typing",
      "impact": "Cannot immediately click option after typing",
      "workaround": "await expect(dropdown.getByRole('option')).toHaveCount.greaterThan(0);"
    }
  ],
  "knownBugs": [
    {
      "id": "BUG001",
      "description": "Double-click on save button creates duplicate",
      "status": "wont-fix",
      "workaround": "Disable button after first click in test",
      "affectsJourneys": ["JRN-0005", "JRN-0012"]
    }
  ],
  "environmentDifferences": [
    {
      "feature": "SSO redirect",
      "dev": "Mocked, instant",
      "staging": "Real Azure AD, 2-3s",
      "prod": "Real Azure AD with MFA"
    }
  ]
}
```

---

## Integration Points

### 1. Journey-Implement Integration

```markdown
## Step 9.7 — Apply Lessons Learned (NEW)

Before writing tests, check LLKB for relevant lessons:

1. **Load LLKB**: Read `.artk/llkb/lessons.json`
2. **Filter by scope**: Find lessons matching Journey's scope/features
3. **Apply patterns**: Pre-apply known good patterns
4. **Avoid anti-patterns**: Skip known problematic approaches

Example integration:
\`\`\`typescript
// LLKB learned: AG Grid requires aria-based selectors
// Applying pattern SEL001 from lessons
const row = page.locator(`[aria-rowindex="${rowIndex}"]`);

// LLKB learned: Toast timing is variable
// Applying pattern ASYNC001 with learned timeout
await expectToast(page, { message: /success/i, timeout: 5000 });
\`\`\`
```

### 2. Journey-Verify Integration

```markdown
## Step X — Record Learnings (NEW)

After fixing issues, record lessons:

1. **Capture fix details**: What was wrong, what fixed it
2. **Generalize pattern**: Is this app-wide or component-specific?
3. **Update LLKB**: Add/update lesson in appropriate category
4. **Calculate confidence**: Based on number of occurrences

Example learning event:
\`\`\`json
{
  "timestamp": "2026-01-16T10:30:00Z",
  "journey": "JRN-0005",
  "event": "healing",
  "before": {
    "selector": "page.locator('.submit-btn')",
    "error": "Element not found"
  },
  "after": {
    "selector": "page.getByRole('button', { name: 'Submit' })",
    "result": "success"
  },
  "generalized": true,
  "lessonId": "L042"
}
\`\`\`
```

### 3. Journey-Clarify Integration

```markdown
## Step X — Surface Known Quirks (NEW)

When clarifying a Journey, surface relevant LLKB knowledge:

1. **Check component quirks**: Does the Journey touch known quirky components?
2. **Check data constraints**: Are there known data setup requirements?
3. **Check timing issues**: Are there known async patterns for this area?

Output to user:
\`\`\`
**LLKB Insights for this Journey:**
- OrderForm: Validation fires on blur, not change (QUIRK001)
- AG Grid: Use aria-based selectors (SEL001)
- Toast timing: Variable 100-800ms (ASYNC001)

These patterns will be auto-applied during implementation.
\`\`\`
```

### 4. AutoGen Integration

The AutoGen CLI can read LLKB to generate better code:

```bash
# AutoGen reads LLKB automatically
npx artk-autogen generate ../journeys/JRN-0010.md -o tests/ --use-llkb

# Or explicitly specify LLKB path
npx artk-autogen generate ../journeys/JRN-0010.md --llkb .artk/llkb/
```

---

## Learning Lifecycle

### Phase 1: Collection (During Verify)

```
verify discovers issue → analyze root cause → record in history/
```

### Phase 2: Generalization (Automatic)

```
history event → pattern matching → if similar events >= 3 → promote to lesson
```

### Phase 3: Application (During Implement)

```
load LLKB → filter relevant lessons → inject into context → apply patterns
```

### Phase 4: Validation (Ongoing)

```
track lesson effectiveness → if success rate < 70% → demote/archive lesson
```

### Phase 5: Evolution (Continuous)

```
new app version → some lessons obsolete → version-tag lessons → archive old
```

---

## Confidence Scoring

Each lesson has a confidence score (0.0 - 1.0):

| Score | Meaning | Action |
|-------|---------|--------|
| 0.0 - 0.3 | Experimental | Suggest only, don't auto-apply |
| 0.3 - 0.6 | Probable | Auto-apply with comment |
| 0.6 - 0.8 | Confident | Auto-apply silently |
| 0.8 - 1.0 | Certain | Enforce as rule |

**Confidence calculation:**
```
confidence = (successes / total_applications) * recency_factor * validation_boost

where:
  recency_factor = 1.0 - (days_since_last_success / 90) * 0.3
  validation_boost = 1.2 if human_reviewed else 1.0
```

---

## Context Injection Strategy

### Problem: Limited Context Window

LLM context is finite. We can't inject all lessons every time.

### Solution: Relevance-Based Filtering

```typescript
function getRelevantLessons(journey: Journey, llkb: LLKB): Lesson[] {
  const relevant: Lesson[] = [];

  // 1. Match by scope
  relevant.push(...llkb.lessons.filter(l =>
    l.applicableTo.includes(journey.scope)
  ));

  // 2. Match by components used
  const components = extractComponents(journey.steps);
  relevant.push(...llkb.lessons.filter(l =>
    l.applicableTo.some(c => components.includes(c))
  ));

  // 3. Match by route/page
  const routes = extractRoutes(journey.steps);
  relevant.push(...llkb.appQuirks.filter(q =>
    routes.some(r => q.location?.includes(r))
  ));

  // 4. Sort by confidence and recency
  return relevant
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10); // Top 10 most relevant
}
```

### Context Template

```markdown
## LLKB Context (Auto-Injected)

**Relevant lessons for this Journey:**

1. **[HIGH] AG Grid Selectors** (L001, 95% confidence)
   - Use: `page.getByRole('gridcell', { name: value })`
   - Avoid: `.ag-cell-value` CSS selectors

2. **[MEDIUM] Toast Timing** (ASYNC001, 75% confidence)
   - Use: `expectToast(page, { timeout: 5000 })`
   - Observed delay: 100-800ms

3. **[QUIRK] OrderForm Validation** (QUIRK001)
   - Blur field before checking validation errors

---
```

---

## Analytics and Reporting

### Effectiveness Tracking (`analytics.json`)

```json
{
  "stats": {
    "totalLessons": 42,
    "activeRules": 15,
    "archived": 8,
    "avgConfidence": 0.78
  },
  "categoryBreakdown": {
    "selector": 18,
    "timing": 12,
    "data": 7,
    "auth": 3,
    "quirks": 10
  },
  "impactMetrics": {
    "verifyIterationsSaved": 156,
    "avgIterationsBeforeLLKB": 3.2,
    "avgIterationsAfterLLKB": 1.4,
    "estimatedHoursSaved": 45
  },
  "topLessons": [
    { "id": "L001", "applications": 89, "successRate": 0.96 },
    { "id": "ASYNC001", "applications": 67, "successRate": 0.91 }
  ]
}
```

### Dashboard Output

```markdown
## LLKB Health Report

**Coverage:** 42 lessons covering 85% of app components
**Effectiveness:** 92% average success rate
**Impact:** ~45 hours saved in last 30 days

**Top Performers:**
1. AG Grid selectors (L001) - 96% success, 89 uses
2. Toast timing (ASYNC001) - 91% success, 67 uses
3. Form validation quirk (QUIRK001) - 88% success, 34 uses

**Needs Review:**
- Search dropdown timing (ASYNC005) - 62% success, declining
- Modal close button (SEL012) - 58% success, needs update
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create LLKB directory structure
- [ ] Define JSON schemas for all pattern files
- [ ] Create `llkb.config.yml` with defaults
- [ ] Add LLKB loading to journey-implement prompt
- [ ] Add basic lesson recording to journey-verify prompt

### Phase 2: Core Integration (Week 2)
- [ ] Implement relevance filtering algorithm
- [ ] Add context injection to journey prompts
- [ ] Create AutoGen LLKB integration
- [ ] Add confidence scoring system
- [ ] Implement lesson promotion (history → lessons)

### Phase 3: Analytics (Week 3)
- [ ] Track lesson application and outcomes
- [ ] Build effectiveness metrics
- [ ] Create health report generation
- [ ] Add lesson deprecation logic
- [ ] Implement version tagging for app updates

### Phase 4: Advanced Features (Week 4+)
- [ ] Cross-project pattern sharing
- [ ] ML-based pattern suggestion
- [ ] Visual pattern recognition integration
- [ ] Automated quirk detection
- [ ] Integration with bug tracking systems

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stale lessons | Apply outdated patterns | Recency decay in confidence scoring |
| Over-generalization | Wrong pattern applied | Require 3+ occurrences before promotion |
| Context bloat | Too much injected context | Relevance filtering, top-N limit |
| False confidence | Bad pattern marked as good | Effectiveness tracking, auto-demote |
| Schema evolution | Breaking changes | Version field, migration scripts |

---

## Success Criteria

1. **Quantitative**
   - 50% reduction in verify iterations
   - 30% reduction in implementation time
   - 70% reduction in flaky tests
   - 90%+ lesson effectiveness rate

2. **Qualitative**
   - Consistent code patterns across journeys
   - Knowledge retained across sessions
   - New team members productive faster
   - App-specific quirks documented

---

## References

### Research Sources
- [Self-Healing Test Automation - Functionize](https://www.functionize.com/automated-testing/self-healing-test-automation)
- [Katalon Self-Healing Guide](https://katalon.com/resources-center/blog/self-healing-test-automation)
- [AI-Enhanced Playwright - 70% Flaky Test Reduction](https://medium.com/@thilinijayasekara97/how-we-reduced-flaky-tests-by-70-with-ai-enhanced-playwright-automation-9474b1c46a22)
- [LLM Powered Autonomous Agents - Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Agent Memory Systems - Letta](https://www.letta.com/blog/agent-memory)
- [Context Engineering for AI Agents - Weaviate](https://weaviate.io/blog/context-engineering)
- [Lessons Learned Database - PMP Classes](https://pmp-classes.com/editorial/creating-a-lessons-learned-database-for-capturing-valuable-insights/)
- [Test Process Improvement - LambdaTest](https://www.lambdatest.com/learning-hub/test-process-improvement)

### Frameworks Referenced
- **Reflexion**: Self-reflection framework for LLM agents
- **Memp**: Procedural memory for agents
- **AutoContext**: Instance-level context learning

---

## Conclusion

The LLKB system transforms ARTK from a stateless test generator into a **learning system** that gets smarter with each verification cycle. By capturing, generalizing, and reapplying lessons, we can:

1. Dramatically reduce the verify-fix-verify loop
2. Ensure consistent, high-quality test code
3. Build institutional knowledge that survives team changes
4. Create a competitive advantage through accumulated intelligence

This is not just a feature - it's a paradigm shift from "generate tests" to "learn how to test this specific application."
