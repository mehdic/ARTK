---
id: JRN-9001
title: User Dashboard Access
status: clarified
tier: smoke
scope: dashboard
actor: authenticated-user
revision: 1
prerequisites:
  - JRN-0001
modules:
  foundation:
    - auth
    - navigation
  features:
    - dashboard
completion:
  - type: url
    value: /dashboard
  - type: element
    value: '[data-testid="dashboard-welcome"]'
tags:
  - smoke
  - dashboard
---

# User Dashboard Access

## Acceptance Criteria

### AC-1: Access dashboard after login
**Given** user is authenticated (prerequisite: JRN-0001)
**When** user navigates to dashboard
**Then** dashboard page loads with welcome message

## Procedural Steps

1. Navigate to /dashboard
2. Verify dashboard welcome message is visible
3. Verify user profile widget is present
