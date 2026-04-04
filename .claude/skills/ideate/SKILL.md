---
name: ideate
description: Collaborative idea refinement. Interviews the user to extract requirements, maps features, defines MVP scope, detects project size, and produces a structured brief ready for /build.
disable-model-invocation: true
argument-hint: <raw idea or just a few words>
---

# /ideate — Ideia → Brief Estruturado

> Skill de ideação colaborativa.
> Transforma uma ideia vaga em um brief preciso com features mapeadas, MVP definido, escopo dimensionado e contexto pronto para o `/build`.

---

## Visão geral do pipeline

```
/ideate <ideia bruta>
    │
    ├─ [1/5] Absorção
    │         └─ Lê a ideia, identifica domínio, formula entendimento inicial
    │
    ├─ [2/5] Entrevista
    │         └─ ⏸ PAUSA: 5-7 perguntas certeiras → aguarda respostas do usuário
    │             (pode ter rodadas adicionais se respostas abrem novos ângulos)
    │
    ├─ [3/5] Mapeamento de Features
    │         └─ ⏸ PAUSA: propõe feature list completa → usuário aprova / ajusta
    │
    ├─ [4/5] Definição de Escopo
    │         └─ ⏸ PAUSA: propõe MVP + roadmap faseado → usuário confirma
    │
    └─ [5/5] Brief Final
              └─ Gera IDEAS.md e apresenta handoff para /build
```

Cada pausa é obrigatória. Nunca avançar de fase sem resposta explícita do usuário.

---

## Fase 1 — Absorção

> **Emitir:** `▶ [1/5] Absorção da ideia`

Recebe a ideia bruta (pode ser 3 palavras ou 3 parágrafos) e:

### 1.1 — Identifica domínio e tipo

Classifica a ideia em:

**Domínio:**
- Produtividade / gestão de tarefas
- E-commerce / marketplace
- SaaS / ferramenta B2B
- Rede social / comunidade
- Saúde / bem-estar
- Finanças / fintech
- Educação / e-learning
- Entretenimento / mídia
- Developer tooling
- Outro: [inferido da ideia]

**Tipo de app:**
- Web app (frontend + backend)
- API / backend only
- Mobile first
- CLI tool
- Integração / automação

**Analogias conhecidas** (máx 3):
Identifica produtos existentes que se parecem com a ideia. Usados apenas como referência de vocabulário — não para copiar.

### 1.2 — Reformula em linguagem técnica

Apresenta ao usuário:

```
ENTENDIMENTO INICIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ideia:        [nome curto sugerido]
Domínio:      [domínio identificado]
Tipo:         [tipo de app]
Análogo a:    [produto A] + [produto B] (se relevante)

Em uma frase: [o que o usuário conquista com esse produto]

O que parece ser o núcleo:
  • [comportamento central 1]
  • [comportamento central 2]
  • [comportamento central 3, se evidente]
```

### 1.3 — Avança direto para Fase 2

Sem pedir confirmação aqui — a entrevista vai validar ou corrigir o entendimento.

---

## Fase 2 — Entrevista

> **Emitir:** `▶ [2/5] Entrevista`

### 2.0 — Adaptar ao modo de operação

O modo é herdado do `/build` (se chamado via build) ou detectado do argumento (se chamado direto):

| Modo | Comportamento na entrevista |
|------|----------------------------|
| **autonomous** (default) | 2-3 perguntas macro: scale, must-have absoluto, constraint crítico. AI define feature set a partir da pesquisa. |
| **guided** | 5-7 perguntas detalhadas (comportamento padrão abaixo). Usuário define features. |

Detecção: argumento contém `guided`, `guiado`, `me pergunte` → guided. Caso contrário → autonomous.

**Se autonomous:** selecionar apenas perguntas de "Escala e ambição" (obrigatória) + 1-2 de "Problema e usuário" ou "Features e diferencial". Máximo 3 perguntas. A pesquisa (Fase 1 do /build) + Product Discovery Agent definirão o feature set.

**Se guided:** seguir o fluxo completo abaixo (5-7 perguntas).

### 2.1 — Seleciona perguntas

Com base no domínio e tipo identificados, seleciona **5 a 7 perguntas** do banco abaixo (modo guided) ou **2 a 3** (modo autonomous).
Nunca fazer mais de 7 perguntas em uma rodada. Priorizar as mais decisivas para o escopo.

**Banco de perguntas por categoria:**

**Problema e usuário (sempre incluir pelo menos 2):**
- Qual problema específico você está resolvendo? O que acontece hoje sem esse produto?
- Quem é o usuário principal? (perfil, contexto de uso, nível técnico)
- Existe um usuário secundário ou admin além do usuário final?
- Você já teve esse problema pessoalmente, ou está resolvendo para outros?

**Escala e ambição (sempre incluir pelo menos 1 — a primeira é obrigatória):**
- Qual é o scale deste projeto? **MVP** (validar ideia, sem infra completa) / **Product** (vai para mercado, precisa de CI/CD e qualidade) / **Scale** (produto com tração, precisa de observabilidade e resiliência)?
- Você tem expectativa de quantos usuários no início? (10, 100, 10.000, mais?)
- Isso é um projeto pessoal / hobby, ou tem intenção comercial?

**Features e diferencial (sempre incluir pelo menos 1):**
- Quais são as 3 coisas que esse produto PRECISA fazer para ser útil? (sem elas, não tem produto)
- O que ele NÃO precisa fazer na primeira versão?
- Qual é o diferencial em relação ao que já existe?

**Técnico e constraints (incluir se sinais técnicos aparecerem na ideia):**
- Tem preferência de stack? (linguagem, framework, banco)
- Precisa integrar com algum serviço externo? (pagamentos, auth, APIs)
- Tem constraint de prazo ou budget?
- Vai ser open source ou closed source?

**Contexto adicional (incluir se domínio for especializado):**
- Tem alguma regra de negócio ou compliance específico do domínio?
- Existe alguma terminologia do setor que preciso entender?

### 2.2 — Apresenta as perguntas

Formato:

```
Tenho [N] perguntas para entender melhor o que você quer construir:

1. [pergunta]
2. [pergunta]
...
N. [pergunta]

Pode responder na ordem que preferir, e se quiser pular alguma, tudo bem.
```

**Aguarda respostas do usuário antes de continuar.**

### 2.3 — Avalia as respostas

Após receber as respostas:

- Se as respostas revelam novos ângulos importantes → faz **1 rodada adicional** com no máximo 3 perguntas de follow-up. Não fazer mais de 2 rodadas totais.
- Se há ambiguidade crítica que impediria o mapeamento de features → esclarece antes de avançar.
- Se as respostas são suficientes → avança direto para a Fase 3.

### 2.4 — Consolida o contexto

Internamente (não exibir ao usuário), consolida:

```
contexto_entrevista = {
  problema: [o que foi dito],
  usuario_principal: [perfil],
  usuario_secundario: [se houver],
  mvp_ambicao: [rapido | completo],
  escala_esperada: [micro | pequena | media | grande],
  must_have: [lista do que não pode faltar],
  nice_to_have: [lista do que pode ficar para depois],
  diferencial: [o que torna único],
  stack_hints: [se mencionou],
  integracoes: [se mencionou],
  constraints: [prazo, budget, etc],
  dominio_especializado: [regras, terminologia],
}
```

---

## Fase 3 — Mapeamento de Features

> **Emitir:** `▶ [3/5] Mapeamento de features`

### 3.1 — Gera feature list completa

Com base no contexto consolidado da entrevista, gera a lista completa de features que o produto pode ter.

Organiza em 3 camadas:

**NÚCLEO (must-have para o produto existir):**
Features sem as quais o produto não tem proposta de valor. Geralmente 3-6 features.

**ESSENCIAL (necessário para ser competitivo):**
Features que um usuário esperaria encontrar após o núcleo. Geralmente 4-8 features.

**EXTENSÃO (diferencial e crescimento):**
Features que tornam o produto mais completo ou escalável. Podem ficar para versões futuras.

### 3.2 — Apresenta para o usuário

Formato:

```
FEATURE MAP — [Nome do Produto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NÚCLEO (sem essas, não tem produto)
  [ ] [Feature 1] — [uma linha explicando o que faz]
  [ ] [Feature 2] — [...]
  [ ] [Feature 3] — [...]

ESSENCIAL (para ser um produto completo)
  [ ] [Feature 4] — [...]
  [ ] [Feature 5] — [...]
  [ ] [Feature 6] — [...]

EXTENSÃO (diferencial / crescimento)
  [ ] [Feature 7] — [...]
  [ ] [Feature 8] — [...]

Dependências importantes:
  • [Feature B] depende de [Feature A]
  • [Feature D] depende de [Feature C]

Total: [N] features identificadas
```

### 3.3 — Pede aprovação

```
Esse mapeamento faz sentido para o que você quer construir?

Você pode:
  • Aprovar o mapeamento → "ok" / "aprovado" / "sim"
  • Remover features → "remove [X]"
  • Adicionar features → "adiciona [X]"
  • Mover entre camadas → "move [X] para núcleo"
  • Renomear → "renomeia [X] para [Y]"
  • Ajuste livre → descreva o que mudar
```

**Aguarda resposta do usuário antes de continuar.**

Aceita o mapeamento e avança quando o usuário aprovar (inclui "sim", "ok", "pode ir", "aprovado", "vamos").
Se o usuário pedir ajustes: incorpora e apresenta novamente até aprovação.

---

## Fase 4 — Definição de Escopo

> **Emitir:** `▶ [4/5] Definição de escopo`

### 4.1 — Detecta o porte do projeto

Com base no feature map aprovado + sinais da entrevista, classifica o projeto:

| Porte | Features totais | Complexidade | Protocolo recomendado |
|-------|-----------------|--------------|----------------------|
| **Micro** | 1-4 | Simples (CRUD, sem integrações) | `/feature-dev` direto |
| **Pequeno** | 5-10 | Moderada (algumas integrações) | `/build` feature por feature |
| **Médio** | 11-25 | Alta (múltiplas integrações, roles) | `/build` + `/agent-teams` em features complexas |
| **Grande** | 26+ | Muito alta (multi-tenant, escala) | `/build` faseado + `/agent-teams` + múltiplos worktrees |

### 4.2 — Define MVP

O MVP é a menor versão que valida a proposta de valor central.

Regras para o MVP:
- Incluir **todas** as features do NÚCLEO (se o porte permitir)
- Para porte Grande/Médio: pode dividir o NÚCLEO em MVP-1 e MVP-2
- Incluir features ESSENCIAIS que desbloqueiam o núcleo (ex: auth sempre vai junto)
- Máximo 8 features no MVP-1

### 4.3 — Propõe roadmap faseado

Para projetos Médios e Grandes, divide em fases de entrega:

```
MVP (Fase 1) — [N] features → produto funciona
  [lista das features MVP]

Fase 2 — [N] features → produto é completo
  [lista das features essenciais restantes]

Fase 3 — [N] features → produto é competitivo
  [lista das features de extensão]
```

Para projetos Micro e Pequenos, não há fases — tudo vai no MVP.

### 4.4 — Apresenta ao usuário

```
ESCOPO DEFINIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Porte:        [Micro | Pequeno | Médio | Grande]
Protocolo:    [protocolo recomendado]

MVP — o que será construído primeiro:
  ✓ [Feature 1]
  ✓ [Feature 2]
  ...

[Se houver fases adicionais:]
Fase 2 (pós-MVP):
  ○ [Feature N]
  ...

Fase 3 (longo prazo):
  ○ [Feature N]
  ...

Para começar, vou focar no MVP ([N] features).
```

### 4.5 — Pede confirmação

```
Esse escopo reflete o que você quer construir primeiro?

Confirme com "sim" ou ajuste o que precisar.
```

**Aguarda confirmação antes de continuar.**

---

## Fase 5 — Brief Final

> **Emitir:** `▶ [5/5] Brief final`

### 5.1 — Gera IDEAS.md

Cria `IDEAS.md` na raiz do projeto com toda a informação estruturada:

```markdown
# IDEAS.md — [Nome do Produto]

> Gerado por /ideate em [data]

## Visão do produto

**Em uma frase:** [proposta de valor]

**Problema:** [problema que resolve]

**Usuário principal:** [perfil]
**Usuário secundário:** [se houver]

**Diferencial:** [o que torna único]

---

## Context da entrevista

**Must-have:** [lista do que não pode faltar]
**Nice-to-have:** [lista do que pode esperar]
**Scale:** MVP | Product | Scale (determina infra, CI/CD, observabilidade)
**Constraints:** [prazo, budget, stack, compliance]
**Integrações:** [serviços externos mencionados]

---

## Feature Map aprovado

### NÚCLEO
- [Feature 1]: [descrição]
- [Feature 2]: [descrição]

### ESSENCIAL
- [Feature N]: [descrição]

### EXTENSÃO
- [Feature N]: [descrição]

### Dependências
- [Feature B] depende de [Feature A]

---

## Escopo confirmado

**Porte:** [Micro | Pequeno | Médio | Grande]

### MVP (construir agora)
- [Feature 1]
- [Feature 2]

### Fase 2 (pós-MVP)
- [Feature N]

### Fase 3 (longo prazo)
- [Feature N]

---

## Stack e integrações

**Stack hints:** [se mencionado, caso contrário: "nenhuma preferência — a ser definido na pesquisa"]
**Integrações externas:** [lista ou "nenhuma identificada"]
**Domínio especializado:** [regras ou "nenhuma"]

---

## Analogias de referência

[produto A]: [o que aproveitar como referência]
[produto B]: [o que aproveitar como referência]
```

### 5.2 — Apresenta o brief ao usuário

```
BRIEF GERADO — [Nome do Produto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Produto:      [nome]
Porte:        [porte]
MVP:          [N] features
Arquivo:      IDEAS.md

O que será construído no MVP:
  [lista das features MVP, uma por linha]

[Se houver integrações:]
Integrações identificadas:
  [lista]

[Se houver constraints relevantes:]
Constraints:
  [lista]
```

### 5.3 — Pergunta sobre o próximo passo

```
IDEAS.md está pronto. Próximo passo: iniciar o build.

Para começar:
  /build IDEAS.md

O /build vai pesquisar, planejar e implementar o MVP que definimos.
Quer iniciar agora?
```

Se o usuário disser "sim" / "pode ir" / "bora" / "inicia" → chama `/build IDEAS.md` automaticamente.
Se o usuário quiser revisar algo antes → aguarda instrução.

---

## Regras gerais

1. **Nunca assuma** — o que não foi dito explicitamente, pergunta na entrevista.
2. **Pausas são sagradas** — cada fase com ⏸ exige resposta do usuário antes de avançar.
3. **Sem julgamentos sobre a ideia** — o papel do /ideate é clarificar, não filtrar.
4. **MVP sempre existe** — mesmo para projetos grandes, há um MVP. Sem MVP, não há handoff.
5. **Porte determina protocolo** — não tratar um projeto grande como um pequeno, nem o contrário.
6. **IDEAS.md é o artefato** — toda a conversa se consolida nesse arquivo. É o input do /build.
7. **Perguntas objetivas** — nada de perguntas filosóficas ou abertas demais. Cada pergunta deve desbloquear uma decisão concreta de produto.

---

## Tratamento de ideias vagas

| Situação | Comportamento |
|----------|---------------|
| Ideia com 1-3 palavras ("tipo o Spotify") | Absorção infere domínio + analogia, entrevista começa com perguntas de problema |
| Ideia muito técnica (sem usuário definido) | Entrevista prioriza perguntas de usuário e problema |
| Ideia com tudo definido (doc completo) | Absorção confirma entendimento, entrevista pode ter apenas 2-3 perguntas de validação |
| Ideia fora do escopo de software | Informa gentilmente e pergunta se há um produto digital por trás |
| Ideia com contradições | Sinaliza a contradição na entrevista e pede esclarecimento |

---

## Sinais de porte — referência

| Sinal | Porte provável |
|-------|---------------|
| "um app simples", "para mim mesmo", "testar uma ideia" | Micro |
| "lançar logo", "MVP em semanas", "produto para clientes" | Pequeno |
| "plataforma", "múltiplos usuários com roles", "dashboard" | Médio |
| "marketplace", "multi-tenant", "escalar para muitos usuários" | Grande |
| Analogia com Spotify, Zendesk, Salesforce, Notion | Grande |
| Analogia com Todoist, Notion para uso pessoal | Pequeno-Médio |

---

## Context Budget

Ideação envolve múltiplas rodadas de interação com o usuário — contexto cresce com cada resposta.

**Checkpoint triggers:**
- Após [3/5] Mapeamento de Features aprovado: checkpoint obrigatório (maior consumo de contexto até aqui)
- Se contexto estimado atingir ~60k tokens em qualquer fase: checkpoint imediato

**Formato do checkpoint:**
```
skill: /ideate
fase: [absorção | entrevista | mapeamento | escopo | entrega]
ideia: [resumo da ideia]
respostas_coletadas: [N de N]
features_mapeadas: [sim/não + resumo]
proximo: [próximo passo exato]
```

Emitir: `↺ Contexto ~60k — checkpoint escrito. Recomendo /compact. Use /resume para retomar /ideate na fase [N/5].`
