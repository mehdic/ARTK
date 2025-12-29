# ITSS Project Analysis

**Date:** 2024-12-29
**Project:** IT Service Shop (req-apps-it-service-shop)
**Purpose:** Reference project for ARTK Core development

---

## Executive Summary

ITSS is a **monorepo** with React frontend + Spring Boot backend, using **Keycloak** for OIDC authentication with **MFA enabled**. No existing E2E tests - perfect candidate for ARTK.

---

## 1. Project Structure

**Type:** Maven Monorepo with 4 modules

| Module | Description | Tech |
|--------|-------------|------|
| `iss-frontend` | React SPA | React 18.3.1, Vite, TypeScript |
| `iss-backend` | REST API | Spring Boot 3.2.4, Java 17 |
| `iss-mock` | Mock server | Testing support |
| `iss-clients` | Client utilities | Shared code |

---

## 2. Tech Stack

### Frontend
- **Framework:** React 18.3.1 with TypeScript 5.0.2
- **Build:** Vite 5.0.10
- **UI:** Ant Design 5.16.5 + ag-Grid Enterprise
- **HTTP:** Axios with interceptors
- **Auth:** react-oauth2-code-pkce (PKCE support)
- **Router:** React Router v6.14.2
- **Dev Server:** `npm run start` → localhost:5173

### Backend
- **Framework:** Spring Boot 3.2.4
- **Language:** Java 17
- **Security:** Spring Security 6.x + OAuth2 Resource Server
- **Database:** PostgreSQL
- **ORM:** Spring Data JPA + Hibernate
- **API Docs:** SpringDoc OpenAPI (Swagger)

---

## 3. Authentication

### IdP: Keycloak (NOT Azure AD)

**Configuration:**
- **Realm:** REQ
- **Grant Type:** Authorization Code with PKCE
- **Keycloak URL:** localhost:8084 (dev)
- **Frontend Library:** react-oauth2-code-pkce
- **Backend:** Spring OAuth2 Resource Server with JWT validation

**JWT Claims:**
- Principal: `username` claim
- Roles: `applicationRoles` claim
- Scopes: `scope` claim

### Dual Auth Mode

The app supports switching between OAuth2 and Basic Auth:

```yaml
# OAuth2 (production)
pictet.security.basicAuthActivated: false

# Basic Auth (development)
pictet.security.basicAuthActivated: true
```

### MFA: ENABLED
User confirmed MFA is enabled in the environment.

---

## 4. User Roles

| Role | Description | Test User |
|------|-------------|-----------|
| `ROLE_ADMIN` | Full admin access | jadmin |
| `ROLE_PRODUCT_MANAGER` | Manage products/templates | jpm |
| `ROLE_TECHNICAL_PM` | Technical PM capabilities | jtpm |
| `ROLE_IT_SUPPORT` | IT Support functions | jexit |
| `ROLE_HR_MANAGER` | HR movement management | jhr |
| `ROLE_HR_MANAGER_REO` | REO-specific HR | - |
| `ROLE_HR_ADMIN` | Full HR administration | npatel |
| `ROLE_LOGISTIC` | Logistics coordination | mmartinez |
| `ROLE_PARTNERS_SECRETARIES` | Partner secretaries | jcoffey |

### Test Users (Basic Auth Dev Mode)

```yaml
- jdoe (no roles)
- jadmin (ADMIN) - password: password
- jpm (PRODUCT_MANAGER)
- jhr (HR_MANAGER)
- jtpm (TECHNICAL_PM)
- jexit (IT_SUPPORT)
- npatel (HR_ADMIN)
- mmartinez (LOGISTIC)
- jcoffey (PARTNERS_SECRETARIES)
```

### Role Hierarchy

```java
PRODUCT_MANAGER = "hasAnyRole('ADMIN','PRODUCT_MANAGER','TECHNICAL_PM','IT_SUPPORT')"
HR_MANAGER = "hasAnyRole('ADMIN','HR_MANAGER','HR_ADMIN','IT_SUPPORT')"
TECHNICAL_PM = "hasAnyRole('ADMIN','TECHNICAL_PM','IT_SUPPORT')"
ADMIN = "hasAnyRole('ADMIN','IT_SUPPORT')"
```

---

## 5. Routes / Pages

| Route | Description | Role Required |
|-------|-------------|---------------|
| `/` | Dashboard/Home | Any authenticated |
| `/catalog/:catalogId?` | Product Catalog | Any authenticated |
| `/request` | Search requests | Feature toggled |
| `/request/:id` | Request detail | Feature toggled |
| `/request/create` | New request | Feature toggled |
| `/myproduct` | My Templates | PRODUCT_MANAGER |
| `/hr-movement` | People Movements | HR roles, feature toggled |
| `/learn` | Knowledge base | Any authenticated |
| `/admin` | Admin console | ADMIN only |
| `/userprofile` | User profile | Any authenticated |
| `/changelog` | Changelog | Any authenticated |

### Feature Toggles
- `REQUEST_FEATURE` - Enable/disable request module
- `HR_MOVEMENT_FEATURE` - Enable/disable people movements
- `NO_ADMIN_RIGHTS_FEATURE` - Toggle admin rights
- `MAINTENANCE_MODE_FEATURE` - Maintenance mode

---

## 6. API Endpoints

**Base Path:** `/api`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | OAuth2 config (public) |
| `/api/user/current` | GET | Current user info |
| `/api/user/search` | POST | Search users |
| `/api/products` | GET/POST | Product management |
| `/api/request` | GET/POST/PUT | Request CRUD |
| `/api/request/ongoing` | GET | Ongoing requests |
| `/api/request/closed` | GET | Closed requests |
| `/api/admin` | GET/POST | Admin functions |
| `/api/profiles` | GET/PUT/POST | Profile templates |
| `/api/comment` | GET/POST | Comments |
| `/api/teams` | GET/POST | Team management |
| `/api/attachments` | GET/POST | File attachments |

---

## 7. Existing Tests

### Frontend
- **Framework:** Vitest v1.4.0
- **Environment:** happy-dom
- **Command:** `npm test`
- **Coverage:** `npm run coverage`

### Backend
- **Framework:** JUnit (Maven Surefire)
- **Config:** application-test.yaml with H2 database

### E2E
- **Status:** ❌ NONE EXISTS
- **Opportunity:** Perfect for ARTK implementation

---

## 8. Environment Configuration

### Frontend Config Source
- Runtime config fetched from `GET /api/config`
- Dev mode: hardcoded basic auth (jadmin:password)
- Prod mode: Bearer token from OAuth2

### Backend Profiles
- `application.yaml` - Defaults
- `application-dev.yaml` - Development (basic auth)
- `application-oidc-dev.yaml` - Keycloak dev config
- `application-test.yaml` - Test with H2

### Key Properties
```yaml
pictet:
  security:
    basicAuthActivated: true/false
    sessionCreationPolicy: STATELESS
  req:
    serviceShopUrl: http://localhost:8085
```

---

## 9. Docker Services

| Service | Port | Description |
|---------|------|-------------|
| db | 5432 | PostgreSQL |
| keycloak | 8084 | Keycloak IdP |
| minio | 9000 | S3 storage |
| ibmmq | 1414 | Message queue |
| mail | 3025 | Greenmail SMTP |

---

## 10. ARTK Configuration for ITSS

Based on this analysis, the ARTK config should be:

```yaml
# artk.config.yml for ITSS
app:
  name: ITSS
  baseUrl: ${ITSS_BASE_URL:-http://localhost:5173}
  type: spa

auth:
  provider: oidc

  roles:
    admin:
      credentialsEnv:
        username: ITSS_ADMIN_USER
        password: ITSS_ADMIN_PASS
      description: Full admin access

    productManager:
      credentialsEnv:
        username: ITSS_PM_USER
        password: ITSS_PM_PASS
      description: Product manager role

    hrManager:
      credentialsEnv:
        username: ITSS_HR_USER
        password: ITSS_HR_PASS
      description: HR manager role

  oidc:
    idpType: keycloak  # ← KEYCLOAK, not Azure AD!
    loginUrl: /  # App redirects to Keycloak automatically

    success:
      url: /  # Returns to home after login
      selector: '[data-testid="user-menu"]'  # Or similar

    # Keycloak selectors (standard Keycloak theme)
    idpSelectors:
      username: '#username'
      password: '#password'
      submit: '#kc-login'

    mfa:
      enabled: true  # MFA IS ENABLED
      type: totp
      totpSecretEnv: ITSS_TOTP_SECRET

# Selectors - need to verify actual data-testid usage
selectors:
  testIdAttribute: data-testid
  strategy: [role, label, testid, text, css]
```

---

## 11. Recommended Initial Journeys

Based on the routes and roles:

### Smoke Tier
1. **JRN-0001:** User can log in via Keycloak and reach dashboard
2. **JRN-0002:** User can view product catalog
3. **JRN-0003:** User can access their profile

### Release Tier
4. **JRN-0004:** Product manager can create a new product template
5. **JRN-0005:** User can create a service request
6. **JRN-0006:** HR manager can view people movements
7. **JRN-0007:** Admin can access admin console

---

## 12. Key Findings for ARTK Implementation

1. **Keycloak OIDC** - Must implement Keycloak provider (not Azure AD)
2. **MFA** - Must handle TOTP in auth flow
3. **Feature Toggles** - Tests should check feature flags before running
4. **Dual Auth** - Consider supporting basic auth for faster dev testing
5. **Role Guards** - Frontend has `RoleGuardedRoute` component
6. **No E2E** - Clean slate for ARTK implementation
7. **Ant Design** - May have specific selector patterns
8. **ag-Grid** - Need table assertion patterns for grid

---

## 13. Environment Variables Needed

```bash
# .env.local (never commit)
ITSS_BASE_URL=http://localhost:5173
ITSS_API_URL=http://localhost:8085

# Admin role (jadmin in dev)
ITSS_ADMIN_USER=jadmin
ITSS_ADMIN_PASS=password

# Product Manager (jpm)
ITSS_PM_USER=jpm
ITSS_PM_PASS=password

# HR Manager (jhr)
ITSS_HR_USER=jhr
ITSS_HR_PASS=password

# MFA (if TOTP)
ITSS_TOTP_SECRET=<base32-secret>
```

---

## 14. Next Steps

1. Update ARTK spec to use Keycloak instead of Azure AD
2. Implement Keycloak OIDC provider with TOTP MFA support
3. Create initial smoke journeys for ITSS
4. Verify actual selectors used in ITSS frontend
5. Set up ARTK in ITSS repo
