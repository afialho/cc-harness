---
name: redesign
description: Transform an existing application into a modern one. Analyzes the current app (via browser or codebase), detects whether in-place UI replacement or a full rewrite to a new folder is appropriate, proposes UX improvements (navigation reorganization, design system, animations), gets user approval, then implements with full feature parity guarantee.
disable-model-invocation: true
argument-hint: <url or path of existing app>
---

# /redesign — Application Modernization & UI Transformation

> Transforma um app existente em um moderno.
> Analisa o que existe → detecta o modo correto → propõe UX melhorada → implementa com garantia de paridade.
> O app original nunca é tocado até confirmação explícita (ou nunca, no caso de rewrite).

---

## Dois modos — detectados automaticamente

| Modo | Quando | O que acontece |
|------|--------|---------------|
| **rewrite** | Framework legacy (AngularJS, Backbone, jQuery, Ember, CoffeeScript), stack incompatível com migração incremental, ou usuário quer pasta nova | Nova pasta + nova stack + mesmas features + UX melhorada |
| **in-place** | Framework moderno (React, Vue, Next.js, Angular 14+), estrutura preservável, usuário quer substituir só a UI | Mesma pasta + substitui camada de apresentação + backend intacto |

A skill detecta e recomenda — nunca age sem confirmação do usuário.

---

## Fase 1 — Análise do app existente

> **Emitir:** `▶ [1/7] Analisando o app existente`

### 1.1 — Identificar o tipo de entrada

- **URL fornecida** → usar agent-browser para navegar o app em produção/staging
- **Path de codebase** → explorar estrutura de arquivos + ler componentes principais

### 1.2 — Mapear via agent-browser (se URL disponível)

Navegar sistematicamente:

```
Para cada página/tela do app:
  □ URL e título da página
  □ Elementos de navegação (menu principal, sidebar, breadcrumb, tabs)
  □ Componentes principais visíveis (tabelas, formulários, cards, modais, dashboards)
  □ Ações disponíveis (botões, links, formulários, drag-drop)
  □ Estados da UI (loading, empty, error, success)
  □ Fluxos de usuário (sequências de passos para completar uma tarefa)

Registrar também:
  □ Integração com APIs (observar XHR/fetch calls se DevTools acessível)
  □ Auth (login, logout, controle de acesso por rota)
  □ Responsividade (testar em mobile viewport)
  □ Pain points visuais (inconsistências, elementos desalinhados, UI datada)
```

### 1.3 — Mapear via codebase (se path disponível, em paralelo ou alternativo)

```bash
# Detectar framework e stack
rtk cat package.json 2>/dev/null || rtk cat requirements.txt 2>/dev/null

# Mapear rotas/telas
find . -name "*.routes.*" -o -name "router*" -o -name "routes*" | head -20
find . -name "*.component.*" -o -name "*.page.*" -o -name "*.view.*" | grep -v node_modules | head -40
```

Extrair de cada arquivo de rota:
- Path da URL
- Componente/view associado
- Guards de auth (se houver)

### 1.4 — Detectar framework e avaliar modo

**Sinais de REWRITE (nova pasta recomendado):**
- AngularJS (angular.js v1.x), Backbone.js, Ember.js antigo, jQuery como framework principal
- Stack sem TypeScript com > 50 componentes (migração incremental inviável)
- Sem estrutura de componentes (HTML + JS direto)
- Versão de framework com EOL (end-of-life)
- Usuário explicitamente quer nova pasta / novo projeto

**Sinais de IN-PLACE:**
- React (qualquer versão), Vue 3, Angular 14+, Next.js
- Codebase com testes existentes que precisam ser preservados
- Backend + frontend no mesmo repo e backend não muda
- Usuário quer só substituir a camada visual

### 1.5 — Gerar inventário estruturado

```
INVENTÁRIO DO APP ATUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:    [nome + versão]
Telas:        [N] telas mapeadas
Features:     [lista estruturada por módulo]
Navegação:    [estrutura atual de menus/rotas]
Auth:         [sim/não + tipo]
APIs:         [lista de integrações identificadas]
Pain points:  [problemas visuais/UX encontrados]
```

---

## Fase 2 — Detecção de modo + Stack decision

> **Emitir:** `▶ [2/7] Detectando modo + definindo stack`

Apresentar recomendação com justificativa:

```
RECOMENDAÇÃO DE MODO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework atual: [nome + versão]
Motivo:          [por que rewrite ou in-place]

Modo recomendado: REWRITE | IN-PLACE

[Se REWRITE:]
Stack sugerida para o novo app:
  Framework:    Next.js 14 (App Router) — [justificativa]
  Styling:      Tailwind CSS + shadcn/ui
  Animações:    Framer Motion (page transitions + micro-interactions)
  Estado:       [Zustand | TanStack Query — baseado no que o app usa]
  Auth:         [manter backend atual | reescrever — baseado na análise]

Nova pasta:     ../[nome-do-projeto]-redesign/

[Se IN-PLACE:]
Substituição:   Componentes de UI trocados, lógica preservada
Design system:  shadcn/ui + Tailwind
Animações:      Framer Motion
```

**⏸ PAUSA:** Confirmar modo + stack antes de qualquer implementação.

Se o usuário quiser ajustar a stack sugerida → incorporar e confirmar novamente.

---

## Fase 3 — Proposta de UX

> **Emitir:** `▶ [3/7] Proposta de UX melhorada`

Esta é a fase de maior valor — não apenas replicar, mas melhorar.

### 3.1 — Análise de padrões modernos equivalentes

Para cada tipo de tela identificada no inventário, pesquisar (agent-browser em sites de referência):
- Dribbble, Mobbin, Awwwards para o tipo de produto (SaaS dashboard, e-commerce, ferramenta de gestão, etc.)
- Apps modernos equivalentes e como resolvem os mesmos problemas

### 3.2 — Proposta de nova arquitetura de informação (IA)

Comparar estrutura atual vs. proposta:

```
NAVEGAÇÃO ATUAL                    NAVEGAÇÃO PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menu principal:                    Menu principal:
  ├─ [item atual 1]           →      ├─ [item proposto 1] [motivo]
  ├─ [item atual 2]           →      ├─ [item proposto 2] [motivo]
  └─ [item atual 3]           →      └─ [item proposto 3] [motivo]
                                     └─ [item novo sugerido] [motivo]

Sidebar/secundário:                Sidebar/secundário:
  └─ [atual]                  →      └─ [proposto]

Fluxos reorganizados:
  "[tarefa X]" era 4 passos → proposta: 2 passos ([justificativa])
  "[recurso Y]" estava oculto → proposta: destaque em dashboard ([justificativa])
```

### 3.3 — Design system e identidade visual

```
DESIGN SYSTEM PROPOSTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base:        shadcn/ui (componentes acessíveis, customizáveis)
Tema:        [claro | escuro | ambos — baseado no tipo de produto]
Palette:     [sugestão de 3 cores com justificativa]
Tipografia:  [fonte sugerida + escala]
Ícones:      Lucide Icons (consistente com shadcn/ui)
Animações:
  - Page transitions: Framer Motion (fade + slide)
  - Micro-interactions: hover states, loading skeletons, success feedback
  - Data loading: skeleton screens (não spinners)
  - Empty states: ilustrações + call-to-action
```

### 3.4 — Apresentar proposta completa ao usuário

Formato:

```
PROPOSTA DE REDESIGN — [Nome do App]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOVA ARQUITETURA DE INFORMAÇÃO
[diagrama texto comparando atual vs. proposto]

MELHORIAS DE UX PROPOSTAS
  1. [melhoria] — [motivo baseado em análise]
  2. [melhoria] — [motivo]
  ...

DESIGN SYSTEM
  [resumo das escolhas visuais]

FEATURES MANTIDAS (paridade garantida)
  ✓ [feature 1]
  ✓ [feature 2]
  ... todas as [N] features do app atual

FEATURES FORA DO ESCOPO (sugestão)
  ○ [feature antiga que pode ser deprecada — com justificativa]
```

**⏸ PAUSA:** Aguarda aprovação ou ajustes. Só avança quando usuário confirmar.

> **Checkpoint:** Escreve `.claude/checkpoint.md`:
> ```
> skill: redesign
> fase: ux-proposal-approved
> arquivos_modificados: [list]
> proximo: platform-detection
> ```
> Se contexto atingir ~60k tokens → escreve checkpoint e emite:
> `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

## Fase 4 — Detecção de plataforma + delegação mobile

> **Emitir:** `▶ [4/7] Detecção de plataforma`

Antes de iniciar a implementação, verificar se o app é mobile-native:

**Sinais de app mobile:**
- `react-native` ou `expo` em `package.json`
- Diretórios `android/` ou `ios/` na raiz
- Arquivos `.xcodeproj`, `MainActivity.java`, ou `app.json` (Expo)

**Se mobile detectado:**

```
App mobile detectado (React Native / Expo).
O redesign mobile usa /mobile scaffold + iterative /mobile feature — delegando agora.
```

Executar em sequência:

1. **`/mobile scaffold`** — cria o novo projeto RN/Expo com arquitetura hexagonal, design system mobile (NativeWind), navegação, auth scaffold, e requisitos App Store/Play Store. Passar como contexto a proposta de navegação + design system aprovada na Fase 3.

2. **`/mobile feature`** (uma chamada por feature) — para cada feature do inventário (Fase 1), na ordem da mais crítica para secundárias. Cada chamada recebe:
   - Como a feature funciona no app original (inventário Fase 1)
   - Como deve ficar no novo app (proposta aprovada Fase 3)
   - Componentes e design system já criados pelo scaffold

3. **`/mobile qa`** — QA final do app completo após todas as features.

`/mobile` executa seu próprio pipeline por scope (TDD com RNTL, Detox E2E, EAS Build).
`/redesign` não continua após a delegação.

**Se app web:** continuar para Fase 5.

---

## Fase 5 — Implementação

> **Emitir:** `▶ [5/7] Implementação`

### Stack de frontend padrão (aplicada em todo redesign web)

O redesign usa o ecossistema frontend completo do kit:

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Design system | shadcn/ui + Tailwind CSS | Componentes acessíveis, tokens de design, tema claro/escuro |
| Ícones | Lucide Icons | Biblioteca consistente, co-designed com shadcn/ui |
| Animações | Framer Motion | Page transitions, micro-interactions, skeleton loaders |
| Forms | React Hook Form + Zod | Validação type-safe com feedback em tempo real |
| Estado global | Zustand ou TanStack Query | Conforme detectado no inventário do app |
| Testes unitários | Vitest + Testing Library | TDD: RED → GREEN → REFACTOR em cada componente |
| Testes E2E | Cypress | Fluxo completo por feature, antes de avançar |
| QA visual | agent-browser via /qa-loop | Verificação com browser real após cada seção |

### Se modo REWRITE

```bash
# Criar nova pasta ao lado do original — nunca dentro
mkdir ../[projeto]-redesign
cd ../[projeto]-redesign
```

Executar em sequência estrita:

#### Passo 1 — Scaffold
```
/scaffold fullstack
```
Gera: estrutura hexagonal, Docker, GitHub Actions (se scale ≥ Product), Git, GitHub repo com sufixo `-redesign`.

#### Passo 2 — Foundation com pipeline /ui completo

```
/ui foundation
```

O `/ui` executa internamente:
1. **Pesquisa visual** — agent-browser em Dribbble / Mobbin / Awwwards para referências do tipo de produto
2. **TDD do design system** — testes para tokens, temas e componentes base antes de implementar
3. **`/frontend-design`** (plugin oficial) — gera layout base, design tokens, tema claro/escuro conforme Fase 3
4. **a11y check** — estrutura semântica, contraste WCAG AA, keyboard nav
5. **browser-qa gate** — agent-browser verifica layout em desktop + mobile antes de avançar

```
⛔ GATE Foundation: /qa-loop (dimensões: qa-design + qa-a11y)
   PASS obrigatório antes de qualquer feature
```

#### Passo 3 — Auth

```
/auth scaffold
```

Replica o sistema de auth do app original. Gate obrigatório:

```
⛔ GATE Auth: /qa-loop (dimensões: qa-backend + qa-security + qa-e2e)
   Se BLOCKER → redesign pausado. Corrigir auth antes de qualquer feature.
```

#### Passo 4 — Features (uma por vez, na ordem do inventário)

Para **cada feature** do inventário (da mais crítica para as secundárias):

```
Contexto obrigatório para o agente de implementação:
  - Como a feature funciona no app original (inventário Fase 1)
  - Como deve ficar no novo app (proposta aprovada Fase 3)
  - Design system + componentes disponíveis (Passo 2)
  - Schema da feature se entidades novas → /dba design antes de implementar
```

**Sequência TDD por feature:**

```
1. Gherkin scenario → tests/bdd/features/[feature].feature
2. Unit tests (RED) → tests/unit/[feature].test.ts
3. Implementação (GREEN) — componentes com shadcn/ui + Lucide + Framer Motion
4. Refactor (REFACTOR) — extrair para componentes reutilizáveis se necessário
5. E2E test → tests/e2e/[feature].cy.ts
```

**Gate por feature:**

```
⛔ PHASE GATE [feature]:
   □ rtk npx vitest run --coverage (unit tests passando)
   □ rtk npx cypress run --spec tests/e2e/[feature].cy.ts
   □ /qa-loop (escopo: [feature], dimensões: qa-design + qa-ux + qa-a11y + qa-e2e)
   □ /browser-qa <url> (navegação exaustiva da feature)
   PASS obrigatório antes de avançar para a próxima feature
   Fix loop automático (máx 3 iterações) → escalar se persistir
```

**Gate de paridade por feature:**

```
PARIDADE [feature]:
  □ Comportamento equivalente ao original?
  □ Dados/integrações funcionam?
  □ Estados (loading / error / empty) implementados?
  □ Responsiva em mobile viewport?
```

### Se modo IN-PLACE

Substituição seção por seção — lógica de negócio intocada:

```
Instalar: shadcn/ui + Tailwind + Lucide + Framer Motion no projeto existente
Criar: design tokens (cores, tipografia, espaçamentos) da proposta Fase 3
```

Sequência de substituição:

```
1. Header / Navbar → gate: /qa-loop (qa-design + qa-ux) + /browser-qa
2. Sidebar / Navegação lateral → gate: /qa-loop + /browser-qa
3. Páginas principais (core do produto) → gate por página
4. Páginas secundárias → gate por página
5. Modais / Drawers / Overlays → gate final
```

**Regras in-place:**
- Nunca tocar arquivos fora de `components/`, `app/` ou `pages/` — lógica de negócio, API routes e serviços permanecem intactos
- Para cada componente substituído: escrever teste de comportamento antes de substituir (garante paridade)
- Se um componente original não tem teste → escrever o teste documentando o comportamento atual antes de substituir

---

## Fase 6 — Verificação de paridade

> **Emitir:** `▶ [6/7] Verificação de paridade`

Comparar sistematicamente o inventário da Fase 1 com o app novo:

```
PARIDADE CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para cada feature do inventário:
  □ Feature existe no novo app?
  □ Comportamento é equivalente ao original?
  □ Dados/integrações funcionam?
  □ Fluxo de usuário completo funciona?

Para cada tela do inventário:
  □ Tela existe no novo app?
  □ Todos os elementos visíveis estão presentes?
  □ Responsiva em mobile?
```

Usar agent-browser no novo app para verificar cada item.
Issues encontrados → fix automático antes de avançar para Fase 7.

---

## Fase 7 — QA final + entrega

> **Emitir:** `▶ [7/7] QA final`

QA completo do app inteiro (não só a última feature):

```
/qa-loop (escopo: app completo, dimensões: qa-design + qa-ux + qa-a11y + qa-code + qa-security + qa-e2e + qa-perf)
```

Seguido de navegação exaustiva com browser real:

```
/browser-qa <url-do-novo-app>
```

O `/browser-qa` crawla toda a UI (menus, fluxos, estados, viewports mobile/desktop) e substitui `qa-e2e` individual.

Fix loop automático até PASS em todas as dimensões.

### Output final

```
REDESIGN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Modo:           REWRITE | IN-PLACE
App original:   [path/url] — intacto ✅
Novo app:       [path/url do redesign]
Stack:          [tecnologias usadas]

Features implementadas: [N]/[N] (100% de paridade)
Telas:          [N] telas

Melhorias de UX aplicadas:
  ✓ [melhoria 1]
  ✓ [melhoria 2]

QA:
  Design:       ✅ PASS
  UX:           ✅ PASS
  A11y:         ✅ PASS
  E2E:          ✅ PASS
  Browser:      ✅ PASS

[Se REWRITE:]
Repo:           github.com/[user]/[projeto]-redesign
Para rodar:     rtk docker compose up -d (na pasta ../[projeto]-redesign)

App legado permanece em [path original] — nenhuma alteração foi feita.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Nunca tocar o app original** sem confirmação explícita — no modo rewrite, trabalha exclusivamente na nova pasta
2. **Proposta de UX antes de código** — nenhuma linha de implementação começa sem aprovação da Fase 3
3. **Paridade é obrigatória** — toda feature do app original deve estar no novo, ou ter sido explicitamente removida com aprovação do usuário
4. **Melhorias de UX são sugestões** — o usuário decide quais aceitar; nada é imposto
5. **Design system do kit** — shadcn/ui + Tailwind + Lucide + Framer Motion como base; `/ui` pipeline para tudo que é visual
6. **TDD em toda implementação** — Gherkin → unit test (RED) → implementação (GREEN) → refactor; nenhum componente sem teste
7. **Gate de qualidade por feature** — `/qa-loop` + `/browser-qa` depois de cada feature; nunca acumular e testar tudo no final
8. **Rewrite para legacy** — AngularJS, Backbone, Ember, jQuery-as-framework → sempre rewrite; nunca tenta migração incremental sem caminho oficial
9. **Mobile detectado → /mobile scaffold + feature** — apps React Native / Expo delegam para `/mobile scaffold` (nova foundation) seguido de `/mobile feature` por feature (reimplementação), depois `/mobile qa` (gate final)
