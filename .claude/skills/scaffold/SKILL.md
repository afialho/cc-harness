---
name: scaffold
description: Initialize a new project from scratch. Creates project structure, Docker Compose, testing framework, Git repo, and pushes to GitHub. Called automatically by /build when no project exists yet. For mobile projects, delegates to /mobile scaffold.
disable-model-invocation: true
argument-hint: [type: web | api | fullstack | cli]
---

# /scaffold — New Project Initialization

> Creates the base structure of a project before /build starts implementing.
> For mobile → delegates to `/mobile scaffold`.

---

## When it is invoked

- **Via `/build`**: automatically when `src/`, `app/`, `lib/` or `package.json` does not exist
- **Directly**: `/scaffold web`, `/scaffold api`, `/scaffold fullstack`, `/scaffold cli`

---

## Type detection

If invoked without an argument, detects the type from IDEAS.md (if it exists):

| "Type" field in IDEAS.md | Inferred type |
|-------------------------|---------------|
| Web app (frontend + backend) | `fullstack` |
| API / backend only | `api` |
| Mobile first | `mobile` → delegates to `/mobile scaffold` |
| CLI tool | `cli` |
| Integration / automation | `api` |

If IDEAS.md does not exist → asks the user before continuing.

---

## Phase 1 — Directory structure + base dependencies

> **Emit:** `▶ [1/7] Project structure`

### Fullstack (Next.js App Router)

```bash
rtk npx create-next-app@latest . --typescript --eslint --tailwind --src-dir --app --import-alias "@/*" --no-git
rtk npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
rtk npm install -D @cucumber/cucumber cypress
```

Final structure:
```
src/
  app/           Next.js App Router — pages, layouts, API routes
  lib/           Server-side logic (queries, server actions, utils)
  components/    React components
  shared/        Config, types, constants
tests/
  unit/          Vitest unit tests
  integration/   API route integration tests
  bdd/features/  Gherkin feature files
  bdd/steps/     Cucumber step definitions
  e2e/           Cypress E2E tests
  load/          k6 load tests
```

### API only (Node.js + Fastify, hexagonal architecture)

```bash
rtk npm init -y
rtk npm install fastify @fastify/cors @fastify/jwt @fastify/cookie zod
rtk npm install -D typescript tsx vitest @types/node
rtk npm install -D @cucumber/cucumber cypress
```

Hexagonal structure:
```
src/
  domain/        Entities and pure logic — zero external deps
  application/   Use cases
  ports/         Interfaces (adapter contracts)
  infrastructure/ Adapters (DB, HTTP, messaging)
  shared/        Config, utils, logging
tests/
  unit/
  integration/
  bdd/features/
  bdd/steps/
  e2e/
  load/
```

### CLI

```bash
rtk npm init -y
rtk npm install commander chalk inquirer
rtk npm install -D typescript tsx vitest @types/node
```

---

## Phase 2 — Docker Compose

> **Emit:** `▶ [2/7] Docker Compose`

Creates `docker-compose.yml` based on the type. All services use `env_file: [".env"]` — no inline credentials.

**Fullstack / API:**
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes: [".:/app", "/app/node_modules"]
    env_file: [".env"]
    depends_on: [db, redis]

  db:
    image: postgres:16-alpine
    env_file: [".env"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

Creates `.env.example` with variables component by component — no real values, no combined connection strings:
```
# App
NODE_ENV=development
PORT=3000

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=

# Database — separate components (app builds the URL at runtime)
POSTGRES_DB=appdb
POSTGRES_USER=
POSTGRES_PASSWORD=

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

The app builds the connection string from individual components in `src/shared/config/database.ts`. Never concatenate credentials outside an isolated config function.

Creates `Dockerfile` (dev-ready):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**CLI:** no Docker Compose — CLI tools run on the host.

---

## Phase 3 — TypeScript + Testing config

> **Emit:** `▶ [3/7] TypeScript + Testing config`

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
    }
  }
})
```

### cucumber.js

```js
module.exports = {
  default: {
    require: ['tests/bdd/steps/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress'],
    paths: ['tests/bdd/features/**/*.feature'],
  }
}
```

### Scripts in package.json

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run tests/integration",
    "test:bdd": "cucumber-js",
    "test:e2e": "cypress run",
    "test:all": "npm test && npm run test:bdd"
  }
}
```

---

## Phase 4 — Validation Gate

> **Emit:** `▶ [4/7] Validation gate`

Verifies that the generated project compiles, tests, and starts before committing. **CLI projects** skip the Docker check.

```bash
# Tests pass
rtk npm test

# Build compiles
rtk npm run build

# Docker Compose valid (skip for CLI)
rtk docker compose config --quiet
```

If any check fails → **diagnose and fix before proceeding**. Do not advance to Git with a broken project.

---

## Phase 5 — Git + GitHub

> **Emit:** `▶ [5/7] Git + GitHub`

```bash
# Init
rtk git init
rtk git branch -M main

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.next/
EOF

# GitHub repo (name = project directory name)
rtk gh repo create $(basename $(pwd)) --private --source=. --remote=origin

# Initial commit — never include .env, only .env.example
rtk git add .gitignore package.json docker-compose.yml .env.example tsconfig.json vitest.config.ts cucumber.js
rtk git commit -m "chore(scaffold): initialize project structure"
rtk git push -u origin main
```

---

## Phase 6 — MCP + QA Tools

> **Emit:** `▶ [6/7] MCP + QA tools`

Install tools needed for visual QA and browser testing (used by `/qa-loop`, `/browser-qa`, and `/build`).

### agent-browser CLI (required for projects with UI)

```bash
# Check if already installed
which agent-browser && agent-browser --version
```

If not found:

```bash
npm install -g agent-browser && agent-browser install
```

Verify installation: `agent-browser --version` — should return version number.

If it fails → emit warning (does not block scaffold, but will be needed before the first visual QA):
```
⚠️ agent-browser CLI did not install automatically.
Install manually before running /build: npm install -g agent-browser && agent-browser install
```

### Cypress (already installed via dependencies)

Verify that Cypress is functional:
```bash
rtk npx cypress verify
```

If it fails → `rtk npx cypress install` and verify again.

---

## Phase 7 — architecture.json + handoff

> **Emit:** `▶ [7/7] Architecture config`

Creates `.claude/architecture.json` based on the type:

**Fullstack (Next.js App Router):**
```json
{
  "pattern": "nextjs-app-router"
}
```

**API hexagonal:**
```json
{
  "pattern": "hexagonal",
  "layers": {
    "domain":         { "pattern": "src/domain/**",         "allowedImportPrefixes": ["src/domain/", "src/shared/"] },
    "application":    { "pattern": "src/application/**",    "allowedImportPrefixes": ["src/domain/", "src/ports/", "src/shared/"] },
    "ports":          { "pattern": "src/ports/**",          "allowedImportPrefixes": ["src/domain/"] },
    "infrastructure": { "pattern": "src/infrastructure/**", "allowedImportPrefixes": ["src/domain/", "src/application/", "src/ports/", "src/shared/"] },
    "shared":         { "pattern": "src/shared/**",         "allowedImportPrefixes": [] }
  },
  "testMapping": {
    "src/domain/**":          "tests/unit/domain/**",
    "src/application/**":    "tests/unit/application/**",
    "src/infrastructure/**": "tests/integration/**"
  }
}
```

### Final output

```
SCAFFOLD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type:          [web | api | fullstack | cli]
Stack:         [configured technologies]
Docker:        docker-compose.yml ✅
Testing:       [configured frameworks] ✅
agent-browser: CLI ✅ (or ⚠️ install manually)
Cypress:       verified ✅
Git:           main branch initialized ✅
GitHub:        github.com/[user]/[repo] ✅
Architecture:  .claude/architecture.json ✅ (pattern: [pattern])

Next: /build [feature] to start implementation.
```

---

## Rules

1. **Mobile → always delegate** to `/mobile scaffold` — never reimplement
2. **Docker always** — every project has `docker-compose.yml` before any code
3. **GitHub always** — repository created before the first commit
4. **architecture.json always** — created in Phase 7 so that hooks and skills work
5. **Credentials in .env** — `.env.example` uses empty fields with no real values; `.env` is never committed
6. **No business dependencies** — only base infra (framework, testing, build tools)
7. **Never overwrite** — if `package.json` already exists, notify the user and abort
