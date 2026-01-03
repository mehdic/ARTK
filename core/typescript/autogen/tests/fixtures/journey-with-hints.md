---
id: JOURNEY-HINTS-001
title: User Login with Machine Hints
status: clarified
tier: smoke
actor: registered_user
scope:
  module: authentication
  feature: login
tags:
  - hints
  - login
  - smoke
---

# User Login with Machine Hints

A test journey demonstrating machine hint syntax for precise element targeting.

## Acceptance Criteria

### AC1: User can access login page
- User navigates to /login (wait=domcontentloaded)
- User should see "Sign In" heading (role=heading) (level=1)
- Login form is visible (testid=login-form)

### AC2: User can enter credentials
- User enters "testuser@example.com" in email field (label="Email Address") (exact=true)
- User enters "SecurePass123" in password field (label="Password")
- User clicks "Sign In" button (role=button) (testid=submit-btn)

### AC3: User sees success feedback
- Wait for navigation to complete (wait=networkidle)
- User should see "Welcome back" message (text="Welcome back") (exact=true)
- Dashboard heading is visible (role=heading) (level=1) (text="Dashboard")

## Procedural Steps

1. Open browser and navigate to login page (wait=load)
2. Locate email input field (label="Email Address")
3. Enter valid email address "testuser@example.com"
4. Locate password input field (label="Password")
5. Enter valid password "SecurePass123"
6. Click the sign in button (role=button) (testid=submit-btn)
7. Wait for redirect to dashboard (signal=auth-complete)
8. Verify welcome message appears (text="Welcome back")
9. Verify dashboard title is displayed (role=heading) (level=1)

## Notes

This journey uses machine hints to provide explicit element locators:
- `(role=...)` - ARIA role for accessibility-first testing
- `(testid=...)` - Test ID for stable selectors
- `(label=...)` - Form labels for input fields
- `(text=...)` - Visible text content
- `(exact=true)` - Exact matching (no substring)
- `(level=...)` - Heading level (1-6)
- `(wait=...)` - Wait strategy (networkidle, domcontentloaded, load, commit)
- `(signal=...)` - Custom signal to wait for
- `(timeout=...)` - Custom timeout in milliseconds
- `(module=...)` - Module method to call (e.g., auth.login)
