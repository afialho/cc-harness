---
name: build
description: Full lifecycle orchestrator. Runs research → clarify → plan → implement pipeline. Each phase uses parallel agents and has its own context budget with automatic checkpoints.
disable-model-invocation: true
argument-hint: <raw idea>
---

# /build — Pipeline Completo: Ideia → Implementação

> **Extends:** `claude-code-setup@claude-plugins-official`
> Adds: research wave, BDD planning, parallel agent orchestration, and quality gates (/qa-loop + /browser-qa) at every phase.
> The official plugin handles project setup; this skill runs the full development lifecycle on top.

Orquestrador de três fases com research real, planejamento informado e implementação autônoma.
Cada fase tem budget próprio de contexto e checkpoints automáticos.

---

## Visão geral do pipeline

```
/build <ideia>
    │
    ├─ [0/3] Fase 0 — Detecção de contexto
    │         ├─ Ideia vaga? → chama /ideate → aguarda IDEAS.md → retoma automaticamente
    │         └─ ⏸ PAUSA: confirmação do entendimento
    │
    ├─ [1/3] Fase 1 — Research
    │         ├─ Wave de agentes paralelos:
    │         │   ├─ Agente Business/Market    (sempre que feature tem usuários)
    │         │   ├─ Agente API/Docs           (se integra com terceiros)
    │         │   ├─ Agente Architecture       (se tem backend/infra)
    │         │   ├─ Agente Domain/Rules       (se domínio especializado)
    │         │   ├─ Agente Implementations    (sempre)
    │         │   └─ Agente YouTube            (se tem tutoriais relevantes)
    │         ├─ Agrega em RESEARCH.md
    │         ├─ Agrega em RESEARCH.md
    │         ├─ /qa-loop (qa-research) → GATE: research tem evidências reais?
    │         └─ ⏸ PAUSA: key insights + 3-5 perguntas de clarificação
    │
    ├─ [2/3] Fase 2 — Planning
    │         ├─ Extrai estruturadamente do RESEARCH.md → arquitetura hexagonal, BDD, test plan
    │         ├─ Gera PLAN.md
    │         ├─ /qa-loop (qa-plan) → GATE: BDD completo? arquitetura mapeada?
    │         └─ ⏸ PAUSA: apresenta plano → aguarda aprovação
    │
    └─ [3/3] Fase 3 — Implementation
              ├─ [3a] Foundation (design system + layout) → agent-browser → GATE
              ├─ [3b] Auth (register/login/logout) → agent-browser → GATE obrigatório
              ├─ Feature simples → /feature-dev + phase gate por feature
              └─ Feature complexa (3+ componentes) → /agent-teams + phase gate por wave
```

Checkpoints automáticos ao final de cada fase e sempre que o contexto estimado atingir ~60k tokens.

---

## Fase 0 — Detecção de contexto + Refinamento

> **Emitir:** `▶ [0/3] Analisando contexto`

### 0.0 — Detectar se o contexto é suficiente para construir

Antes de qualquer coisa, avaliar o que foi recebido:

**Verificar (em ordem):**

1. `IDEAS.md` existe na raiz do projeto? → contexto suficiente, pular para 0.1
2. Projeto já tem código (`src/`, `app/`, `lib/`)? → adicionar feature, pular para 0.1
3. O argumento passado descreve claramente **o que construir** (feature, entidades, comportamento esperado)? → pular para 0.1

**Sinais de ideia vaga — chamar `/ideate` se qualquer um destes for verdade:**
- Nenhum argumento passado (`/build` sem nada)
- Argumento com < 15 palavras sem feature concreta ("quero um app", "algo tipo Zendesk", "uma plataforma de tarefas")
- Analogia sem especificação ("tipo o Pipefy mas diferente", "como o Notion mas para X")
- Sem usuário definido, sem problema claro, sem comportamento esperado
- Múltiplas ideias soltas sem escopo definido

**Se ideia vaga detectada:**

```
Percebi que a ideia ainda está em fase de definição.
Antes de construir, vou te entrevistar para mapear features, definir o MVP e
garantir que vamos construir a coisa certa.

▶ Iniciando /ideate...
```

Chama `/ideate <argumento recebido>` e **aguarda o resultado** (IDEAS.md gerado + aprovação do usuário).
Após `/ideate` concluir, retoma automaticamente o `/build` com o `IDEAS.md` como input — sem precisar que o usuário chame `/build` de novo.

**Se contexto suficiente:** prosseguir direto para 0.1.

---

### 0.1 — Refinamento da ideia

Recebe a ideia concreta (ou IDEAS.md do /ideate) e:

1. Detectar ou confirmar o **scale** do projeto:
   - Se IDEAS.md existe e tem campo Scale → usar
   - Se chamado com argumento `scale=MVP|Product|Scale` → usar
   - Caso contrário → perguntar: *"Qual o scale? MVP (validar ideia) / Product (vai para mercado) / Scale (produto com tração)?"*

   **O scale determina o que será incluído:**
   ```
   MVP:     Auth + features core + testes unitários básicos
            SEM: CI/CD, observabilidade, rate limiting, load tests
   Product: MVP + CI/CD (GitHub Actions) + rate limiting em auth + E2E + structured logging
   Scale:   Product + observabilidade completa + feature flags + load tests
   ```

2. Reformula em linguagem técnica clara:
   - O que será construído
   - Input e output esperados
   - Entidades envolvidas
   - Tipo de feature: UI-heavy | Backend | Full-stack | Biblioteca

3. Apresenta o entendimento ao usuário neste formato:

```
ENTENDIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:      [nome curto]
Scale:        MVP | Product | Scale
Objetivo:     [uma frase — o que o usuário conquista]
O que constrói: [2-4 bullets técnicos]
Input/Output: [o que entra, o que sai]
Entidades:    [entidades de domínio envolvidas]
Tipo:         [UI-heavy | Backend | Full-stack | Biblioteca]
```

4. Pergunta: **"Esse entendimento está correto? Posso avançar para a pesquisa?"**

Aguarda confirmação antes de iniciar a Fase 1.
Se o usuário corrigir algo, ajusta o entendimento e confirma novamente.

---

## Fase 1 — Research

> **Emitir:** `▶ [1/3] Research — lançando agentes paralelos`

Executa o protocolo da skill `/research` para o tópico confirmado.

### Wave de pesquisa (agentes paralelos)

Lança até 4 agentes simultâneos com base no tipo de feature. A seleção é feita pelo orquestrador conforme o contexto da ideia confirmada na Fase 0.

**Agente Business/Market** — pesquisa mercado e concorrência (usar sempre que a feature tem usuários finais)
- Busca: concorrentes e como resolvem o mesmo problema (Product Hunt, G2, Capterra)
- Busca: reviews de usuários — o que elogiam, o que reclamam
- Busca: blogs do setor e posts de referência sobre o problema

**Agente API/Docs** — pesquisa integrações com terceiros (usar se a feature integra com APIs externas)
- Busca: documentação oficial de cada serviço externo mencionado
- Busca: endpoints relevantes, rate limits, autenticação e SDKs disponíveis
- Busca: changelogs e versões suportadas

**Agente Architecture/Backend** — pesquisa padrões de design e infraestrutura (usar se tem backend ou infra)
- Busca: padrões de design aplicáveis (Martin Fowler, AWS/GCP blogs, RFC relevantes)
- Busca: decisões de schema, modelagem de dados e estratégias de persistência
- Busca: trade-offs de arquitetura documentados por praticantes

**Agente Domain/Rules** — pesquisa domínio especializado (usar se o domínio tem terminologia ou regras específicas)
- Busca: regras do setor, regulamentações e compliance relevantes
- Busca: terminologia canônica do domínio (para naming de entidades)
- Busca: RFCs, standards ou especificações formais aplicáveis

**Agente YouTube/Tutorials** — pesquisa implementações em vídeo
- Busca: tutoriais e walkthroughs para o padrão/feature
- Busca: pitfalls comuns e lições aprendidas
- Busca: abordagens alternativas demonstradas

**Agente Implementations** — pesquisa implementações reais (sempre incluído)
- Busca: repositórios open source de referência
- Busca: snippets e padrões de código recomendados
- Busca: trade-offs de implementação documentados

Cada agente usa WebSearch e WebFetch para pesquisa real — sem inventar dados.

### Agregação

Consolida todos os achados em `RESEARCH.md` com estrutura:

```markdown
# Research: [Feature Name]

## Key Insights
[5-10 bullets com os achados mais relevantes]

## Business & Market Analysis
[achados do agente Business/Market]

## API & Integration Docs
[achados do agente API/Docs: endpoints, rate limits, SDKs]

## Architecture & Backend Patterns
[achados do agente Architecture/Backend]

## Domain Rules & Terminology
[achados do agente Domain/Rules: regras, terminologia canônica]

## Implementation Patterns
[achados de implementações reais]

## Pitfalls & Lessons Learned
[problemas conhecidos e como evitá-los]

## References
[links com descrição]
```

### QA Gate pós-pesquisa

Antes da pausa, executa:
```
/qa-loop (escopo: RESEARCH.md, dimensões: qa-research)
```
Se `qa-research` retornar BLOCKER → corrige gaps na pesquisa (spawna agente de research adicional) antes de apresentar ao usuário.

### Pausa obrigatória após pesquisa

Após gerar `RESEARCH.md` e passar o gate, apresenta ao usuário:

1. **Key Insights** (extraídos do RESEARCH.md, 5-10 linhas)
2. **3-5 perguntas de clarificação** baseadas nos achados — focadas em gaps, trade-offs ou decisões que a pesquisa revelou e que precisam de input humano

Exemplo de perguntas relevantes:
- "A pesquisa encontrou duas abordagens: X (mais simples) e Y (mais escalável). Qual prefere?"
- "As APIs A e B cobrem o mesmo caso de uso. A tem melhor DX, B tem melhor rate limit. Alguma preferência?"
- "A feature toca autenticação — a pesquisa revelou que o padrão do projeto usa JWT. Confirma que devemos seguir esse padrão?"

Aguarda resposta do usuário antes de iniciar a Fase 2.

> **Checkpoint após Fase 1:**
> Escreve `.claude/checkpoint.md`:
> ```
> fase: research_completa
> research_md: gerado
> respostas_usuario: [respostas registradas]
> proximo: fase_2_planning
> ```

Se o contexto atingir ~60k tokens antes de concluir a Fase 1:
Escreve checkpoint com o estado parcial e emite:
`↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar na Fase 1 (pesquisa parcial registrada).`

---

## Fase 2 — Planning

> **Emitir:** `▶ [2/3] Planning`

Antes de gerar qualquer planejamento, extrai estruturadamente do RESEARCH.md:

**APIs identificadas:**
→ Cada API externa encontrada = outbound port + infrastructure adapter nomeado especificamente
→ Cada endpoint relevante = uma task granular na wave decomposition (não "integrar API", mas "implementar POST /charges no StripeAdapter")

**Regras de negócio encontradas:**
→ Cada regra = um BDD Scenario concreto com Given/When/Then específicos
→ Edge cases do domínio = Scenarios adicionais
→ Usar terminologia exata do domínio encontrada na pesquisa para nomear entidades

**Concorrentes e referências de arquitetura:**
→ Padrões que se repetiram em múltiplas referências = padrão preferido para este projeto
→ Trade-offs documentados nos achados = decisões de design informadas e documentadas

**Achados de implementação:**
→ Abordagens técnicas encontradas no RESEARCH.md informam a sequência de implementação
→ Pitfalls identificados = items de atenção no plano

Este mapeamento explícito garante que o planejamento seja embasado nos achados reais da pesquisa,
não em decisões genéricas do modelo.

### O que gerar

Lê `RESEARCH.md` e as respostas de clarificação do usuário para informar cada decisão.

**Architecture mapping (baseado em `.claude/architecture.json`):**

Ler `.claude/architecture.json` antes de mapear. Usar o template correspondente ao `pattern` detectado:

- **hexagonal** (ou projeto novo): Domain → Application → Ports → Infrastructure → Shared
- **mvc-rails**: Models → Services → Controllers → Views/Serializers
- **mvc-express / mvc-nestjs**: Models/DTOs → Services → Controllers → Routes
- **nextjs-app-router**: lib/ (server logic) → Server Actions → API Routes → Server Components → Client Components
- **feature-based**: src/features/[nome]/ (autocontido) → src/shared/ (compartilhado)
- **flat / disabled**: documentar estrutura existente sem impor padrão

**BDD scenarios (Gherkin):**
- Happy path
- Casos de erro
- Edge cases

**Test plan:**
- Unit tests por entidade de domínio e use case
- Integration tests por adapter
- E2E (Cypress) se houver UI
- Load test (k6) se houver endpoint HTTP

**Implementation sequence (TDD — baseado no padrão detectado):**

*hexagonal:* BDD file → Domain entities → Ports → Use Cases → Adapters → Composition root → Cucumber → Cypress → k6
*mvc-rails:* BDD file → Model → Service → Controller → Request tests → Cucumber → Cypress
*mvc-express/nestjs:* BDD file → DTO/Model → Service → Controller → Routes → Integration tests → Cucumber → Cypress → k6
*nextjs-app-router:* BDD file → lib/ functions → Server Actions → API Routes → Server Components → Client Components → Cucumber → Cypress → k6
*feature-based:* BDD file → Business logic → UI components → API integration → Integration tests → Cucumber → Cypress

**Agent wave decomposition** (se feature complexa):
- Quais componentes podem ser implementados em paralelo
- Quais têm dependência sequencial
- Estimativa de waves necessárias

**Git strategy:**
- Nome da branch: `feature/[nome-kebab-case]`
- Commits atômicos: sequência sugerida

**Definition of Done:**
- Checklist completo com todos os critérios

### QA Gate pós-plano

Antes de apresentar ao usuário, executa:
```
/qa-loop (escopo: PLAN.md, dimensões: qa-plan)
```
Se `qa-plan` retornar BLOCKER (ex: user story sem scenario, decision critical sem justificativa) → corrige o plano antes de apresentar.

### Apresentação ao usuário

Apresenta o plano completo (pode ser inline ou referencia `PLAN.md` se gerado).

Em seguida pergunta: **"Plano aprovado? Posso iniciar a implementação?"**

Aceita: "sim", "vai", "aprovado", "implementa", "go" ou equivalente.
Se o usuário pedir ajustes: incorpora e apresenta novamente.

> **Checkpoint após Fase 2:**
> Escreve `.claude/checkpoint.md`:
> ```
> fase: planning_completo
> plan_md: gerado
> aprovacao_usuario: confirmada
> proximo: fase_3_implementation
> ```

Se o contexto atingir ~60k tokens antes de concluir a Fase 2:
Escreve checkpoint com plano parcial e emite:
`↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar na Fase 2 (planejamento parcial registrado).`

---

## Fase 3 — Implementation

> **Emitir:** `▶ [3/3] Implementation`

---

### Detecção automática: Web vs. Mobile

Antes do Foundation Protocol, detectar o tipo de projeto:

```bash
# Mobile: se package.json contém "expo" ou "react-native"
rtk cat package.json | grep -E '"expo"|"react-native"'
```

- **Mobile detectado** → usar Foundation Protocol Mobile (abaixo)
- **Web (padrão)** → usar Foundation Protocol Web (abaixo)

---

### Foundation Protocol Mobile (OBRIGATÓRIO para projetos React Native)

Executar em sequência estrita. Usar `/mobile` como referência completa.

#### [M-3a] Design System + Navigation Base

1. Instalar NativeWind v4 + configurar tema (cores, fontes, dark/light mode)
2. Criar componentes base: `Button`, `Input`, `Screen`, `Typography`, `Card`
3. Configurar `RootNavigator` + `AuthNavigator` + `AppNavigator`
4. Verificar renderização em iOS Simulator + Android Emulator

```
⛔ GATE [M-3a]: /mobile qa
  □ Componentes sem erro em iOS e Android
  □ Dark mode funciona
  □ Navegação entre telas funciona
  PASS obrigatório — sem este gate, nenhuma feature inicia
```

#### [M-3b] Auth — Register / Login / Logout

1. Implementar fluxo completo: register, login, logout, refresh token, proteção de rotas
2. Criar `tests/e2e/auth.e2e.ts` com happy path + caso de erro
3. `rtk npx detox test tests/e2e/auth.e2e.ts`

```
⛔ GATE [M-3b]: /mobile qa (escopo: auth)
  Se auth falha → TODO o build para aqui
  Sem exceções.
```

---

### Foundation Protocol Web (OBRIGATÓRIO para qualquer app web com UI)

Antes de implementar qualquer feature de produto, executar em sequência estrita:

#### [3a] Design System + Layout Base

1. Instalar e configurar shadcn/ui + tema (cores, fontes, dark/light mode conforme tipo de app)
2. Construir layout base: estrutura navegacional (header, sidebar ou nav, main content area)
3. Executar QA:

```
⛔ GATE [3a]: /qa-loop (escopo: layout base, dimensões: qa-design)
             PASS obrigatório — sem este gate, nenhuma feature inicia
             Fix loop automático até PASS ou escalate para usuário
```

#### [3b] Auth — Register / Login / Logout

1. Implementar fluxo completo: register, login, logout, redirect pós-login, proteção de rotas
2. Criar `tests/e2e/auth.cy.ts` com happy path + caso de erro
3. `rtk npx cypress run --spec tests/e2e/auth.cy.ts`
4. Executar QA:

```
⛔ GATE [3b]: /qa-loop (escopo: auth, dimensões: qa-backend + qa-security + qa-e2e)
             PASS obrigatório
             Se auth falha → TODO o build para aqui
             Não há exceções: auth com BLOCKER = build pausado até PASS
```

---

### Phase Gate Protocol

Após CADA feature implementada (não apenas ao final do build):

**Web:**
```
PHASE GATE — executar após cada feature:
  □ rtk npx cypress run --spec tests/e2e/[feature].cy.ts
  □ /qa-loop (escopo: [feature], dimensões: conforme tipo)
      UI only      → qa-design + qa-ux + qa-e2e
      Backend only → qa-backend + qa-security + qa-code
      Full-stack   → qa-design + qa-ux + qa-backend + qa-security + qa-e2e
  □ PASS obrigatório antes de iniciar a próxima feature
  □ Fix loop automático (máx 3 iterações) antes de escalar para usuário
```

**Mobile:**
```
PHASE GATE — executar após cada feature mobile:
  □ rtk npx detox test tests/e2e/[feature].e2e.ts
  □ /mobile qa (escopo: [feature])
  □ PASS obrigatório antes de iniciar a próxima feature
  □ Fix loop automático (máx 3 iterações) antes de escalar para usuário
```

**Regra de dependência**: features que dependem de outra só iniciam se o gate da dependência passou.

**Regra de prioridade de fix**: o QA Loop spawna fix agents automaticamente — o orquestrador do /build aguarda PASS antes de avançar, sem intervenção manual.

---

### Decisão automática de protocolo

| Critério | Protocolo |
|----------|-----------|
| Feature com 3+ componentes independentes | `/agent-teams` (times paralelos) |
| Feature única ou sequencial | `/feature-dev` (7 fases, agentes por wave) |
| Feature com UI significativa | Inclui `/frontend-design` dentro da implementação |

A decisão é tomada automaticamente com base no plano da Fase 2.

### Contexto para implementação

Todos os agentes de implementação recebem como contexto:
- `RESEARCH.md` — decisões de biblioteca e padrões visuais
- Plano aprovado da Fase 2 — arquitetura, sequência, test plan
- Respostas de clarificação do usuário da Fase 1

### Se protocolo for /feature-dev

Executa as 7 fases do `/feature-dev` com agentes por wave:
- Fase 1: BDD scenarios
- Fase 2: Domain (RED — testes failing)
- Fase 3: Domain (GREEN — implementação)
- Fase 4: Ports + Application (RED → GREEN)
- Fase 5: Infrastructure adapters (integration tests)
- Fase 6: Wiring + E2E
- Fase 7: Review + Load test

Checkpoint ao final de cada fase.

### Se protocolo for /agent-teams

Executa o `/agent-teams` com times paralelos:
- Decompõe em workstreams independentes (max 85k tokens por time)
- Lança waves de times simultâneos (max 5 agentes por wave)
- Cada time retorna TEAM REPORT com status, arquivos e decisões
- Orquestrador agrega handoffs entre waves

Checkpoint ao final de cada wave.

### Checkpoints durante implementação

A cada phase completa (se /feature-dev) ou a cada wave (se /agent-teams):
Atualiza `.claude/checkpoint.md` com progresso exato.

Se contexto atingir ~60k em qualquer ponto:
`↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar na [phase/wave exata].`

### Conclusão da implementação

Após implementação completa:

1. **Roda suite de testes completa:**
   ```bash
   rtk npm test
   rtk npx cucumber-js
   rtk npx cypress run          # se UI foi construída
   rtk k6 run tests/load/[f].js # se endpoint foi adicionado
   ```

2. **QA Final** (todas as dimensões aplicáveis ao build):
   ```
   /qa-loop (escopo: build completo, dimensões: todas)
   ```
   Fix loop automático até PASS. Se escalar → apresentar ao usuário antes do commit.

3. **Loop de correção** (se falhas de testes unitários/BDD): spawna agentes de fix targeted. Repete até tudo verde.

3. **Code review global** (agente code-reviewer):
   - Conformidade hexagonal
   - Princípios SOLID
   - Cobertura de testes
   - Segurança
   - Se FAIL → loop de fix até PASS

4. **Commit:**
   ```bash
   rtk git add [arquivos específicos — nunca git add .]
   rtk git commit -m "feat([scope]): [descrição]

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

5. **Apresenta summary final ao usuário:**

```
BUILD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:        [nome da feature]
Branch:         feature/[nome]

O que foi construído:
  [2-4 bullets descrevendo o que foi implementado]

Arquivos:
  Criados:    [N]
  Modificados:[N]

Testes:
  Unit:        [N] passando
  Integration: [N] passando
  BDD:         [N] cenários passando
  E2E:         [N] passando     (se aplicável)
  Load:        p95 Xms @ Y rps  (se aplicável)

Gates de qualidade:
  Foundation:  ✅ Design system + layout verificado (agent-browser)
  Auth:        ✅ Register/login/logout verificado (agent-browser + Cypress)
  Per-feature: ✅ Phase gate passou em cada feature
  Browser:     ✅ Verificação E2E final completa (agent-browser)

Protocolo:    [feature-dev | agent-teams]
Review:       PASS

Próximo: merge feature/[nome] em main quando pronto.
```

---

## Regras gerais

1. **Nunca pule a pesquisa** — features de UI sem `RESEARCH.md` resultam em soluções genéricas sem embasamento real.
2. **Pausas obrigatórias** após Fase 1 (clarificação) e Fase 2 (aprovação do plano). Fora dessas pausas, execução é totalmente autônoma.
3. **Checkpoints** ao final de cada fase e sempre que estimar ~60k tokens consumidos.
4. **Progress markers** em todos os pontos (`▶ [N/3] Phase Name`).
5. **Autonomia máxima dentro de cada fase** — decisões de arquitetura, naming, padrões e dependências são feitas pelos agentes sem perguntar ao usuário.
6. **Decisões documentadas** — toda escolha não-óbvia é registrada no handoff do agente que a tomou.
7. **TDD não é negociável** — teste failing antes de qualquer implementação, sem exceções.

---

## Tratamento de falhas

| Situação | Comportamento |
|----------|---------------|
| Pesquisa retorna poucos resultados | Documenta o gap no RESEARCH.md, avança com o que foi encontrado |
| Teste não passa após 3 tentativas | Documenta no handoff, marca workstream PARTIAL, continua os demais |
| Violação de arquitetura detectada | Corrige a violação, documenta a decisão |
| Dependência faltando | Instala, documenta no handoff |
| Requisito ambíguo | Escolhe a interpretação mais simples, documenta a premissa |
| Workstream BLOQUEADO (impossível) | Reporta no handoff, orquestrador decide se pula ou adapta |

Agentes nunca pedem ajuda ao usuário durante a execução. Decidem, documentam e continuam.
