---
id: JRN-9002
title: Login Form Validation
status: clarified
tier: regression
scope: auth
actor: guest-user
revision: 1
modules:
  foundation:
    - auth
  features: []
completion:
  - type: url
    value: /dashboard
  - type: toast
    value: Welcome back
negativePaths:
  - name: invalid_password
    input:
      username: testuser@example.com
      password: wrongpassword
    expectedError: Invalid credentials
    expectedElement: '[data-testid="login-error"]'
  - name: missing_username
    input:
      username: ''
      password: test123
    expectedError: Username is required
    expectedElement: '[data-testid="username-error"]'
  - name: missing_password
    input:
      username: testuser@example.com
      password: ''
    expectedError: Password is required
    expectedElement: '[data-testid="password-error"]'
tags:
  - regression
  - auth
  - validation
---

# Login Form Validation

## Acceptance Criteria

### AC-1: Successful login
**Given** user has valid credentials
**When** user enters username and password
**Then** user is redirected to dashboard

## Procedural Steps

1. Navigate to /login
2. Fill username field with valid email
3. Fill password field with valid password
4. Click login button
5. Verify redirect to /dashboard
6. Verify welcome toast appears
