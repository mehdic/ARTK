# ARTK Journeys

Journeys are **living documentation** that also drive automated regression coverage.

- A Journey file is the **source of truth**.
- `BACKLOG.md` and `index.json` are **generated** from Journey files. Do not edit generated files manually.

## Lifecycle
- `proposed` → `defined` → `clarified` → `implemented`
- `quarantined`: temporarily excluded from gating due to known flakiness (must include owner + issue link)
- `deprecated`: kept for history

## How Journeys map to tests
When a Journey becomes `implemented`, it must include `tests[]` in frontmatter and the tests should reference the Journey ID (recommended via tags/annotations).

## Generator
The repo-local wrapper should run the Core generator to:
- validate Journey frontmatter against the schema
- generate `BACKLOG.md`
- generate `index.json`

## Conventions
- Keep the **Acceptance Criteria** declarative (behavior-focused).
- Keep **Procedural Steps** as the UI walkthrough.
- Prefer short, focused Journeys over mega-flows.
