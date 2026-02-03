# ARTK Journey Schema (Frontmatter)

This document describes the **YAML frontmatter** required for each Journey markdown file.

The authoritative machine schema is:
- `journey.frontmatter.schema.json`

## Why frontmatter?
Frontmatter makes Journeys readable as docs, but also parseable for automation (Backlog + Index generation).

## Required fields
- `id` (string): stable identifier, never reused.
- `title` (string): short human title.
- `status` (enum): `proposed | defined | clarified | implemented | quarantined | deprecated`
- `tier` (enum): `smoke | release | regression`
- `actor` (string): the user role for the Journey.
- `scope` (string): high-level area of the application.

## Conditional rules
- If `status: implemented`, `tests[]` must be present and non-empty.
- If `status: quarantined`, `owner`, `statusReason`, and at least one `links.issues[]` are required.
- If `status: deprecated`, `statusReason` is required.

## Recommended fields
- `tags[]`: keywords for grouping.
- `modules.foundation[]` / `modules.feature[]`: module dependencies.
- `links.requirements[]`: requirement IDs or URLs.
- `links.issues[]`: bug URLs/IDs (mandatory for quarantined).
- `tests[]`: test file paths and/or test IDs/tags (mandatory for implemented).

## Example
```yaml
---
id: JRN-0001
title: User signs in
status: clarified
tier: smoke
actor: standard_user
scope: auth
tags: [auth, critical]
modules:
  foundation: [auth, navigation]
  feature: []
links:
  requirements: ["JIRA-1234"]
  issues: []
  docs: []
tests: []
---
```
