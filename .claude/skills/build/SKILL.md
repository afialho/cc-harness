---
name: build
description: Full lifecycle orchestrator. Runs research → clarify → plan → implement pipeline. Each phase uses parallel agents and has its own context budget with automatic checkpoints.
disable-model-invocation: true
argument-hint: <raw idea>
---

# /build — Pipeline Completo: Ideia → Implementação

Orquestrador de três fases com research real, planejamento informado e implementação autônoma.
Cada fase tem budget próprio de contexto e checkpoints automáticos.

---

## Visão geral do pipeline

```
/build <ideia bruta>
    │
    ├─ [0/3] Fase 0 — Refinamento da ideia
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
    │         └─ ⏸ PAUSA: key insights + 3-5 perguntas de clarificação
    │
    ├─ [2/3] Fase 2 — Planning
    │         ├─ Extrai estruturadamente do RESEARCH.md → arquitetura hexagonal, BDD, test plan
    │         ├─ Gera PLAN.md
    │         └─ ⏸ PAUSA: apresenta plano → aguarda aprovação
    │
    └─ [3/3] Fase 3 — Implementation
              ├─ Feature simples → /feature-dev (7 fases, agentes por wave)
              └─ Feature complexa (3+ componentes) → /agent-teams (times paralelos)
```

Checkpoints automáticos ao final de cada fase e sempre que o contexto estimado atingir ~60k tokens.

---

## Fase 0 — Refinamento da ideia

> **Emitir:** `▶ [0/3] Refinando a ideia`

Recebe a ideia bruta e:

1. Reformula em linguagem técnica clara:
   - O que será construído
   - Input e output esperados
   - Entidades envolvidas
   - Tipo de feature: UI-heavy | Backend | Full-stack | Biblioteca

2. Apresenta o entendimento ao usuário neste formato:

```
ENTENDIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:      [nome curto]
Objetivo:     [uma frase — o que o usuário conquista]
O que constrói: [2-4 bullets técnicos]
Input/Output: [o que entra, o que sai]
Entidades:    [entidades de domínio envolvidas]
Tipo:         [UI-heavy | Backend | Full-stack | Biblioteca]
```

3. Pergunta: **"Esse entendimento está correto? Posso avançar para a pesquisa?"**

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

### Pausa obrigatória após pesquisa

Após gerar `RESEARCH.md`, apresenta ao usuário:

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

2. **Loop de correção** (se falhas): spawna agentes de fix targeted. Repete até tudo verde.

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
