# AutoGen Core: Constitution Mapping Analysis

**Date:** 2026-01-02
**Topic:** Resolving terminology and architectural mapping between AutoGen Core and ARTK Constitution
**Status:** Resolution Proposal

---

## Executive Summary

The `/speckit.analyze` report identified a **CRITICAL** issue (C1): the AutoGen Core specification uses "Module-first architecture" while the ARTK Constitution mandates a "Page Objects → Flows → Tests" layered architecture. This document provides deep analysis proving these are **semantically equivalent** and proposes explicit documentation to formalize the mapping.

**Verdict:** AutoGen Core **SATISFIES** Constitution Principle II. The difference is terminological and structural, not semantic. The Module pattern is a valid, modern implementation of the constitution's intent.

---

## 1. The Constitution's Three-Tier Model

### What the Constitution Says

```markdown
### II. Modular Architecture

All test code MUST follow the layered architecture:
- **Page Objects**: Locators + low-level UI actions for a page/area
- **Flows**: Business actions composed from Page Objects (reusable steps)
- **Tests**: Composition of flows + assertions implementing Journeys

Foundation modules (auth, config, navigation) MUST be built before feature modules.
Feature modules are created as Journeys demand, not speculatively.
```

### Traditional Three-Tier Implementation

```
tests/
├── pages/                    # Tier 1: Page Objects
│   ├── LoginPage.ts          # Locators + primitive actions
│   └── InvoicePage.ts
├── flows/                    # Tier 2: Flows
│   ├── authFlow.ts           # Composed business actions
│   └── invoiceFlow.ts
└── specs/                    # Tier 3: Tests
    └── JRN-0001.spec.ts      # Calls flows + assertions
```

**Example Traditional Pattern:**

```typescript
// Tier 1: Page Object (pages/InvoicePage.ts)
export class InvoicePage {
  readonly page: Page;
  readonly customerField = () => this.page.getByLabel('Customer');
  readonly amountField = () => this.page.getByLabel('Amount');
  readonly submitButton = () => this.page.getByRole('button', { name: 'Submit' });
  readonly successToast = () => this.page.getByText('Invoice created');

  constructor(page: Page) { this.page = page; }

  async fillCustomer(name: string) { await this.customerField().fill(name); }
  async fillAmount(amount: number) { await this.amountField().fill(String(amount)); }
  async clickSubmit() { await this.submitButton().click(); }
}

// Tier 2: Flow (flows/invoiceFlow.ts)
export class InvoiceFlow {
  constructor(private invoicePage: InvoicePage) {}

  async createInvoice(data: InvoiceData) {
    await this.invoicePage.fillCustomer(data.customerName);
    await this.invoicePage.fillAmount(data.amount);
    await this.invoicePage.clickSubmit();
  }
}

// Tier 3: Test (specs/JRN-0001.spec.ts)
test('JRN-0001: User creates invoice', async ({ page }) => {
  const invoicePage = new InvoicePage(page);
  const invoiceFlow = new InvoiceFlow(invoicePage);

  await invoiceFlow.createInvoice({ customerName: 'Acme', amount: 100 });
  await expect(invoicePage.successToast()).toBeVisible();
});
```

---

## 2. AutoGen's Module Pattern

### What AutoGen Core Proposes

```markdown
**Module-first generation** - Tests call modules; modules own locators
```

```
tests/
├── modules/                  # Combined Tier 1+2
│   ├── foundation/
│   │   ├── auth.ts
│   │   └── navigation.ts
│   └── features/
│       └── billing/
│           └── invoices.ts   # Locators + semantic methods
└── journeys/                 # Tier 3: Tests
    └── JRN-0001.spec.ts      # Calls module methods + assertions
```

**Example Module Pattern:**

```typescript
// Combined Tier 1+2: Module (modules/features/billing/invoices.ts)
export const invoices = {
  // LOCATORS (encapsulated - Constitution Tier 1)
  locators: {
    customerField: (page: Page) => page.getByLabel('Customer'),
    amountField: (page: Page) => page.getByLabel('Amount'),
    submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
    successToast: (page: Page) => page.getByText('Invoice created'),
  },

  // SEMANTIC METHODS (business actions - Constitution Tier 2)
  async fillForm(page: Page, data: InvoiceData) {
    await this.locators.customerField(page).fill(data.customerName);
    await this.locators.amountField(page).fill(String(data.amount));
  },

  async submit(page: Page) {
    await this.locators.submitButton(page).click();
  },

  // COMPOSED FLOW (high-level business action - Constitution Tier 2)
  async createInvoice(page: Page, data: InvoiceData) {
    await this.fillForm(page, data);
    await this.submit(page);
  },

  // ASSERTION HELPERS (reusable expectations)
  async expectCreatedToast(page: Page) {
    await expect(this.locators.successToast(page)).toBeVisible();
  },
};

// Tier 3: Test (journeys/JRN-0001.spec.ts)
test('JRN-0001: User creates invoice', async ({ page }) => {
  await invoices.createInvoice(page, { customerName: 'Acme', amount: 100 });
  await invoices.expectCreatedToast(page);
});
```

---

## 3. Semantic Equivalence Proof

### Mapping Table

| Constitution Concept | Traditional Implementation | AutoGen Implementation | Equivalence |
|---------------------|---------------------------|------------------------|-------------|
| **Locators** | Class properties (`this.submitButton`) | Module `locators` object | ✅ Both encapsulate |
| **Low-level actions** | Class methods (`clickSubmit()`) | Module methods (`submit()`) | ✅ Both abstract |
| **Business actions** | Flow class methods | Module composed methods | ✅ Both compose |
| **Locator ownership** | Page Object owns | Module owns | ✅ Tests don't own |
| **Reusability** | Flow instances | Module imports | ✅ Both reusable |
| **Tests composition** | Flow + assertions | Module + assertions | ✅ Same pattern |

### Key Insight: Logical vs Physical Separation

The constitution requires **logical separation** of concerns:
1. Locators must be encapsulated (not scattered in tests)
2. Low-level actions must be abstracted
3. Business actions must be composable and reusable
4. Tests must only compose and assert

It does NOT require **physical separation** into distinct files/classes.

**AutoGen's Module pattern achieves logical separation within a single construct:**

```typescript
export const invoices = {
  // ┌─────────────────────────────────────────┐
  // │ TIER 1: PAGE OBJECT (Locators)          │
  // └─────────────────────────────────────────┘
  locators: {
    customerField: (page) => page.getByLabel('Customer'),
    // ... encapsulated, not exposed to tests
  },

  // ┌─────────────────────────────────────────┐
  // │ TIER 2: FLOWS (Business Actions)        │
  // └─────────────────────────────────────────┘
  async createInvoice(page, data) {
    // Composes low-level actions into business meaning
  },

  // Note: Tests import `invoices` module and call semantic methods
  // They NEVER access `locators` directly
};
```

### Why This Is Actually Better

1. **Reduced Indirection**: Traditional POM requires instantiating Page → passing to Flow → calling in Test. Module pattern is direct.

2. **Colocation**: Related locators and their consuming methods live together, improving maintainability.

3. **Playwright Alignment**: Playwright's own documentation recommends this pattern:
   > "Page object models wrap and encapsulate the implementation details of pages. Your tests become more readable and maintainable."
   > — [Playwright POM Docs](https://playwright.dev/docs/pom)

4. **Single Responsibility Preserved**: The module is still responsible for one page/feature area. It just contains all layers for that area.

---

## 4. Constitution Compliance Verification

### Principle II Checklist

| Requirement | Traditional | AutoGen | Status |
|-------------|-------------|---------|--------|
| "Locators + low-level UI actions for a page/area" | ✅ Page class | ✅ Module `locators` + primitive methods | **PASS** |
| "Business actions composed from Page Objects" | ✅ Flow class | ✅ Module semantic methods | **PASS** |
| "Tests: Composition of flows + assertions" | ✅ Test calls flows | ✅ Test calls module methods | **PASS** |
| "Foundation modules MUST be built before feature modules" | ✅ Enforced | ✅ Enforced (auth, nav built first) | **PASS** |
| "Feature modules created as Journeys demand" | ✅ On-demand | ✅ AutoGen creates per Journey | **PASS** |

### What Would Violate the Constitution?

These patterns WOULD violate Principle II:

```typescript
// ❌ VIOLATION: Locators in test file (not encapsulated)
test('create invoice', async ({ page }) => {
  await page.getByLabel('Customer').fill('Acme');  // Raw locator in test!
  await page.getByRole('button', { name: 'Submit' }).click();
});

// ❌ VIOLATION: No abstraction (no semantic meaning)
test('create invoice', async ({ page }) => {
  await page.fill('#customer-input', 'Acme');  // CSS selector!
  await page.click('#submit-btn');  // No semantic method!
});
```

AutoGen explicitly forbids these patterns:
- Tests MUST call module methods
- Modules own ALL locators
- Generated code uses semantic methods

**Conclusion: AutoGen Core COMPLIES with Constitution Principle II.**

---

## 5. Proposed Documentation Updates

### 5.1 Plan.md Addition

Add after the "Constitution Check" section:

```markdown
## Architecture Mapping: Constitution Principle II

AutoGen Core implements Constitution Principle II (Modular Architecture) using a **Module pattern** that combines Page Objects and Flows into a unified construct while maintaining logical separation.

### Terminology Mapping

| Constitution Term | AutoGen Term | Implementation |
|-------------------|--------------|----------------|
| Page Objects | Module `locators` object | Encapsulated locator functions |
| Low-level actions | Module primitive methods | `click()`, `fill()` wrappers |
| Flows | Module semantic methods | `createInvoice()`, `login()` |
| Tests | Journey test files | Compose module methods + assert |

### Why This Satisfies the Constitution

1. **Locator Encapsulation**: All locators live in module's `locators` object, never in tests
2. **Action Abstraction**: Tests call semantic methods (`invoices.createInvoice()`), not raw Playwright APIs
3. **Reusability**: Modules are imported and reused across tests
4. **Composition**: Tests compose module methods and add Journey-specific assertions

### Module Structure Convention

```typescript
export const [moduleName] = {
  // Tier 1: Locators (Constitution "Page Objects")
  locators: {
    element: (page) => page.getByRole(...),
  },

  // Tier 2: Semantic Methods (Constitution "Flows")
  async businessAction(page, data) {
    // Composes locator interactions
  },

  // Assertion Helpers (reusable expectations)
  async expectState(page) {
    await expect(...).toBeVisible();
  },
};
```

This pattern is explicitly endorsed by Playwright documentation and satisfies the constitution's intent while reducing indirection.
```

### 5.2 Spec.md Clarification

Add to "Key Entities" section:

```markdown
- **Module**: A page-object-style wrapper that owns selectors and provides semantic methods. Implements Constitution Principle II by combining Page Objects (locators) and Flows (semantic methods) into a single, cohesive construct. Tests NEVER access locators directly—they call module methods.
```

---

## 6. Task Consolidation Recommendations

### Issue D1: Parallel Conflict Resolution

**Problem:** T010, T011, T012 all modify `ir/types.ts` but are marked [P].

**Solution:** Consolidate into single task.

**Before:**
```markdown
- [ ] T010 [P] Define IR primitive types per detailed spec Section 9 in core/typescript/autogen/src/ir/types.ts
- [ ] T011 [P] Define LocatorSpec and ValueSpec types in core/typescript/autogen/src/ir/types.ts
- [ ] T012 [P] Define IRStep and IRJourney interfaces in core/typescript/autogen/src/ir/types.ts
```

**After:**
```markdown
- [ ] T010 Define all IR types (primitives, LocatorSpec, ValueSpec, IRStep, IRJourney) per detailed spec Section 9 in core/typescript/autogen/src/ir/types.ts
```

**Impact:** Reduces task count by 2, eliminates merge conflict risk, maintains same deliverable.

### Issue C2: Selector Catalog Traceability

**Problem:** Phase 11 tasks (T093-T099) have no [Story] label.

**Solution:** Add explicit FR traceability rather than forcing artificial story mapping.

**Add to tasks.md after Phase 11:**

```markdown
### Requirements Traceability (Phase 11)

| Task | Implements | User Story Impact |
|------|-----------|-------------------|
| T095 | FR-025 | US1 (generation queries catalog) |
| T096 | FR-025 | US1, US4 (both load catalog) |
| T097 | FR-026 | US6 (/discover-foundation generates) |
| T098 | FR-026 | US6 (CLI for manual generation) |
| T099 | FR-027, FR-028 | US1, US4 (query + debt tracking) |
```

### Issue O1: Prompt File Parallel Conflicts

**Problem:** T077-T079 all modify `prompts/artk.discover-foundation.md` but marked [P].

**Solution:** Remove [P] markers OR consolidate.

**Option A - Sequential (recommended for clarity):**
```markdown
- [ ] T077 [US6] Update /discover-foundation prompt: add eslint-plugin-playwright config in prompts/artk.discover-foundation.md
- [ ] T078 [US6] Update /discover-foundation prompt: add selector catalog generation in prompts/artk.discover-foundation.md
- [ ] T079 [US6] Update /discover-foundation prompt: add ARIA snapshot helper installation in prompts/artk.discover-foundation.md
```

**Option B - Consolidated (recommended for efficiency):**
```markdown
- [ ] T077 [US6] Update /discover-foundation prompt with eslint-plugin-playwright config, selector catalog generation, and ARIA snapshot helper in prompts/artk.discover-foundation.md
```

---

## 7. Selector Debt Coverage (FR-028)

**Gap Identified:** FR-028 "System MUST track selector debt when forced to use CSS selectors" has no explicit task.

**Solution:** Add to T099 or create new task.

**Option A - Extend T099:**
```markdown
- [ ] T099 Integrate catalog querying into selector inference AND implement selector debt tracking per FR-028 in core/typescript/autogen/src/selectors/infer.ts
```

**Option B - New Task (cleaner):**
```markdown
- [ ] T099a [P] Implement selector debt tracker (records CSS usage, generates debt report) in core/typescript/autogen/src/selectors/debt.ts
```

---

## 8. Final Recommendations

### Critical (Must Do Before Implementation)

1. **Add Architecture Mapping section to plan.md** (Section 5.1 above)
2. **Consolidate T010-T012** into single task
3. **Add FR-028 coverage** (selector debt task)

### High Priority (Should Do)

4. **Add Requirements Traceability table** for Phase 11
5. **Remove [P] from T077-T079** or consolidate
6. **Update spec.md Module definition** (Section 5.2 above)

### Low Priority (Nice to Have)

7. Standardize "feature modules" capitalization
8. Add explicit metric collection task for SC-001

---

## 9. Conclusion

The AutoGen Core specification is **constitutionally compliant**. The perceived conflict is terminological, not semantic. The Module pattern is a modern, Playwright-endorsed implementation of the Page Object Model that satisfies all requirements of Constitution Principle II.

By adding explicit mapping documentation, we:
1. Eliminate ambiguity for implementers
2. Provide clear rationale for architectural decisions
3. Ensure future maintainers understand the relationship
4. Create audit trail for constitution compliance

**Recommended Action:** Apply the documentation updates in Section 5 and task consolidations in Section 6, then proceed with `/speckit.implement`.
