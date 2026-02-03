# Auth Bypass Detection Patterns

**MUST search for ALL of these patterns during discovery to detect skip/bypass auth mechanisms.**

## Pattern Groups

### Group 1: Skip/Bypass Flags in Code

```regex
skip.*auth|bypass.*auth|mock.*auth|noAuth|skipAuth|authSkip
skipAuthentication|skip-auth|skipLogin|skipOidc
```

**Examples:** `skipAuth`, `bypassAuth`, `mockAuth`, `skipOidc`, `authSkip`

### Group 2: Environment Variables

```regex
SKIP_AUTH|NO_AUTH|AUTH_DISABLED|DISABLE_AUTH
VITE_BYPASS|BYPASS_AUTH|MOCK_AUTH
```

**Examples:** `SKIP_AUTH=true`, `VITE_BYPASS_AUTH=1`, `AUTH_DISABLED=true`

### Group 3: Config Flags

```regex
oauthEnabled|authEnabled|enableAuth|requireAuth
authRequired|isAuthRequired|useAuth
```

**Examples:** `oauthEnabled: false`, `config.authRequired`, `enableAuth=false`

**Important:** Check config endpoints (e.g., `/api/config`) for auth-related flags.

### Group 4: Mock/Dev User Patterns

```regex
mockUser|devUser|testUser|fakeUser
DEV_USER|MOCK_USER|TEST_USER
```

**Examples:** `mockUser`, `devUser`, `MOCK_USER_ID`, `testUserCredentials`

### Group 5: Conditional Auth Rendering

```regex
if.*auth.*enabled|if.*oauth|config\.auth|config\.oauth
AuthProvider.*\?|AuthGuard.*skip|canActivate.*false
```

**Examples:**
- React: `{config.oauthEnabled ? <AuthProvider>...</AuthProvider> : children}`
- Angular: `canActivate: () => !environment.skipAuth`
- Vue: `v-if="authEnabled"`

## Documentation Requirements

For each pattern found, document:

| Field | Description |
|-------|-------------|
| **Flag/Mechanism** | Name of the flag (e.g., `oauthEnabled`) |
| **Location** | File path and line number, or API endpoint |
| **How to Enable** | Environment variable, config setting, or build flag |
| **Mode** | `identityless` (no user context) or `mock-identity` (fake user with roles) |

## Output Format

Include in `docs/DISCOVERY.md` under "Local auth bypass signals":

```markdown
### Local Auth Bypass Signals

| Mechanism | Location | How to Enable | Mode |
|-----------|----------|---------------|------|
| `oauthEnabled` | `src/main.tsx:64` | Backend `/api/config` returns `oauthEnabled=false` | identityless |
| `SKIP_AUTH` | `.env.local` | Set `SKIP_AUTH=true` | identityless |
| `mockUser` | `src/auth/mock.ts:12` | Import and use `mockUserContext` | mock-identity |
```

## Auth Mode Classification

- **identityless**: No user identity visible, protected routes accessible without login, RBAC disabled
- **mock-identity**: A user identity is injected (fake/test user), RBAC still enforced, roles switchable via toggle

## Usage in Journey Propose

When asking about auth style, **always check discovery findings** and include bypass as an option if detected:

```
1. **OIDC with Keycloak** (detected - local env)
2. **SSO redirect** (corporate SSO in higher envs)
3. **Skip auth** (oauthEnabled=false detected) — for fast local testing
4. **Multiple modes** (Keycloak locally, SSO in staging, skip for unit-like tests)
```
