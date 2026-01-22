# Test Data Discovery Gap Analysis

**Date:** 2026-01-22
**Topic:** Why journey-clarify asks for API info that should be in discovery outputs

---

## Problem Statement

When running `/artk.journey-clarify`, journeys are marked as "blocked" because:
1. User selected "API data setup" strategy
2. Clarify doesn't know the API endpoints to create/delete test entities
3. Clarify asks user for Swagger docs even though the codebase has this information

**User's Question:** "Why wasn't this discovered in discover-foundation?"

---

## Root Cause Analysis

### Finding 1: `apis.json` Has No Schema

In `artk.discover-foundation.md` line 122:
```
- `reports/discovery/apis.json`
```

But there's **no schema defined** for what this file should contain. It's listed as an output but never specified.

### Finding 2: Data Feasibility Is High-Level Only

Lines 305-310 describe "Data feasibility" discovery:
```markdown
### B) Data feasibility
- seeded data scripts
- fixture support
- API helpers
- admin endpoints for setup/teardown
- multi-tenant constraints
```

But there's **no specific guidance** on:
- WHERE to look for API endpoints
- WHAT to extract (method, path, schema)
- HOW to structure the output

### Finding 3: Discovery Is UI-Centric, Not API-Centric

Discovery focuses on:
- Routes (pages)
- Features (groupings)
- Auth entry points
- Risk zones

It does NOT focus on:
- CRUD API operations per entity
- Request/response schemas
- UI form patterns for data entry

### Finding 4: Clarify Cannot Consume What Doesn't Exist

Journey-clarify (line 626) asks:
> "Can we create needed data via UI, API, seed scripts, fixtures?"

But it has no structured data to answer this question automatically.

---

## The Gap: "Test Data Bootstrapping Discovery"

| What Discovery Produces | What Clarify Needs |
|------------------------|-------------------|
| Routes like `/requests/:id` | How to CREATE a request |
| Features like "Request Management" | API endpoint: `POST /api/requests` |
| Auth entry points | UI form: `/requests/new` with fields |
| Risk zones | Cleanup endpoint: `DELETE /api/requests/:id` |

**Named Concept:** "Test Data Bootstrapping Discovery" - the missing phase that discovers HOW to create and clean up test data.

---

## Proposed Solution

### Part 1: Define `apis.json` Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "version": { "const": 1 },
    "discoveredAt": { "type": "string", "format": "date-time" },
    "source": {
      "type": "string",
      "enum": ["openapi", "swagger", "controllers", "graphql", "inferred"]
    },
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Entity name (e.g., 'Request', 'HRMovement')" },
          "pluralName": { "type": "string" },
          "operations": {
            "type": "object",
            "properties": {
              "create": { "$ref": "#/$defs/operation" },
              "read": { "$ref": "#/$defs/operation" },
              "update": { "$ref": "#/$defs/operation" },
              "delete": { "$ref": "#/$defs/operation" },
              "list": { "$ref": "#/$defs/operation" }
            }
          },
          "uiForms": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "route": { "type": "string" },
                "action": { "enum": ["create", "update"] },
                "fields": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "type": { "type": "string" },
                      "required": { "type": "boolean" },
                      "selector": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        },
        "required": ["name", "operations"]
      }
    },
    "testFactories": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string" },
          "entity": { "type": "string" },
          "method": { "type": "string" }
        }
      }
    },
    "seedScripts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    }
  },
  "$defs": {
    "operation": {
      "type": "object",
      "properties": {
        "method": { "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        "path": { "type": "string" },
        "requestSchema": { "type": "object" },
        "responseSchema": { "type": "object" },
        "requiredFields": { "type": "array", "items": { "type": "string" } },
        "examplePayload": { "type": "object" }
      }
    }
  }
}
```

### Part 2: New Discovery Steps

Add to `artk.discover-foundation.md` after Step D7:

```markdown
## Step D7.5 — Discover Test Data Setup Patterns

**Goal:** Find HOW to create and clean up test data for each entity type.

### A) API Discovery Sources (in priority order)

1. **OpenAPI/Swagger files**
   - Look for: `openapi.json`, `openapi.yaml`, `swagger.json`, `swagger.yaml`, `**/api-docs/**`
   - Extract: paths, methods, requestBody schemas, responses

2. **Backend Controllers (Java/Spring)**
   - Look for: `@RestController`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`
   - Pattern: `src/**/controller/**/*.java`, `src/**/api/**/*.java`
   - Extract: path from annotation, method type, request DTO

3. **Backend Controllers (Node/Express)**
   - Look for: `router.post()`, `router.put()`, `router.delete()`, `app.post()`
   - Pattern: `src/**/routes/**/*.ts`, `src/**/api/**/*.ts`

4. **GraphQL Schemas**
   - Look for: `schema.graphql`, `*.gql`, `typeDefs`
   - Extract: mutations (create, update, delete)

### B) UI Form Discovery (for UI-first data entry)

1. **Form Routes**
   - Find routes ending in `/new`, `/create`, `/edit/:id`
   - Map to entity: `/requests/new` → Request entity

2. **Form Components**
   - Find form components with submit handlers
   - Extract field names from `<input>`, `<select>`, formik/react-hook-form schemas

3. **Form Field Mapping**
   ```json
   {
     "route": "/requests/new",
     "entity": "Request",
     "fields": [
       { "name": "title", "type": "text", "selector": "[name='title']" },
       { "name": "category", "type": "select", "selector": "[name='category']" }
     ]
   }
   ```

### C) Test Factory Discovery

1. **Existing Test Helpers**
   - Look for: `**/test/**/*factory*`, `**/test/**/*builder*`, `**/fixtures/**`
   - Pattern: files with `create`, `build`, `make` + entity name

2. **Mock Server Data**
   - Look for: `**/mock/**`, `**/msw/**`, `**/wiremock/**`
   - Extract: response fixtures that can be used as creation templates

### D) Seed/Fixture Discovery

1. **Database Seeds**
   - Look for: `**/seeds/**`, `**/fixtures/**`, `**/db/seed*`
   - Note: these often require DB access, may not be suitable for E2E

2. **JSON Fixtures**
   - Look for: `**/*.fixture.json`, `**/testdata/**/*.json`

### E) Output Structure

Generate `reports/discovery/apis.json`:
```json
{
  "version": 1,
  "discoveredAt": "2026-01-22T10:00:00Z",
  "source": "openapi",
  "entities": [
    {
      "name": "Request",
      "pluralName": "requests",
      "operations": {
        "create": {
          "method": "POST",
          "path": "/api/requests",
          "requiredFields": ["title", "category", "description"],
          "examplePayload": {
            "title": "Test Request",
            "category": "IT",
            "description": "Test description"
          }
        },
        "delete": {
          "method": "DELETE",
          "path": "/api/requests/{id}"
        }
      },
      "uiForms": [
        {
          "route": "/requests/new",
          "action": "create",
          "fields": [
            { "name": "title", "type": "text", "required": true },
            { "name": "category", "type": "select", "required": true }
          ]
        }
      ]
    }
  ],
  "testFactories": [
    {
      "file": "tests/helpers/request-factory.ts",
      "entity": "Request",
      "method": "createRequest"
    }
  ]
}
```
```

### Part 3: Update Journey-Clarify Consumption

Add to `artk.journey-clarify.md` in Step 2:

```markdown
## Step 2.5 — Load Test Data Setup Patterns

If `reports/discovery/apis.json` exists:
1. Load entity operations (CRUD endpoints)
2. Load UI form patterns
3. Load existing test factories

For each journey's required entities:
- Check if `apis.json` has create/delete operations
- If YES: Pre-fill data strategy with discovered patterns
- If NO: Mark as needing manual discovery (but DON'T ask user for Swagger)

**Auto-fill clarification block:**
```yaml
dataStrategy:
  approach: api-first  # or ui-first based on user choice
  entities:
    - name: Request
      create:
        method: POST /api/requests
        requiredFields: [title, category, description]
      cleanup:
        method: DELETE /api/requests/{id}
      uiAlternative:
        route: /requests/new
        fields: [title, category, description]
```

**If entity not found in apis.json:**
- DON'T ask user for Swagger
- DO scan backend code (controllers) on-demand
- ONLY ask user if scan fails
```

### Part 4: Reduce Questions, Not Increase

**Current behavior:**
```
"What backend API endpoints exist for creating test entities?"
Options: 1) Show me Swagger, 2) Check backend code, 3) Test helper, 4) Mock server, 5) Discover it
```

**New behavior:**
```
Discovery found these test data patterns:

| Entity | API Create | API Delete | UI Form |
|--------|-----------|-----------|---------|
| Request | POST /api/requests | DELETE /api/requests/{id} | /requests/new |
| HRMovement | POST /api/hr-movements | DELETE /api/hr-movements/{id} | /hr-movements/new |

Using these for API-first data setup. Confirm or adjust? [Y/adjust/more]
```

---

## Implementation Plan

### Phase 1: Schema Definition
1. Create `core/artk-core-journeys/journeys/schema/apis.schema.json`
2. Document expected structure

### Phase 2: Discovery Enhancement
1. Add Step D7.5 to `artk.discover-foundation.md`
2. Add OpenAPI/Swagger detection logic
3. Add controller scanning patterns (Java, Node)
4. Add UI form discovery patterns

### Phase 3: Clarify Consumption
1. Update Step 2 in `artk.journey-clarify.md` to load `apis.json`
2. Auto-fill data strategy from discovered patterns
3. Reduce questions by pre-filling known information

### Phase 4: Fallback Behavior
1. If `apis.json` doesn't exist → scan on-demand
2. If scan fails → ask focused questions (not generic "show me Swagger")
3. Always try to discover before asking

---

## Backward Compatibility

- Existing installations without `apis.json` will work (clarify falls back to asking)
- New discover-foundation runs will produce `apis.json`
- No breaking changes to existing journey files

---

## Success Criteria

1. Running `/artk.discover-foundation` produces `reports/discovery/apis.json`
2. Running `/artk.journey-clarify` consumes `apis.json` without asking
3. Blocked journeys have pre-filled data strategy from discovery
4. User questions reduced from 4+ to 1 (confirmation only)

---

## Open Questions

1. **Depth of OpenAPI parsing:** Full schema extraction or just paths/methods?
2. **UI form discovery accuracy:** How to handle dynamic forms (React Hook Form, Formik)?
3. **Multi-tenant patterns:** How to discover tenant-scoped API patterns?
4. **Mock server integration:** Should we generate MSW handlers from discovery?
