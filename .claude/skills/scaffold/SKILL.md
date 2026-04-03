---
name: scaffold
description: Initialize a new project from scratch. Creates project structure, Docker Compose, testing framework, Git repo, and pushes to GitHub. Called automatically by /build when no project exists yet. For mobile projects, delegates to /mobile scaffold.
disable-model-invocation: true
argument-hint: [type: web | api | fullstack | cli]
---

# /scaffold — New Project Initialization

> Cria a estrutura base de um projeto antes do /build começar a implementar.
> Para mobile → delega para `/mobile scaffold`.

---

## Quando é invocado

- **Via `/build`**: automaticamente quando não existe `src/`, `app/`, `lib/` ou `package.json`
- **Diretamente**: `/scaffold web`, `/scaffold api`, `/scaffold fullstack`, `/scaffold cli`

---

## Detecção de tipo

Se invocado sem argumento, detecta o tipo pelo IDEAS.md (se existir):

| Campo "Tipo" em IDEAS.md | Tipo inferido |
|-------------------------|---------------|
| Web app (frontend + backend) | `fullstack` |
| API / backend only | `api` |
| Mobile first | `mobile` → delega para `/mobile scaffold` |
| CLI tool | `cli` |
| Integração / automação | `api` |

Se IDEAS.md não existir → pergunta ao usuário antes de continuar.

---

## Fase 1 — Estrutura de diretórios + dependências base

> **Emit:** `▶ [1/6] Project structure`

### Fullstack (Next.js App Router)

```bash
rtk npx create-next-app@latest . --typescript --eslint --tailwind --src-dir --app --import-alias "@/*" --no-git
rtk npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
rtk npm install -D @cucumber/cucumber cypress
```

Estrutura final:
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

### API only (Node.js + Fastify, arquitetura hexagonal)

```bash
rtk npm init -y
rtk npm install fastify @fastify/cors @fastify/jwt @fastify/cookie zod
rtk npm install -D typescript tsx vitest @types/node
rtk npm install -D @cucumber/cucumber cypress
```

Estrutura hexagonal:
```
src/
  domain/        Entidades e lógica pura — zero deps externos
  application/   Use cases
  ports/         Interfaces (contratos de adapters)
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

## Fase 2 — Docker Compose

> **Emit:** `▶ [2/6] Docker Compose`

Cria `docker-compose.yml` baseado no tipo. Todos os serviços usam `env_file: [".env"]` — nenhuma credencial inline.

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

Cria `.env.example` com variáveis componente por componente — sem valores reais, sem connection strings combinadas:
```
# App
NODE_ENV=development
PORT=3000

# JWT — gerar com: openssl rand -hex 32
JWT_SECRET=

# Database — componentes separados (app constrói a URL em runtime)
POSTGRES_DB=appdb
POSTGRES_USER=
POSTGRES_PASSWORD=

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

O app constrói a connection string a partir dos componentes individualmente em `src/shared/config/database.ts`. Nunca concatenar credenciais fora de uma função de config isolada.

Cria `Dockerfile` (dev-ready):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**CLI:** sem Docker Compose — ferramentas CLI rodam no host.

---

## Fase 3 — TypeScript + Testing config

> **Emit:** `▶ [3/6] TypeScript + Testing config`

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

### Scripts em package.json

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

## Fase 4 — Validation Gate

> **Emit:** `▶ [4/6] Validation gate`

Verifica que o projeto gerado compila, testa e sobe antes de commitar. **CLI projects** pulam o Docker check.

```bash
# Tests pass
rtk npm test

# Build compiles
rtk npm run build

# Docker Compose válido (skip para CLI)
rtk docker compose config --quiet
```

Se qualquer check falhar → **diagnosticar e corrigir antes de prosseguir**. Não avançar para Git com projeto quebrado.

---

## Fase 5 — Git + GitHub

> **Emit:** `▶ [5/6] Git + GitHub`

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

# GitHub repo (nome = nome do diretório do projeto)
rtk gh repo create $(basename $(pwd)) --private --source=. --remote=origin

# Commit inicial — nunca incluir .env, apenas .env.example
rtk git add .gitignore package.json docker-compose.yml .env.example tsconfig.json vitest.config.ts cucumber.js
rtk git commit -m "chore(scaffold): initialize project structure"
rtk git push -u origin main
```

---

## Fase 6 — architecture.json + handoff

> **Emit:** `▶ [6/6] Architecture config`

Cria `.claude/architecture.json` baseado no tipo:

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

### Output final

```
SCAFFOLD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo:        [web | api | fullstack | cli]
Stack:       [tecnologias configuradas]
Docker:      docker-compose.yml ✅
Testing:     [frameworks configurados] ✅
Git:         main branch inicializado ✅
GitHub:      github.com/[user]/[repo] ✅
Arquitetura: .claude/architecture.json ✅ (pattern: [pattern])

Próximo: /build [feature] para iniciar a implementação.
```

---

## Regras

1. **Mobile → sempre delegar** para `/mobile scaffold` — nunca reimplementar
2. **Docker sempre** — todo projeto tem `docker-compose.yml` antes de qualquer código
3. **GitHub sempre** — repositório criado antes do primeiro commit
4. **architecture.json sempre** — criado na Fase 6 para que hooks e skills funcionem
5. **Credenciais em .env** — `.env.example` usa campos vazios sem valores reais; `.env` nunca é commitado
6. **Sem dependências de negócio** — apenas infra base (framework, testing, build tools)
7. **Nunca sobrescrever** — se `package.json` já existe, sinaliza ao usuário e aborta
