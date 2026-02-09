# Debate Synthesis: Scaling LLKB Patterns to 300-400

**Date:** 2026-02-05
**Participants:** Claude Opus 4.5, OpenAI Codex 0.94.0, Gemini 2.5 Flash

---

## Consensus Summary

Both AIs agree that reaching 300-400 patterns is achievable through:

1. **Multiple Static Sources** - Routes, schemas, components, i18n, analytics
2. **Template-Based Generation** - CRUD, Form, Table, Modal templates
3. **Framework-Specific Packs** - Pre-built patterns for React, Angular, Vue
4. **Quality Controls** - Confidence thresholds, deduplication, pruning

---

## Pattern Source Breakdown

### Codex's Breakdown (360 patterns)

| Source | Count | Examples |
|--------|-------|----------|
| Universal seed | 79 | click, fill, navigate |
| F12 app-specific | 25 | app login, app navigation |
| Routes/navigation | 40 | navigate to {route} |
| Forms/schema | 60 | fill {field}, validate {field} |
| Tables/lists | 25 | sort by {column}, filter |
| Modals/dialogs | 25 | open {modal}, confirm |
| Auth/RBAC | 20 | access as {role} |
| Notifications | 20 | expect toast |
| i18n anchors | 25 | verify {label} text |
| Analytics events | 15 | track {event} |
| Feature flags | 26 | ensure {feature} visible |
| **Total** | **360** | |

### Gemini's Breakdown (374 patterns)

| Source | Count | Examples |
|--------|-------|----------|
| Universal seed | 79 | click, fill, navigate |
| F12 app-specific | 30 | custom app patterns |
| Framework-specific | 100 | React hooks, Angular directives |
| Utility/language | 70 | async/await, array methods |
| Design patterns | 35 | factory, service layers |
| Configuration | 30 | tsconfig, eslint rules |
| Code quality | 30 | anti-patterns, smells |
| **Total** | **374** | |

---

## Template Generators (Both Agree)

### 1. CRUD Template (per entity)
```
create {entity}
edit {entity}
delete {entity}
view {entity} details
search {entity}
list {entity}
```
**Source:** Schema + Routes
**Patterns per entity:** 6

### 2. Form Template (per form)
```
fill {field}
clear {field}
validate {field}
submit {form}
reset {form}
```
**Source:** Form schemas (Zod, Yup, JSON Schema)
**Patterns per form:** 5

### 3. Table Template (per table)
```
sort by {column}
filter by {field}
select row {n}
paginate next
paginate previous
expand row
```
**Source:** Table/grid components
**Patterns per table:** 6

### 4. Modal Template (per modal)
```
open {modal}
close {modal}
confirm {modal}
cancel {modal}
```
**Source:** Component registry
**Patterns per modal:** 4

### 5. Navigation Template (per route)
```
navigate to {route}
open {route} page
go to {section}
```
**Source:** Router config
**Patterns per route:** 3

---

## Quality Controls (Consensus)

1. **Confidence threshold ≥0.5** for all patterns
2. **Deduplication** by normalized text + IR primitive
3. **Executable mapping** required (must map to AutoGen primitive)
4. **Cross-source validation** - promote if found in 2+ sources
5. **Pruning** - remove unused patterns after N test runs
6. **Signal weighting** - Strong (routes, schemas) > Medium (i18n) > Weak (literals)

---

## Implementation Strategy

### Phase 1: Core Templates (MVP++)
- CRUD templates from discovered entities
- Form templates from schema files
- Navigation templates from routes
- **Target:** 200 patterns

### Phase 2: Component Mining
- Modal/dialog templates from components
- Table/grid templates from data tables
- **Target:** 280 patterns

### Phase 3: Framework Packs
- React-specific patterns (hooks, context)
- Angular-specific patterns (directives, pipes)
- MUI/Antd component patterns
- **Target:** 350 patterns

### Phase 4: i18n & Analytics Mining
- i18n key patterns for text verification
- Analytics event patterns
- **Target:** 400 patterns

---

## Confidence

**Codex:** 0.73
**Gemini:** (implicit high confidence)
**Combined:** 0.75

**Key Caveats:**
- Pattern count depends on project size and metadata quality
- Smaller projects may only reach 200-250 patterns
- Large enterprise apps could exceed 500 patterns
