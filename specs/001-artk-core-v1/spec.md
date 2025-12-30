# Feature Specification: ARTK Core v1 Infrastructure Library

**Feature Branch**: `001-artk-core-v1`
**Created**: 2025-12-29
**Status**: Draft
**Input**: Vendorable Playwright infrastructure library providing config-driven setup, OIDC authentication, reusable fixtures, selector utilities, common assertions, data management, and multi-language support architecture.

## Out of Scope (v1)

The following are explicitly excluded from ARTK Core v1:

- **CI/CD pipeline integration**: No built-in GitHub Actions, Jenkins, GitLab CI, or other CI/CD configurations. Pipeline setup is handled via documentation and prompts.
- **Visual regression testing**: No screenshot comparison, baseline management, or pixel-diff utilities.
- **API-only testing utilities**: No standalone API test framework. API calls are supported only as data helpers for E2E tests (e.g., test data creation, cleanup operations), not for testing API endpoints directly.
- **Mobile/native app support**: Browser-based testing only; no Appium, Detox, or native mobile integrations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Config-Driven Test Setup (Priority: P1)

As a test engineer, I want to configure my entire Playwright test infrastructure through a single YAML file so that I can customize environments, authentication, and behaviors without modifying code.

**Why this priority**: Configuration is the foundation that all other components depend on. Without a working config system, no other feature can function properly.

**Independent Test**: Can be fully tested by creating a valid `artk.config.yml` file and verifying the system loads, validates, and provides typed access to all configuration sections.

**Acceptance Scenarios**:

1. **Given** a valid `artk.config.yml` file exists, **When** the config loader is invoked, **Then** the system returns a typed configuration object with all sections accessible.
2. **Given** environment variables are referenced in config (e.g., `${ARTK_BASE_URL}`), **When** the config is loaded, **Then** environment variables are resolved to their actual values.
3. **Given** a config file with invalid values (e.g., unknown auth provider), **When** the config loader runs, **Then** the system returns a clear error message with the invalid field and suggested fix.
4. **Given** multiple named environments are defined, **When** the user sets `ARTK_ENV=staging`, **Then** the staging environment configuration is active.

---

### User Story 2 - OIDC Authentication with Storage State (Priority: P1)

As a test engineer working with enterprise applications, I want automated OIDC login that persists authentication state across test runs so that tests execute quickly without repeated login flows.

**Why this priority**: Authentication is required before any meaningful test can run. Enterprise apps universally require login, making this a blocking prerequisite.

**Independent Test**: Can be fully tested by running an auth setup project that logs into an OIDC-protected application and saves storage state, then verifying subsequent tests can use that state without re-authenticating.

**Acceptance Scenarios**:

1. **Given** OIDC configuration with Keycloak IdP type, **When** the auth setup project runs, **Then** the system navigates to the login page, fills credentials, handles MFA if configured, and saves storage state.
2. **Given** valid storage state exists from a previous run, **When** a new test session starts, **Then** the system reuses the existing state without performing a new login.
3. **Given** storage state is older than the configured maximum age, **When** a test session starts, **Then** the system performs a fresh login and saves new storage state.
4. **Given** multiple roles are defined (admin, standardUser), **When** auth setup runs, **Then** separate storage state files are created for each role.
5. **Given** MFA is enabled with TOTP, **When** the login flow encounters the MFA prompt, **Then** the system generates and enters a valid TOTP code from the configured secret.

---

### User Story 3 - Pre-Built Test Fixtures (Priority: P2)

As a test engineer, I want pre-configured Playwright fixtures for common patterns (authenticated pages, API contexts, test data) so that I can write tests faster with less boilerplate.

**Why this priority**: Fixtures reduce test authoring time significantly and enforce consistent patterns across the test suite.

**Independent Test**: Can be fully tested by writing a test that uses `authenticatedPage`, `apiContext`, and `testData` fixtures and verifying each provides the expected functionality.

**Acceptance Scenarios**:

1. **Given** `authenticatedPage` fixture is requested, **When** the test runs, **Then** a Page object is provided that is already logged in as the default role.
2. **Given** `adminPage` fixture is requested, **When** the test runs, **Then** a Page object is provided that is logged in as admin role specifically.
3. **Given** `apiContext` fixture is requested, **When** the test makes API calls, **Then** the context includes authentication headers and configured extra headers.
4. **Given** `testData` fixture with cleanup registration, **When** the test completes (pass or fail), **Then** registered cleanup functions execute automatically.
5. **Given** `runId` fixture is used, **When** multiple tests run in parallel, **Then** each test receives a unique identifier for data isolation.

---

### User Story 4 - Accessibility-First Locator Utilities (Priority: P2)

As a test engineer, I want locator utilities that prioritize accessibility selectors (role, label) over brittle CSS selectors so that my tests are more resilient to UI changes.

**Why this priority**: Proper locator strategy is essential for test stability and maintenance. Using accessibility-first approach reduces test flakiness.

**Independent Test**: Can be fully tested by using locator utilities to find elements by role, label, and test-id, verifying the configured strategy order is respected.

**Acceptance Scenarios**:

1. **Given** an element with role="button" and name="Submit", **When** `byRole(page, 'button', { name: 'Submit' })` is called, **Then** the correct element is located.
2. **Given** a form field with associated label "Email", **When** `byLabel(page, 'Email')` is called, **Then** the input element is located.
3. **Given** an element with `data-testid="user-menu"`, **When** `byTestId(page, 'user-menu')` is called, **Then** the element is located using the configured test ID attribute.
4. **Given** a custom test ID attribute (`data-qa`) is configured, **When** `byTestId` is called, **Then** it uses the custom attribute.
5. **Given** scoped locator `withinForm(page, 'login')`, **When** `field('email')` is called on the scoped locator, **Then** only elements within that form are searched.

---

### User Story 5 - Common Assertion Helpers (Priority: P3)

As a test engineer, I want pre-built assertions for common UI patterns (toasts, tables, forms, loading states) so that I can write more expressive and reliable tests.

**Why this priority**: Common assertions reduce code duplication and make tests more readable. Important but not blocking for basic test execution.

**Independent Test**: Can be fully tested by creating UI scenarios with toasts, tables, and loading states, then verifying the assertion helpers correctly pass or fail.

**Acceptance Scenarios**:

1. **Given** a success toast appears with message "Order created", **When** `expectToast(page, 'Order created', { type: 'success' })` is called, **Then** the assertion passes.
2. **Given** a table contains a row with specific data, **When** `expectTableToContainRow(page, 'orders-table', { id: '123', status: 'Active' })` is called, **Then** the assertion passes if the row exists.
3. **Given** a form field has validation error "Email is required", **When** `expectFormFieldError(page, 'email', 'Email is required')` is called, **Then** the assertion passes.
4. **Given** a loading spinner is visible, **When** `waitForLoadingComplete(page)` is called, **Then** it waits until no loading indicators are present.
5. **Given** no toast is displayed, **When** `expectNoToast(page)` is called, **Then** the assertion passes.

---

### User Story 6 - Test Data Isolation and Cleanup (Priority: P3)

As a test engineer, I want automatic test data namespacing and cleanup so that tests can run in parallel without data conflicts and leave no orphaned data.

**Why this priority**: Data isolation prevents flaky tests from shared state. Important for reliable parallel execution.

**Independent Test**: Can be fully tested by running multiple tests in parallel that create namespaced data, verifying no conflicts occur and cleanup runs after each test.

**Acceptance Scenarios**:

1. **Given** a test creates data with name "Test Order", **When** `namespace('Test Order', runId)` is called, **Then** the result includes a unique identifier like "Test Order [artk-abc123]".
2. **Given** cleanup function is registered via `testData.cleanup()`, **When** the test completes, **Then** the cleanup function executes regardless of test pass/fail status.
3. **Given** multiple tests run in parallel, **When** each creates namespaced data, **Then** no data collisions occur between tests.
4. **Given** a DataBuilder with namespacing, **When** `withNamespace(runId).build()` is called, **Then** all string fields that should be unique include the namespace.

---

### User Story 7 - Journey-Aware Reporting (Priority: P4)

As a test lead, I want test reports that map results back to Journey definitions so that I can track regression coverage and identify which business scenarios are passing or failing.

**Why this priority**: Reporting provides visibility but is not blocking for test execution. Can be added after core functionality works.

**Independent Test**: Can be fully tested by running tests tagged with Journey IDs and verifying the ARTK reporter output includes journey mapping.

**Acceptance Scenarios**:

1. **Given** a test is tagged with `@JRN-0001`, **When** the ARTK reporter generates output, **Then** the result includes the Journey ID mapping.
2. **Given** PII masking is enabled, **When** screenshots are captured on failure, **Then** elements matching configured PII selectors are masked.
3. **Given** HTML and JSON reporters are enabled, **When** tests complete, **Then** both report formats are generated in configured directories.

---

### User Story 8 - Prompt Integration with Core (Priority: P4)

As an AI assistant (GitHub Copilot, Claude), I want updated ARTK prompts that reference the new core framework so that I can generate project-specific code that imports from and builds upon the vendored core modules.

**Why this priority**: Prompts are how users interact with ARTK. Without updated prompts, AI assistants will generate code that doesn't use the new core modules. Can be done after core is stable.

**Independent Test**: Can be fully tested by invoking each updated prompt and verifying it references core imports (e.g., `from 'artk/.core/...'`) rather than generating equivalent code from scratch.

**Acceptance Scenarios**:

1. **Given** the `/init` prompt is invoked, **When** it scaffolds a new ARTK project, **Then** it copies core to `artk/.core/` and generates `artk.config.yml`.
2. **Given** the `/foundation-build` prompt is invoked, **When** it sets up the Playwright harness, **Then** it imports `createPlaywrightConfig` from core rather than generating a config factory.
3. **Given** the `/journey-implement` prompt is invoked, **When** it generates test code, **Then** it imports fixtures from `artk/.core/fixtures` and locators from `artk/.core/locators`.
4. **Given** the `/journey-validate` prompt is invoked, **When** it validates test code, **Then** it checks for correct core API usage (imports, fixture names, assertion patterns).
5. **Given** the `/journey-verify` prompt is invoked, **When** it runs tests, **Then** it uses the core fixtures and harness configuration.

---

### Edge Cases

- What happens when config file does not exist? System displays clear error with expected file location and sample config.
- What happens when IdP login page has unexpected structure? System uses configured selector overrides or falls back to generic selectors with appropriate timeout and error message.
- What happens when storage state file is corrupted? System detects invalid state, logs warning, and performs fresh authentication.
- What happens when TOTP secret is missing but MFA is enabled? System fails fast with clear error indicating the required environment variable.
- What happens when cleanup function throws an error? System logs the error but continues executing remaining cleanup functions.
- What happens when test ID attribute is not present on element? System falls back to next strategy in configured order.

## Requirements *(mandatory)*

### Functional Requirements

**Config System:**
- **FR-001**: System MUST load configuration from `artk/artk.config.yml` file
- **FR-002**: System MUST validate configuration against defined schema and report all validation errors with field paths
- **FR-003**: System MUST resolve environment variables using `${VAR_NAME}` and `${VAR_NAME:-default}` syntax
- **FR-004**: System MUST support named environment profiles (local, dev, staging) switchable via `ARTK_ENV`
- **FR-005**: System MUST provide typed access to all configuration sections

**Authentication:**
- **FR-006**: System MUST support OIDC authentication with at least Keycloak, Azure AD, Okta, and generic OIDC providers
- **FR-007**: System MUST persist authentication state to files and reuse valid state across test runs
- **FR-008**: System MUST invalidate storage state based on configurable maximum age
- **FR-009**: System MUST support multiple named roles with separate credentials and storage states
- **FR-010**: System MUST handle TOTP-based MFA by generating codes from configured secret
- **FR-011**: System MUST read credentials from environment variables (never hardcoded)

**Fixtures:**
- **FR-012**: System MUST provide `authenticatedPage` fixture with pre-logged-in Page object
- **FR-013**: System MUST generate role-specific page fixtures (e.g., `adminPage`) for each configured role
- **FR-014**: System MUST provide `apiContext` fixture with authentication headers
- **FR-015**: System MUST provide `testData` fixture with cleanup registration capability
- **FR-016**: System MUST provide `runId` fixture with unique identifier per test

**Locators:**
- **FR-017**: System MUST support locator strategies: role, label, placeholder, testid, text, css
- **FR-018**: System MUST apply strategies in configured order until a match is found
- **FR-019**: System MUST support custom test ID attribute configuration
- **FR-020**: System MUST provide scoped locators for forms, tables, and sections

**Assertions:**
- **FR-021**: System MUST provide toast/notification assertions with type detection
- **FR-022**: System MUST provide table row assertions with column matching
- **FR-023**: System MUST provide form validation error assertions
- **FR-024**: System MUST provide loading state assertions with configurable selectors

**Data Harness:**
- **FR-025**: System MUST generate unique run IDs for test isolation
- **FR-026**: System MUST provide namespacing utilities that append run ID to values
- **FR-027**: System MUST execute registered cleanup functions after test completion
- **FR-028**: System MUST run cleanup even when tests fail (configurable)

**Reporters:**
- **FR-029**: System MUST map test results to Journey IDs via `@JRN-####` tags
- **FR-030**: System MUST support PII masking in screenshots based on configured selectors
- **FR-031**: System MUST generate ARTK-specific report format with journey mapping

**Distribution:**
- **FR-032**: System MUST be vendorable (copyable) into target projects without npm installation
- **FR-033**: System MUST include version tracking file for upgrade compatibility checking
- **FR-034**: System MUST preserve project-specific code when core is updated

**Prompt Integration:**
- **FR-035**: `/init` prompt MUST install core to `artk/.core/` and generate starter `artk.config.yml`
- **FR-036**: `/foundation-build` prompt MUST configure core modules, not regenerate equivalent code
- **FR-037**: `/journey-implement` prompt MUST import from core (fixtures, locators, assertions) and generate only project-specific code (page objects, flows, tests)
- **FR-038**: `/journey-validate` prompt MUST validate against core APIs (correct imports, fixture usage, assertion patterns)
- **FR-039**: `/journey-verify` prompt MUST use core fixtures and harness for test execution

### Key Entities

- **ARTKConfig**: Root configuration object containing all settings (app, environments, auth, selectors, assertions, data, fixtures, tiers, reporters, artifacts, browsers, journeys)
- **AuthProvider**: Interface for authentication implementations (OIDC, Form, Token, Custom)
- **StorageState**: Persisted browser state including cookies and local storage for session reuse
- **Credentials**: Username/password pair loaded from environment variables
- **Role**: Named authentication profile with credentials and optional provider overrides
- **TestDataManager**: Fixture for registering cleanup functions and managing test data lifecycle
- **Locator**: Playwright locator with strategy-based resolution
- **Journey**: Text-based regression scenario definition (existing system)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Test engineers can configure the entire test infrastructure through a single YAML file without writing configuration code
- **SC-002**: Authenticated tests skip login flow 90%+ of the time by reusing valid storage state
- **SC-003**: New journey implementation requires fewer than 50 lines of project-specific code (excluding page objects)
- **SC-004**: Team members with Playwright knowledge can understand and modify generated tests within 15 minutes of review
- **SC-005**: Test suite can execute with 3+ different user roles in a single run without credential conflicts
- **SC-006**: Parallel test execution achieves zero data collision failures through namespacing
- **SC-007**: Core library can be updated in target project without breaking existing tests (when no breaking changes in core)
- **SC-008**: Test reports correctly map 100% of tagged tests to their Journey definitions
- **SC-009**: Configuration validation catches 100% of invalid settings before tests attempt to run
- **SC-010**: Tests using accessibility-first locators experience 50%+ fewer locator-related failures compared to CSS-only approach

## Non-Functional Requirements

### Observability
- **NFR-001**: System MUST output structured logs in JSON format to stdout/stderr
- **NFR-002**: System MUST support configurable verbosity levels: debug, info, warn, error
- **NFR-003**: Logs MUST include context (module, operation, timestamp) for filtering and aggregation

### Scalability
- **NFR-004**: System MUST support up to 16 parallel test workers per machine
- **NFR-005**: System MUST maintain independent storage state files per role to prevent authentication conflicts during parallel execution
- **NFR-006**: Storage state isolation MUST be maintained regardless of worker count

### Maintenance
- **NFR-007**: System MUST automatically delete storage state files older than 24 hours on test run start
- **NFR-008**: Auto-cleanup MUST run before auth setup to prevent stale state accumulation
- **NFR-009**: System MUST log cleanup actions at info verbosity level

### Reliability
- **NFR-010**: System MUST retry authentication failures up to 2 times with exponential backoff
- **NFR-011**: After retry exhaustion, system MUST fail with actionable error message including: failure reason, IdP response (if available), and suggested remediation steps
- **NFR-012**: System MUST log each retry attempt at warn level with attempt number and delay before next retry

## Assumptions

- Target project uses Playwright 1.40.0 or higher
- Node.js 18.0.0 or higher is available
- OIDC identity provider is accessible from test environment
- Test accounts exist with known credentials stored in environment variables
- Target application has consistent loading indicators detectable via selectors
- Network access allows reaching both application and identity provider URLs

## Clarifications

### Session 2025-12-29
- Q: What observability strategy should ARTK Core use for logging? → A: Structured logs (JSON) with verbosity levels (debug/info/warn/error)
- Q: How many parallel test workers should ARTK Core support? → A: Up to 16 parallel workers with independent storage state per role
- Q: When should storage state files be cleaned up? → A: Auto-cleanup storage states older than 24 hours on test run start
- Q: What should be explicitly out of scope for v1? → A: CI/CD integration, visual regression, API-only testing (API calls allowed only as data helpers for E2E), mobile/native support
- Q: How should authentication failures be handled? → A: Retry up to 2 times with exponential backoff, then fail with actionable error
