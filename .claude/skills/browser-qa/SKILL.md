---
name: browser-qa
description: Exhaustive browser QA using Cypress (programmatic) + vercel:agent-browser (visual/exploratory). Crawls all pages, clicks all interactive elements, runs Cypress specs in loop until zero failures and zero BLOCKER/MAJOR. Requires vercel:agent-browser MCP + Cypress installed.
disable-model-invocation: true
argument-hint: <url da aplicação — ex: http://localhost:3000>
---

# /browser-qa — Exhaustive Browser QA

Dual-engine QA: **Cypress** (programmatic, deterministic) + **agent-browser** (visual, exploratory).
Ambos rodam em loop até a aplicação estar **100% funcional** — zero falhas Cypress, zero BLOCKER/MAJOR no browser.

**Engines:**
- `vercel:agent-browser` — navegação visual, cliques exploratórios, detecção de erros visuais
- Cypress — specs E2E determinísticos, cobrindo todos os fluxos definidos
- Loop até: Cypress 0 failures ∧ agent-browser 0 BLOCKER/MAJOR

**Pré-requisitos:** `vercel:agent-browser` MCP + `npx cypress` disponível.

---

## Quando invocar

| Contexto | Quando |
|---------|--------|
| Após qualquer entrega de UI | Antes de marcar feature como DONE |
| Gate final do `/build` | Sempre — todas as páginas |
| Manual por demanda | `/browser-qa <url>` |
| Após fix de bug de interface | Para verificar regressão |

---

## Pré-requisito — vercel:agent-browser

Antes de qualquer fase, verificar se `vercel:agent-browser` MCP está disponível:

```bash
rtk claude mcp list 2>/dev/null | grep -q "vercel"
```

Se **não estiver instalado**, instalar automaticamente:

```bash
rtk claude mcp add vercel npx -y @vercel/mcp-server
```

Emitir: `vercel:agent-browser instalado. Continuando...`
Emitir erro e parar SOMENTE se a instalação falhar.

---

## Fase 0 — Configuração

> **Emitir:** `▶ [BROWSER-QA 0/6] Configuração`

1. Receber URL base da aplicação (argumento ou inferir do projeto — `localhost:3000` por padrão)
2. Ler arquivos de rotas para discovery antecipado:
   - Next.js: `app/**/page.tsx`, `pages/**/*.tsx`
   - React Router: arquivos com `<Route`, `createBrowserRouter`
   - Express/Rails/Django: routes files
3. Ler `PLAN.md` ou `RESEARCH.md` se existirem — extrair lista de requisitos de interface para validação posterior
4. Definir escopo: URL base + lista de rotas conhecidas + credenciais de teste (se auth existe)
5. Emitir: `Escopo: [N] rotas conhecidas + crawl dinâmico. URL: [url]. Auth: [sim/não].`

---

## Fase 1 — Discovery

> **Emitir:** `▶ [BROWSER-QA 1/6] Discovery`

**Agente: browser-discovery**

```
Role: Mapeador de rotas e elementos da aplicação.
Tool: vercel:agent-browser
Actions:
  1. Abrir URL base
  2. Capturar screenshot do estado inicial
  3. Extrair todos os links (<a href>), botões de navegação, itens de menu
  4. Para cada rota descoberta: visitar e repetir extração (max 2 níveis de profundidade)
  5. Para apps com auth: fazer login com credenciais de teste antes de mapear rotas protegidas
  6. Registrar: URL, título da página, tipo (pública/protegida), elementos interativos encontrados

Output:
  SITEMAP.md com:
  - Lista completa de rotas (URL, título, tipo, nº de elementos interativos)
  - Lista de elementos interativos por página (botões, links, forms, menus, dropdowns, modais)
  - Elementos que requerem estado específico (ex: modal abre só após ação)
  - Erros encontrados durante discovery (404, redirect loop, crash)
```

---

## Fase 2A — Cypress Run (programmatic)

> **Emitir:** `▶ [BROWSER-QA 2A/6] Cypress Run`

```bash
rtk npx cypress run --reporter json --reporter-options "output=.claude/cypress-results.json"
```

Ler `.claude/cypress-results.json` após a execução:
- Extrair: total specs, passing, failing, pending
- Para cada falha: spec file + test name + error message + screenshot path
- Se **0 failures** → Cypress PASS, continuar para Fase 2B
- Se **failures > 0** → listar todos em `.claude/cypress-failures.md` e ir para Fase 4 (Fix Loop) antes do crawl visual

> **Nota:** Cypress testa fluxos predefinidos (register, login, feature flows).
> Agent-browser testa o que Cypress não cobre: elementos não scriptados, erros visuais, estados inesperados.

---

## Fase 2B — Crawl Visual Exaustivo (agent-browser)

> **Emitir:** `▶ [BROWSER-QA 2B/6] Visual Crawl — [N] páginas`

Lança agentes em paralelo (máx 5), um por grupo de páginas:

**Agente: browser-crawler-[N]**

```
Role: Navegador exaustivo — testa como um usuário real.
Tool: vercel:agent-browser
Input: lista de páginas do SITEMAP.md (subset por agente)

Para cada página:
  1. Navegar para a URL
  2. Capturar screenshot inicial
  3. Para CADA elemento interativo (botão, link, input, select, dropdown, modal trigger):
     a. Clicar / hover / focus
     b. Registrar: o que aconteceu? (navegação, modal, estado, erro, nada)
     c. Screenshot se estado mudou ou erro ocorreu
     d. Pressionar Escape / voltar antes do próximo elemento
  4. Testar formulários:
     - Submit vazio → validação aparece com mensagem clara?
     - Submit dados inválidos → mensagem útil (não só "campo inválido")?
     - Submit dados válidos → sucesso + feedback visual?
  5. Capturar: console errors JS, network failures (4xx/5xx), warnings
  6. Responsividade: redimensionar para 375px (mobile), repetir screenshot
  7. Verificar: elementos sobrepostos, overflow horizontal, layout quebrado

Output: CRAWL_REPORT_[N].md
  - Elemento | Ação | Resultado | Screenshot | Erro
```

---

## Fase 3 — Detecção e Classificação

> **Emitir:** `▶ [BROWSER-QA 3/6] Detecção e Classificação`

**Agente: browser-classifier**

```
Role: Classificador de erros de interface.
Input: todos os CRAWL_REPORT_N.md + SITEMAP.md + requisitos do PLAN.md (se existir)

Para cada item dos relatórios, classificar:

BLOCKER (impede uso):
  - Crash / white screen / unhandled JS error
  - Botão/link que não faz nada (sem ação, sem feedback)
  - Form que não submete ou submete sem validação de campos obrigatórios
  - Rota 404 que deveria existir
  - Rota protegida acessível sem autenticação
  - Dados não persistem após reload

MAJOR (degrada significativamente):
  - Elemento interativo sem feedback visual (hover, active, focus)
  - Mensagem de erro não informativa ("Error", "Something went wrong")
  - Layout quebrado em mobile (overflow horizontal, elementos sobrepostos)
  - Empty state ausente (lista vazia sem explicação)
  - Ação destrutiva sem confirmação
  - Loading state ausente em operação > 500ms
  - Inconsistência com requisitos do PLAN.md

MINOR (melhoria recomendada):
  - Texto truncado sem tooltip
  - Animação ausente esperada pelo design system
  - Inconsistência visual menor (espaçamento, cor levemente fora do padrão)

OK:
  - Elemento funciona como esperado

Output: BROWSER_QA_REPORT.md com:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BROWSER QA REPORT — [data/hora]
  Aplicação: [url]
  Páginas navegadas: [N] | Elementos testados: [N]
  Status: PASS | FAIL
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BLOCKERS ([N]):
    [página] | [elemento] | [descrição] | [screenshot]

  MAJORS ([N]):
    [página] | [elemento] | [descrição] | [screenshot]

  MINORS ([N]):
    [página] | [elemento] | [sugestão]

  OK: [N] elementos sem issues
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Salvar em `.claude/browser-qa-report.md`.

---

## Fase 3 — Detecção e Classificação (merge Cypress + Visual)

> **Emitir:** `▶ [BROWSER-QA 3/6] Detecção e Classificação`

**Agente: browser-classifier**

```
Input: cypress-failures.md (se existir) + todos os CRAWL_REPORT_N.md + SITEMAP.md + PLAN.md (requisitos)

Classificar cada issue encontrado:

BLOCKER:
  - Qualquer Cypress test failing (sempre BLOCKER)
  - Crash / white screen / unhandled JS error
  - Botão/link sem ação (sem resposta, sem feedback)
  - Form que não submete ou não valida campos obrigatórios
  - Rota 404 que deveria existir
  - Rota protegida acessível sem autenticação
  - Dados não persistem após reload

MAJOR:
  - Elemento interativo sem feedback visual
  - Mensagem de erro não informativa
  - Layout quebrado em mobile
  - Empty state ausente
  - Ação destrutiva sem confirmação
  - Loading state ausente em operação > 500ms
  - Inconsistência com requisitos do PLAN.md

MINOR: melhorias sem impacto funcional

Output: BROWSER_QA_REPORT.md (ver formato na Fase anterior)
```

---

## Fase 4 — Dispatch de Fix Agents

> **Emitir:** `▶ [BROWSER-QA 4/6] Fix Dispatch — Iteração [N/3]`

**Se PASS (zero BLOCKER e MAJOR):** pular para Fase 6.

**Se FAIL:** lançar fix agents em paralelo (máx 5), um por BLOCKER/MAJOR:

```
Fix Agent: [id do issue — ex: "home/cta-button-no-action"]
Task: Corrigir ESPECIFICAMENTE: [descrição exata do BLOCKER/MAJOR]
Tipo: frontend | backend | full-stack (inferir pelo tipo de erro)
Arquivo provável: [inferir do componente/rota]
Fix necessário: [ação específica — ex: "adicionar onClick handler", "retornar 400 se title ausente"]
Evidência: [screenshot path ou log de erro]
Contexto: [handoff com BROWSER_QA_REPORT.md + arquivos relevantes]
Restrições:
  - Máx 100k tokens
  - Corrigir APENAS este issue
  - Não refatorar código adjacente
  - Se backend: validar que fix não quebra contrato de API
Output obrigatório: arquivos modificados + descrição da correção
```

**Roteamento automático por tipo:**
- Erro de UI/CSS/layout → fix agent frontend
- Erro de validação de form (client-side) → fix agent frontend
- Erro de API (4xx/5xx) → fix agent backend
- Rota protegida acessível → fix agent backend (middleware/guard)
- Crash JS por dado inesperado → fix agent full-stack (null check + API contract)

---

## Fase 5 — Re-verificação Dual (Cypress + Visual)

> **Emitir:** `▶ [BROWSER-QA 5/6] Re-verificação — Iteração [N/3]`

### 5.1 — Re-run Cypress (apenas specs afetadas)

```bash
# Re-run apenas os specs que falharam (não toda a suite)
rtk npx cypress run --spec "tests/e2e/[affected-specs]" --reporter json \
  --reporter-options "output=.claude/cypress-results-iter[N].json"
```

Ler resultados: ainda há failures? → anotar para próxima iteração

### 5.2 — Re-navegação Visual (agent-browser)

```
Role: Verificador pós-fix.
Tool: vercel:agent-browser
Input: lista de páginas/elementos afetados pelos fixes

Para cada issue corrigido:
  1. Navegar para a página afetada
  2. Repetir a ação exata que causava o erro
  3. Verificar comportamento correto
  4. Verificar que não há regressão nas páginas adjacentes
  5. Capturar screenshot de confirmação

Output: VERIFICATION_REPORT_iter[N].md
  - Issue | Status (RESOLVED | STILL_FAILING | REGRESSION) | Screenshot
```

### 5.3 — Decisão

**PASS se:** Cypress 0 failures ∧ agent-browser 0 BLOCKER/MAJOR → **Fase 6**
**FAIL se:** qualquer failure ou BLOCKER/MAJOR restante:
  - iteração < 3 → voltar para Fase 4 (próxima iteração)
  - iteração = 3 → **Escalate**

```
⚠️ BROWSER-QA ESCALATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Após 3 iterações, os seguintes issues persistem:

[lista com histórico de tentativas por issue]

Possíveis causas:
  - Problema estrutural (requer redesign de componente/API)
  - Race condition ou state management complexo
  - Dependência de serviço externo não disponível em dev
  - Requisito ambíguo — precisa de decisão humana

Ação necessária: revisão manual.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Fase 6 — Relatório Final

> **Emitir:** `▶ [BROWSER-QA 6/6] Relatório Final`

```
BROWSER QA COMPLETE ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL:       [url]
Iterações: [N/3]

Cypress:
  Specs:   [N] | Passing: [N] | Failing: 0 ✅

Agent-Browser:
  Páginas:    [N] navegadas
  Elementos:  [N] testados
  Formulários:[N] testados
  Viewports:  desktop (1280px) + mobile (375px)
  BLOCKERs:   0 ✅ | MAJORs: 0 ✅

Issues corrigidos nesta sessão:
  Cypress failures: [N] → 0
  BLOCKERs: [N] → 0
  MAJORs:   [N] → 0

Pendentes (MINOR — backlog):
  [lista]

Relatório: .claude/browser-qa-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A aplicação está funcional. ✅ Pode avançar.
```

---

## Regras

1. **Cobertura total** — todo elemento interativo visível deve ser testado, sem exceções
2. **Estado limpo entre elementos** — Escape / voltar após cada interação antes de testar o próximo
3. **Auth antes de tudo** — login feito antes de qualquer teste em área protegida
4. **Screenshot obrigatório** — todo BLOCKER/MAJOR tem screenshot de evidência
5. **Fix cirúrgico** — fix agents corrigem APENAS o issue específico
6. **Verificação pós-fix** — re-navegar as áreas afetadas, não assumir que está corrigido
7. **Máx 3 iterações** — se persistir após 3, escalar para o usuário
8. **Máx 5 agentes paralelos** — seguir RULE-AGENT-001
