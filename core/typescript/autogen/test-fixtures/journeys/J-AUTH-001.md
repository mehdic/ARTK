---
id: JRN-0001
title: User Login with Valid Credentials
status: clarified
tier: smoke
actor: registered-user
scope: authentication
modules:
  foundation:
    - auth
    - navigation
  features: []
tests: []
completion:
  - type: url
    value: /dashboard
  - type: element
    value: "[data-testid='welcome-message']"
    options:
      state: visible
---

## Acceptance Criteria

- User can access the login page
- User can enter valid credentials
- User is redirected to dashboard after successful login
- Welcome message is displayed

## Steps

### Step 1: Navigate to login page
- **Action**: Go to `/login`
- **Wait for**: `[data-testid="login-form"]` to be visible
- **Assert**: Page title contains "Login"

### Step 2: Enter email
- **Action**: Fill `[data-testid="email-input"]` with `test@example.com`

### Step 3: Enter password
- **Action**: Fill `[data-testid="password-input"]` with `SecurePass123!`

### Step 4: Submit login form
- **Action**: Click `[data-testid="login-submit"]`
- **Wait for**: Navigation to complete

### Step 5: Verify successful login
- **Assert**: URL matches `/dashboard`
- **Assert**: `[data-testid="welcome-message"]` is visible
- **Assert**: `[data-testid="welcome-message"]` contains text "Welcome"
