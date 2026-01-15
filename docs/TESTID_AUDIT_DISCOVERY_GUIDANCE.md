# TestID Audit vs Discover-Foundation Guidance

This note explains how `/artk.testid-audit` and `/artk.discover-foundation` interact, and when (or when not) to re-run discovery after a testid audit.

## What /artk.discover-foundation does
- Produces discovery outputs: `docs/DISCOVERY.md`, `docs/TESTABILITY.md`, and `docs/discovery/*.json`.
- Regenerates the Environment Matrix in `docs/DISCOVERY.md`.
- Builds or updates the foundation harness and selector utilities.
- Generates initial selector catalog outputs when configured by the prompt.

## What /artk.testid-audit does
- Scans UI and tests for brittle selectors and missing stable test hooks.
- Produces `docs/TESTID_FIX_REPORT.md` and `artk/reports/testid-fix-plan.json`.
- If you apply fixes, updates `docs/TESTABILITY.md` to reduce selector debt.
- Does NOT regenerate the discovery artifacts in `docs/discovery/*.json`.

## Default recommendation
Do NOT automatically re-run `/artk.discover-foundation` after `/artk.testid-audit`.

Reason: the audit is a focused, safe change to add or standardize test hooks, and the prompt already refreshes `docs/TESTABILITY.md` when fixes are applied. Full discovery is heavier and usually redundant for this change.

## When you SHOULD re-run /artk.discover-foundation
Re-run discovery if any of the following are true:
- You changed the test hook attribute strategy (e.g., moved from `data-testid` to `data-cy`) and want harness config to align.
- You need to regenerate the selector catalog or other discovery outputs.
- Routing or app structure changed significantly since the last discovery run.
- You changed `appScope` or discovered a new frontend target in a monorepo.

## When you should NOT re-run it
Skip discovery re-run if:
- You only added or adjusted `data-testid` attributes.
- You only needed `docs/TESTABILITY.md` updated (the audit already does this after apply).
- You are proceeding to `/journey-propose` or `/journey-clarify` with no structural app changes.

## Practical checklist
Use this checklist after a testid audit:
- Did you change the `testIdAttribute` strategy? If yes, re-run discovery.
- Do you need fresh `docs/discovery/*.json` or selector catalogs? If yes, re-run discovery.
- Did app routing or targets change? If yes, re-run discovery.
- Otherwise, skip the discovery re-run and move forward.
