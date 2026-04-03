---
name: simplify
description: Reviews changed code for reuse, quality, and efficiency, then fixes issues found. Extends the official code-simplifier plugin with hexagonal architecture and SOLID compliance checks.
disable-model-invocation: true
argument-hint: <file or scope — omit to use git diff>
---

# /simplify — Code Simplification

> **Extends:** `code-simplifier@claude-plugins-official`
> Adds: Hexagonal Architecture compliance, SOLID rules (Rules.md RULE-CODE-001 to 006), TDD preservation (no test coverage reduced), and RTK token efficiency.
> The official plugin handles base simplification; this skill adds architecture-aware constraints.

---

## Scope

Se argumento fornecido → simplificar os arquivos especificados.
Se não → usar `rtk git diff HEAD` para identificar arquivos modificados recentemente.

---

## Fase 1 — Analysis

> **Emit:** `▶ [1/3] Analysis`

Ler todos os arquivos no escopo. Para cada arquivo, verificar:

**Reuse:**
- Código duplicado que pode ser extraído (regra: 3+ repetições = candidato a extração)
- Funções utilitárias que já existem no projeto fazendo a mesma coisa
- Dependências desnecessárias importadas mas não usadas

**Quality (RULE-CODE-001 a 006):**
- SRP: cada função/classe faz uma coisa? Se não, separar
- Magic numbers/strings: extrair para constantes nomeadas
- Nomes revelam intenção? Renomear se não
- Dead code: remover código comentado, funções nunca chamadas
- Dependency Inversion: depende de abstrações (interfaces/ports) ou de implementações concretas?

**Architecture (hexagonal):**
- Domain: importa algo externo? → violação
- Application: importa infraestrutura diretamente? → violação
- Infrastructure: implementa port corretamente?

**Efficiency:**
- Loops desnecessários (N+1 queries, nested loops evitáveis)
- Promises não paralelizadas quando poderiam ser (`Promise.all`)
- Cálculos repetidos que poderiam ser cached

**TDD check (não reduzir cobertura):**
- Toda lógica extraída/renomeada ainda coberta por testes?
- Se extração cria novo comportamento, anotar que teste é necessário

Output: lista de issues por arquivo com categoria e ação específica.

---

## Fase 2 — Fix

> **Emit:** `▶ [2/3] Fix`

Aplicar simplificações identificadas:
- Uma mudança por vez, mais simples primeiro
- Nunca remover testes existentes
- Nunca alterar comportamento externo (assinatura de função, contrato de API)
- Se renomear: atualizar todos os imports/referências no projeto
- Constantes extraídas: colocar no arquivo mais próximo do uso ou em `src/shared/constants`

---

## Fase 3 — Report

> **Emit:** `▶ [3/3] Report`

```
SIMPLIFY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arquivos modificados: [N]
Issues resolvidos:
  Reuse:        [N] (duplicação removida, utilitários reutilizados)
  Quality:      [N] (magic numbers, SRP, nomes, dead code)
  Architecture: [N] (violações de layer corrigidas)
  Efficiency:   [N] (loops, promises, cache)
Issues não tocados (requerem decisão humana):
  [lista — ex: "extrair X requer criar novo módulo — fora do escopo"]
Cobertura de testes: preservada / [N] testes precisam ser atualizados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Nunca mudar comportamento externo** — refactor interno apenas
2. **Nunca reduzir cobertura** — se mover código, mover ou adaptar tests junto
3. **Nunca simplificar o que não está no escopo** — foco cirúrgico
4. **Architecture first** — violações de layer têm prioridade sobre style
5. **RTK em todos os comandos** — `rtk git diff`, `rtk grep`, etc.
