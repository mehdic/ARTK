---
id: JRN-9999
title: Data-Driven Login Test
status: clarified
tier: smoke
scope: auth
actor: test-user
revision: 1
modules:
  foundation:
    - auth
    - navigation
  features: []
testData:
  - name: valid_user
    description: Standard user with valid credentials
    data:
      username: testuser
      password: password123
  - name: admin_user
    description: Administrator user
    data:
      username: admin
      password: adminpass
  - name: readonly_user
    description: Read-only user
    data:
      username: readonly
      password: readonlypass
completion:
  - type: url
    value: /dashboard
tags:
  - auth
  - smoke
---

# Data-Driven Login Test

## Acceptance Criteria

### AC-1: Navigate to Login Page
- User opens the application
- Login form is displayed

### AC-2: Enter Credentials
- User enters username from test data
- User enters password from test data
- User clicks login button

### AC-3: Verify Successful Login
- User is redirected to dashboard
- Welcome message is displayed

## Procedural Steps

1. Navigate to login page (AC-1)
2. Enter username from testData (AC-2)
3. Enter password from testData (AC-2)
4. Click login button (AC-2)
5. Verify redirect to dashboard (AC-3)
