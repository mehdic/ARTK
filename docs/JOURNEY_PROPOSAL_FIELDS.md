# Journey Proposal Metadata Fields

This guide explains the metadata block written by `/artk.journey-propose` inside proposed Journey files.
The block is managed by ARTK and appears between these markers:

```markdown
<!-- ARTK:PROPOSAL:BEGIN -->
...fields...
<!-- ARTK:PROPOSAL:END -->
```

Source of truth: `prompts/artk.journey-propose.md`.

## Field reference

| Field | Use | Possible values |
| --- | --- | --- |
| `proposedBy` | Records which command produced the proposal metadata. | `/artk.journey-propose`. |
| `proposedAt` | Records when the proposal metadata was generated. | ISO date/time string (example: `2026-01-19T00:00:00Z`). |
| `sources` | Lists the input files used to build the proposal. | File paths from the discovery and incident inputs. Common sources include `docs/discovery/summary.json`, `docs/discovery/routes.json`, `docs/discovery/features.json`, `docs/discovery/risk.json`, `docs/discovery/apis.json`, `docs/DISCOVERY.md`, `docs/TESTABILITY.md`, `docs/incidents/**`, `docs/postmortems/**`, `postmortem/**`, `incident/**`, `CHANGELOG.md`, `RELEASE_NOTES.md`, `incidents.csv`, `bugs.csv`, `jira_export.*`, `tickets.*`. |
| `confidence` | Overall confidence label for the proposal metadata. | `low`, `medium`, `high`. |
| `baseRisk` | Base risk score used in ranking. | Number from discovery risk if present; otherwise derived from `impact (1..5) x likelihood (1..5)`. |
| `changeScore` | Normalized change-risk signal mapped to the Journey scope/routes. | `0..1`. |
| `incidentScore` | Normalized incident/bug signal mapped to the Journey scope/routes. | `0..1`. |
| `ownerScore` | Ownership-risk signal from CODEOWNERS heuristic (optional). | `0..1` or `na` when not available. |
| `feasibility` | Testability feasibility based on `docs/TESTABILITY.md` signals (selectors, data setup, async risks, environment constraints). | `low`, `medium`, `high`. |
| `complexity` | Complexity estimate based on step count, async behavior, and data coupling. | `low`, `medium`, `high`. |
| `foundationModules` | Reusable dependency hints for early module work. | From the foundation list: `auth`, `navigation`, `selectors`, `data`, `api`, `assertions`, `files`, `notifications` (choose what applies). |
| `featureModules` | Domain-specific module hints inferred from features/routes. | Project-specific names (examples in prompt: `users`, `billing`, `approvals`, `inventory`, `reports`, `admin`). |

## Notes on how these fields are used

- `changeScore`, `incidentScore`, and `ownerScore` are combined with `baseRisk` to compute an augmented risk score for ranking proposals.
- `feasibility` can exclude or de-prioritize candidates if testability is low.
- `foundationModules` and `featureModules` are dependency hints to guide module planning and scaffolding.

