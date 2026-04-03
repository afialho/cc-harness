---
name: code-review
description: Reviews code for bugs, architecture violations, security issues, and test coverage. Extends the official code-review plugin with hexagonal architecture, TDD, SOLID, and project-specific rules from Rules.md.
disable-model-invocation: true
argument-hint: <file, PR, or scope — omit for git diff>
---

# /code-review — Code Review

> **Extends:** `code-review@claude-plugins-official`
> Adds: Hexagonal Architecture layer validation, TDD compliance (RED→GREEN→REFACTOR), BDD scenario coverage, SOLID rules, and RTK efficiency enforcement.
> The official plugin handles base review; this skill adds the project's architectural and quality constraints.

---

## Scope

Se argumento é um PR → `rtk gh pr diff <number>`
Se argumento é arquivo(s) → ler os arquivos especificados
Se não → `rtk git diff main...HEAD`

---

## Fase 1 — Architecture Review

> **Emit:** `▶ [1/4] Architecture`

Validar as regras do `Rules.md` (RULE-ARCH-001 a 005) para cada arquivo modificado:

```
□ RULE-ARCH-001: Domain layer — zero imports externos (só stdlib e tipos internos)?
□ RULE-ARCH-002: Application layer — importa só Domain + Ports, nunca Infrastructure?
□ RULE-ARCH-003: Infrastructure — implementa Port definido em src/ports/?
□ RULE-ARCH-004: DI em composition root — nunca `new ConcreteClass()` em Application/Domain?
□ RULE-ARCH-005: Sem dependências circulares entre módulos?
```

Para cada violação: arquivo:linha + regra violada + como corrigir.

---

## Fase 2 — Code Quality Review

> **Emit:** `▶ [2/4] Code Quality`

Validar RULE-CODE-001 a 006:

```
□ RULE-CODE-001: SRP — cada função/classe tem uma única razão para mudar?
□ RULE-CODE-002: Sem magic numbers/strings — constantes nomeadas?
□ RULE-CODE-003: Nomes revelam intenção — sem `data`, `temp`, `obj`, `x`?
□ RULE-CODE-004: Sem dead code — sem funções não chamadas, imports não usados, código comentado?
□ RULE-CODE-005: DIP — depende de abstrações, não de implementações?
□ RULE-CODE-006: Sem defensive programming em Domain — sem null checks defensivos, trusting internal code?
```

Adicionais:
```
□ Sem TODO antigo (> 1 semana sem resolução)
□ Error handling consistente com padrão do projeto
□ Sem console.log/print de debug esquecido
```

---

## Fase 3 — Testing Review

> **Emit:** `▶ [3/4] Testing`

Validar RULE-TEST-001 a 007:

```
□ RULE-TEST-001: TDD — testes foram escritos antes da implementação? (verificar git log ordem)
□ RULE-TEST-002: BDD — há scenarios Gherkin para cada user story afetada?
□ RULE-TEST-003: Domain + Application têm 100% unit test coverage?
□ RULE-TEST-004: Infrastructure tem integration tests com deps reais (não mocks)?
□ RULE-TEST-005: Endpoints de API têm load test k6?
□ RULE-TEST-006: Fluxos de usuário têm Cypress E2E?
□ RULE-TEST-007: Testes testam comportamento, não implementação?
```

Se há código novo sem teste correspondente → BLOCKER.

---

## Fase 4 — Security Review

> **Emit:** `▶ [4/4] Security`

```
□ Input validation em todos os endpoints públicos?
□ Sem SQL injection (queries parametrizadas ou ORM)?
□ Sem XSS (sem dangerouslySetInnerHTML sem sanitize)?
□ Auth guards em rotas protegidas?
□ Sem secrets hardcoded (API keys, passwords, tokens)?
□ CORS policy explícita?
□ Sem exposição de dados sensíveis nas respostas?
```

---

## Report Final

```
CODE REVIEW: [escopo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: PASS | FAIL

BLOCKERS (devem ser corrigidos antes de merge):
  [RULE-X] arquivo:linha — descrição + como corrigir

MAJORS (corrigir antes de finalizar):
  [categoria] arquivo:linha — descrição

MINORS (recomendações):
  [categoria] arquivo:linha — sugestão

Dimensões:
  Architecture  ✅/❌  ([N] arquivos, [N] violações)
  Code Quality  ✅/❌  ([N] issues)
  Testing       ✅/❌  ([N] issues)
  Security      ✅/❌  ([N] issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Evidência obrigatória** — todo BLOCKER/MAJOR tem arquivo:linha
2. **Referência à regra** — citar o RULE-X correspondente quando aplicável
3. **Acionável** — cada issue descreve o que fazer, não só o problema
4. **Sem false positives** — só reportar o que é objetivamente errado, não style preference
5. **RTK em todos os comandos** — `rtk git diff`, `rtk gh pr diff`, etc.
