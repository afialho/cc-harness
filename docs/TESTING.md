# Testing Strategy

Full testing strategy for this project. Follow TDD: RED → GREEN → REFACTOR.

## Testing Stack

| Layer | Tool | Config File |
|-------|------|-------------|
| Unit & Integration | Framework-native (Vitest / Jest / Pytest / etc.) | `vitest.config.ts` or `jest.config.ts` |
| BDD | Cucumber.js (`@cucumber/cucumber`) | `cucumber.js` |
| E2E | Cypress | `cypress.config.ts` |
| Load & Stress | k6 | `tests/load/*.js` |

## Test Locations

```
tests/
├── unit/
│   ├── domain/             Unit tests for domain entities and value objects
│   └── application/        Unit tests for use cases
├── integration/            Integration tests for infrastructure adapters
├── bdd/
│   ├── features/           Gherkin .feature files
│   └── steps/              Cucumber step definitions
├── e2e/                    Cypress specs
└── load/                   k6 scripts
```

## Running Tests

```bash
# All tests
rtk npm test

# Unit only
rtk npm test -- tests/unit

# Integration only
rtk npm test -- tests/integration

# BDD
rtk npx cucumber-js

# E2E (interactive)
rtk npx cypress open

# E2E (CI)
rtk npx cypress run

# Load test
rtk k6 run tests/load/[script].js
```

## Unit Tests

### Scope
- Domain entities and value objects
- Application use cases
- Pure functions

### Dependencies
- Mock only at port boundaries (outbound interfaces)
- Never mock domain objects
- Use test doubles (stubs/fakes) over complex mocking frameworks

### Structure (Arrange-Act-Assert)
```typescript
describe('LoginUseCase', () => {
  describe('when credentials are valid', () => {
    it('returns a session token', async () => {
      // Arrange
      const user = UserBuilder.active().withEmail('user@test.com').build();
      const repo = new FakeUserRepository([user]);
      const useCase = new LoginUseCase(repo, new FakePasswordHasher(), new FakeTokenService());

      // Act
      const result = await useCase.execute({
        email: 'user@test.com',
        password: 'correct-password',
      });

      // Assert
      expect(result.token).toBeDefined();
    });
  });

  describe('when user does not exist', () => {
    it('throws UserNotFoundError', async () => {
      const repo = new FakeUserRepository([]);
      const useCase = new LoginUseCase(repo, new FakePasswordHasher(), new FakeTokenService());

      await expect(
        useCase.execute({ email: 'ghost@test.com', password: 'any' })
      ).rejects.toThrow(UserNotFoundError);
    });
  });
});
```

### Test Builders (for complex domain objects)
Create builders for entities used in many tests:
```typescript
// tests/helpers/builders/UserBuilder.ts
export class UserBuilder {
  private props = { /* defaults */ };

  static active() { return new UserBuilder().withStatus('active'); }

  withEmail(email: string) { this.props.email = email; return this; }
  withStatus(status: string) { this.props.status = status; return this; }

  build(): User { return User.create(this.props); }
}
```

## Integration Tests

### Scope
- Infrastructure adapters (repositories, HTTP clients, email services)
- Port implementations
- Service composition at boundaries

### Setup
```typescript
// Use real dependencies (or containerized equivalents)
// Docker Compose for databases in CI:
//   docker-compose -f docker-compose.test.yml up -d

beforeEach(async () => {
  await truncateAllTables(db); // Clean state between tests
});

afterAll(async () => {
  await db.disconnect();
});
```

### What to test
- CRUD operations at the adapter level
- Query correctness
- Error handling (connection failures, constraint violations)
- Transaction behavior

## BDD Tests with Cucumber.js

See `docs/BDD.md` for detailed guide.

Quick setup:
```bash
npm install --save-dev @cucumber/cucumber
```

`cucumber.js` config:
```javascript
module.exports = {
  default: {
    require: ['tests/bdd/steps/**/*.ts'],
    paths: ['tests/bdd/features/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber.html'],
    requireModule: ['ts-node/register'],
  }
};
```

## Cypress E2E Tests

### Setup
```bash
npm install --save-dev cypress
npx cypress open  # first run — generates cypress.config.ts
```

`cypress.config.ts`:
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'tests/e2e/**/*.cy.ts',
    supportFile: 'tests/e2e/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
  },
});
```

### Test structure
```typescript
// tests/e2e/auth.cy.ts
describe('User Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in with valid credentials', () => {
    cy.get('[data-testid="email"]').type('user@test.com');
    cy.get('[data-testid="password"]').type('correct-password');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('shows error for invalid credentials', () => {
    cy.get('[data-testid="email"]').type('user@test.com');
    cy.get('[data-testid="password"]').type('wrong');
    cy.get('[data-testid="submit"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });
});
```

**Always use `data-testid` attributes** — never CSS classes or element tags for selectors.

## Load & Stress Tests with k6

### Setup
```bash
# macOS
brew install k6

# Docker
docker pull grafana/k6
```

### Test types

**Load test** — normal + peak traffic behavior:
```javascript
// tests/load/auth-login.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up
    { duration: '3m', target: 100 },  // steady state
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'loadtest@test.com',
    password: 'test-password',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    'status 200': r => r.status === 200,
    'has token': r => JSON.parse(r.body).token !== undefined,
  });

  sleep(1);
}
```

**Stress test** — find the breaking point:
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 400 },   // push beyond expected capacity
    { duration: '2m', target: 0 },
  ],
};
```

**Spike test** — sudden traffic surges:
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 500 },  // spike
    { duration: '3m', target: 500 },
    { duration: '10s', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '10s', target: 0 },
  ],
};
```

### Run
```bash
rtk k6 run tests/load/auth-login.js
rtk k6 run --vus 50 --duration 2m tests/load/auth-login.js
```

### When to write load tests
- Every new HTTP endpoint
- Endpoints with database queries
- Endpoints called by external services
- Any operation expected to handle high concurrency

## Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Domain | 100% lines | Native coverage |
| Application | 100% branches | Native coverage |
| Infrastructure | 80% lines | Native coverage |
| Overall | 80% | Native coverage |

Coverage is a floor, not a goal. 100% coverage with bad tests is worthless.
