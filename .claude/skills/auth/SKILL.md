---
name: auth
description: Authentication and authorization implementation. Stack-aware: detects Next.js, Node/Express/Fastify, React Native, Django, Rails and applies the correct strategy. Covers JWT + refresh rotation, OAuth2/social login, RBAC, security hardening, TDD, BDD, and hexagonal architecture.
disable-model-invocation: true
argument-hint: [scope: scaffold | social | rbac | reset | audit]
---

# /auth — Authentication & Authorization

> Auth é a primeira feature de qualquer projeto. Sem auth funcional, nada avança.
> Esta skill detecta o stack e aplica a estratégia correta. Nunca reinventa o que já existe.

---

## Detecção de Stack (automática)

Antes de qualquer implementação, detectar:

```
Stack detectado:
  □ Next.js           → Auth.js (next-auth v5) — padrão
  □ Node/Express      → JWT custom (jsonwebtoken + bcrypt)
  □ Node/Fastify      → @fastify/jwt + @fastify/cookie
  □ React Native      → JWT custom (backend) + SecureStore (mobile)
  □ Django            → dj-rest-auth + djangorestframework-simplejwt
  □ Rails             → devise + devise-jwt
  □ Supabase          → @supabase/auth-helpers — padrão se Supabase detectado
  □ Firebase          → firebase/auth — padrão se Firebase detectado
```

Se stack ambíguo → perguntar antes de implementar.

---

## Estratégias disponíveis

| Scope | Uso | Comando |
|-------|-----|---------|
| `scaffold` | Auth completa do zero (register, login, logout, refresh) | `/auth scaffold` |
| `social` | OAuth2 / login social (Google, GitHub, Apple) | `/auth social` |
| `rbac` | Role-Based Access Control (roles + permissões) | `/auth rbac` |
| `reset` | Recuperação de senha (email + token) | `/auth reset` |
| `audit` | Auditoria de segurança da auth existente | `/auth audit` |

---

## Scope: scaffold

> Implementar autenticação completa do zero.

### Fase 0 — Auth Methods (perguntar antes de implementar)

> **Emit:** `▶ [0/7] Auth Methods`

Antes de qualquer código, confirmar quais métodos este projeto precisa:

```
Métodos de autenticação:
  □ Email + senha              (sempre incluído)
  □ Magic link (passwordless)  (recomendado — pergunta obrigatória)
  □ Google OAuth2
  □ GitHub OAuth2
  □ Apple Sign In              (OBRIGATÓRIO se iOS + qualquer outro social)
  □ Microsoft / Azure AD       (projetos enterprise)
  □ SSO SAML                   (projetos enterprise)
```

Se o usuário não especificou → perguntar explicitamente:
*"Este projeto terá login social ou magic link? (recomendado: sim para ambos)"*

**Magic link é recomendado por padrão** para qualquer app que vá para o mercado:
- Remove atrito de lembrar senha
- Reduz suporte ("esqueci minha senha")
- Seguro por design (token one-use, TTL curto)
- Implementar junto com email+senha, não depois

Se magic link confirmado → implementar em paralelo com scaffold (ver scope `social`).

---

### Fase 1 — BDD Scenarios

> **Emit:** `▶ [1/7] BDD Scenarios`

Escrever em `tests/bdd/features/auth.feature` antes de qualquer código:

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

---

### Fase 2 — Arquitetura Hexagonal

> **Emit:** `▶ [2/7] Arquitetura`

```
src/domain/auth/
  User.ts                  Entidade User (id, email, passwordHash, role, lockedUntil)
  Token.ts                 Value object Token (accessToken, refreshToken, expiresAt)
  AuthError.ts             Erros de domínio (InvalidCredentials, AccountLocked, TokenExpired)
  AuthPolicy.ts            Regras: senha mínima, tentativas máximas, duração de token

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

### Fase 3 — Domain RED → GREEN

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

Implementar entidades e use cases até todos os testes passarem (GREEN).

---

### Fase 4 — Infrastructure

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

    // 1. Verificar se token existe e não foi revogado
    const stored = await this.tokenStore.findRefreshToken(payload.tokenId);
    if (!stored) throw new AuthError.TokenRevoked();

    // 2. REVOGAR o token antigo (rotation)
    await this.tokenStore.revokeToken(payload.tokenId);

    // 3. Emitir novo par
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
  private readonly COST_FACTOR = 12; // nunca < 10

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

### Fase 5 — Endpoints / Routes

> **Emit:** `▶ [5/7] Routes`

```
POST /auth/register        → RegisterUseCase
POST /auth/login           → LoginUseCase → { accessToken, refreshToken }
POST /auth/logout          → LogoutUseCase (revoke refresh token)
POST /auth/refresh         → RefreshTokenUseCase → { accessToken, refreshToken }
POST /auth/forgot-password → ForgotPasswordUseCase → sends email
POST /auth/reset-password  → ResetPasswordUseCase (token + new value)
GET  /auth/me              → [protected] retorna user atual
```

**Armazenamento de tokens (por plataforma):**

| Plataforma | Access Token | Refresh Token |
|------------|-------------|---------------|
| Web SPA | Memory (React state/Zustand) | HttpOnly cookie (SameSite=Strict) |
| Next.js SSR | Cookie HttpOnly (server-set) | Cookie HttpOnly |
| React Native | Memory (Zustand) | expo-secure-store |
| CLI/server | Env var / keychain | Arquivo seguro |

> **NUNCA** armazenar access token em localStorage ou AsyncStorage.

---

### Fase 6 — Next.js: Auth.js (next-auth v5)

> **Emit:** `▶ [6/7] Next.js Auth.js` *(pular se não for Next.js)*

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

### Fase 7 — E2E + Gate

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
  □ Sem credenciais em código (security-scan passa sem warnings)

  Se qualquer item falhar → build PARA. Auth é pré-requisito de tudo.
```

---

## Scope: social

> Adicionar OAuth2 / login social e/ou magic link.
> Implementar junto com scaffold, não depois.

### Magic Link (passwordless)

Fluxo seguro:
```
1. POST /auth/magic-link { email }
   → SEMPRE retornar 200 (evita user enumeration)
   → Gerar token: crypto.randomUUID(), TTL 15min
   → Armazenar hash do token (não plaintext)
   → Enviar email com link: /auth/verify?token=<token>&email=<email>

2. GET /auth/verify?token=<token>&email=<email>
   → Validar token (hash match + não expirado + one-use)
   → Se usuário não existe → criar conta automaticamente
   → Emitir access token + refresh token
   → Redirecionar para dashboard
   → INVALIDAR token imediatamente após uso
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

### Provedores OAuth2 suportados

```typescript
// Next.js com Auth.js
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Apple from 'next-auth/providers/apple';

// Node.js com Passport.js
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
```

### Variáveis de ambiente necessárias

```env
# Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Apple (Sign in with Apple — obrigatório para iOS)
APPLE_CLIENT_ID=your-bundle-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
```

> Apple Sign In é **obrigatório** para apps iOS que oferecem qualquer outro login social (App Store guideline 4.8).

### Fluxo de merge (account linking)

Quando usuário social usa o mesmo email de uma conta existente:
1. Verificar se email já existe no banco
2. Se sim → vincular provider ao account existente (não criar duplicata)
3. Se não → criar novo account com dados do provider
4. Sempre confirmar que email está verificado no provider antes de vincular

---

## Scope: rbac

> Role-Based Access Control — roles e permissões.

### Modelo de domínio

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

// Uso:
router.delete('/users/:id', authenticate, requirePermission('delete:users'), deleteUserHandler);
```

### React: proteção de UI

```typescript
// src/hooks/usePermission.ts
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user ? hasPermission(user.role, permission) : false;
}

// Componente guard
export function CanDo({ permission, children, fallback = null }) {
  return usePermission(permission) ? children : fallback;
}

// Uso:
<CanDo permission="delete:users" fallback={<span>Sem permissão</span>}>
  <DeleteButton />
</CanDo>
```

---

## Scope: reset

> Recuperação de senha via email.

### Fluxo seguro

```
1. POST /auth/forgot-password { email }
   → SEMPRE retornar 200 (mesmo que email não exista — evita user enumeration)
   → Se email existe: gerar token UUID (crypto.randomUUID()), TTL 1h
   → Armazenar HASH do token (nunca o token em plaintext)
   → Enviar email com link: /reset-password?token=<token>

2. GET /reset-password?token=<token>
   → Validar token existe e não expirou (comparar hash)
   → Exibir form de novo valor

3. POST /auth/reset-password { token, newValue }
   → Validar token
   → Hash novo valor
   → Salvar
   → INVALIDAR token (one-use only)
   → Revogar TODOS os refresh tokens do usuário (força re-login em todos os dispositivos)
```

> **Armazenar hash do reset token, não o token em si.** Se DB vazar, tokens não funcionam.

---

## Scope: audit

> Auditoria de segurança da autenticação existente.

### Checklist de auditoria

```
Tokens:
  □ Access token TTL ≤ 30 min (ideal: 15 min)
  □ Refresh token tem rotation implementada?
  □ Refresh tokens revogados no logout?
  □ Tokens armazenados em HttpOnly cookie ou SecureStore? (não localStorage)
  □ JWT_SECRET tem ≥ 256 bits de entropia? (não string curta ou óbvia)
  □ Dois secrets distintos: ACCESS_SECRET ≠ REFRESH_SECRET

Hashing:
  □ Bcrypt cost factor ≥ 10 (ideal: 12)?
  □ Validação de força no backend (não só frontend)?
  □ Rate limiting no endpoint de login?
  □ Account lockout após N tentativas?

Segredos:
  □ Nenhuma credencial em código (security-scan)
  □ Variáveis em .env e .env em .gitignore

Transporte:
  □ HTTPS obrigatório em produção
  □ HSTS header configurado
  □ Cookie com Secure flag em produção

Endpoints:
  □ /auth/register tem rate limiting?
  □ /auth/login tem rate limiting?
  □ /auth/forgot-password retorna 200 mesmo para email inválido?
  □ Reset tokens são one-use?
  □ Reset token armazena hash (não plaintext)?

RBAC:
  □ Cada endpoint protegido tem guard explícito?
  □ Default é negar (deny by default)?
  □ Roles validadas no backend, não só no frontend?
```

Para cada item ❌: gerar issue com severidade (Critical/High/Medium) e fix recomendado.

---

## Security Baseline — não negociável

```
Estas regras se aplicam independente do scope:

1. NUNCA armazenar valores sensíveis em plaintext — somente bcrypt hash (cost ≥ 10)
2. NUNCA armazenar access token em localStorage / AsyncStorage
3. NUNCA retornar mensagens que revelem se email existe ou não
4. NUNCA usar Math.random() para gerar tokens — usar crypto.randomUUID() ou crypto.randomBytes()
5. SEMPRE dois secrets distintos: ACCESS_SECRET e REFRESH_SECRET
6. SEMPRE revogar todos os refresh tokens no reset
7. SEMPRE revogar o refresh token na rotação (não emitir novo sem revogar o antigo)
8. Rate limiting em: /login, /register, /forgot-password
9. Account lockout: ≥ 5 tentativas → bloquear por ≥ 15 minutos
10. Tokens de reset: one-use, TTL ≤ 1h, armazenar somente hash
```
