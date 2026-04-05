---
name: auth
description: Authentication and authorization implementation. Stack-aware: detects Next.js, Node/Express/Fastify, React Native, Django, Rails and applies the correct strategy. Covers JWT + refresh rotation, OAuth2/social login, RBAC, security hardening, TDD, BDD, and hexagonal architecture.
argument-hint: [scope: scaffold | social | rbac | reset | audit]
---

# /auth — Authentication & Authorization

> Auth is the first feature of any project. Without functional auth, nothing progresses.
> This skill detects the stack and applies the correct strategy. Never reinvents what already exists.

---

## Stack Detection (automatic)

Before any implementation, detect:

```
Detected stack:
  □ Next.js           → Auth.js (next-auth v5) — default
  □ Node/Express      → JWT custom (jsonwebtoken + bcrypt)
  □ Node/Fastify      → @fastify/jwt + @fastify/cookie
  □ React Native      → JWT custom (backend) + SecureStore (mobile)
  □ Django            → dj-rest-auth + djangorestframework-simplejwt
  □ Rails             → devise + devise-jwt
  □ Supabase          → @supabase/auth-helpers — default if Supabase detected
  □ Firebase          → firebase/auth — default if Firebase detected
```

If stack is ambiguous → ask before implementing.

---

## Available strategies

| Scope | Usage | Command |
|-------|-------|---------|
| `scaffold` | Complete auth from scratch (register, login, logout, refresh) | `/auth scaffold` |
| `social` | OAuth2 / social login (Google, GitHub, Apple) | `/auth social` |
| `rbac` | Role-Based Access Control (roles + permissions) | `/auth rbac` |
| `reset` | Password recovery (email + token) | `/auth reset` |
| `audit` | Security audit of existing auth | `/auth audit` |

---

## Scope: scaffold

> Implement complete authentication from scratch.

### Phase 0 — Auth Methods (ask before implementing)

> **Emit:** `▶ [0/7] Auth Methods`

Before any code, confirm which methods this project needs:

```
Authentication methods:
  □ Email + password           (always included)
  □ Magic link (passwordless)  (recommended — mandatory question)
  □ Google OAuth2
  □ GitHub OAuth2
  □ Apple Sign In              (REQUIRED if iOS + any other social)
  □ Microsoft / Azure AD       (enterprise projects)
  □ SSO SAML                   (enterprise projects)
```

If user did not specify → ask explicitly:
*"Will this project have social login or magic link? (recommended: yes for both)"*

**Magic link is recommended by default** for any app going to market:
- Removes friction of remembering passwords
- Reduces support ("forgot my password")
- Secure by design (one-use token, short TTL)
- Implement alongside email+password, not after

If magic link confirmed → implement in parallel with scaffold (see scope `social`).

---

### Phase 1 — BDD Scenarios

> **Emit:** `▶ [1/7] BDD Scenarios`

Write in `tests/bdd/features/auth.feature` before any code:

```gherkin
Feature: Authentication

  Scenario: Register with valid credentials
    Given I am on the register page
    When I submit valid name, email and password
    Then I should be logged in and redirected to dashboard

  Scenario: Register with existing email
    Given an account with "user@example.com" already exists
    When I try to register with "user@example.com"
    Then I should see "Email already in use"

  Scenario: Login with valid credentials
    Given I have an account with "user@example.com"
    When I login with correct credentials
    Then I should receive a valid access token
    And I should be redirected to dashboard

  Scenario: Login with wrong credentials
    When I login with incorrect credentials
    Then I should see "Invalid credentials"
    And no token should be issued

  Scenario: Access protected route without token
    When I request a protected endpoint without Authorization header
    Then I should receive 401 Unauthorized

  Scenario: Access protected route with expired token
    Given my access token has expired
    When I request a protected endpoint
    Then the system should automatically refresh my token
    And my request should succeed

  Scenario: Logout
    Given I am logged in
    When I logout
    Then my refresh token should be invalidated
    And subsequent requests with that token should fail

  Scenario: Account lockout after failed attempts
    When I fail to login 5 times with incorrect credentials
    Then my account should be locked for 15 minutes
```

> **Checkpoint:** Writes `.claude/checkpoint.md`:
> ```
> skill: auth
> phase: bdd-scenarios-written
> modified_files: [list]
> next: architecture
> ```
> If context reaches ~60k tokens → writes checkpoint and emits:
> `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

---

### Phase 2 — Hexagonal Architecture

> **Emit:** `▶ [2/7] Architecture`

```
src/domain/auth/
  User.ts                  User entity (id, email, passwordHash, role, lockedUntil)
  Token.ts                 Token value object (accessToken, refreshToken, expiresAt)
  AuthError.ts             Domain errors (InvalidCredentials, AccountLocked, TokenExpired)
  AuthPolicy.ts            Rules: minimum password, max attempts, token duration

src/ports/
  AuthPort.ts              IAuthService (login, register, logout, refresh, validateToken)
  UserRepository.ts        IUserRepository (findByEmail, findById, save, updateLockout)
  TokenStore.ts            ITokenStore (saveRefreshToken, findRefreshToken, revokeToken)
  PasswordHasher.ts        IPasswordHasher (hash, compare)
  EmailPort.ts             IEmailService (sendPasswordReset, sendWelcome)

src/application/auth/
  LoginUseCase.ts          Orchestrates: find user → verify password → check lockout → issue tokens
  RegisterUseCase.ts       Orchestrates: validate → check unique email → hash → save → welcome email
  LogoutUseCase.ts         Revokes refresh token in store
  RefreshTokenUseCase.ts   Validates refresh token → issues new pair (rotation)
  ResetPasswordUseCase.ts  Generates reset token → stores → sends email

src/infrastructure/
  auth/
    JWTAdapter.ts          Implements AuthPort: signs/verifies JWT
    BcryptAdapter.ts       Implements PasswordHasher: bcrypt with cost 12
    RedisTokenStore.ts     Implements TokenStore: refresh tokens in Redis with TTL
    AuthRepository.ts      Implements UserRepository: DB queries
    NodemailerAdapter.ts   Implements EmailPort: transactional email
  http/middleware/
    AuthMiddleware.ts      Validates Bearer token → injects user into request context
    RoleGuard.ts           Verifies role/permission for protected routes
```

---

### Phase 3 — Domain RED → GREEN

> **Emit:** `▶ [3/7] Domain TDD`

```typescript
// tests/unit/domain/auth/User.test.ts
describe('User entity', () => {
  it('should create valid user', () => {
    const user = User.create({ email: 'test@example.com', passwordHash: 'hashed-value', role: 'user' });
    expect(user.isLocked()).toBe(false);
  });

  it('should lock after max failed attempts', () => {
    const user = User.create({ email: 'test@example.com', passwordHash: 'hashed-value', role: 'user' });
    // Simulate 5 failed attempts
    Array.from({ length: 5 }).forEach(() => user.recordFailedAttempt());
    expect(user.isLocked()).toBe(true);
  });
});

// tests/unit/application/auth/LoginUseCase.test.ts
describe('LoginUseCase', () => {
  it('should return tokens on valid credentials', async () => {
    const result = await loginUseCase.execute({ email: mockUser.email, credential: mockUser.validCredential });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should throw InvalidCredentials on bad input', async () => {
    await expect(loginUseCase.execute({ email: mockUser.email, credential: 'invalid-test-credential' }))
      .rejects.toThrow(AuthError.InvalidCredentials);
  });
});
```

Implement entities and use cases until all tests pass (GREEN).

---

### Phase 4 — Infrastructure

> **Emit:** `▶ [4/7] Infrastructure`

#### JWT (access + refresh)

```typescript
// src/infrastructure/auth/JWTAdapter.ts
import jwt from 'jsonwebtoken';

export class JWTAdapter implements AuthPort {
  private readonly ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

  signAccessToken(payload: { userId: string; role: string }): string {
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: '15m',
      issuer: process.env.APP_URL,
    });
  }

  signRefreshToken(payload: { userId: string; tokenId: string }): string {
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: '30d',
    });
  }

  verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.ACCESS_SECRET) as JWTPayload;
  }

  verifyRefreshToken(token: string): RefreshPayload {
    return jwt.verify(token, this.REFRESH_SECRET) as RefreshPayload;
  }
}
```

#### Refresh Token Rotation

```typescript
// src/application/auth/RefreshTokenUseCase.ts
export class RefreshTokenUseCase {
  async execute(refreshToken: string) {
    const payload = this.jwtAdapter.verifyRefreshToken(refreshToken);

    // 1. Check if token exists and has not been revoked
    const stored = await this.tokenStore.findRefreshToken(payload.tokenId);
    if (!stored) throw new AuthError.TokenRevoked();

    // 2. REVOKE the old token (rotation)
    await this.tokenStore.revokeToken(payload.tokenId);

    // 3. Issue new pair
    const user = await this.userRepo.findById(payload.userId);
    const newTokenId = crypto.randomUUID();
    const newAccessToken = this.jwtAdapter.signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = this.jwtAdapter.signRefreshToken({ userId: user.id, tokenId: newTokenId });

    await this.tokenStore.saveRefreshToken(newTokenId, user.id, '30d');

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
```

#### Bcrypt

```typescript
// src/infrastructure/auth/BcryptAdapter.ts
import bcrypt from 'bcrypt';

export class BcryptAdapter implements PasswordHasher {
  private readonly COST_FACTOR = 12; // never < 10

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.COST_FACTOR);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
```

#### Middleware

```typescript
// src/infrastructure/http/middleware/AuthMiddleware.ts
export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const token = header.slice(7);
    const payload = jwtAdapter.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### Phase 5 — Endpoints / Routes

> **Emit:** `▶ [5/7] Routes`

```
POST /auth/register        → RegisterUseCase
POST /auth/login           → LoginUseCase → { accessToken, refreshToken }
POST /auth/logout          → LogoutUseCase (revoke refresh token)
POST /auth/refresh         → RefreshTokenUseCase → { accessToken, refreshToken }
POST /auth/forgot-password → ForgotPasswordUseCase → sends email
POST /auth/reset-password  → ResetPasswordUseCase (token + new value)
GET  /auth/me              → [protected] returns current user
```

**Token storage (per platform):**

| Platform | Access Token | Refresh Token |
|----------|-------------|---------------|
| Web SPA | Memory (React state/Zustand) | HttpOnly cookie (SameSite=Strict) |
| Next.js SSR | Cookie HttpOnly (server-set) | Cookie HttpOnly |
| React Native | Memory (Zustand) | expo-secure-store |
| CLI/server | Env var / keychain | Secure file |

> **NEVER** store access token in localStorage or AsyncStorage.

---

### Phase 6 — Next.js: Auth.js (next-auth v5)

> **Emit:** `▶ [6/7] Next.js Auth.js` *(skip if not Next.js)*

```bash
rtk npm install next-auth@beta
```

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { loginUseCase } from '@/application/auth/LoginUseCase';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, credential: {} },
      authorize: async ({ email, credential }) => {
        const result = await loginUseCase.execute({ email, credential });
        return result.user;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

// app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;

// Middleware: src/middleware.ts
export { auth as middleware } from '@/lib/auth';
export const config = { matcher: ['/dashboard/:path*', '/api/protected/:path*'] };
```

---

### Phase 7 — E2E + Gate

> **Emit:** `▶ [7/7] E2E + Gate`

```typescript
// tests/e2e/auth.cy.ts (Cypress — web)
describe('Auth flow', () => {
  it('registers and redirects to dashboard', () => {
    cy.visit('/register');
    cy.get('[name=name]').type('Test User');
    cy.get('[name=email]').type('test@example.com');
    cy.get('[name=credential]').type('Test-Credential-Not-Real-123!');
    cy.get('[type=submit]').click();
    cy.url().should('include', '/dashboard');
  });

  it('login with invalid credentials shows error', () => {
    cy.visit('/login');
    cy.get('[name=email]').type('test@example.com');
    cy.get('[name=credential]').type('invalid-test-credential-not-real');
    cy.get('[type=submit]').click();
    cy.contains('Invalid credentials').should('be.visible');
  });
});
```

```
⛔ GATE AUTH:
  □ BDD scenarios todos mapeados (auth.feature)
  □ Unit: LoginUseCase, RegisterUseCase, RefreshTokenUseCase — 0 failures
  □ Unit: User entity (lockout, validation) — 0 failures
  □ Integration: endpoints retornam status codes corretos
  □ E2E: register → login → protected route → logout — PASS
  □ Access token: 15min, HttpOnly cookie ou memory only
  □ Refresh token: 30 dias, rotation implementada
  □ Bcrypt cost factor ≥ 10
  □ No credentials in code (security-scan passes without warnings)

  If any item fails → build STOPS. Auth is a prerequisite for everything.
```

---

## Scope: social

> Add OAuth2 / social login and/or magic link.
> Implement alongside scaffold, not after.

### Magic Link (passwordless)

Secure flow:
```
1. POST /auth/magic-link { email }
   → ALWAYS return 200 (prevents user enumeration)
   → Generate token: crypto.randomUUID(), TTL 15min
   → Store hash of token (not plaintext)
   → Send email with link: /auth/verify?token=<token>&email=<email>

2. GET /auth/verify?token=<token>&email=<email>
   → Validate token (hash match + not expired + one-use)
   → If user does not exist → create account automatically
   → Issue access token + refresh token
   → Redirect to dashboard
   → INVALIDATE token immediately after use
```

```typescript
// src/application/auth/MagicLinkUseCase.ts
export class SendMagicLinkUseCase {
  async execute(email: string): Promise<void> {
    const token = crypto.randomUUID();
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    await this.tokenStore.saveMagicToken(Buffer.from(tokenHash).toString('hex'), email, '15m');
    await this.emailPort.sendMagicLink(email, token); // sends plaintext token in link
    // Always resolve — never reveal if email exists
  }
}

export class VerifyMagicLinkUseCase {
  async execute(token: string, email: string) {
    const tokenHash = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    ).toString('hex');
    const stored = await this.tokenStore.findMagicToken(tokenHash, email);
    if (!stored) throw new AuthError.InvalidToken();
    await this.tokenStore.revokeMagicToken(tokenHash); // one-use
    let user = await this.userRepo.findByEmail(email);
    if (!user) user = await this.registerUseCase.createFromMagicLink(email);
    return this.jwtAdapter.issueTokenPair(user);
  }
}
```

**Next.js com Auth.js:**
```typescript
import Resend from 'next-auth/providers/resend'; // ou Nodemailer
// Adicionar ao array de providers em src/lib/auth.ts
Resend({ from: 'noreply@yourapp.com' })
```

### Supported OAuth2 providers

```typescript
// Next.js com Auth.js
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Apple from 'next-auth/providers/apple';

// Node.js com Passport.js
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
```

### Required environment variables

```env
# Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Apple (Sign in with Apple — required for iOS)
APPLE_CLIENT_ID=your-bundle-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
```

> Apple Sign In is **required** for iOS apps that offer any other social login (App Store guideline 4.8).

### Merge flow (account linking)

When social user uses the same email as an existing account:
1. Check if email already exists in database
2. If yes → link provider to existing account (do not create duplicate)
3. If no → create new account with provider data
4. Always confirm email is verified at the provider before linking

---

## Scope: rbac

> Role-Based Access Control — roles and permissions.

### Domain model

```typescript
// src/domain/auth/Permission.ts
export type Resource = 'users' | 'posts' | 'comments' | 'admin';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Permission = `${Action}:${Resource}`;

// src/domain/auth/Role.ts
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['manage:users', 'manage:posts', 'manage:comments', 'manage:admin'],
  editor: ['create:posts', 'read:posts', 'update:posts', 'read:comments'],
  viewer: ['read:posts', 'read:comments'],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission) || permissions.includes(`manage:${permission.split(':')[1]}`);
}
```

### Guard middleware

```typescript
// src/infrastructure/http/middleware/RoleGuard.ts
export const requirePermission = (permission: Permission) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden', required: permission });
    }
    next();
  };

// Usage:
router.delete('/users/:id', authenticate, requirePermission('delete:users'), deleteUserHandler);
```

### React: UI protection

```typescript
// src/hooks/usePermission.ts
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user ? hasPermission(user.role, permission) : false;
}

// Guard component
export function CanDo({ permission, children, fallback = null }) {
  return usePermission(permission) ? children : fallback;
}

// Usage:
<CanDo permission="delete:users" fallback={<span>No permission</span>}>
  <DeleteButton />
</CanDo>
```

---

## Scope: reset

> Password recovery via email.

### Secure flow

```
1. POST /auth/forgot-password { email }
   → ALWAYS return 200 (even if email does not exist — prevents user enumeration)
   → If email exists: generate UUID token (crypto.randomUUID()), TTL 1h
   → Store HASH of token (never the token in plaintext)
   → Send email with link: /reset-password?token=<token>

2. GET /reset-password?token=<token>
   → Validate token exists and is not expired (compare hash)
   → Display form for new value

3. POST /auth/reset-password { token, newValue }
   → Validate token
   → Hash new value
   → Save
   → INVALIDATE token (one-use only)
   → Revoke ALL user's refresh tokens (forces re-login on all devices)
```

> **Store hash of reset token, not the token itself.** If DB leaks, tokens do not work.

---

## Scope: audit

> Security audit of existing authentication.

### Audit checklist

```
Tokens:
  □ Access token TTL ≤ 30 min (ideal: 15 min)
  □ Refresh token has rotation implemented?
  □ Refresh tokens revoked on logout?
  □ Tokens stored in HttpOnly cookie or SecureStore? (not localStorage)
  □ JWT_SECRET has ≥ 256 bits of entropy? (not short or obvious string)
  □ Two distinct secrets: ACCESS_SECRET ≠ REFRESH_SECRET

Hashing:
  □ Bcrypt cost factor ≥ 10 (ideal: 12)?
  □ Strength validation on backend (not just frontend)?
  □ Rate limiting on login endpoint?
  □ Account lockout after N attempts?

Secrets:
  □ No credentials in code (security-scan)
  □ Variables in .env and .env in .gitignore

Transport:
  □ HTTPS required in production
  □ HSTS header configured
  □ Cookie with Secure flag in production

Endpoints:
  □ /auth/register has rate limiting?
  □ /auth/login has rate limiting?
  □ /auth/forgot-password returns 200 even for invalid email?
  □ Reset tokens are one-use?
  □ Reset token stores hash (not plaintext)?

RBAC:
  □ Each protected endpoint has explicit guard?
  □ Default is deny (deny by default)?
  □ Roles validated on backend, not just frontend?
```

For each ❌ item: generate issue with severity (Critical/High/Medium) and recommended fix.

---

## Security Baseline — non-negotiable

```
These rules apply regardless of scope:

1. NEVER store sensitive values in plaintext — only bcrypt hash (cost ≥ 10)
2. NEVER store access token in localStorage / AsyncStorage
3. NEVER return messages that reveal whether email exists or not
4. NEVER use Math.random() to generate tokens — use crypto.randomUUID() or crypto.randomBytes()
5. ALWAYS two distinct secrets: ACCESS_SECRET and REFRESH_SECRET
6. ALWAYS revoke all refresh tokens on reset
7. ALWAYS revoke the refresh token on rotation (do not issue new without revoking old)
8. Rate limiting on: /login, /register, /forgot-password
9. Account lockout: ≥ 5 attempts → lock for ≥ 15 minutes
10. Reset tokens: one-use, TTL ≤ 1h, store only hash
```
