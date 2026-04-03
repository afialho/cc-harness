---
name: resume
description: Resume work autonomously from a checkpoint after context reset (/clear or /compact). Reads .claude/checkpoint.md and continues exactly where the previous session stopped.
disable-model-invocation: true
---

# /resume — Retomada Autônoma de Contexto

Retoma o trabalho de onde parou após um reset de contexto.

## Instruções

Quando `/resume` é invocado:

### 1. Ler o checkpoint
> **Emit:** `↺ Retomando a partir do checkpoint...`

Leia `.claude/checkpoint.md`. Se não existir, informe o usuário que não há trabalho em andamento.

### 2. Reconstruir contexto
A partir do checkpoint, identifique:
- Qual skill estava sendo executada (`/feature-dev`, `/build`, `/agent-teams`, etc.)
- Em qual fase/step parou
- Quais arquivos foram criados/modificados
- Qual é o próximo passo exato

Leia os arquivos relevantes mencionados no checkpoint para reconstruir o contexto técnico.

### 3. Apresentar estado resumido
Mostre ao usuário em 5 linhas:
```
Retomando: [skill] — [feature name]
Concluído: [phases/steps já feitos]
Estado:    [o que está funcionando]
Próximo:   [ação exata a executar]
Continuando automaticamente...
```

### 4. Continuar autonomamente
Execute o próximo passo indicado no checkpoint sem pedir confirmação.
Siga o protocolo da skill original (feature-dev, agent-teams, etc.) a partir do ponto indicado.

### 5. Após concluir a sessão
Ao atingir novamente o threshold de contexto (~60k tokens), escreva um novo checkpoint atualizado e emita o aviso de compact.

## Comportamento quando não há checkpoint

Se `.claude/checkpoint.md` não existe, reconstruir contexto a partir do git:

```bash
rtk git log --oneline -15
rtk git diff HEAD --name-only
rtk git status
```

Com base nos outputs:
- Identificar a última feature em desenvolvimento (commits recentes)
- Listar arquivos modificados mas não commitados (trabalho em andamento)
- Apresentar ao usuário:

```
Nenhum checkpoint encontrado. Contexto reconstruído a partir do git:

Últimos commits:
  [lista dos 15 commits mais recentes]

Arquivos modificados não commitados:
  [lista ou "nenhum"]

Com base no histórico, o trabalho mais recente parece ser:
  [inferência baseada nos commits — ex: "implementação de auth (feat/auth)"]

Deseja continuar a partir daqui? Se sim, diga o que precisa retomar.
```
