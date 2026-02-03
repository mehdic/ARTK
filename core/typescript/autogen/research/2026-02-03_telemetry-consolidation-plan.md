# Telemetry System Consolidation Plan

**Date:** 2026-02-03
**Topic:** Unifying telemetry systems across AutoGen

---

## Current State

There are currently **three separate telemetry systems** in AutoGen:

### 1. Mapping Telemetry (`mapping/telemetry.ts`)
- **Purpose:** Track blocked step patterns during code generation
- **Storage:** `.artk/autogen/pattern-telemetry.json`
- **Key functions:** `analyzeBlockedPatterns()`, `getTelemetryStats()`
- **Used by:** Generate command, plan command

### 2. Blocked Step Telemetry (`shared/blocked-step-telemetry.ts`)
- **Purpose:** Track blocked steps from test runs for pattern gap analysis
- **Storage:** `.artk/autogen/blocked-steps-telemetry.json`
- **Key functions:** `trackBlockedStep()`, `analyzePatternGaps()`, `suggestNewPatterns()`
- **Used by:** Run command, patterns CLI

### 3. LLM Fallback Telemetry (`mapping/llmFallback.ts`)
- **Purpose:** Track LLM API calls, costs, and success rates
- **Storage:** In-memory only (not persisted)
- **Key functions:** `getLlmFallbackTelemetry()`, `addHistoryEntry()`
- **Used by:** LLM fallback (when enabled)

---

## Issues with Current Approach

1. **Duplication:** Similar data (blocked steps) is tracked by multiple systems
2. **Inconsistent APIs:** Different storage formats and function signatures
3. **No unified dashboard:** Cannot get a complete picture of pattern coverage
4. **Memory vs Disk:** LLM telemetry is in-memory only, others persist to disk
5. **Exit handling:** Not all systems flush on process exit

---

## Consolidation Proposal

### Phase 1: Unified Interface (Short-term)

Create a unified telemetry interface that all systems implement:

```typescript
interface TelemetryProvider {
  track(event: TelemetryEvent): void;
  flush(): Promise<void>;
  getStats(): TelemetryStats;
}

type TelemetryEvent =
  | { type: 'blocked_step'; stepText: string; journeyId: string; source: 'generate' | 'run'; }
  | { type: 'pattern_match'; patternName: string; confidence: number; }
  | { type: 'llm_call'; success: boolean; latencyMs: number; costUsd: number; }
  | { type: 'pattern_failure'; stepText: string; journeyId: string; };
```

### Phase 2: Unified Storage (Medium-term)

Consolidate storage into a single telemetry file with sections:

```json
{
  "version": "2.0.0",
  "lastUpdated": "2026-02-03T12:00:00Z",
  "blockedSteps": { ... },
  "patternMatches": { ... },
  "llmCalls": { ... },
  "patternGaps": { ... }
}
```

### Phase 3: Unified CLI (Long-term)

Single CLI command for all telemetry:

```bash
artk-autogen telemetry show          # Unified dashboard
artk-autogen telemetry export --json # Export all telemetry
artk-autogen telemetry clear         # Clear all telemetry
```

---

## Migration Path

1. **Week 1:** Create unified interface, update existing systems to implement it
2. **Week 2:** Add unified storage layer, migrate data format
3. **Week 3:** Update CLI to use unified system
4. **Week 4:** Deprecate old APIs, remove duplicate code

---

## Exit Handler Registration

All telemetry systems should register exit handlers:

```typescript
// In each telemetry module
process.on('beforeExit', () => flushTelemetry());
process.on('SIGINT', () => { flushTelemetry(); process.exit(0); });
process.on('SIGTERM', () => { flushTelemetry(); process.exit(0); });
```

---

## Decision

For now, keep the three systems separate but:
1. Add exit handlers to all systems (implemented)
2. Ensure consistent MAX_RECORDS limits (implemented)
3. Document the consolidation plan (this document)

Consolidation will be tackled in a future sprint when:
- Pattern coverage reaches 90%+
- LLKB feedback loop is stable
- We have more data on actual telemetry usage patterns
