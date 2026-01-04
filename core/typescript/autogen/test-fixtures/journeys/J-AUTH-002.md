---
id: JRN-0002
title: User Logout
status: clarified
tier: smoke
actor: authenticated-user
scope: authentication
modules:
  foundation:
    - auth
    - navigation
  features: []
tests: []
completion:
  - type: url
    value: /login
  - type: element
    value: "[data-testid='login-form']"
    options:
      state: visible
---

## Acceptance Criteria

- Authenticated user can access logout button
- Clicking logout redirects to login page
- Session is terminated

## Steps

### Step 1: Verify user is on dashboard
- **Assert**: URL matches `/dashboard`
- **Assert**: `[data-testid="user-menu"]` is visible

### Step 2: Open user menu
- **Action**: Click `[data-testid="user-menu"]`
- **Wait for**: `[data-testid="logout-button"]` to be visible

### Step 3: Click logout
- **Action**: Click `[data-testid="logout-button"]`
- **Wait for**: Navigation to complete

### Step 4: Verify logout successful
- **Assert**: URL matches `/login`
- **Assert**: `[data-testid="login-form"]` is visible
