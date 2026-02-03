---
id: JRN-ACC-001
title: Simple Login Flow
status: clarified
tier: smoke
actor: standard_user
scope: authentication
tests: []
tags:
  - login
  - authentication
  - smoke
---

# Simple Login Flow

Verify that a user can log in with valid credentials and reach the dashboard.

## Preconditions

- Application is running at configured base URL
- User account exists with valid credentials
- User is not currently logged in

## Steps

1. Navigate to the login page at `/login`
2. Enter the username in the username field
3. Enter the password in the password field
4. Click the "Sign In" button
5. Wait for navigation to complete
6. Verify the dashboard page is displayed

## Expected Result

- User is successfully authenticated
- Dashboard page is visible
- User's name or avatar appears in the header
- No error messages are displayed

## Test Data

| Field | Value | Source |
|-------|-------|--------|
| Username | `testuser@example.com` | Environment: `TEST_USER` |
| Password | `••••••••` | Environment: `TEST_PASSWORD` |

## Selectors (Hints)

| Element | Suggested Selector |
|---------|-------------------|
| Username field | `[data-testid="login-username"]` or `input[name="username"]` |
| Password field | `[data-testid="login-password"]` or `input[type="password"]` |
| Sign In button | `[data-testid="login-submit"]` or `button[type="submit"]` |
| Dashboard header | `[data-testid="dashboard-header"]` |
| User avatar | `[data-testid="user-avatar"]` |

## Notes

- This is a smoke test - should run quickly
- Authentication may involve redirect to OAuth provider
- MFA should be disabled for test account
