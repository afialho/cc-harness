---
name: modernize
description: Transform a monolith into a structured, maintainable architecture. Analyzes the existing codebase, identifies bounded contexts, proposes target architecture (hexagonal monolith, modular monolith, or microservices), and executes the migration incrementally with zero downtime and full test coverage.
disable-model-invocation: true
argument-hint: [target: hexagonal | modular | microservices]
---

# /modernize — Monolith Modernization

> Transforma um monolito em uma arquitetura estruturada.
> Analisa o que existe → identifica bounded contexts → propõe estratégia → migra incrementalmente.
> O sistema continua funcionando durante toda a migração. Nunca um big bang rewrite.

---

## Targets disponíveis

| Target | O que é | Quando escolher |
|--------|---------|----------------|
| `hexagonal` | Monolito reestruturado com camadas hexagonais (domain, application, ports, infrastructure) | Monolito com lógica misturada mas escala razoável — quer ordem sem complexidade distribuída |
| `modular` | Monolito dividido em módulos bem definidos com interfaces claras entre eles | Time crescendo, features se acumulando, quer fronteiras claras sem microsserviços |
| `microservices` | Extração de serviços independentes com comunicação via API/mensageria | Alta escala, times autônomos, partes do sistema com ciclos de deploy distintos |

**Recomendação padrão:** começar com `hexagonal` ou `modular` antes de `microservices`.
Microserviços introduzem complexidade distribuída — só valem quando os problemas que resolvem são reais.

---

## Fase 1 — Análise do monolito

> **Emit:** `▶ [1/6] Analisando o monolito`

### 1.1 — Mapeamento estrutural

```bash
# Estrutura de diretórios
find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -maxdepth 5

# Tamanho dos módulos (identificar os maiores)
find src -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.rb" | \
  xargs wc -l 2>/dev/null | sort -rn | head -30
```

### 1.2 — Mapeamento de dependências

Identificar:
- **Dependências externas**: quais serviços/APIs o sistema consome
- **Dependências internas**: quais módulos importam de quais (grafo de dependências)
- **Acoplamentos problemáticos**: módulos que importam de muitos outros (fan-out alto)
- **Gargalos**: módulos importados por muitos outros (fan-in alto — candidatos a extrair como biblioteca)

### 1.3 — Identificar bounded contexts

Um bounded context é um domínio com linguagem, entidades e regras próprias.

Sinais de bounded contexts distintos no código:
- Grupos de entidades que se referem mutuamente mas raramente cruzam para outros grupos
- Lógica de negócio com terminologia própria (ex: "fatura" no contexto de billing vs. "pedido" no contexto de vendas)
- Partes do sistema que são alteradas por razões diferentes (ciclos de mudança distintos)
- Dados que não precisam ser consistentes em tempo real entre partes do sistema

Para cada bounded context identificado, registrar:
```
Context: [nome]
Entidades principais: [lista]
Responsabilidade: [o que esse contexto faz]
Dependências de outros contexts: [lista]
Tamanho estimado: [N] arquivos
```

### 1.4 — Diagnóstico de dívida técnica

```
Para cada módulo/arquivo:
  □ Viola separação de responsabilidades (lógica de negócio misturada com DB/HTTP)?
  □ Tem dependências circulares?
  □ Tem testes? Qual a cobertura?
  □ Tem > 500 linhas? (candidato a extração)
  □ É acessado diretamente por mais de 5 outros módulos? (candidato a interface)
```

### 1.5 — Relatório de diagnóstico

```
DIAGNÓSTICO DO MONOLITO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tamanho:         [N] arquivos, [N] linhas
Stack:           [linguagem + framework]
Cobertura atual: [X]%

Bounded contexts identificados:
  1. [context] — [N] arquivos — [responsabilidade]
  2. [context] — [N] arquivos
  ...

Problemas críticos:
  □ Lógica de negócio misturada com infraestrutura em [N] arquivos
  □ Dependências circulares em [lista]
  □ [outros problemas]

Cobertura de testes por contexto:
  [context 1]: [X]%
  [context 2]: [X]%
```

---

## Fase 2 — Estratégia de migração

> **Emit:** `▶ [2/6] Definindo estratégia`

### 2.1 — Escolher padrão de migração

**Strangler Fig (recomendado para a maioria dos casos):**
- Construir o novo código ao lado do antigo
- Redirecionar gradualmente para o novo
- Remover o antigo quando o novo estiver validado
- Zero downtime, risco baixo, progresso incremental verificável

**Branch by Abstraction:**
- Introduzir uma interface na frente do código legado
- Criar implementação nova atrás da interface
- Trocar a implementação quando nova estiver pronta
- Ideal quando o código legado não pode ser isolado facilmente

**Big Bang Rewrite (raramente recomendado):**
- Reescrever tudo de uma vez em nova estrutura
- Alto risco, zero valor entregue até o final
- Só justificado se o código legado é literalmente impossível de testar ou isolar

Para monolitos funcionais: **Strangler Fig** ou **Branch by Abstraction** sempre.

### 2.2 — Definir ordem de migração

Princípios:
- Começar pelos bounded contexts com **menor acoplamento** (mais fáceis de isolar)
- Deixar por último os contexts com mais dependências entre si
- Contextos de auth e infraestrutura compartilhada ficam por último (todos dependem deles)

```
ORDEM DE MIGRAÇÃO PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fase A (menor acoplamento — começar aqui):
  1. [context] — motivo: [X dependências externas, fácil de isolar]
  2. [context]

Fase B (acoplamento médio):
  3. [context]
  4. [context]

Fase C (maior acoplamento — por último):
  5. [context] — motivo: [depende de A e B, só isolar depois]
  6. [context] — auth/infra compartilhada
```

### 2.3 — Apresentar proposta ao usuário

```
PROPOSTA DE MODERNIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:      [hexagonal | modular | microservices]
Estratégia:  Strangler Fig (migração incremental, zero downtime)
Contexts:    [N] bounded contexts identificados

Sequência de migração:
  [ordem detalhada]

Estimativa:
  [N] fases de migração
  Sistema funcional em produção durante toda a migração

Riscos identificados:
  [lista de riscos com mitigação]
```

**⏸ PAUSA:** Aguarda aprovação antes de qualquer modificação no código.

> **Checkpoint:** Escreve `.claude/checkpoint.md`:
> ```
> skill: modernize
> fase: strategy-approved
> arquivos_modificados: [list]
> proximo: safety-net
> ```
> Se contexto atingir ~60k tokens → escreve checkpoint e emite:
> `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

## Fase 3 — Safety net global

> **Emit:** `▶ [3/6] Estabelecendo safety net`

Antes de qualquer migração, garantir cobertura de testes adequada.

**Meta:** cobertura ≥ 70% nos arquivos que serão modificados.

Para cada bounded context na ordem de migração:
1. Identificar testes existentes
2. Adicionar testes para comportamentos críticos não cobertos
3. Adicionar integration tests para APIs/endpoints expostos
4. Verificar que todos passam

```bash
rtk npm test -- --coverage
# Registrar baseline: essa cobertura não pode regredir durante a migração
```

---

## Fase 4 — Migração por context

> **Emit:** `▶ [4/6] Migrando — Context [N/Total]`

Para **cada bounded context**, em sequência (um de cada vez):

### 4.1 — Criar estrutura de destino

**Target hexagonal:**
```
src/[context]/
  domain/        Entidades puras do context
  application/   Use cases
  ports/         Interfaces (inbound + outbound)
  infrastructure/ Adapters
```

**Target modular:**
```
src/modules/[context]/
  [context].module.ts    Barrel export (interface pública)
  [context].service.ts   Business logic
  [context].types.ts     Types e DTOs
  [context].repository.ts Data access
```

**Target microservices:**
```
services/[context]/      Serviço independente (próprio package.json, Dockerfile)
  src/
  tests/
  Dockerfile
  docker-compose.yml (development)
```

### 4.2 — Migrar com Strangler Fig

```
Passo 1: Criar novo módulo/serviço VAZIO ao lado do antigo
Passo 2: Implementar uma feature do contexto no novo módulo (TDD)
Passo 3: Adicionar feature flag ou adapter que redireciona para o novo
Passo 4: Testar novo comportamento em produção (ou staging)
Passo 5: Quando validado → remover o código antigo correspondente
Passo 6: Repetir para a próxima feature do contexto
```

Para microserviços, adicionar após Passo 1:
- Definir API contract (OpenAPI) do serviço
- Configurar comunicação (REST síncrono ou mensageria assíncrona)
- Adicionar service ao docker-compose global

### 4.3 — Verificação após cada context

```bash
rtk npm test             # testes não podem regredir
rtk docker compose up -d # sistema deve subir completo
```

Se `/qa-loop` revelar regressão → reverter o context, diagnosticar, recomeçar.

---

## Fase 5 — Limpeza e consolidação

> **Emit:** `▶ [5/6] Limpeza`

Após todos os contexts migrados:

1. **Remover código legado** — todo código que foi substituído pelo Strangler Fig
2. **Verificar dependências circulares** — nenhuma deve existir após a migração
3. **Atualizar `architecture.json`** — refletir a nova estrutura
4. **Atualizar Docker Compose** — se microserviços, garantir que todos os serviços sobem

```bash
# Verificar que nenhum arquivo legado ainda é importado
rtk grep -r "from.*legacy\|require.*legacy\|import.*old" src/ --include="*.ts"
```

---

## Fase 6 — Validação final

> **Emit:** `▶ [6/6] Validação`

```bash
rtk npm test                    # 100% dos testes passando
rtk docker compose up -d        # todos os serviços sobem
```

```
/qa-loop (escopo: sistema completo, dimensões: qa-code + qa-backend + qa-security)
```

Se houver UI: `/browser-qa <url>` — verificar que nenhum fluxo quebrou.

### Output final

```
MODERNIZE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:          [hexagonal | modular | microservices]
Estratégia:      Strangler Fig

Antes:
  Arquitetura:   Monolito não estruturado
  Cobertura:     [X]%
  Bounded contexts misturados: [N]

Depois:
  Arquitetura:   [target] com [N] contexts isolados
  Cobertura:     [Y]% (+[Z]%)
  Código legado removido: [N] arquivos

[Se microservices:]
Serviços criados:
  ├─ [service-1]  → porta [N]  (responsabilidade: [X])
  ├─ [service-2]  → porta [N]
  └─ [service-N]  → porta [N]

Testes:          ✅ PASS (sem regressões)
Arquitetura:     ✅ architecture.json atualizado
Sistema:         ✅ rtk docker compose up -d funcional
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Nunca big bang** — migração incremental com Strangler Fig; se não for possível, Branch by Abstraction; big bang só como último recurso explicitamente aprovado
2. **Sistema funcional em todo momento** — após cada context migrado, o sistema deve funcionar em produção
3. **Safety net primeiro** — cobertura de testes estabelecida antes de qualquer modificação
4. **Testes não regridem** — um teste que passa antes da migração não pode falhar depois
5. **Microserviços são o último passo** — nunca extrair serviços antes de ter fronteiras claras (hexagonal ou modular primeiro)
6. **Um context por vez** — nunca migrar dois contexts em paralelo (conflitos de refatoração)
7. **`architecture.json` atualizado** — ao final, reflete a nova estrutura para que hooks e skills funcionem corretamente
