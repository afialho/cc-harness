---
name: ui
description: Full UI quality pipeline. Orchestrates design research → contract → TDD → official frontend-design plugin (generation) → enforce standards → accessibility → performance → browser-qa gate. Use this for any component or page that needs production quality.
disable-model-invocation: true
argument-hint: <component or page>
---

# /ui — UI Quality Pipeline

> Orquestrador de qualidade para frontend.
> O plugin oficial `frontend-design` é o engine de geração — esta skill define o que gerar, garante TDD, enforça padrões e faz o gate final com browser-qa.
>
> Fluxo: pesquisa real → contrato de design → testes failing → **geração via plugin oficial** → enforcement → acessibilidade → performance → browser-qa

---

## Phase 0 — Design Reference Research

> **Emit:** `▶ [0/9] Design Reference Research`
> **Token budget: ~6k** — 3-5 referências máximo.

Esta fase é OBRIGATÓRIA. Designs sem referências reais resultam em AI slop.

### 0.1 — Context Brief

Definir antes de pesquisar:
- Tipo de produto: SaaS dashboard / landing page / e-commerce / ferramenta dev / consumer app / etc.
- Público-alvo: devs / consumidores / empresas / criadores
- Tom desejado: moderno/técnico · elegante/refinado · playful · minimalista · bold
- Palavras-chave: `[tipo]-[tom]` ex: `saas-dashboard dark`, `fintech minimal`

### 0.2 — Deep Design Research

**Agente: design-researcher**

```
Tool: vercel:agent-browser
Token budget: 4k

Pesquisar nesta ordem, parar com 5 referências de qualidade:
1. Dribbble  → dribbble.com/search/[keywords]
2. Awwwards  → awwwards.com/websites/[category]
3. Behance   → behance.net/search/projects?field=ui-ux&search=[keywords]
4. Mobbin    → mobbin.com/screens?platform=web&keyword=[keywords]
5. Layers.to → layers.to

Por referência documentar:
- Palette de cores (hex dos 3-4 dominantes)
- Tipografia (fontes visíveis)
- Layout pattern
- Elemento de destaque (o que torna memorável)
- Aplicabilidade ao projeto

Output: DESIGN_REFS.md
```

### 0.3 — Síntese

Ler DESIGN_REFS.md e extrair:
- **Paleta**: hex mais frequentes e bonitos entre as referências
- **Tipografia**: fontes das referências ou equivalentes no Google Fonts
- **Layout pattern**: padrão mais recorrente adaptado ao projeto
- **Elemento signature**: um elemento visual específico e memorável

---

## Phase 1 — Context + Design Direction

> **Emit:** `▶ [1/9] Context + Design Direction`

Comprometer-se com uma **direção estética clara e intencional**:

1. **Propósito**: Que problema resolve? Quem usa?
2. **Tom** — escolher um extremo e executar com precisão:
   - Brutalmente minimal · maximalismo caótico · retro-futurista
   - Orgânico/natural · luxo/refinado · playful/lúdico
   - Editorial/magazine · brutalista/raw · art déco/geométrico
   - Suave/pastel · industrial/utilitário
3. **Diferencial**: O que tornará este design INESQUECÍVEL?
4. **Dados**: Quais entidades de domínio são exibidas ou mutadas?
5. **Constraints**: Framework, performance, acessibilidade.

**Regra crítica**: maximalismo bold e minimalismo refinado funcionam igualmente — o que não funciona é indefinição. Escolher e executar com precisão.

---

## Phase 2 — Design Contract

> **Emit:** `▶ [2/9] Design Contract`

```
COMPONENT: [Name]
Aesthetic direction: [ex: "brutalista com acentos âmbar quente"]
Purpose: [o que o usuário conquista]
Variants: [default, loading, error, empty]
States: [hover, focus, active, disabled]
Props/API:
  - [prop]: [type] — [purpose]
Data: [entidades de domínio envolvidas]
Accessibility:
  - ARIA role: [role]
  - Keyboard nav: [tab order, shortcuts]
  - Screen reader: [announcements]
Responsive:
  - Mobile (< 768px): [layout]
  - Tablet (768–1024px): [layout]
  - Desktop (> 1024px): [layout]
```

---

## Phase 3 — Component Hierarchy

> **Emit:** `▶ [3/9] Component Hierarchy`

```
Page/Container (smart — fetch data, manage state)
└── Layout
    ├── Header/Navigation
    ├── Main Content
    │   ├── [PrimaryComponent]
    │   │   ├── [SubComponent A]
    │   │   └── [SubComponent B]
    └── Sidebar/Footer (se aplicável)
```

- **Smart** (containers): buscam dados, gerenciam estado, despacham eventos
- **Dumb** (presentational): recebem props, renderizam UI, emitem eventos

---

## Phase 4 — TDD: Write Failing Tests First

> **Emit:** `▶ [4/9] TDD — Testes antes do código`

Escrever testes ANTES de invocar o plugin de geração. Os testes definem o contrato; o plugin deve gerar código que os passe.

```typescript
// Unit tests (component-level)
describe('[ComponentName]', () => {
  it('renders correctly with required props')
  it('shows loading state when isLoading=true')
  it('shows error state when error is set')
  it('shows empty state when data is empty')
  it('fires correct events on user interaction')
  it('matches design contract: [variant] variant renders correctly')
})

// Integration
it('fetches and displays data end-to-end')

// Cypress E2E
// Full user flow involving this component
```

Rodar: `rtk npx jest [component].test.tsx` — confirmar que falham (RED).

---

## Phase 5 — Generate via Official Plugin

> **Emit:** `▶ [5/9] Geração — plugin oficial`

**Invocar o plugin oficial `frontend-design` via Skill tool**, passando como argumento o contexto completo das fases anteriores:

```
Argumento para frontend-design:

Componente: [nome do componente/página]

Direção estética: [direção definida na Fase 1]
Referências: [síntese do DESIGN_REFS.md — paleta, tipografia, elemento signature]

Design contract:
[colar o contrato completo da Fase 2]

Hierarquia:
[colar a hierarquia da Fase 3]

Stack obrigatória:
- shadcn/ui + Tailwind CSS + Framer Motion
- Lucide React para ícones (nunca emojis como ícones de UI)
- Skeleton screens para loading (não spinners em conteúdo com forma)
- Rive para animações stateful, Lottie para decorativas

Constraints de qualidade:
- NUNCA: Arial, Inter, Roboto, system fonts
- NUNCA: gradiente roxo em fundo branco ou paleta tímida distribuída igualmente
- NUNCA: emojis como ícones funcionais
- NUNCA: misturar estilos de ícone (outline + filled)
- SEMPRE: prefers-reduced-motion respeitado
- SEMPRE: estados completos (loading, error, empty, populated)
- SEMPRE: atmosfera e profundidade no background (não cor sólida genérica)
```

Após a geração, verificar se os testes da Fase 4 passam. Se não → ajustar até GREEN.

---

## Phase 6 — Enforce Standards

> **Emit:** `▶ [6/9] Enforce — padrões de qualidade`

Revisar o código gerado e corrigir qualquer violação:

**Icons:**
- [ ] Sem emojis como ícone funcional — substituir por Lucide, Font Awesome ou Unicons
- [ ] Estilos de ícone consistentes (outline OU filled, não misturado)
- [ ] Ícone + label quando há espaço (não ícone isolado sem acessibilidade)

**Animations:**
- [ ] `prefers-reduced-motion` implementado
- [ ] Loading states: skeleton screen em conteúdo com forma, não spinner
- [ ] Transições existem onde o estado muda (nenhum elemento aparece/desaparece em 0ms)
- [ ] Micro-animations apenas onde agregam valor (não em todo elemento)
- [ ] Botão tem feedback de press (`scale(0.97)` ou equivalente)

**Hexagonal Architecture:**
- [ ] Componentes presentacionais não buscam dados diretamente
- [ ] Smart containers usam use cases via hooks, não chamam API diretamente
- [ ] Nenhum `import` de `infrastructure/` dentro de componentes de `screens/` ou `components/`

**Anti-patterns:**
- [ ] Sem `<div>` como botão — usar `<button>`
- [ ] Sem `onClick` sem equivalente de teclado
- [ ] Sem conditional render aninhado > 2 níveis (extrair componente)
- [ ] Sem estado que pode ser derivado de props
- [ ] Sem strings hardcoded (usar constantes ou i18n keys)
- [ ] Sem estilos inline além de valores dinâmicos

---

## Phase 7 — Accessibility

> **Emit:** `▶ [7/9] Acessibilidade`

- [ ] Todo interativo alcançável por teclado (Tab)
- [ ] Focus visível (não removido por CSS)
- [ ] Imagens têm atributo `alt`
- [ ] Formulários têm `<label>` associado
- [ ] ARIA roles corretos (`role="button"`, `role="dialog"`, etc.)
- [ ] Erros anunciados para screen readers
- [ ] Cor não é único meio de transmitir informação
- [ ] Contraste WCAG AA mínimo (4.5:1 para texto)
- [ ] Touch targets ≥ 44×44px

---

## Phase 8 — Performance

> **Emit:** `▶ [8/9] Performance`

- [ ] Imagens otimizadas (WebP/AVIF, lazy load, tamanho correto)
- [ ] Sem layout shift (CLS < 0.1)
- [ ] Listas longas (> 100 itens) virtualizadas
- [ ] Cálculos caros memoizados
- [ ] Event listeners limpos no unmount
- [ ] Sem re-renders desnecessários

---

## Phase 9 — browser-qa Gate

> **Emit:** `▶ [9/9] browser-qa gate`

```
⛔ GATE /ui:
  □ Testes unitários: 0 failures
  □ Cypress E2E: 0 failures
  □ Acessibilidade: checklist Phase 7 passou
  □ Performance: checklist Phase 8 passou
  □ Enforcement: checklist Phase 6 passou (sem violações)
```

**Invocar `/browser-qa`** na URL do componente/página para verificação visual exaustiva.

Fix loop automático (máx 3 iterações) antes de escalar ao usuário.
Só avançar quando todos os itens estiverem PASS.
