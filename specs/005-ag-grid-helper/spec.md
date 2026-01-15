# Feature Specification: AG Grid Helper Module

**Feature Branch**: `005-ag-grid-helper`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "AG Grid helper module for comprehensive data grid testing in @artk/core"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify Grid Data Content (Priority: P1)

As a test author, I need to verify that a data grid contains expected rows and cell values so that I can validate data is displayed correctly to users.

**Why this priority**: This is the most fundamental grid testing need - verifying data appears correctly. Without this capability, no meaningful grid testing is possible.

**Independent Test**: Can be fully tested by creating a grid with known data and asserting rows/cells contain expected values. Delivers immediate value for basic grid validation.

**Acceptance Scenarios**:

1. **Given** a grid with loaded data, **When** the test author asserts a row contains specific cell values, **Then** the assertion passes if a matching row exists
2. **Given** a grid with loaded data, **When** the test author asserts row count, **Then** the assertion passes if the count matches
3. **Given** a grid with no matching row, **When** the test author asserts row contains values, **Then** the assertion fails with a clear error message identifying what was expected vs found
4. **Given** a grid with data still loading, **When** the test author waits for grid ready, **Then** the helper waits until loading completes before proceeding

---

### User Story 2 - Interact with Grid Elements (Priority: P2)

As a test author, I need to click cells, sort columns, and filter data in a grid so that I can test user interactions with the grid component.

**Why this priority**: After verifying data, the next most common need is testing interactions. This enables testing of sorting, filtering, and cell actions.

**Independent Test**: Can be fully tested by performing grid actions (click, sort, filter) and verifying the resulting state changes. Delivers value for interactive grid testing.

**Acceptance Scenarios**:

1. **Given** a grid with sortable columns, **When** the test author sorts by a column, **Then** the grid reflects the sorted order
2. **Given** a grid with filterable columns, **When** the test author filters a column, **Then** the grid shows only matching rows
3. **Given** a grid with clickable cells, **When** the test author clicks a cell, **Then** the expected action is triggered
4. **Given** a grid with editable cells, **When** the test author edits a cell value, **Then** the new value is applied

---

### User Story 3 - Handle Virtualized Grids (Priority: P2)

As a test author, I need to access rows that are not currently visible in the viewport so that I can test grids with large datasets where only some rows are rendered.

**Why this priority**: Large datasets are common in enterprise applications. Without virtualization handling, tests would fail on any grid with more rows than fit in the viewport.

**Independent Test**: Can be fully tested by creating a grid with more rows than visible and accessing rows outside the viewport. Delivers value for large dataset testing.

**Acceptance Scenarios**:

1. **Given** a virtualized grid with 1000 rows where only 20 are visible, **When** the test author accesses row 500, **Then** the helper scrolls to bring the row into view before accessing it
2. **Given** a virtualized grid, **When** the test author asserts a row exists by cell values, **Then** the helper searches through all rows (scrolling as needed)
3. **Given** a grid with horizontal column virtualization, **When** the test author accesses a hidden column, **Then** the helper scrolls horizontally to reveal the column

---

### User Story 4 - Test Enterprise Grid Features (Priority: P3)

As a test author, I need to test advanced grid features like row grouping, tree data, and master-detail views so that I can validate enterprise grid functionality.

**Why this priority**: Enterprise features are used in complex business applications. While not as common as basic grid testing, they are critical for projects using these features.

**Independent Test**: Can be fully tested by creating grids with enterprise features enabled and testing expand/collapse, nested data access, and group operations.

**Acceptance Scenarios**:

1. **Given** a grid with row grouping, **When** the test author expands a group, **Then** child rows become visible
2. **Given** a grid with tree data, **When** the test author expands a parent node, **Then** child nodes are revealed
3. **Given** a grid with master-detail, **When** the test author expands a master row, **Then** the detail grid becomes accessible
4. **Given** a grid with grouped rows, **When** the test author asserts group child count, **Then** the correct count is returned

---

### User Story 5 - Auto-Detection in Project Discovery (Priority: P3)

As an ARTK user running discovery on my project, I need AG Grid usage to be automatically detected so that I receive appropriate testing recommendations without manual configuration.

**Why this priority**: Auto-detection improves user experience by providing relevant guidance automatically. While valuable, it enhances rather than enables core functionality.

**Independent Test**: Can be fully tested by running discovery on a project with AG Grid dependencies and verifying the detection output includes grid information.

**Acceptance Scenarios**:

1. **Given** a project with AG Grid dependencies, **When** discover-foundation runs, **Then** AG Grid is identified in the discovery report
2. **Given** AG Grid is detected, **When** the discovery report is generated, **Then** it includes recommendations for using the grid helper
3. **Given** a project without AG Grid, **When** discover-foundation runs, **Then** no AG Grid-related recommendations appear

---

### Edge Cases

- What happens when a grid has no data (empty state)?
- How does the helper handle grids still in loading state?
- What happens when accessing a row/column that doesn't exist?
- How are custom cell renderers with non-standard DOM handled?
- What happens when multiple grids exist on the same page?
- How does the helper handle row animations during expand/collapse?
- What happens when grid data changes during test execution?
- How are pinned columns (left/right) handled differently from scrollable columns?

## Requirements *(mandatory)*

### Functional Requirements

**Core Locators**
- **FR-001**: System MUST locate grid containers by test ID, CSS selector, or role
- **FR-002**: System MUST locate specific rows by row index, row ID, or cell values
- **FR-003**: System MUST locate specific cells by row identifier and column ID
- **FR-004**: System MUST locate header cells for column operations
- **FR-005**: System MUST handle pinned columns (left, center, right) transparently

**Assertions**
- **FR-006**: System MUST provide assertion for row count validation
- **FR-007**: System MUST provide assertion for row containing specific cell values
- **FR-008**: System MUST provide assertion for individual cell value
- **FR-009**: System MUST provide assertion for sorted column state
- **FR-010**: System MUST provide assertion for empty grid state
- **FR-011**: System MUST provide assertion for row selection state

**Actions**
- **FR-012**: System MUST support clicking on specific cells
- **FR-013**: System MUST support sorting by column (single and multi-column)
- **FR-014**: System MUST support filtering columns via floating filters
- **FR-015**: System MUST support editing cell values (for editable grids)
- **FR-016**: System MUST support row selection and deselection
- **FR-017**: System MUST support clearing filters (single and all)

**Wait Utilities**
- **FR-018**: System MUST provide wait for grid to be fully rendered and ready
- **FR-019**: System MUST provide wait for data loading to complete
- **FR-020**: System MUST provide wait for specific row to appear

**Virtualization Handling**
- **FR-021**: System MUST automatically scroll to bring target rows into view
- **FR-022**: System MUST automatically scroll horizontally for hidden columns
- **FR-023**: System MUST handle row search across virtualized datasets

**Enterprise Features**
- **FR-024**: System MUST support expanding and collapsing row groups
- **FR-025**: System MUST support expanding and collapsing tree data nodes
- **FR-026**: System MUST support accessing master-detail nested grids
- **FR-027**: System MUST provide group child count retrieval

**Custom Cell Renderers**
- **FR-028**: System MUST support configurable value extraction for custom renderers
- **FR-029**: System MUST provide built-in extractors for common patterns (checkbox, link, badge, button)
- **FR-030**: System MUST fall back to text content when no specific extractor matches

**Data Extraction**
- **FR-031**: System MUST allow extracting cell values programmatically
- **FR-032**: System MUST allow extracting full row data
- **FR-033**: System MUST allow extracting current grid state (sort, filter, selection)

**Detection Integration**
- **FR-034**: System MUST detect AG Grid dependencies during project discovery
- **FR-035**: System MUST detect AG Grid edition (Community vs Enterprise)
- **FR-036**: System MUST store detected grid information in project context
- **FR-037**: System MUST provide usage recommendations in discovery output

**Error Handling**
- **FR-038**: System MUST provide clear error messages when grid is not found
- **FR-039**: System MUST provide clear error messages when row/cell is not found
- **FR-040**: System MUST include expected vs actual values in assertion failures

### Key Entities

- **Grid Configuration**: Settings for locating and interacting with a specific grid (selector, column definitions, enterprise features, timeouts)
- **Row Matcher**: Criteria for finding a specific row (by index, by ID, by cell values, by custom predicate)
- **Column Definition**: Metadata about a column (ID, display name, data type, pinned status, value extractor)
- **Cell Renderer Config**: Configuration for extracting values from custom cell renderers (selector, extraction function)
- **Grid State**: Current state of the grid (total rows, visible rows, sort state, filter state, selected rows)
- **Row Data**: Extracted data from a grid row (index, ID, cell values, group status)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Test authors can verify grid row content in a single line of code without writing custom locators
- **SC-002**: Test authors can interact with virtualized grids containing 10,000+ rows without manual scroll handling
- **SC-003**: Grid assertions provide actionable error messages that identify exactly what was expected vs found
- **SC-004**: Test authors can test enterprise grid features (grouping, tree, master-detail) with the same ease as basic grids
- **SC-005**: Projects using AG Grid receive automatic detection and testing recommendations during discovery
- **SC-006**: Tests using the grid helper remain stable across AG Grid version updates (within same major version)
- **SC-007**: Custom cell renderers can be handled through configuration without modifying helper source code
- **SC-008**: All common grid operations (sort, filter, select, edit) are supported through dedicated helper methods

## Assumptions

- AG Grid versions 30.x through 33.x (current) are the primary target, with architecture supporting future versions
- Test authors have basic Playwright knowledge and understand async/await patterns
- Projects using AG Grid will have it properly configured (not broken/misconfigured implementations)
- Enterprise features are only available to AG Grid Enterprise licensees
- The helper does not need to support AG Grid versions below 30.x
- Detection relies on standard package.json dependencies and import patterns
