# Como Usar o Starter Kit — Do Zero a uma Aplicação Funcionando

## A ideia central

Este starter kit não é para uma feature isolada. É para construir **software completo** de forma sistemática:

```
Nova ideia de aplicação
       ↓
Setup do projeto (starter kit)
       ↓
Definir milestones e features
       ↓
Para cada feature:
  /plan → /feature-dev → /frontend-design
       ↓
Aplicação funcionando, testada, revisada
```

---

## Exemplo completo: construindo um Task Manager do zero

Vamos construir um aplicativo de gerenciamento de tarefas com:
- Backend: API REST
- Frontend: interface web
- Autenticação de usuários
- CRUD de projetos e tarefas

### Passo 1 — Setup do projeto

```bash
# 1. Copie o starter kit para o novo projeto
cp -r ai-dev-starter-kit/ meu-task-manager/
cd meu-task-manager/

# 2. Verifique dependências
./scripts/setup.sh

# 3. Edite CLAUDE.md: troque [Project Name] por "Task Manager"

# 4. Ajuste os paths em .claude/architecture.json se necessário

# 5. Inicie o Claude Code
claude
```

Ao abrir, o hook `session-start` injeta automaticamente:
- Regras ativas do projeto
- Skills disponíveis
- Stack detectada

---

### Passo 2 — Defina a aplicação antes de codar

Antes de qualquer `/feature-dev`, defina o escopo da aplicação inteira.
Use o Claude Code diretamente (sem skill):

```
Vou construir um Task Manager. Funcionalidades:
- Usuário se cadastra e faz login
- Usuário cria projetos
- Dentro de projetos, cria tarefas com título, descrição, prazo e status
- Tarefas têm status: todo, in_progress, done
- Usuário vê dashboard com tarefas do dia

Me ajude a quebrar isso em features ordenadas por dependência.
```

O Claude vai propor algo como:

```
Feature 1: user-auth         (cadastro + login) ← sem dependências
Feature 2: projects          (CRUD de projetos) ← depende de auth
Feature 3: tasks             (CRUD de tarefas)  ← depende de projects
Feature 4: dashboard-ui      (frontend)         ← depende de tasks
Feature 5: task-notifications (emails)          ← depende de tasks
```

---

### Passo 3 — Feature 1: Autenticação (`/plan` → `/feature-dev`)

#### 3.1 — Planejar

```
/plan autenticação de usuário com cadastro por email e senha e login com JWT
```

O `/plan` vai produzir (fases 1–4 do workflow):
- Mapeamento hexagonal (User entity, Email VO, Password VO, RegisterUseCase, LoginUseCase, UserRepository port)
- Cenários BDD (cadastro válido, email duplicado, senha fraca, login correto, senha errada)
- Plano de testes (unit domain, unit use cases, integration adapter, BDD, Cypress, k6)
- Decomposição em waves de agentes se a feature for complexa

Você revisa, aprova, e só então implementa.

#### 3.2 — Implementar

```
/feature-dev user-auth
```

O que acontece automaticamente (fases 5–7):

```
Cria worktree:
  rtk git worktree add ../task-manager-user-auth -b feature/user-auth

Agents Wave 1 — Exploração:
  code-explorer → entende estrutura atual, padrões existentes

Agents Wave 2 — BDD + Design:
  bdd-writer   → cria tests/bdd/features/user-auth.feature (PRIMEIRO)
  code-architect → valida design das camadas

Agents Wave 3 — Domínio (TDD):
  test-writer  → tests/unit/domain/Email.test.ts    (RED)
  implementer  → src/domain/user/Email.ts            (GREEN → REFACTOR)
  ...repete para Password, User

Agents Wave 4 — Use Cases + Infra (TDD):
  test-writer  → tests/unit/application/RegisterUserUseCase.test.ts
  implementer  → src/application/user/RegisterUserUseCase.ts
  implementer  → src/infrastructure/persistence/PostgresUserRepository.ts
  test-integ   → tests/integration/PostgresUserRepository.test.ts

Wave 5 — Cucumber steps + Qualidade:
  bdd-steps    → tests/bdd/steps/user-auth.steps.ts
  code-reviewer → revisa tudo (arquitetura, SOLID, testes, segurança)
  
[loop: testes → fix → review → fix até tudo verde]

Gateways verificados:
  ✅ 15 unit tests
  ✅ 3 integration tests
  ✅ 4 BDD scenarios (Cucumber)
  ✅ Code review: PASS
  ✅ k6: p95=94ms @ 50 RPS

Commit: feat(auth): implement user registration and login with JWT
Worktree removida.
```

---

### Passo 4 — Feature 2: Projetos (paralelo à Feature 3)

Após autenticação mergeada na main, features 2 e 3 podem ser desenvolvidas **em paralelo** com worktrees separadas:

```bash
# Terminal 1 — Feature projects
/plan CRUD de projetos com nome, descrição e membros
/feature-dev projects

# Terminal 2 — Feature tasks (começa a partir do design, impl espera projects)
/plan CRUD de tarefas com título, descrição, prazo e status
```

As worktrees garantem isolamento total:
```
meu-task-manager/            ← main (auth já mergeada)
task-manager-projects/       ← feature/projects em andamento
task-manager-tasks/          ← feature/tasks em andamento
```

---

### Passo 5 — Feature 4: Interface (`/frontend-design`)

Com o backend pronto (features 1–3 mergeadas), o frontend:

```
/frontend-design dashboard de tarefas com lista por projeto e filtros por status e prazo
```

O `/frontend-design` vai:
1. Definir o design contract (componentes, estados, responsivo, a11y)
2. Criar hierarquia de componentes (Container → Layout → TaskList → TaskCard)
3. Escrever testes de componente (TDD para UI)
4. Implementar com todos os estados: loading, empty, error, populated
5. Adicionar testes Cypress para os fluxos principais

```
/feature-dev dashboard-ui
```

Mesmo fluxo: worktree → BDD → TDD → agents → review → gates.

---

### Passo 6 — Visão do projeto acumulando qualidade

À medida que features são implementadas, a suite de testes cresce:

```
Após Feature 1 (auth):
  Unit: 15 testes | Integration: 3 | BDD: 4 scenarios | E2E: 2 | Load: 1 script

Após Feature 2 (projects):
  Unit: 28 testes | Integration: 6 | BDD: 9 scenarios | E2E: 5 | Load: 2 scripts

Após Feature 3 (tasks):
  Unit: 47 testes | Integration: 10 | BDD: 16 scenarios | E2E: 8 | Load: 3 scripts

Após Feature 4 (dashboard):
  Unit: 63 testes | Integration: 10 | BDD: 16 scenarios | E2E: 14 | Load: 3 scripts
```

Cada nova feature não quebra as anteriores — os testes garantem regressão zero.

---

## Modo Turbo: múltiplos times de agentes em paralelo (`/agent-teams`)

Para projetos maiores ou quando você quer velocidade máxima, use `/agent-teams`.
Em vez de features sequenciais, vários times trabalham **ao mesmo tempo**.

### Quando usar `/agent-teams` vs `/feature-dev`

| Situação | Use |
|----------|-----|
| 1 feature de qualquer tamanho | `/feature-dev` |
| 3+ features independentes simultâneas | `/agent-teams` |
| Feature tão grande que não cabe num time | `/agent-teams` (divide sozinho) |
| Sprint completo em paralelo | `/agent-teams` |

---

### Exemplo: Task Manager com 3 times em paralelo

Após o setup e a descoberta (Passos 1–2), em vez de implementar feature por feature, você invoca:

```
/agent-teams construir user-auth + projects + tasks em paralelo para o Task Manager
```

#### O que o orquestrador faz antes de lançar qualquer time

Ele **estima o budget de tokens** de cada workstream:

```
Workstream A — user-auth
  Arquivos a ler:    ~15 arquivos × 1.500 tokens = 22.500
  Raciocínio:        20.000 (fixo)
  Código a gerar:    ~220 linhas × 20 tokens  = 4.400
  Handoff:           5.000 (fixo)
  ────────────────────────────────────────────────────
  Total estimado:    ~52k tokens ✅ (< 85k — pode despachar)

Workstream B — projects
  Total estimado:    ~48k tokens ✅

Workstream C — tasks
  Total estimado:    ~55k tokens ✅

Todos cabem → lança os 3 times em paralelo.
```

Se algum ultrapassasse 85k, o orquestrador dividiria em 2 workstreams menores antes de despachar.

#### Os 3 times rodam simultaneamente

```
ORQUESTRADOR
│
├── Time Alpha — user-auth              ← worktree: task-manager-auth
│   │   Budget: ~52k tokens
│   ├── Wave 1: Agente 1 (code-explorer)
│   │     → entende padrões existentes, mapeia src/
│   │     → handoff: convenções identificadas
│   │
│   ├── Wave 2: Agente 2 (test-writer) + Agente 3 (bdd-writer)  ← paralelo
│   │     → testes unitários domain: Email.test.ts, Password.test.ts, User.test.ts
│   │     → BDD: tests/bdd/features/user-auth.feature
│   │
│   ├── Wave 3: Agente 4 (implementer)
│   │     → domínio: Email.ts, Password.ts, User.ts, RegisterUseCase.ts
│   │     → infra: PostgresUserRepository.ts + integration test
│   │
│   └── Wave 4: Agente 5 (code-reviewer)
│         → revisa arquitetura, SOLID, cobertura
│         → REVIEW: PASS
│
├── Time Beta — projects                ← worktree: task-manager-projects
│   │   Budget: ~48k tokens
│   ├── Wave 1: Agente 1 (code-explorer)
│   ├── Wave 2: Agente 2 (test-writer) + Agente 3 (bdd-writer)
│   ├── Wave 3: Agente 4 (implementer)
│   └── Wave 4: Agente 5 (code-reviewer)
│
└── Time Gamma — tasks                  ← worktree: task-manager-tasks
    │   Budget: ~55k tokens
    ├── Wave 1: Agente 1 (code-explorer)
    ├── Wave 2: Agente 2 (test-writer) + Agente 3 (bdd-writer)
    ├── Wave 3: Agente 4 (implementer)
    └── Wave 4: Agente 5 (code-reviewer)
```

Os 3 times rodam ao mesmo tempo. Cada wave interna é sequencial dentro do time, mas os times são independentes entre si.

#### O que cada agente recebe (contexto controlado)

```
Agente 4 (implementer) do Time Alpha recebe exatamente:
  - Task brief: "Implementar User entity, Email VO, Password VO em src/domain/user/"
  - Handoff Wave 1: convenções do projeto (2k tokens)
  - Handoff Wave 2: lista de testes falhos para fazer passar (3k tokens)
  - Rules.md subset: RULE-ARCH-001, RULE-TEST-001 (2k tokens)
  - Arquivos para ler: [lista exata de 12 arquivos] (18k tokens)
  ─────────────────────────────────────────────────────────────────
  Total de entrada: ~25k tokens
  Sobra ~70k para raciocínio + código gerado
  Handoff de saída: ~5k tokens
  ─────────────────────────────────────────────────────────────────
  Total consumido: ~100k ✅
```

#### Resultado ao final dos 3 times

```
ORQUESTRADOR recebe:
  Time Alpha — COMPLETO
    Criados: 12 arquivos (domain + application + infra + tests + BDD)
    Testes:  15 unit, 3 integration, 4 BDD scenarios
    Review:  PASS

  Time Beta — COMPLETO
    Criados: 10 arquivos
    Testes:  11 unit, 2 integration, 3 BDD scenarios
    Review:  PASS

  Time Gamma — COMPLETO
    Criados: 14 arquivos
    Testes:  18 unit, 4 integration, 6 BDD scenarios
    Review:  PASS

Orquestrador faz merge das 3 branches:
  rtk git merge feature/user-auth
  rtk git merge feature/projects
  rtk git merge feature/tasks

Roda suite completa: 44 unit + 9 integration + 13 BDD ✅
```

3 features implementadas, testadas e revisadas — todas em paralelo.

---

### Comparando velocidade: sequencial vs paralelo

```
Sequencial (/feature-dev × 3):         Paralelo (/agent-teams):
  Feature 1: auth      → 45 min          Todos os 3 times juntos → ~50 min
  Feature 2: projects  → 35 min          (o mais lento determina o tempo)
  Feature 3: tasks     → 40 min
  ──────────────────────────────
  Total: ~120 min                         Total: ~50 min
```

O paralelo não é 3× mais rápido porque o tempo total é o do time mais lento.
Mas é significativamente mais rápido que o sequencial para projetos grandes.

---

### Casos onde o orquestrador divide um workstream

Se uma feature for grande demais:

```
/agent-teams implementar sistema de pagamentos completo

Orquestrador estima:
  Workstream "payments" original:
    Arquivos a ler: ~40 × 1.5k = 60k
    Código a gerar: ~600 linhas × 20 = 12k
    Raciocínio: 20k
    Total: ~92k tokens ❌ (> 85k — muito grande)

  Divide em 2:
    Workstream A — payments-domain:    ~44k tokens ✅
    Workstream B — payments-infra:     ~48k tokens ✅

  Lança A e B em paralelo (se independentes)
  ou A primeiro, B na wave seguinte (se B depende de A)
```

---

## O fluxo resumido para qualquer projeto

```
1. SETUP
   cp -r ai-dev-starter-kit/ meu-projeto/
   ./scripts/setup.sh
   Editar CLAUDE.md (nome do projeto)
   claude

2. DESCOBERTA (sem skill — conversa direta)
   "Quero construir X com funcionalidades Y, Z, W.
    Me ajude a quebrar em features ordenadas."

3. PARA CADA FEATURE:
   /plan [descrição da feature]
     → fases 1-4: discovery, exploração, perguntas, design
     → aguarda sua aprovação
   
   /feature-dev [nome-da-feature]
     → fases 5-7: TDD + agents + review + gates
     → entrega com todos os testes passando

4. PARA FEATURES DE UI:
   /frontend-design [componente ou página]
     → design contract → TDD componentes → Cypress

5. CONSULTAS DURANTE O TRABALHO:
   /hexagonal [componente]    → orientação de camada
   /tdd [comportamento]       → ciclo RED/GREEN/REFACTOR

6. RESULTADO
   Aplicação funcionando
   Suite de testes completa (unit + integration + BDD + E2E + load)
   Arquitetura hexagonal limpa
   Code review aprovado em cada feature
```

---

## Por que esse fluxo funciona

| Problema comum | Como o starter kit resolve |
|---------------|---------------------------|
| "Não sei por onde começar" | `/plan` faz discovery + design antes de codar |
| "O código virou bagunça" | Hexagonal + hooks bloqueiam violations |
| "Os testes são frágeis" | TDD de fora para dentro + BDD como acceptance criteria |
| "Uma mudança quebra outra coisa" | Suite acumulada detecta regressão |
| "O agente gerou código errado" | code-reviewer obrigatório antes de merge |
| "Trabalho paralelo gera conflito" | Worktrees isolam cada feature |
| "Gastamos muitos tokens" | RTK CLI + hooks advisory reduzem 60-90% |

---

## Checklist de início de projeto

```
[ ] cp -r ai-dev-starter-kit/ meu-projeto/
[ ] ./scripts/setup.sh — instalar RTK, k6, Cypress, Cucumber
[ ] Editar [Project Name] no CLAUDE.md
[ ] Ajustar paths em .claude/architecture.json para a stack escolhida
[ ] claude → verificar que hooks disparam (rtk-rewrite, session-start)
[ ] Conversa de descoberta: quebrar aplicação em features ordenadas
[ ] /plan [feature-1] → aprovar o plano
[ ] /feature-dev [feature-1] → implementar
[ ] Repetir para cada feature
```
