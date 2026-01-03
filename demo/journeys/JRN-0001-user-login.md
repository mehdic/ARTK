---
id: JRN-0001
title: User Login
status: clarified
tier: smoke
actor: registered_user
scope: authentication
modules:
  foundation:
    - auth/login-page
    - auth/session
  features: []
completion:
  - type: url
    value: /dashboard
    options:
      timeout: 5000
---

# User Login Journey

## Context
A registered user needs to authenticate to access the application dashboard.

## Preconditions
- User has valid credentials (email + password)
- Application is accessible at base URL

## Acceptance Criteria
- [ ] User can enter email and password
- [ ] Login button submits credentials
- [ ] Successful login redirects to dashboard
- [ ] Invalid credentials show error message

## Steps

### Step 1: Navigate to Login Page
Navigate to the login page.

**Machine Hints:**
- action: goto
- url: /login
- selector: [data-testid="login-form"]

### Step 2: Enter Email
Enter the user's email address in the email field.

**Machine Hints:**
- action: fill
- selector: [data-testid="email-input"]
- value: {{user.email}}

### Step 3: Enter Password
Enter the user's password in the password field.

**Machine Hints:**
- action: fill
- selector: [data-testid="password-input"]
- value: {{user.password}}

### Step 4: Click Login Button
Click the login button to submit credentials.

**Machine Hints:**
- action: click
- selector: [data-testid="login-button"]

### Step 5: Verify Dashboard Redirect
Verify the user is redirected to the dashboard.

**Machine Hints:**
- action: waitForURL
- pattern: /dashboard
- timeout: 5000
