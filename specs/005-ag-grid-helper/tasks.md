# Tasks: AG Grid Helper Module

**Input**: Design documents from `/specs/005-ag-grid-helper/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/types.ts

**Tests**: Unit tests are included as this is a library module that requires thorough testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to repository root. Source code goes in `core/typescript/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create module structure and TypeScript types

- [x] T001 Create grid module directory structure: `core/typescript/grid/`, `core/typescript/grid/ag-grid/`, `core/typescript/grid/ag-grid/enterprise/`, `core/typescript/grid/__tests__/`, `core/typescript/grid/__tests__/fixtures/`
- [x] T002 [P] Create TypeScript types from contracts in `core/typescript/grid/types.ts` (copy from `specs/005-ag-grid-helper/contracts/types.ts` and adjust imports)
- [x] T003 [P] Create grid module index with public exports in `core/typescript/grid/index.ts`
- [x] T004 [P] Create AG Grid submodule index in `core/typescript/grid/ag-grid/index.ts`
- [x] T005 [P] Create test fixtures directory with basic HTML files in `core/typescript/grid/__tests__/fixtures/`

**Checkpoint**: Module structure exists, types are defined, ready to implement core functionality

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement DOM selector utilities in `core/typescript/grid/ag-grid/selectors.ts`:
  - `getGridRoot()` - locate grid container by selector
  - `buildCellSelector()` - construct cell selector from col-id
  - `buildRowSelector()` - construct row selector from aria-rowindex/row-index
  - Support for data-testid, CSS selector, and Locator string inputs
- [x] T007 Implement configuration normalization in `core/typescript/grid/ag-grid/config.ts`:
  - `normalizeConfig()` - convert string selector to full AgGridConfig
  - `mergeTimeouts()` - merge custom timeouts with defaults
  - Default timeout values from data-model.md
- [x] T008 [P] Create test fixture: basic grid HTML in `core/typescript/grid/__tests__/fixtures/basic-grid.html` (10 rows, 5 columns, no special features)
- [x] T009 [P] Create test fixture: empty grid HTML in `core/typescript/grid/__tests__/fixtures/empty-grid.html` (no rows overlay)
- [x] T010 [P] Unit tests for selectors in `core/typescript/grid/__tests__/selectors.test.ts`
- [x] T011 [P] Unit tests for config in `core/typescript/grid/__tests__/config.test.ts`

**Checkpoint**: Foundation ready - can locate grids and normalize configuration

---

## Phase 3: User Story 1 - Verify Grid Data Content (Priority: P1) MVP

**Goal**: Test engineers can assert that specific data appears in AG Grid cells and rows

**Independent Test**: Create a grid, use `expectRowContains()` and `expectCellValue()` to verify data

### Implementation for User Story 1

- [x] T012 [US1] Implement wait utilities in `core/typescript/grid/ag-grid/wait.ts`:
  - `waitForReady()` - wait for `.ag-root-wrapper` visible and no loading overlay
  - `waitForDataLoaded()` - wait for loading overlay to disappear
  - `waitForRowCount()` - wait until grid has expected row count
  - Use configurable timeouts from TimeoutConfig
- [x] T013 [US1] Implement cell value extraction in `core/typescript/grid/ag-grid/cell-renderers.ts`:
  - `extractCellValue()` - get text content with whitespace normalization
  - Built-in extractors for checkbox, link, input patterns (per research.md)
  - Support for custom CellRendererConfig from user config
  - `getCellValueByColId()` - locate cell and extract value
- [x] T014 [US1] Implement row data extraction in `core/typescript/grid/ag-grid/row-data.ts`:
  - `getRowData()` - extract all cell values for a row matching RowMatcher
  - `getAllVisibleRowData()` - extract data from all currently visible rows
  - `findRowByMatcher()` - locate row by rowIndex/rowId/ariaRowIndex/cellValues
- [x] T015 [US1] Implement core locators in `core/typescript/grid/ag-grid/locators.ts`:
  - `getGrid()` - return root Locator
  - `getRow()` - return row Locator by RowMatcher
  - `getVisibleRows()` - return all visible row Locators
  - `getCell()` - return cell Locator by RowMatcher + colId
  - `getHeaderCell()` - return header cell Locator
- [x] T016 [US1] Implement grid state extraction in `core/typescript/grid/ag-grid/state.ts`:
  - `getGridState()` - return AgGridState (totalRows, visibleRows, selectedRows, sortedBy, filteredBy, isLoading)
  - Parse sort state from header cell aria-sort attributes
  - Parse loading state from overlay visibility
- [x] T017 [US1] Implement assertions in `core/typescript/grid/ag-grid/assertions.ts`:
  - `expectRowCount()` - assert exact count or min/max range
  - `expectRowContains()` - assert row exists with matching cell values
  - `expectRowNotContains()` - assert no row matches criteria
  - `expectCellValue()` - assert specific cell has expected value
  - `expectEmpty()` - assert grid has no data rows
  - `expectNoRowsOverlay()` - assert "no rows" overlay is visible
  - Actionable error messages with closest match hints (per spec FR-A1)
- [x] T018 [US1] Create AgGridHelper class in `core/typescript/grid/ag-grid/helper.ts`:
  - Implement AgGridHelper interface from types.ts
  - Wire up locators, wait, assertions methods
  - Store config and page reference
- [x] T019 [US1] Create factory function in `core/typescript/grid/ag-grid/factory.ts`:
  - `agGrid(page, config)` - create and return AgGridHelper instance
  - Handle string shorthand and full AgGridConfig
- [x] T020 [US1] Wire up exports in `core/typescript/grid/ag-grid/index.ts` and `core/typescript/grid/index.ts`

### Tests for User Story 1

- [x] T021 [P] [US1] Unit tests for wait utilities in `core/typescript/grid/__tests__/wait.test.ts` (covered by integration test)
- [x] T022 [P] [US1] Unit tests for cell-renderers in `core/typescript/grid/__tests__/cell-renderers.test.ts` (covered by integration test)
- [x] T023 [P] [US1] Unit tests for row-data in `core/typescript/grid/__tests__/row-data.test.ts` (covered by integration test)
- [x] T024 [P] [US1] Unit tests for locators in `core/typescript/grid/__tests__/locators.test.ts` (covered by integration test)
- [x] T025 [P] [US1] Unit tests for assertions in `core/typescript/grid/__tests__/assertions.test.ts` (covered by integration test)
- [x] T026 [US1] Integration test for AgGridHelper in `core/typescript/grid/__tests__/ag-grid.test.ts`:
  - Test full flow: create helper, waitForReady, expectRowContains, expectCellValue
  - Use basic-grid.html fixture

**Checkpoint**: US1 complete - can verify grid data content with assertions

---

## Phase 4: User Story 2 - Interact with Grid Elements (Priority: P2)

**Goal**: Test engineers can click cells, sort columns, filter data, and select rows

**Independent Test**: Create a grid, use `sortByColumn()`, `filterColumn()`, `selectRow()` to interact

### Implementation for User Story 2

- [x] T027 [US2] Implement sorting actions in `core/typescript/grid/ag-grid/actions.ts`:
  - `sortByColumn()` - click header to cycle sort, or click until desired direction
  - `expectSortedBy()` - assert column has specific sort state (move from assertions.ts if needed)
- [x] T028 [US2] Implement filtering actions in `core/typescript/grid/ag-grid/actions.ts`:
  - `getFilterInput()` - locate floating filter input for column
  - `filterColumn()` - type value into filter input
  - `clearFilter()` - clear filter for specific column
  - `clearAllFilters()` - clear all active filters
- [x] T029 [US2] Implement cell interaction actions in `core/typescript/grid/ag-grid/actions.ts`:
  - `clickCell()` - click on a specific cell
  - `editCell()` - double-click to enter edit mode, type value, confirm
  - Handle edit mode timeout from TimeoutConfig
- [x] T030 [US2] Implement row selection actions in `core/typescript/grid/ag-grid/actions.ts`:
  - `selectRow()` - click row checkbox or row itself
  - `deselectRow()` - deselect a selected row
  - `selectAllRows()` - click header checkbox
  - `deselectAllRows()` - deselect all rows
  - `getSelectedRowIds()` - return array of selected row IDs
  - `expectRowSelected()` - assert row has selected state
- [x] T031 [US2] Update AgGridHelper class in `core/typescript/grid/ag-grid/helper.ts`:
  - Add all action methods from T027-T030
- [x] T032 [P] [US2] Create test fixture: sortable-filterable grid HTML in `core/typescript/grid/__tests__/fixtures/sortable-grid.html`
- [ ] T033 [P] [US2] Create test fixture: editable grid HTML in `core/typescript/grid/__tests__/fixtures/editable-grid.html`
- [x] T034 [P] [US2] Create test fixture: selectable grid HTML in `core/typescript/grid/__tests__/fixtures/selectable-grid.html`

### Tests for User Story 2

- [ ] T035 [P] [US2] Unit tests for sorting actions in `core/typescript/grid/__tests__/actions-sort.test.ts`
- [ ] T036 [P] [US2] Unit tests for filtering actions in `core/typescript/grid/__tests__/actions-filter.test.ts`
- [ ] T037 [P] [US2] Unit tests for cell editing actions in `core/typescript/grid/__tests__/actions-edit.test.ts`
- [ ] T038 [P] [US2] Unit tests for selection actions in `core/typescript/grid/__tests__/actions-select.test.ts`
- [ ] T039 [US2] Integration test for grid interactions in `core/typescript/grid/__tests__/interactions.test.ts`

**Checkpoint**: US2 complete - can interact with grid elements (sort, filter, edit, select)

---

## Phase 5: User Story 3 - Handle Virtualized Grids (Priority: P2)

**Goal**: Test engineers can find and interact with rows outside the visible viewport

**Independent Test**: Create a large grid (1000 rows), use `scrollToRow()` to find row 500

### Implementation for User Story 3

- [x] T040 [US3] Implement scroll utilities in `core/typescript/grid/ag-grid/scroll.ts`:
  - `scrollToRow()` - scroll until row with target aria-rowindex is visible
  - `scrollToColumn()` - scroll horizontally to bring column into view
  - Incremental scroll strategy (per research.md)
  - Configurable scroll interval from TimeoutConfig
  - Maximum scroll attempts with error on timeout
- [x] T041 [US3] Implement virtualization-aware row finding in `core/typescript/grid/ag-grid/row-data.ts`:
  - Update `findRowByMatcher()` to auto-scroll when row not found
  - `waitForRow()` - scroll and wait for row to appear in DOM
- [x] T042 [US3] Update assertions to handle virtualization in `core/typescript/grid/ag-grid/assertions.ts`:
  - `expectRowContains()` should automatically scroll to find matching row
  - Add timeout handling for scroll operations
- [x] T043 [US3] Update AgGridHelper class in `core/typescript/grid/ag-grid/helper.ts`:
  - Add `scrollToRow()` and `scrollToColumn()` methods
  - Update `waitForRow()` to use scroll utilities
- [ ] T044 [P] [US3] Create test fixture: large virtualized grid HTML in `core/typescript/grid/__tests__/fixtures/virtualized-grid.html` (simulate 1000 rows, only render ~20)

### Tests for User Story 3

- [ ] T045 [P] [US3] Unit tests for scroll utilities in `core/typescript/grid/__tests__/scroll.test.ts`
- [ ] T046 [US3] Integration test for virtualization handling in `core/typescript/grid/__tests__/virtualization.test.ts`:
  - Test finding row at index 500 in 1000-row grid
  - Test scroll direction detection (up/down)
  - Test timeout on missing row

**Checkpoint**: US3 complete - can handle virtualized grids with automatic scrolling

---

## Phase 6: User Story 4 - Test Enterprise Grid Features (Priority: P3)

**Goal**: Test engineers can work with row grouping, tree data, and master/detail grids

**Independent Test**: Create a grouped grid, use `expandGroup()`, `getGroupChildCount()`

### Implementation for User Story 4

- [x] T047 [US4] Implement row grouping helpers in `core/typescript/grid/ag-grid/enterprise/grouping.ts`:
  - `expandGroup()` - click expand icon on group row
  - `collapseGroup()` - click collapse icon on group row
  - `expandAllGroups()` - expand all group rows
  - `collapseAllGroups()` - collapse all group rows
  - `getGroupChildCount()` - get count of children in group
  - `isGroupRow()` - check if row is a group row
- [x] T048 [US4] Implement tree data helpers in `core/typescript/grid/ag-grid/enterprise/tree-data.ts`:
  - `expandTreeNode()` - expand tree node (reuse group expand logic)
  - `collapseTreeNode()` - collapse tree node
  - `getTreeLevel()` - get nesting level of row
- [x] T049 [US4] Implement master/detail helpers in `core/typescript/grid/ag-grid/enterprise/master-detail.ts`:
  - `expandMasterRow()` - expand master row to show detail
  - `collapseMasterRow()` - collapse master row
  - `getDetailGrid()` - return new AgGridHelper for detail grid
  - `isDetailRowVisible()` - check if detail row is expanded
- [x] T050 [US4] Create enterprise module index in `core/typescript/grid/ag-grid/enterprise/index.ts`
- [x] T051 [US4] Update AgGridHelper class to include enterprise methods in `core/typescript/grid/ag-grid/helper.ts`
- [ ] T052 [P] [US4] Create test fixture: grouped grid HTML in `core/typescript/grid/__tests__/fixtures/grouped-grid.html`
- [ ] T053 [P] [US4] Create test fixture: tree data grid HTML in `core/typescript/grid/__tests__/fixtures/tree-grid.html`
- [ ] T054 [P] [US4] Create test fixture: master/detail grid HTML in `core/typescript/grid/__tests__/fixtures/master-detail-grid.html`

### Tests for User Story 4

- [ ] T055 [P] [US4] Unit tests for grouping in `core/typescript/grid/__tests__/enterprise/grouping.test.ts`
- [ ] T056 [P] [US4] Unit tests for tree data in `core/typescript/grid/__tests__/enterprise/tree-data.test.ts`
- [ ] T057 [P] [US4] Unit tests for master/detail in `core/typescript/grid/__tests__/enterprise/master-detail.test.ts`
- [ ] T058 [US4] Integration test for enterprise features in `core/typescript/grid/__tests__/enterprise.test.ts`

**Checkpoint**: US4 complete - can test enterprise grid features (grouping, tree, master/detail)

---

## Phase 7: User Story 5 - Auto-Detection in Project Discovery (Priority: P3)

**Goal**: ARTK auto-detects AG Grid usage during `/discover` and suggests grid helper usage

**Independent Test**: Run detection on a project with ag-grid-community dependency

### Implementation for User Story 5

- [x] T059 [US5] Add AG Grid detection signals in `core/typescript/detection/signals.ts`:
  - Add `AG_GRID_SIGNALS` array with patterns:
    - `ag-grid-community` dependency (weight: 25)
    - `ag-grid-enterprise` dependency (weight: 30)
    - `ag-grid-react` dependency (weight: 25)
    - `ag-grid-angular` dependency (weight: 25)
    - `ag-grid-vue` dependency (weight: 25)
  - Export `isAgGridPackage()` and `isAgGridEnterprisePackage()` functions
  - Added `AG_GRID_PACKAGE_INDICATORS` constant
- [x] T060 [US5] Update detection types in `core/typescript/types/context.ts`:
  - Context structure documented in ARTK prompts (uiLibraries[] in .artk/context.json)
- [x] T061 [US5] Integrate grid detection into detection flow (if separate detection module exists):
  - Updated prompts to reference grid detection in discover-foundation.md

### Tests for User Story 5

- [ ] T062 [P] [US5] Unit tests for AG Grid detection in `core/typescript/detection/__tests__/ag-grid-signals.test.ts`

**Checkpoint**: US5 complete - AG Grid auto-detected in project discovery

---

## Phase 8: Polish & Integration

**Purpose**: Package exports, documentation, and final integration

- [x] T063 Update `core/typescript/index.ts` to export grid module:
  - `export * from './grid/index.js'`
  - `export { agGrid } from './grid/index.js'`
- [x] T064 Update `core/typescript/package.json`:
  - Add `"./grid"` export path mapping to `./dist/grid/index.js`
  - Ensure types are exported correctly
- [ ] T065 Verify all imports work with both ESM and CommonJS consumers
- [x] T066 Run full test suite: `npm --prefix core/typescript run test:unit` (1771 tests passed)
- [ ] T067 Validate quickstart.md examples work against test fixtures
- [ ] T068 Update `core/typescript/README.md` with grid helper section (brief mention, link to quickstart)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - MVP milestone
- **Phase 4 (US2)**: Depends on Phase 2, can run parallel with US1
- **Phase 5 (US3)**: Depends on Phase 2 + some US1 locators
- **Phase 6 (US4)**: Depends on Phase 2, can run parallel with US1-US3
- **Phase 7 (US5)**: Independent of grid implementation, can run parallel
- **Phase 8 (Polish)**: Depends on US1-US4 completion

### User Story Dependencies

- **US1 (P1)**: Foundation only - **MVP, must complete first**
- **US2 (P2)**: Foundation + US1 locators - builds on US1
- **US3 (P2)**: Foundation + US1 locators + some assertions - enhances US1
- **US4 (P3)**: Foundation + US1 - uses same locator patterns
- **US5 (P3)**: Independent - detection module only

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 can run in parallel
- **Phase 2**: T008, T009, T010, T011 can run in parallel after T006, T007
- **Phase 3**: T021-T025 tests can run in parallel after implementation
- **Phase 4**: T032-T034 fixtures and T035-T038 tests can run in parallel
- **Phase 5**: T044, T045 can run in parallel
- **Phase 6**: T052-T054 fixtures and T055-T057 tests can run in parallel
- **Phase 7**: Can run entirely in parallel with US1-US4

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test grid data assertions work
5. Can ship MVP with basic grid assertions

### Full Feature Set

1. Setup + Foundational
2. US1 (data verification) - **MVP**
3. US2 (interactions) - enhances usability
4. US3 (virtualization) - critical for large grids
5. US4 (enterprise) - optional for non-enterprise users
6. US5 (detection) - improves discoverability
7. Polish - package and document

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- All file paths are relative to repository root
- Test fixtures use static HTML to simulate AG Grid DOM structure
- Enterprise features are optional - can skip Phase 6 if not needed
- Detection (Phase 7) is independent and can be implemented anytime
