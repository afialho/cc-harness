---
name: adapt
description: Auto-configure the ai-dev-starter-kit for an existing project. Detects stack, architecture pattern, and test framework. Updates architecture.json, CLAUDE.md, and hooks to match the real project structure. Run once after adopt.sh.
disable-model-invocation: true
---

# /adapt — Configurar o Kit para o Projeto Existente

Executar após `adopt.sh` ter instalado o kit em um projeto existente.
Detecta a stack real e adapta automaticamente todas as configurações.

---

## Quando usar /adapt vs. outras skills

| Quero... | Skill certa |
|----------|------------|
| **Instalar o kit** em um projeto que já existe e configurá-lo para a stack do projeto | `/adapt` (esta skill) |
| **Melhorar a qualidade do código** — limpar, extrair, reorganizar camadas | `/refactor` |
| **Mudar a interface** do app — novo visual, nova UX, novos componentes | `/redesign` |
| **Mudar a arquitetura** — hexagonal, modular, microsserviços | `/modernize` |
| **Construir algo novo** — feature, produto, protótipo | `/build` |

**Regra prática:**
- Rodou `adopt.sh` agora? → `/adapt` primeiro, depois `/build` para features
- O kit já está instalado e você quer melhorar código? → `/refactor`
- O kit já está instalado e você quer mudar arquitetura? → `/modernize`

---

---

## Phase 1 — Exploração

> **Emit:** `▶ [1/6] Explorando o projeto`

### Detectar linguagem e runtime

Verificar existência dos seguintes arquivos (use Glob e Read):

- `package.json` → Node.js / TypeScript / JavaScript
- `pyproject.toml` ou `requirements.txt` → Python
- `go.mod` → Go
- `Gemfile` → Ruby
- `pom.xml` ou `build.gradle` → Java / Kotlin
- `Cargo.toml` → Rust

### Detectar framework

**Node.js — ler `package.json` (campo `dependencies`):**

| Dependência | Framework |
|---|---|
| `next` | Next.js |
| `react` (sem `next`) | React (SPA) |
| `vue` | Vue |
| `express` | Express |
| `fastify` | Fastify |
| `@nestjs/core` | NestJS |
| `@hapi/hapi` | Hapi |

**Python — ler `requirements.txt` ou `pyproject.toml`:**

| Pacote | Framework |
|---|---|
| `django` | Django |
| `fastapi` | FastAPI |
| `flask` | Flask |

**Ruby — ler `Gemfile`:**

| Gem | Framework |
|---|---|
| `rails` | Rails |
| `sinatra` | Sinatra |

### Detectar test framework

**Node.js — ler `package.json` (campo `devDependencies`):**

| Dependência | Framework |
|---|---|
| `jest` | Jest |
| `vitest` | Vitest |
| `@playwright/test` | Playwright |
| `cypress` | Cypress |

**Python:** `pytest` em requirements → pytest

**Ruby:** `rspec` em Gemfile → RSpec

**Go:** presença de arquivos `*_test.go` ou `testing` em `go.mod` → Go testing

### Detectar padrão arquitetural

Executar via Bash:

```bash
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -maxdepth 4
```

Mapear resultado para padrão:

| Diretórios presentes | Padrão |
|---|---|
| `src/domain/` **e** `src/application/` | **hexagonal** |
| `app/models/`, `app/controllers/`, `app/views/` | **MVC (Rails/Django)** |
| `src/routes/`, `src/controllers/`, `src/services/`, `src/models/` | **MVC (Express/NestJS)** |
| `apps/` com subdiretórios de feature (ex: `users/`, `products/`) | **Django apps / feature-based** |
| `src/features/` ou `src/modules/` | **feature-based** |
| `app/` com `layout.tsx` ou `page.tsx` dentro | **Next.js App Router** |
| `pages/` na raiz | **Next.js Pages Router** |
| Nenhum padrão claro acima | **flat/desconhecido** |

Verificar também se já existe `.claude/architecture.json` com conteúdo personalizado. Se sim, registrar como "personalizações existentes detectadas" e avisar na Phase 2.

---

## Phase 2 — Diagnóstico

> **Emit:** `▶ [2/6] Diagnosticando compatibilidade`

Determinar compatibilidade de cada hook com a stack detectada:

**architecture-guard:**
- hexagonal → `✅ compatível` (verificar se paths batem com a estrutura real)
- qualquer outro padrão → `⚠ precisa reconfigurar` ou `❌ não aplicável`

**tdd-guard:**
- Jest → `✅ compatível`
- Vitest, pytest, RSpec, Go testing → `⚠ extensões de arquivo a atualizar`
- nenhum framework detectado → `❌ não aplicável`

**Comando de teste:**

| Framework | Comando |
|---|---|
| Jest | `npm test` ou `npm run test` |
| Vitest | `npm run test` |
| pytest | `python -m pytest` |
| RSpec | `bundle exec rspec` |
| Go testing | `go test ./...` |

Apresentar diagnóstico completo antes de qualquer alteração:

```
DIAGNÓSTICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stack detectada:     [linguagem + framework]
Padrão arquitetural: [hexagonal | MVC | feature-based | flat | Next.js App Router]
Test framework:      [nome]
Test command:        [comando]

Compatibilidade:
  architecture-guard: [✅ compatível | ⚠ precisa reconfigurar | ❌ não aplicável]
  tdd-guard:          [✅ compatível | ⚠ extensões a atualizar | ❌ não aplicável]

O que será alterado:
  - .claude/architecture.json → [descrição da mudança]
  - CLAUDE.md (ou CLAUDE.kit.md) → [descrição da mudança]
  - .claude/hooks/session-start.mjs → comandos de teste atualizados
  [outros itens detectados]

⚠ Personalizações existentes detectadas: [sim/não — se sim, listar arquivos]

Prosseguir? (sim/ajustar)
```

**Aguardar confirmação explícita do usuário antes de prosseguir para Phase 3.**

Se o usuário responder "ajustar", perguntar o que deve ser corrigido no diagnóstico e repetir o diagnóstico revisado antes de prosseguir.

---

## Phase 3 — Atualizar architecture.json

> **Emit:** `▶ [3/6] Configurando arquitetura`

Gerar e escrever `.claude/architecture.json` baseado no padrão detectado.

### hexagonal (padrão já correto)

Verificar se os paths em `allowedImportPrefixes` batem com a estrutura real.
Corrigir apenas o que não corresponder. Não sobrescrever o que já estiver correto.

```json
{
  "pattern": "hexagonal",
  "layers": {
    "domain": {
      "pattern": "src/domain/**",
      "allowedImportPrefixes": ["src/domain/", "src/shared/"],
      "description": "Pure business logic — zero external deps"
    },
    "application": {
      "pattern": "src/application/**",
      "allowedImportPrefixes": ["src/domain/", "src/ports/", "src/shared/"],
      "description": "Use cases — depends on domain and port interfaces only"
    },
    "ports": {
      "pattern": "src/ports/**",
      "allowedImportPrefixes": ["src/domain/"],
      "description": "Interface contracts (inbound + outbound)"
    },
    "infrastructure": {
      "pattern": "src/infrastructure/**",
      "allowedImportPrefixes": ["src/domain/", "src/application/", "src/ports/", "src/shared/"],
      "description": "Adapters implementing ports"
    },
    "shared": {
      "pattern": "src/shared/**",
      "allowedImportPrefixes": [],
      "description": "Cross-cutting concerns — no business logic"
    }
  }
}
```

### MVC (Rails / Django)

```json
{
  "pattern": "mvc-rails",
  "layers": {
    "models": {
      "path": "app/models/",
      "description": "Domain entities and data models"
    },
    "controllers": {
      "path": "app/controllers/",
      "description": "Request handlers"
    },
    "services": {
      "path": "app/services/",
      "description": "Business logic and use cases"
    },
    "views": {
      "path": "app/views/",
      "description": "Presentation layer"
    }
  },
  "note": "MVC pattern — architecture-guard layer enforcement disabled (not hexagonal)"
}
```

### MVC (Express / NestJS)

```json
{
  "pattern": "mvc-express",
  "layers": {
    "routes": {
      "path": "src/routes/",
      "description": "Route definitions and request entry points"
    },
    "controllers": {
      "path": "src/controllers/",
      "description": "Request handlers"
    },
    "services": {
      "path": "src/services/",
      "description": "Business logic and use cases"
    },
    "models": {
      "path": "src/models/",
      "description": "Data models and entities"
    }
  },
  "note": "MVC pattern — architecture-guard layer enforcement disabled (not hexagonal)"
}
```

### Next.js App Router

```json
{
  "pattern": "nextjs-app-router",
  "layers": {
    "app": {
      "path": "app/",
      "description": "Next.js App Router — pages, layouts, route segments"
    },
    "components": {
      "path": "components/",
      "description": "React components (server and client)"
    },
    "lib": {
      "path": "lib/",
      "description": "Business logic, utilities, and server-side helpers"
    },
    "api": {
      "path": "app/api/",
      "description": "API Route Handlers"
    }
  },
  "note": "Next.js App Router — architecture-guard adapted for Next.js structure"
}
```

### feature-based

```json
{
  "pattern": "feature-based",
  "layers": {
    "features": {
      "path": "src/features/",
      "description": "Feature modules — each feature is self-contained"
    },
    "shared": {
      "path": "src/shared/",
      "description": "Shared utilities, components, and cross-cutting concerns"
    }
  },
  "note": "Feature-based architecture — architecture-guard layer enforcement disabled"
}
```

### flat / desconhecido

```json
{
  "pattern": "flat",
  "layers": {},
  "disabled": true,
  "note": "Architecture pattern not detected — architecture-guard disabled. Update manually if needed."
}
```

> **Checkpoint:** Se contexto atingir ~60k tokens → escreve `.claude/checkpoint.md` com skill: adapt, fase: 3, padrão detectado, arquivos a alterar, próximo passo. Emite: `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

## Phase 4 — Atualizar CLAUDE.md e hooks

> **Emit:** `▶ [4/6] Atualizando configurações`

### CLAUDE.md / CLAUDE.kit.md

Determinar qual arquivo usar:
- Se existir `CLAUDE.kit.md` na raiz → editar `CLAUDE.kit.md`
- Caso contrário → editar `CLAUDE.md`

Localizar a seção `## Core Development Principles` e dentro dela a subseção `### 1. Hexagonal Architecture`.
Substituir essa subseção pelo bloco correspondente ao padrão detectado:

**hexagonal** — manter o conteúdo original, apenas corrigir os paths se necessário.

**MVC (Rails/Django):**
```markdown
### 1. Arquitetura — MVC (Rails/Django)
Padrão MVC detectado. Business logic em `app/services/`, modelos em `app/models/`.

```
app/
  models/       Entidades e lógica de dados
  controllers/  Handlers de request
  services/     Lógica de negócio (use cases)
  views/        Camada de apresentação
```

Test command: `bundle exec rspec`
```

**MVC (Express/NestJS):**
```markdown
### 1. Arquitetura — MVC (Express/NestJS)
Padrão MVC detectado. Rotas em `src/routes/`, lógica em `src/services/`.

```
src/
  routes/      Entry points e definição de rotas
  controllers/ Handlers de request
  services/    Lógica de negócio (use cases)
  models/      Modelos e entidades de dados
```

Test command: `npm test`
```

**Next.js App Router:**
```markdown
### 1. Arquitetura — Next.js App Router
Next.js App Router detectado. Server Components por padrão, Client Components com `'use client'`.

```
app/           Pages, layouts, route segments (App Router)
app/api/       API Route Handlers
components/    Componentes React (server e client)
lib/           Lógica de negócio e helpers server-side
```

Test command: `npm test`
```

**feature-based:**
```markdown
### 1. Arquitetura — Feature-Based
Arquitetura baseada em features. Cada feature é autocontida em `src/features/`.

```
src/
  features/    Módulos de feature (cada feature é autocontida)
  shared/      Utilitários, componentes e concerns compartilhados
```

Test command: `npm test`
```

**flat/desconhecido:**
```markdown
### 1. Arquitetura — Não detectada
Padrão arquitetural não identificado automaticamente.
Atualize `.claude/architecture.json` manualmente com os layers do projeto.

Test command: [atualizar manualmente]
```

Atualizar também a seção de testes para refletir o test command correto da stack detectada.

### session-start.mjs

Localizar o arquivo `.claude/hooks/session-start.mjs`.
Encontrar o bloco que define os comandos de teste (procurar por referências a `npm test`, `jest`, `vitest`, etc.).
Substituir pelo comando correto detectado na Phase 1.

Se o arquivo não existir, pular esta etapa e registrar no relatório final.

### architecture-guard hook

Localizar o arquivo `.claude/hooks/architecture-guard.*` (qualquer extensão).
Se `architecture.json` tiver `"disabled": true`:
- Adicionar no início do hook, após qualquer shebang ou imports, a seguinte verificação:

  **Para shell scripts:**
  ```sh
  # Check if architecture guard is disabled
  DISABLED=$(node -e "const c=require('./.claude/architecture.json'); console.log(c.disabled||false)" 2>/dev/null)
  if [ "$DISABLED" = "true" ]; then exit 0; fi
  ```

  **Para arquivos .mjs / .js:**
  ```js
  import { readFileSync } from 'fs';
  const arch = JSON.parse(readFileSync('.claude/architecture.json', 'utf-8'));
  if (arch.disabled) process.exit(0);
  ```

Se o hook não existir, pular esta etapa e registrar no relatório final.

---

## Phase 5 — Validação

> **Emit:** `▶ [5/6] Validando configuração`

Verificar que as alterações feitas estão funcionais:

### 5.1 — Validar architecture.json

```bash
node -e "const c = JSON.parse(require('fs').readFileSync('.claude/architecture.json','utf8')); console.log('pattern:', c.pattern); console.log('layers:', Object.keys(c.layers || {}).join(', ')); console.log('valid: true')"
```

Se falhar (JSON inválido, erro de parse) → corrigir antes de continuar.

### 5.2 — Validar hooks

Verificar que os hooks essenciais existem e são executáveis:

```bash
# Verificar que os hooks existem
ls -la .claude/hooks/session-start.mjs .claude/hooks/architecture-guard.mjs .claude/hooks/tdd-guard.mjs 2>/dev/null
```

Se `architecture.json` tem `"disabled": true` → verificar que architecture-guard respeita o flag:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts","content":"import x from \"prisma\""}}' | node .claude/hooks/architecture-guard.mjs
# Deve retornar ALLOW (não bloquear) quando disabled
```

### 5.3 — Testar detecção de stack

```bash
# Executar session-start e verificar que detecta a stack correta
echo '{}' | node .claude/hooks/session-start.mjs 2>/dev/null | node -e "process.stdin.on('data',d=>{const o=JSON.parse(d);console.log(o.additionalContext?.substring(0,500))})"
```

Verificar que o output menciona a stack e framework corretos (detectados na Phase 1).

Se qualquer validação falhar → corrigir o arquivo afetado e re-validar antes de avançar para o relatório.

---

## Phase 6 — Relatório final

> **Emit:** `▶ [6/6] Adaptação concluída`

Apresentar relatório completo:

```
ADAPT COMPLETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stack:    [linguagem + framework]
Padrão:   [padrão arquitetural detectado]

Alterações feitas:
  ✅ .claude/architecture.json — [descrição do que foi alterado]
  ✅ CLAUDE.md (ou CLAUDE.kit.md) — seção arquitetura atualizada para [padrão]
  ✅ .claude/hooks/session-start.mjs — test command: [comando]
  [listar outros arquivos alterados]

Itens pulados (arquivo não encontrado):
  [listar itens que foram pulados e o motivo]

Skills disponíveis para este projeto:
  /build       → entry point: research → planning (PLAN.md) → implement
  /research    → pesquisa antes de qualquer feature
  /feature-dev → implementação TDD + arquitetura detectada
  /dba         → schema design, índices, multi-tenancy (antes de implementar entidades novas)
  /adapt       → rode novamente se a stack mudar

⚠ Verifique manualmente:
  [lista de itens que precisam atenção humana]
  Exemplos:
  - architecture-guard desativado (padrão não-hexagonal detectado)
  - tdd-guard: extensões de arquivo não atualizadas automaticamente para [framework]
  - session-start.mjs não encontrado — atualize o test command manualmente

Pronto. Use /build <sua ideia> para começar.
```

---

## Notas de comportamento

- **Nunca sobrescrever sem confirmar** — a Phase 2 sempre apresenta o diagnóstico completo e aguarda confirmação explícita antes de alterar qualquer arquivo.
- **Ser conservador em caso de dúvida** — se o padrão arquitetural não puder ser determinado com clareza, reportar como "flat/desconhecido" e desabilitar guards em vez de configurar incorretamente.
- **Preservar personalizações existentes** — se `.claude/architecture.json` ou `CLAUDE.md` já tiverem sido editados pelo usuário, detectar, avisar no diagnóstico e não sobrescrever sem confirmação explícita.
- **Pular etapas faltantes graciosamente** — se um arquivo esperado (ex: `session-start.mjs`, `architecture-guard`) não existir, registrar no relatório final em vez de falhar.
- **Não criar arquivos além dos listados** — esta skill atualiza arquivos existentes do kit. Não criar novos arquivos de configuração.
