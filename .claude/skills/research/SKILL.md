---
name: research
description: Topic-agnostic parallel research wave. Launches specialized agents (Business/Market, API/Docs, Architecture, Domain/Rules, Implementations, YouTube) based on topic type. Produces RESEARCH.md consumed by /build (planning phase).
disable-model-invocation: true
argument-hint: <topic or feature to research>
---

# /research — Parallel Research Wave

Deep, multi-source research before any planning or code is written.
Real agents. Real searches. Real output.

> A pesquisa leva tempo mas é o que garante qualidade real no output final.

---

## How it works

```
/research <tópico>
    │
    ├─ Phase 0: Entender o tópico (Claude, sem agentes)
    │
    ├─ Phase 1: Wave de pesquisa paralela (até 4 agentes simultâneos)
    │           ├─ Agente Business/Market     (se feature de produto com usuários ou mercado identificável)
    │           ├─ Agente API/Docs            (se há integração com serviço externo ou API)
    │           ├─ Agente Architecture/Backend (se há lógica de servidor, BD, cache ou fila)
    │           ├─ Agente Domain/Rules        (se domínio especializado ou regras de negócio complexas)
    │           ├─ Agente Implementações      (sempre)
    │           └─ Agente YouTube             (se tópico tem probabilidade de tutoriais técnicos relevantes)
    │
    ├─ Phase 2: Agregação → RESEARCH.md gerado no projeto
    │
    ├─ Resumo de 5–10 linhas dos principais achados
    │
    └─ 3–5 perguntas de clarificação → aguarda resposta antes de indicar pronto para /build (planning phase)
```

---

## Phase 0 — Entender o tópico

> **Emit:** `▶ [1/3] Entendendo o tópico`

Antes de lançar qualquer agente, analise o tópico recebido e determine:

1. **Categoria:** É uma feature de produto? Uma integração com API externa? Um serviço ou backend? Um domínio regulado ou especializado? Um conceito arquitetural?
2. **Objetivo principal:** O que o usuário quer construir ou entender? Qual o resultado esperado?
3. **Dimensões de pesquisa relevantes:** Com base no tópico, decida quais agentes lançar usando as 6 dimensões abaixo. **Máximo 4 agentes por wave.** Se 5 ou mais dimensões forem relevantes, priorize os 4 mais impactantes para o tópico.

**Critérios de seleção:**

```
Lança Business/Market quando:
  - Feature de produto com usuários finais
  - Há concorrentes claros no mercado
  - Feature tem impacto em conversão, retenção ou monetização

Lança API/Docs quando:
  - Feature integra com serviço externo (Stripe, SendGrid, Twilio, etc.)
  - Há uma API de terceiro mencionada ou implícita
  - Feature consome ou expõe uma API REST/GraphQL/gRPC

Lança Architecture/Backend quando:
  - Feature tem lógica de servidor, banco de dados, cache ou fila
  - Decisões de escalabilidade são relevantes
  - Feature é um serviço, worker ou job

Lança Domain/Rules quando:
  - Feature opera em domínio especializado (fintech, healthtech, e-commerce, etc.)
  - Há regras de negócio não-óbvias envolvidas
  - O vocabulário do domínio precisa ser entendido antes de implementar

Lança Implementações: sempre

Lança YouTube: quando há probabilidade de tutoriais técnicos relevantes
```

Emita uma linha de contexto antes de iniciar a wave:

```
Tópico:    [tópico identificado]
Categoria: [Product Feature | API Integration | Backend Service | Domain/Rules | Architecture | Other]
Agentes:   [lista dos agentes que serão lançados e por quê — máximo 4]
```

---

## Phase 1 — Wave de pesquisa paralela

> **Emit:** `▶ [2/3] Pesquisa paralela em andamento`

Lance os agentes selecionados **em paralelo** usando o Agent tool com:
- `subagent_type: "general-purpose"`
- `run_in_background: false`
- Todos os agentes recebem o mesmo contexto de entrada (tópico + categoria)

Aguarde todos completarem antes de prosseguir para Phase 2.

---

### Agente Business/Market

**Lançar quando:** Qualquer feature de produto com usuários finais, quando há concorrentes claros no mercado, ou quando a feature tem impacto em conversão, retenção ou monetização.

**Prompt para o agente:**

```
Você é um pesquisador especializado em análise de mercado e produto.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é entender como o mercado resolve este problema: concorrentes, demandas dos usuários,
modelos de negócio e tendências relevantes.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- Product Hunt: WebSearch "site:producthunt.com [tópico]" → WebFetch nas páginas mais relevantes
- G2: WebSearch "site:g2.com [tópico] reviews" → WebFetch nas páginas de categoria
- App Store / Google Play: WebSearch "[tópico] app reviews site:apps.apple.com OR site:play.google.com"
- Hacker News: WebSearch "site:news.ycombinator.com [tópico]" → WebFetch nas threads relevantes
- Reddit: WebSearch "site:reddit.com [tópico] [setor]" → WebFetch nos posts mais votados
- LinkedIn / blogs do setor: WebSearch "[tópico] [setor] trends 2024 2025"
- Fallback: WebSearch "[tópico] competitors comparison market 2024 2025"

Para cada referência encontrada, extraia:
1. URL da fonte
2. Como o produto ou empresa aborda o problema
3. O que os usuários elogiam e reclamam (se reviews)
4. Modelo de negócio ou pricing identificado (se aplicável)
5. Gaps ou oportunidades identificados em relação ao tópico

Retorne no máximo 2000 tokens com:
- 3 a 5 referências concretas com URLs reais
- Resumo de como o mercado aborda o problema hoje
- Funcionalidades mais pedidas / mais reclamadas pelos usuários
- Gaps identificados nos concorrentes
- Tendências do mercado para o tipo de feature

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente API/Docs

**Lançar quando:** A feature envolve integração com serviço externo, API de terceiro mencionada ou implícita, ou feature que consome ou expõe uma API REST/GraphQL/gRPC.

**Prompt para o agente:**

```
Você é um pesquisador especializado em documentação de APIs e integrações técnicas.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é mapear os endpoints, autenticação, SDKs e limitações da API ou serviço externo
relevante para este tópico.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- Documentação oficial da API mencionada: WebFetch na URL docs oficial + WebSearch "[api] documentation [versão]"
- Changelog oficial: WebSearch "[api] changelog release notes" → WebFetch para identificar versão atual
- Status page: WebSearch "[api] status page uptime" → WebFetch para histórico de incidentes
- GitHub da API: WebSearch "site:github.com [api provider] sdk" → WebFetch no README e issues abertos
- RapidAPI: WebSearch "site:rapidapi.com [tópico]" → WebFetch nas páginas relevantes
- Postman Collections públicas: WebSearch "[api] postman collection" → WebFetch se disponível
- Fallback: WebSearch "[api] rate limits authentication endpoints 2024 2025"

Para cada API ou serviço encontrado, extraia:
1. URL da documentação oficial
2. Endpoints relevantes com estrutura de request/response (se disponível)
3. Método de autenticação (API key, OAuth, JWT, etc.)
4. Rate limits e limites do plano gratuito vs. pago
5. Versão atual da API (está deprecada? há v2 ou versão nova?)
6. SDKs oficiais disponíveis e linguagens suportadas
7. Erros comuns documentados ou issues abertos no GitHub

Retorne no máximo 2000 tokens com:
- Endpoints mais relevantes com estrutura resumida
- Autenticação necessária e como configurá-la
- SDKs oficiais disponíveis (com links)
- Rate limits e limitações conhecidas
- Versão atual e status de deprecação
- Issues ou erros comuns reportados

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente Architecture/Backend

**Lançar quando:** Features de backend, services, APIs, banco de dados, queue, cache; quando decisões de escalabilidade são relevantes; ou quando a feature é um serviço, worker ou job.

**Prompt para o agente:**

```
Você é um pesquisador especializado em arquitetura de software e sistemas backend.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar padrões de design, trade-offs documentados e referências de arquitetura
em produção para este tipo de problema.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- Martin Fowler's blog: WebSearch "site:martinfowler.com [tópico]" → WebFetch nos artigos encontrados
- AWS Architecture Blog: WebSearch "site:aws.amazon.com/blogs/architecture [tópico]"
- Google Cloud Blog: WebSearch "site:cloud.google.com/blog [tópico]"
- High Scalability: WebSearch "site:highscalability.com [tópico]" → WebFetch nos posts relevantes
- InfoQ: WebSearch "site:infoq.com [tópico] architecture" → WebFetch nos artigos relevantes
- GitHub (projetos de referência): WebSearch "site:github.com [tópico] architecture example production"
- Fallback: WebSearch "[tópico] design patterns scalability trade-offs production 2024 2025"

Para cada referência encontrada, extraia:
1. URL da fonte
2. Padrão de design ou abordagem arquitetural descrita (CQRS, Event Sourcing, Saga, etc.)
3. Trade-offs documentados entre abordagens
4. Schema de banco de dados ou modelo de dados para entidades similares (se disponível)
5. Estratégias de cache e performance para o caso de uso
6. Escala reportada (se menciona volume, RPS, latência, etc.)

Retorne no máximo 2000 tokens com:
- Padrões recomendados para o tipo de problema com justificativa
- Trade-offs por abordagem (simplicidade vs. escalabilidade, consistência vs. disponibilidade, etc.)
- Schemas ou modelos de dados relevantes encontrados
- Referências de implementação em produção com métricas quando disponíveis
- 1-2 recomendações diretas com base nas referências

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente Domain/Rules

**Lançar quando:** Features com regras de negócio complexas, domínios regulados (financeiro, saúde, jurídico), ou quando o domínio tem terminologia específica que precisa ser entendida antes de implementar.

**Prompt para o agente:**

```
Você é um pesquisador especializado em regras de negócio e domínios especializados.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é mapear a terminologia do domínio, regras de negócio consolidadas, regulações
aplicáveis e edge cases conhecidos para este tipo de feature.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- Documentação oficial do setor: WebSearch "[setor/domínio] official documentation standards"
- RFCs relevantes: WebSearch "RFC [tópico]" → WebFetch nos documentos encontrados
- Wikipedia (conceitos do domínio): WebFetch "https://en.wikipedia.org/wiki/[conceito]" para definições
- Legislação aplicável: WebSearch "[tópico] regulation compliance law [país/região]" se relevante
- Documentação de ERP/sistemas consolidados: WebSearch "SAP [tópico] OR Salesforce [tópico] model"
- Fallback: WebSearch "[domínio] business rules terminology glossary best practices"

Para cada referência encontrada, extraia:
1. URL da fonte
2. Definições e terminologia do domínio relevante para o tópico
3. Regras de negócio consolidadas no setor
4. Regulações ou requisitos de compliance aplicáveis
5. Edge cases conhecidos ou situações excepcionais documentadas
6. Como sistemas consolidados modelam entidades similares

Retorne no máximo 2000 tokens com:
- Glossário compacto dos termos mais relevantes (máximo 10 termos com definição de 1-2 linhas cada)
- Regras de negócio identificadas que impactam a implementação
- Edge cases do domínio que precisam ser tratados
- Referências normativas ou regulatórias aplicáveis (se houver)
- Como sistemas de referência do mercado (SAP, Salesforce, etc.) abordam entidades similares

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente Implementações de Referência

**Lançar quando:** Sempre. Este agente é lançado para todos os tópicos.

**Prompt para o agente:**

```
Você é um pesquisador especializado em implementações de código open source e artigos técnicos.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar implementações reais e artigos técnicos relevantes para este tópico.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- GitHub: WebSearch "site:github.com [tópico] implementation" e "site:github.com [tópico] example"
- Stack Overflow: WebSearch "site:stackoverflow.com [tópico]" → WebFetch nas respostas mais votadas
- Dev.to: WebSearch "site:dev.to [tópico]" → WebFetch nos artigos mais relevantes
- CSS-Tricks (para frontend): WebSearch "site:css-tricks.com [tópico]" → WebFetch nos artigos encontrados
- AWS Docs / PostgreSQL Docs / Redis Docs (para backend): WebSearch "site:docs.aws.amazon.com [tópico]" OR "site:postgresql.org/docs [tópico]" OR "site:redis.io/docs [tópico]"
- Medium/Hashnode: WebSearch "[tópico] implementation medium.com OR hashnode.dev"
- Fallback: WebSearch "[tópico] open source example implementation 2024 2025"

Para cada implementação ou artigo encontrado, extraia:
1. URL da fonte
2. Abordagem técnica utilizada (padrão de design, algoritmos, estrutura de dados)
3. Pontos técnicos notáveis (performance, segurança, reutilização, testabilidade)
4. Trechos de código relevantes (se disponíveis)
5. Relevância e qualidade da implementação

Retorne no máximo 2000 tokens com:
- 3 a 5 implementações ou artigos com URLs reais
- Resumo das abordagens técnicas mais comuns ou mais eficazes
- Padrões de código recorrentes encontrados
- Recomendações técnicas baseadas nas referências encontradas

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente YouTube

**Lançar quando:** O tópico provavelmente tem tutoriais técnicos em vídeo disponíveis (features conhecidas, bibliotecas populares, patterns documentados, integrações comuns). Omitir apenas se o tópico for muito específico, proprietário ou improvável de ter cobertura em vídeo.

**Prompt para o agente:**

```
Você é um pesquisador especializado em conteúdo educativo em vídeo.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar vídeos tutoriais relevantes e extrair os conceitos técnicos apresentados.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Processo (execute nesta ordem):

PASSO 1 — Encontrar vídeos relevantes:
  WebSearch: site:youtube.com "[tópico]" tutorial 2024 OR 2025
  WebSearch: site:youtube.com "[tópico]" implementation walkthrough
  WebSearch: site:youtube.com "[tópico]" from scratch

  Selecione os 2-3 vídeos mais relevantes (mais recentes, mais visualizações, mais técnicos).

PASSO 2 — Para cada vídeo selecionado, tente extrair transcrição:
  Tente via Bash:
    yt-dlp --write-subs --write-auto-subs --sub-lang en --skip-download \
      --output '/tmp/yt_%(id)s' "URL_DO_VIDEO" 2>/dev/null \
      && cat /tmp/yt_*.vtt 2>/dev/null | head -300

  Se yt-dlp não disponível ou falhar: use WebFetch na URL do vídeo para capturar
  título, descrição completa, capítulos (se disponíveis) e comentários fixados.

PASSO 3 — Analise o conteúdo capturado:
  Extraia os conceitos e técnicas mais importantes mencionados.
  Identifique abordagens de implementação específicas apresentadas.
  Note bibliotecas, ferramentas ou padrões citados.

Retorne no máximo 2000 tokens com:
- URLs dos vídeos encontrados + título + canal + data aproximada
- Resumo dos conceitos técnicos principais de cada vídeo
- Bibliotecas, ferramentas e padrões mencionados
- Abordagens de implementação identificadas
- Uma linha indicando qual vídeo tem a melhor explicação técnica e por quê

Se não encontrar vídeos relevantes após 3 tentativas de busca, retorne o que foi encontrado
com uma nota indicando a limitação dos resultados.
```

---

## Phase 2 — Agregação e clarificação

> **Emit:** `▶ [3/3] Agregando resultados e preparando clarificações`

### 2.1 — Gerar RESEARCH.md

Agregue os resultados de todos os agentes em `RESEARCH.md` na raiz do projeto.
Se já existir um `RESEARCH.md`, sobrescreva-o — este é sempre o resultado da pesquisa mais recente.

Formato do arquivo:

```markdown
# RESEARCH.md — [Tópico]
_Gerado em: [data e hora atual]_

## Business & Market Analysis
[resultados do Agente Business/Market, ou "— N/A —" se não lançado]

## API & Integration Docs
[resultados do Agente API/Docs, ou "— N/A —" se não lançado]

## Architecture & Backend Patterns
[resultados do Agente Architecture/Backend, ou "— N/A —" se não lançado]

## Domain Rules & Terminology
[resultados do Agente Domain/Rules, ou "— N/A —" se não lançado]

## Implementation References
[resultados do Agente Implementações]

## Video Insights
[resultados do Agente YouTube, ou "— N/A —" se não lançado]

## Key Insights
[3 a 5 bullet points com os achados mais importantes cruzando todas as fontes]
[Priorize: padrões recorrentes, consenso entre fontes, decisões técnicas ou de produto que se destacaram]
```

### 2.2 — Apresentar resumo

Apresente ao usuário um resumo direto de **5 a 10 linhas** cobrindo:
- O que foi encontrado de mais relevante
- Padrões técnicos, arquiteturais ou de produto que se destacaram
- Regras de domínio ou limitações de API identificadas
- Qualquer achado surpreendente ou contra-intuitivo

Formato:

```
RESEARCH COMPLETO: [Tópico]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[resumo em 5–10 linhas]

Arquivo gerado: RESEARCH.md
```

### 2.3 — Perguntas de clarificação

Com base no que foi pesquisado, faça **3 a 5 perguntas de clarificação** que:
- Endereçam gaps identificados na pesquisa (algo que as fontes não cobriram com clareza)
- Forçam decisões técnicas ou de produto que o usuário precisa tomar (ex: qual API usar? qual estratégia de cache?)
- Expõem trade-offs encontrados que dependem das prioridades do usuário (ex: consistência vs. performance? simplicidade vs. escalabilidade?)
- Ajudam a refinar o escopo antes do `/build` (planning phase) (ex: a feature é um MVP ou precisa estar pronta para produção desde o início?)

Apresente as perguntas numeradas e aguarde a resposta do usuário.

**Após receber as respostas**, emita:

```
Pronto para /build [tópico].
Use os achados do RESEARCH.md como contexto para o planejamento (Phase 2 de /build).
```

---

## Notas de comportamento

- **Agentes lançam buscas reais.** Cada agente usa WebSearch e WebFetch para encontrar conteúdo atualizado. Não substitua com conhecimento interno do modelo — o objetivo é trazer informação externa e recente.
- **Cada agente tenta 3-4 buscas por fonte** antes de desistir e passar para a próxima. Persistência é parte do processo.
- **Resultados não encontrados são reportados honestamente.** Se uma fonte não retornou nada útil, o agente registra isso em vez de inventar conteúdo.
- **Máximo 4 agentes por wave.** Se 5 ou mais dimensões forem relevantes, o orquestrador prioriza os 4 mais impactantes para o tópico antes de lançar a wave.
- **O RESEARCH.md é o artefato principal.** Ele deve ser útil como referência durante o `/build` (planning phase) e o `/feature-dev` — não um dump bruto, mas um documento editado e sintetizado.
- **As perguntas de clarificação encerram o fluxo.** Não prossiga para `/build` automaticamente — aguarde o usuário responder antes de indicar que está pronto.

---

## Context Budget

Este skill lança múltiplos agentes de pesquisa em paralelo — cada wave consome ~8-12k tokens.

**Checkpoint triggers:**
- Após Phase 1 (wave completa): escrever `.claude/checkpoint.md` com agentes lançados, resultados parciais, e próximo passo
- Se contexto estimado atingir ~60k tokens durante agregação: escrever checkpoint com achados parciais e emitir:
  `↺ Contexto ~60k — checkpoint escrito. Recomendo /compact. Use /resume para continuar a agregação do RESEARCH.md.`

**Formato do checkpoint:**
```
skill: /research
fase: [phase_0 | wave_em_progresso | agregacao | qa_gate]
topico: [tópico pesquisado]
agentes_completados: [lista]
agentes_pendentes: [lista]
achados_parciais: [resumo dos achados já coletados]
proximo: [próximo passo exato]
```
