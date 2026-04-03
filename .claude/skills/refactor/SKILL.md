---
name: refactor
description: Structured refactoring of existing code. Covers module extraction, layer cleanup, dependency untangling, and incremental architecture improvement. Always test-first: establishes coverage before any change. Supports scopes from a single function to an entire layer.
disable-model-invocation: true
argument-hint: [scope: simplify | clean | extract | inline | layer | module]
---

# /refactor — Structured Code Refactoring

> Refatoração com segurança: cobertura de testes primeiro, depois a mudança.
> "Make it work, make it right, make it fast" — esta skill cuida do "make it right".
> Nunca quebra comportamento existente. Cada passo é verificável e reversível.

---

## Escopos disponíveis

| Scope | O que faz | Quando usar |
|-------|-----------|-------------|
| `simplify` | **Auto-escopo via git diff** — reuse, eficiência (loops, Promise.all, cache), naming, dead code nos arquivos recém-modificados. Sem coverage gate — opera no diff atual. | Pós-implementação: limpar o que acabou de ser escrito |
| `clean` | Remove dead code, magic numbers, nomes ruins, funções longas | Código que funciona mas está difícil de ler/manter |
| `extract` | Extrai lógica de um módulo em módulos menores/mais coesos | Módulo com múltiplas responsabilidades (god class/module) |
| `inline` | Consolida abstrações desnecessárias que adicionam complexidade sem valor | Over-engineered — muitas camadas para pouca lógica |
| `layer` | Reorganiza código entre camadas arquiteturais (ex: lógica de negócio no controller → service) | Violações de arquitetura acumuladas |
| `module` | Refatoração completa de um módulo: análise + clean + extract + test coverage | Módulo crítico com dívida técnica alta |

Se nenhum scope informado → faz análise e recomenda qual aplicar.

---

## Fase 1 — Análise e safety net

> **Emit:** `▶ [1/5] Análise e cobertura de testes`

### 1.1 — Mapear o alvo

Ler os arquivos do escopo declarado (ou inferido do argumento):

```
Para cada arquivo no escopo:
  □ Quantas responsabilidades tem? (SRP check)
  □ Quais funções têm > 20 linhas?
  □ Quais classes têm > 200 linhas?
  □ Há importações que violam as camadas definidas em architecture.json?
  □ Há lógica duplicada (DRY violations)?
  □ Há magic numbers ou strings?
  □ Os nomes revelam intenção?
  □ Há dead code (imports não usados, funções não chamadas)?
```

### 1.2 — Verificar cobertura de testes existente

```bash
rtk npm test -- --coverage 2>/dev/null || rtk npx vitest run --coverage 2>/dev/null
```

Registrar a cobertura atual dos arquivos no escopo:
- Se cobertura > 80% → pode prosseguir para refatoração
- Se cobertura < 80% → **Fase 2 obrigatória: escrever testes primeiro**
- Se zero testes → **Fase 2 obrigatória sempre**

### 1.3 — Gerar relatório de diagnóstico

```
DIAGNÓSTICO DE REFATORAÇÃO — [módulo/arquivo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arquivos no escopo: [N]
Cobertura atual:    [X]% → [suficiente | insuficiente — testes necessários antes]

Problemas encontrados:
  CRÍTICO (bloqueia manutenção):
    [arquivo:linha] — [descrição do problema]

  IMPORTANTE (impacta qualidade):
    [arquivo:linha] — [descrição]

  MENOR (oportunidade de melhoria):
    [arquivo:linha] — [descrição]

Scope recomendado: [clean | extract | layer | module]
Estratégia:        [descrição em 1-2 frases do que vai ser feito]
Estimativa:        [N] arquivos afetados, [N] testes a escrever
```

**⏸ PAUSA:** Apresenta diagnóstico → aguarda confirmação antes de qualquer mudança.

---

## Fase 2 — Safety net (testes antes de refatorar)

> **Emit:** `▶ [2/5] Estabelecendo safety net de testes`

**Só executada se cobertura < 80% nos arquivos do escopo.**

Princípio: testes escritos aqui capturam o *comportamento atual* — não o desejado.
O objetivo é ter uma rede de segurança que detecte se a refatoração quebrar algo.

Para cada arquivo sem cobertura suficiente:
1. Identificar os comportamentos existentes (inputs → outputs observáveis)
2. Escrever testes que documentam o comportamento atual — sem julgamento sobre se está correto
3. Verificar que todos passam antes de qualquer mudança

```bash
rtk npm test -- --coverage
# Meta: coverage dos arquivos no escopo ≥ 80% antes de prosseguir
```

Se o código é tão acoplado que não é possível testar sem mocks extensivos:
- Registrar no diagnóstico como "requires seam introduction"
- Introduzir uma seam mínima (interface ou injeção) para viabilizar o teste
- Nunca mudar comportamento nessa etapa — só tornar o código testável

---

## Fase 3 — Refatoração incremental

> **Emit:** `▶ [3/5] Refatorando`

Princípio: **uma mudança por vez, testes verdes entre cada mudança**.
Nunca acumular múltiplas mudanças antes de rodar os testes.

### Scope: simplify

Escopo automático: `rtk git diff HEAD --name-only` para identificar arquivos modificados na sessão atual.
Sem coverage gate (opera no diff — cobertura dos arquivos do diff é assumida como adequada, pois foram recém-escritos).

Para cada arquivo no diff, verificar e corrigir:

```
Reuse:
  □ Código duplicado (3+ repetições) → extrair função/constante
  □ Função utilitária equivalente já existe no projeto → reutilizar
  □ Imports não usados → remover

Quality (RULE-CODE-001 a 006):
  □ SRP: função/classe faz mais de uma coisa? → separar
  □ Magic numbers/strings → extrair para constantes nomeadas
  □ Nomes não revelam intenção? → renomear (atualizar todas as referências)
  □ Dead code (comentado, nunca chamado) → remover
  □ Depende de implementação concreta onde deveria depender de abstração? → anotar (não mudar sozinho se requer wiring)

Efficiency:
  □ Loops com queries inside → identificar N+1, propor solução
  □ Promises sequenciais quando poderiam ser Promise.all → paralelizar
  □ Cálculo idêntico repetido múltiplas vezes no mesmo request → extrair e cachear na variável

Architecture:
  □ Arquivo de domain importa algo externo? → violação (reportar, não corrigir se requer restructuring)
  □ Arquivo de application importa infrastructure diretamente? → violação (reportar)
```

Após cada mudança: `rtk npm test` (ou equivalente) — verde é pré-requisito para continuar.

Output do scope:
```
SIMPLIFY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arquivos no diff: [N]
Issues resolvidos:
  Reuse:        [N] (duplicação, utilitários reutilizados)
  Quality:      [N] (magic numbers, nomes, dead code)
  Efficiency:   [N] (loops, promises, cache)
Issues anotados (requerem decisão):
  Architecture: [lista — violações encontradas mas que requerem restructuring]
Cobertura: preservada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Scope: clean

Executar nesta ordem (cada item = um commit separado):

```
1. Remover imports não usados
2. Remover variáveis e funções não usadas (dead code)
3. Renomear identificadores que não revelam intenção
4. Extrair magic numbers/strings para constantes nomeadas
5. Quebrar funções > 20 linhas em subfunções com nomes descritivos
6. Quebrar classes > 200 linhas se tiverem múltiplas responsabilidades
```

Após cada item: `rtk npm test` → deve continuar verde.

### Scope: extract

```
1. Identificar a segunda responsabilidade (a que deve ser extraída)
2. Criar novo módulo/arquivo com nome que revela a responsabilidade
3. Mover código para o novo módulo (sem alterar lógica)
4. Ajustar imports no módulo original
5. Verificar testes verdes
6. Mover testes correspondentes para o novo módulo
```

Após extração: verificar que o módulo original ficou mais coeso.

### Scope: layer

Ler `.claude/architecture.json` para determinar onde cada peça deve estar.

```
Para cada violação de camada identificada na Fase 1:
  1. Identificar onde o código DEVERIA estar (camada correta)
  2. Criar interface/port se necessário (para não criar dependência direta)
  3. Mover o código para a camada correta
  4. Ajustar wiring no composition root
  5. Verificar testes verdes
```

**Exemplo prático — lógica de negócio no controller:**

```
Violação identificada: PaymentController.ts:45 — calcula desconto diretamente no handler
  → deveria estar em: src/domain/pricing/DiscountCalculator.ts

Passo 1: Criar src/domain/pricing/DiscountCalculator.ts (com unit test primeiro)
Passo 2: Criar src/ports/outbound/DiscountCalculator.ts (interface)
Passo 3: Mover lógica do controller para o domain
Passo 4: Controller injeta DiscountCalculator via construtor (composition root)
Passo 5: rtk npm test → verde
```

Outros exemplos comuns:
- DB query diretamente em use case → mover para infrastructure adapter + criar port
- HTTP call em domain entity → mover para infrastructure + injetar via port
- Config/secrets lidos em domain → mover para shared/config + injetar

### Scope: inline

```
Para cada abstração desnecessária:
  1. Verificar: essa abstração tem mais de 1 uso real? Tem probabilidade real de variação?
  2. Se não → inline: mover o código de volta para o chamador
  3. Remover a abstração
  4. Verificar testes verdes
```

Critério: uma abstração com 1 uso e sem variação futura justificada é complexidade, não design.

### Scope: module

Combina clean + extract + layer em sequência para um módulo completo.
Divide em waves se o módulo for grande (> 5 arquivos):

```
Wave 1: clean (sem mudança estrutural)
Wave 2: extract (separar responsabilidades)
Wave 3: layer (corrigir violações arquiteturais)
Wave 4: review + testes adicionais
```

---

## Fase 4 — Verificação e code review

> **Emit:** `▶ [4/5] Verificação`

```bash
# Testes devem estar todos verdes
rtk npm test

# Coverage não deve ter regredido
rtk npm test -- --coverage
```

Executar `/qa-loop (escopo: arquivos modificados, dimensões: qa-code)`:
- Verificar que SOLID foi respeitado no resultado
- Verificar que Clean Code foi respeitado
- Verificar que arquitetura foi respeitada

Executar code-reviewer agent nos arquivos modificados:
- Confirmar que nenhum comportamento foi alterado inadvertidamente
- Confirmar que o código ficou mais simples (não mais complexo) após refatoração

Se qa-code retornar BLOCKER → corrigir antes de avançar.

---

## Fase 5 — Commit estruturado

> **Emit:** `▶ [5/5] Commit`

Cada mudança logicamente separada = commit separado.
Nunca um commit gigante com toda a refatoração.

```bash
# Exemplo de sequência de commits para scope: module
rtk git commit -m "test(auth): add coverage for AuthService before refactor"
rtk git commit -m "refactor(auth): extract TokenValidator from AuthService"
rtk git commit -m "refactor(auth): move token storage to infrastructure layer"
rtk git commit -m "refactor(auth): rename ambiguous variables to reveal intent"
```

### Output final

```
REFACTOR COMPLETE — [módulo/escopo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scope:          [clean | extract | layer | inline | module]
Arquivos:       [N] modificados, [N] criados, [N] removidos

Antes:
  Cobertura:    [X]%
  Problemas:    [N] críticos, [N] importantes

Depois:
  Cobertura:    [Y]% (+[Z]%)
  Problemas:    0 críticos, 0 importantes

Comportamento: ✅ Nenhum teste que passava antes deixou de passar
Arquitetura:   ✅ Camadas respeitadas
SOLID:         ✅ PASS
Clean Code:    ✅ PASS

Commits:       [N] commits atômicos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Testes primeiro** — nunca refatorar código sem cobertura de testes adequada
2. **Uma mudança por vez** — cada transformação é seguida de `npm test` antes da próxima
3. **Comportamento preservado** — refatoração não muda o que o código faz, só como faz
4. **Commits atômicos** — cada passo lógico separado; nunca "big bang refactor" em um commit
5. **Mais simples, não mais complexo** — se após a refatoração o código está mais difícil de entender, desfazer
6. **Não escalar sem evidência** — não extrair abstrações "para o futuro"; extrair quando há necessidade real hoje

---

## Context Budget

Refatorações de escopo `module` ou `layer` podem consumir contexto significativo com análise + cobertura + mudanças.

**Checkpoint triggers:**
- Após fase de análise completa (antes de iniciar mudanças): checkpoint com diagnóstico
- Após cada step de refatoração aplicado e verificado: checkpoint com progresso
- Se contexto estimado atingir ~60k tokens: checkpoint imediato

**Formato do checkpoint:**
```
skill: /refactor
scope: [simplify | clean | extract | inline | layer | module]
fase: [análise | cobertura | refatoração | verificação]
arquivos_analisados: [lista]
mudanças_aplicadas: [lista resumida]
mudanças_pendentes: [lista]
testes_status: [passando/falhando + detalhes]
proximo: [próximo passo exato]
```

Emitir: `↺ Contexto ~60k — checkpoint escrito. Recomendo /compact. Use /resume para retomar /refactor [scope] na fase [fase].`
