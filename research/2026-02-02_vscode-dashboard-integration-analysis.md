# VS Code Dashboard Integration Analysis

**Date:** 2026-02-02
**Topic:** Integrating merged CLI workflow features into VS Code extension dashboard

---

## Executive Summary

The `fix/cli-workflow-implementation` branch introduced comprehensive journey workflow CLI commands, LLKB seed functionality, and structured execution types. This document analyzes how to integrate these capabilities into the VS Code extension dashboard, prioritizing **easy but impactful** features first.

---

## Current Dashboard State

The dashboard currently has 4 cards:
1. **Installation** - Version, variant, Node.js, Playwright
2. **Configuration** - App name, environments, auth, browser
3. **LLKB** - Enabled/disabled status, health check, stats buttons
4. **Quick Actions** - Doctor, Prerequisites, Upgrade buttons

**Current Limitations:**
- No journey visibility
- No LLKB statistics displayed (just buttons)
- No seed status
- No implementation progress tracking
- No session state awareness

---

## New CLI Capabilities (from merge)

### 1. Journey Commands
```bash
artk journey validate <id>      # Validate journey for implementation
artk journey implement <ids>    # Generate tests
artk journey check-llkb         # Check LLKB readiness
```

### 2. LLKB Seed Command
```bash
artk llkb seed --patterns universal  # Pre-load patterns
artk llkb seed --list               # Show available seeds
```

### 3. Session State
- `SessionState` tracking (journeys completed/failed/in-progress)
- Execution environment detection
- Progress persistence for recovery

### 4. Structured Types
- `JourneyInfo` - id, path, status, title, tests
- `JourneyStatus` - proposed/defined/clarified/implemented/quarantined/deprecated
- `ExecutionEnvironment` - vscode-local/github-web/cli-terminal/ci-pipeline
- `ValidationResult` - valid, errors, warnings

---

## Integration Opportunities (Prioritized)

### Tier 1: Easy + High Impact (Implement First)

#### 1.1 LLKB Statistics Card Enhancement
**Effort:** Low | **Impact:** High

Current LLKB card shows only enabled/disabled. Enhance to show:
```
LLKB Status: Enabled
Lessons:     42
Components:  15
Confidence:  0.78 avg
Seeded:      Yes (universal)
```

**Implementation:**
- Add CLI call: `artk llkb stats --json`
- Parse: `{ lessons: number, components: number, avgConfidence: number, seeded: boolean }`
- Display in existing LLKB card

**Data already available via:** `llkbStats({ llkbRoot })` in runner.ts

---

#### 1.2 Journey Summary Card (NEW)
**Effort:** Low | **Impact:** High

Add new card showing journey status breakdown:
```
Journeys
─────────────────────
Proposed:     3
Defined:      5
Clarified:    2   → Ready to implement!
Implemented:  8
─────────────────────
Total:        18

[View Journeys] [Validate All]
```

**Implementation:**
- Read journey files from `artk-e2e/journeys/`
- Parse YAML frontmatter for status
- JourneysTreeProvider already does this - reuse logic
- Add two action buttons

---

#### 1.3 LLKB Seed Button
**Effort:** Very Low | **Impact:** Medium

Add "Seed LLKB" button to LLKB card when:
- LLKB enabled
- No lessons exist OR lessons < 10

```
[Seed LLKB] → Runs: artk llkb seed --patterns universal
```

**Implementation:**
- Add button with `onclick="runCommand('llkbSeed')"`
- Add command handler to CLI runner
- Show progress notification

---

### Tier 2: Medium Effort + High Impact

#### 2.1 Journey Implementation Progress (Real-time)
**Effort:** Medium | **Impact:** Very High

Show live progress during `journey implement`:
```
┌─────────────────────────────────────────┐
│ Implementation Progress                  │
│ ════════════════════════════════════════│
│ Journey: JRN-0003                        │
│ Progress: ████████░░ 3/5 (60%)          │
│ Elapsed:  2m 34s                         │
│                                          │
│ ✓ JRN-0001  ✓ JRN-0002  ◉ JRN-0003      │
│ ○ JRN-0004  ○ JRN-0005                   │
│                                          │
│ [Cancel] [View Logs]                     │
└─────────────────────────────────────────┘
```

**Implementation:**
- Read `artk-e2e/.artk/session.json` (session state)
- Poll every 2 seconds during execution
- Use `SessionState` types from workflows

---

#### 2.2 Journey Quick Actions
**Effort:** Medium | **Impact:** High

Context-aware actions based on journey state:
```
Ready to Implement: JRN-0003, JRN-0007
[Implement Selected] [Validate First]
```

When `clarified` journeys exist, show prominent call-to-action.

---

### Tier 3: Higher Effort (Future)

#### 3.1 Session Recovery Panel
When interrupted session exists:
```
⚠ Previous session incomplete
   3/5 journeys completed
   [Resume] [Discard]
```

#### 3.2 Blocked Steps Viewer
After implementation, show AutoGen telemetry:
```
Generation Quality: 85%
├─ Generated: 17 steps
├─ Blocked:   3 steps  [View Details →]
```

---

## Recommended Implementation Order

| Priority | Feature | Effort | Files to Modify |
|----------|---------|--------|-----------------|
| 1 | LLKB Stats Display | 2h | DashboardPanel.ts, runner.ts |
| 2 | Journey Summary Card | 3h | DashboardPanel.ts, new data fetching |
| 3 | LLKB Seed Button | 1h | DashboardPanel.ts, runner.ts |
| 4 | Journey Progress | 8h | New component, polling, session.json |
| 5 | Journey Quick Actions | 4h | DashboardPanel.ts, context menus |

---

## Data Flow Architecture

```
CLI Commands                VS Code Extension
─────────────────          ──────────────────
artk llkb stats     ←───→  LLKBStatsProvider
artk llkb seed      ←───→  SeedCommand
artk journey validate ←──→  JourneyValidator
artk journey implement ←─→  ImplementRunner
                           ↓
                    DashboardPanel
                    (aggregates & displays)
```

---

## CLI Runner Additions Needed

```typescript
// New CLI wrapper functions needed in runner.ts

// LLKB Stats (already exists but may need --json parsing)
export async function llkbStats(options: { llkbRoot: string }): Promise<LLKBStatsResult>;

// LLKB Seed (new)
export async function llkbSeed(options: {
  patterns: string;
  dryRun?: boolean
}): Promise<CLIResult>;

// Journey validation (new)
export async function journeyValidate(options: {
  journeyIds: string[];
  harnessRoot: string;
}): Promise<ValidationResult>;

// Journey implementation (new)
export async function journeyImplement(options: {
  journeyIds: string[];
  harnessRoot: string;
  dryRun?: boolean;
}): Promise<ImplementResult>;
```

---

## Type Definitions Needed

```typescript
// LLKB Statistics
interface LLKBStatsResult {
  lessons: number;
  components: number;
  avgConfidence: number;
  lastUpdated: string;
  seeded: boolean;
  seedName?: string;
}

// Journey Summary
interface JourneySummary {
  proposed: number;
  defined: number;
  clarified: number;
  implemented: number;
  quarantined: number;
  deprecated: number;
  total: number;
  readyToImplement: string[];  // Journey IDs
}

// Validation Result
interface JourneyValidationResult {
  journeyId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## Security Considerations

All dashboard integrations must maintain existing security patterns:
- HTML escaping via `escapeHtml()` for all user data
- CSP nonce for inline scripts
- No shell: true in spawn calls
- Path validation for file access

---

## Recommendation

**Start with Tier 1 features (1.1, 1.2, 1.3):**

1. They're easy to implement (5-6 hours total)
2. They provide immediate visible value
3. They don't require new polling/state management
4. They reuse existing infrastructure

**Next Session:** Implement LLKB stats display and Journey Summary card.

---

## Confidence: 0.85

**Caveats:**
- Time estimates assume no unexpected blockers
- Progress tracking (Tier 2) requires testing with real sessions
- Some CLI commands may need `--json` flag additions
