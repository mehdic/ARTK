# ARTK Core (Journeys) — v0.1.0

This repository/folder is **ARTK Core for Journeys**. It is designed to be **installed into many application repos** to provide a consistent Journey schema and backlog automation.

## What’s inside
- Canonical Journey frontmatter schema
- Journey templates
- Backlog + index generator + validator scripts (Node)

## How it’s intended to be used
- Application repos run `/journey-system` (ARTK Instance installer) to install/upgrade this Core into `<ARTK_ROOT>/.artk/core/journeys` (or your chosen vendor location).
- The instance keeps repo-specific config and generated outputs under `<ARTK_ROOT>/journeys`.

## Versioning
This Core should be versioned (SemVer preferred). Use tags/releases to pin versions in consuming repos.

## Dependencies
Core scripts expect these dev dependencies in the executing Node environment:
- ajv, yaml, fast-glob, minimist

(See `core.manifest.json` for recommended versions.)

## License
Internal use (adjust as needed).
