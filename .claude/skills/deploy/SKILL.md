---
name: deploy
description: Deploy applications to production. Detects cloud target, audits environment, runs security gate, generates production Docker config, writes Infrastructure-as-Code, defines secrets strategy, runs pre-deploy checklist, and validates post-deploy health. 8-phase workflow.
disable-model-invocation: true
argument-hint: [target? e.g. vercel, fly.io, aws-ecs]
---

# /deploy — Deploy para Produção

> Orquestrador de deploy com 8 fases: detecção de target → auditoria de ambiente → security gate → Docker de produção → IaC → secrets → checklist pré-deploy → validação pós-deploy.
> Sempre lê `.claude/architecture.json` para adaptar a estratégia de deploy ao padrão arquitetural do projeto.

---

## Visão geral do pipeline

```
/deploy [target?]
    │
    ├─ [1/8] Deployment Target Detection
    │         └─ detecta ou pergunta o cloud target
    │
    ├─ [2/8] Environment Audit
    │         ├─ analisa docker-compose.yml
    │         ├─ verifica env vars + secrets
    │         └─ valida health check endpoints
    │
    ├─ [3/8] Security Gate
    │         └─ /security-hardening audit → BLOCK|CONDITIONAL|PASS
    │
    ├─ [4/8] Production Docker
    │         └─ gera/atualiza docker-compose.prod.yml
    │
    ├─ [5/8] Infrastructure-as-Code
    │         └─ gera config mínima específica do target
    │
    ├─ [6/8] Secrets Strategy
    │         └─ guia de gestão de secrets por cloud target
    │
    ├─ [7/8] Deploy Checklist
    │         └─ migrations, smoke tests, rollback, monitoring
    │
    └─ [8/8] Post-Deploy Validation
              ├─ smoke tests nos endpoints críticos
              └─ /qa-loop (dimensão: qa-smoke)
```

---

## Phase 1 — Deployment Target Detection

> **Emitir:** `▶ [1/8] Deployment Target Detection`

### 1.1 — Leitura do contexto arquitetural

Antes de detectar o target, ler `.claude/architecture.json` se existir:
- `pattern` → informa se é hexagonal, MVC, Next.js, feature-based
- `deployTarget` → se já definido no arquivo, usar como padrão e confirmar com o usuário

### 1.2 — Detecção automática

Inspecionar o repositório em busca de artefatos de infra existentes:

```
Agent: code-explorer
Task: Scan repository root and .claude/ for deployment artifacts. Report:
      1. Presence of: vercel.json, fly.toml, railway.json, .railway/, Dockerfile,
         docker-compose.prod.yml, terraform/, .github/workflows/*.yml, appspec.yml,
         Procfile, render.yaml, app.yaml (GCP), task-definition.json (ECS)
      2. Contents of any detected deployment config files
      3. Presence and contents of .env.example or .env.production.example
      4. Any CI/CD pipeline files that reveal the deploy target
      5. Contents of .claude/architecture.json if it exists
```

### 1.3 — Targets suportados

| Target | Arquivo detectado | Comando de deploy |
|--------|-------------------|-------------------|
| **Vercel** | `vercel.json` | `vercel --prod` |
| **Fly.io** | `fly.toml` | `flyctl deploy` |
| **Railway** | `railway.json` / `.railway/` | `railway up` |
| **AWS ECS/Fargate** | `task-definition.json` / `appspec.yml` | `aws ecs update-service` |
| **GCP Cloud Run** | `app.yaml` / GCP annotations | `gcloud run deploy` |
| **DigitalOcean App Platform** | `.do/app.yaml` | `doctl apps update` |
| **Self-hosted VPS** | `docker-compose.prod.yml` / `Makefile` | `docker compose -f docker-compose.prod.yml up -d` |

### 1.4 — Pausa se target não detectado

Se nenhum artefato for encontrado, perguntar ao usuário:

```
DEPLOY TARGET não detectado. Qual é o target?

  1. Vercel (apps Next.js, static sites, serverless)
  2. Fly.io (apps containerizadas, latência global)
  3. Railway (simplicidade, full-stack, PostgreSQL integrado)
  4. AWS ECS/Fargate (enterprise, alta escala)
  5. GCP Cloud Run (serverless containers, GCP ecosystem)
  6. DigitalOcean App Platform (simplicidade, custo previsível)
  7. Self-hosted VPS (controle total, Docker Compose)

Responda com o número ou o nome do target.
```

Aguardar resposta antes de avançar.

Se o argumento for passado diretamente (`/deploy vercel`), usar sem perguntar.

---

## Phase 2 — Environment Audit

> **Emitir:** `▶ [2/8] Environment Audit`

```
Agent: code-explorer
Task: Perform a full environment audit for production readiness. Report:
      1. docker-compose.yml — list all services, ports exposed, volumes, networks
      2. Environment variables — compare .env.example with what services actually use
         (grep for process.env, os.getenv, ENV[], config() calls in source files)
      3. Missing env vars — vars used in code but not documented in .env.example
      4. Health check endpoints — check if any service defines /health, /ready, /ping
         or framework-specific health routes (Spring Actuator, FastAPI /health, etc.)
      5. Readiness probes — check docker-compose.yml for healthcheck blocks
      6. Secrets exposure risk — any hardcoded credentials, API keys, or passwords
         in source files, docker-compose.yml, or config files (exclude .env* files)
      7. Database migration strategy — check for migration tooling (Flyway, Alembic,
         Knex, ActiveRecord, Prisma migrate, golang-migrate) and migration files
```

### Relatório de auditoria

Apresentar ao usuário um relatório estruturado antes de avançar:

```
ENVIRONMENT AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Serviços detectados:  [lista com portas]
Env vars documentadas: [N] em .env.example
Env vars faltando:    [lista ou "nenhuma"]
Health check:         [presente/ausente em cada serviço]
Readiness probes:     [presente/ausente]
Secrets expostos:     [lista de riscos ou "nenhum"]
Migration tooling:    [detectado ou "nenhum"]
```

Se houver **secrets expostos** → bloquear imediatamente:
```
⛔ BLOQUEIO: secrets hardcoded detectados. Corrija antes de prosseguir.
[lista dos arquivos e linhas com o problema]
```

Se houver **env vars faltando** → gerar lista de ação antes de avançar:
```
⚠ Env vars não documentadas detectadas. Adicionar ao .env.example:
[lista de vars]
Continuando após documentação...
```

---

## Phase 3 — Security Gate

> **Emitir:** `▶ [3/8] Security Gate`

Run `/security-hardening full app` as a mandatory prerequisite before generating any infrastructure.

Interpret the deploy decision from its final report:

- **BLOCK DEPLOY** (CRITICAL findings) — Stop immediately. Emit:
  ```
  ⛔ SECURITY GATE: BLOCKED — [N] CRITICAL findings. Deploy halted.
  Fix all CRITICAL issues and re-run /deploy.
  ```
  Do NOT proceed to Phase 4. The deploy pipeline ends here.

- **CONDITIONAL** (HIGH findings, no CRITICAL) — Emit:
  ```
  ⚠ SECURITY GATE: [N] HIGH findings detected (0 CRITICAL).
  Review the /security-hardening report above.
  Continue deploy? (sim/não)
  ```
  Aguardar confirmação do usuário. Se "não" → halt deploy.

- **PASS** — Emit `✅ Security gate: PASS` and proceed to Phase 4.

> **Checkpoint:** Escreve `.claude/checkpoint.md`:
> ```
> skill: deploy
> fase: security-gate-passed
> arquivos_modificados: [list]
> proximo: production-docker
> ```
> Se contexto atingir ~60k tokens → escreve checkpoint e emite:
> `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

## Phase 4 — Production Docker

> **Emitir:** `▶ [4/8] Production Docker`

Gerar ou atualizar `docker-compose.prod.yml` com configuração de produção. **Nunca modificar `docker-compose.yml`** — o arquivo de dev permanece intacto.

### Regras para docker-compose.prod.yml

**Resource limits** — todos os serviços devem ter limites:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 128M
```

**Restart policies** — todos os serviços:
```yaml
restart: unless-stopped
```

**Sem volumes de desenvolvimento** — remover hot-reload, source mounts, node_modules volumes:
```yaml
# REMOVER em prod:
# volumes:
#   - ./src:/app/src
#   - /app/node_modules
```

**Production env vars** — usar variáveis de ambiente sem defaults hardcoded:
```yaml
environment:
  NODE_ENV: production
  DATABASE_URL: ${DATABASE_URL}
  JWT_SECRET: ${JWT_SECRET}
  # nunca: DATABASE_URL: postgres://user:pass@localhost/db
```

**Health checks obrigatórios** — todo serviço exposto deve ter:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Networks isoladas** — sem `network_mode: host`:
```yaml
networks:
  app-network:
    driver: bridge
```

**Logging configurado** — para facilitar observabilidade:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Template base

Gerar `docker-compose.prod.yml` completo baseado nos serviços detectados na auditoria (Phase 2), aplicando todas as regras acima. Adaptar conforme `pattern` em `.claude/architecture.json`:

- **hexagonal / MVC / feature-based**: API container + DB container + cache container (se detectado)
- **nextjs-app-router**: web container (Next.js) + API container (se separado) + DB + cache
- **self-hosted VPS**: incluir reverse proxy (nginx ou Caddy) como serviço adicional

---

## Phase 5 — Infrastructure-as-Code

> **Emitir:** `▶ [5/8] Infrastructure-as-Code`

Gerar configuração mínima específica para o target detectado na Phase 1.

### Vercel — `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["gru1"],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

Adaptar `framework` conforme stack detectada. Para APIs (não Next.js), usar `"framework": null` com `routes`.

### Fly.io — `fly.toml`

```toml
app = "[app-name]"
primary_region = "gru"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[checks]
  [checks.health]
    grace_period = "30s"
    interval = "15s"
    method = "get"
    path = "/health"
    port = 3000
    timeout = "10s"
    type = "http"
```

### Railway — `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### AWS ECS/Fargate — Terraform mínimo

Gerar `infra/main.tf` com:
- `aws_ecs_cluster`
- `aws_ecs_task_definition` (referenciando variáveis de ECR image)
- `aws_ecs_service` com `desired_count = 1`
- `aws_lb` + `aws_lb_target_group` + `aws_lb_listener`
- `variables.tf` com: `aws_region`, `ecr_image_uri`, `container_cpu`, `container_memory`
- `outputs.tf` com: `load_balancer_dns`, `ecs_cluster_name`

Usar módulos conservadores, sem over-engineering. O objetivo é infraestrutura funcional mínima.

### GCP Cloud Run — `cloudbuild.yaml` + gcloud commands

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/[app-name]:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/[app-name]:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - '[app-name]'
      - '--image=gcr.io/$PROJECT_ID/[app-name]:$COMMIT_SHA'
      - '--region=southamerica-east1'
      - '--platform=managed'
      - '--allow-unauthenticated'
```

### DigitalOcean App Platform — `.do/app.yaml`

```yaml
name: [app-name]
region: nyc
services:
  - name: api
    source_dir: /
    dockerfile_path: Dockerfile
    http_port: 3000
    instance_size_slug: basic-xxs
    instance_count: 1
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
```

### Self-hosted VPS — `Makefile` de deploy

Gerar `Makefile` com targets:
```makefile
deploy:
	ssh $(VPS_HOST) 'cd $(APP_DIR) && git pull && docker compose -f docker-compose.prod.yml up -d --build'

rollback:
	ssh $(VPS_HOST) 'cd $(APP_DIR) && git checkout HEAD~1 && docker compose -f docker-compose.prod.yml up -d'

logs:
	ssh $(VPS_HOST) 'cd $(APP_DIR) && docker compose -f docker-compose.prod.yml logs -f'
```

---

## Phase 6 — Secrets Strategy

> **Emitir:** `▶ [6/8] Secrets Strategy`

Documentar a estratégia de gestão de secrets adequada ao target e ao porte do projeto.

### Regra absoluta

**Nunca** commitar secrets em repositório. Verificar `.gitignore` e garantir que inclui:
```
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
secrets/
```

Se `.gitignore` estiver incompleto, gerar as entradas faltantes imediatamente.

### Estratégia por target

**Vercel:**
```
Secrets em: Vercel Dashboard → Settings → Environment Variables
Ambientes separados: Development / Preview / Production
Acesso via CLI:
  rtk vercel env add SECRET_NAME production
  rtk vercel env ls
Não usar: vercel.json para secrets (arquivo é public no repo)
```

**Fly.io:**
```
Secrets em: Fly Secrets (criptografados em repouso)
Comandos:
  rtk flyctl secrets set DATABASE_URL="postgres://..."
  rtk flyctl secrets list
  rtk flyctl secrets unset SECRET_NAME
Automaticamente injetados como env vars no container
```

**Railway:**
```
Secrets em: Railway Dashboard → Service → Variables
Ou via CLI:
  rtk railway variables set DATABASE_URL="postgres://..."
Service Variables são injetadas automaticamente
```

**AWS ECS/Fargate:**
```
Recomendado: AWS Secrets Manager
  aws secretsmanager create-secret --name /app/prod/db-password --secret-string "value"
  
No task-definition.json, referenciar via secrets:
  "secrets": [
    {
      "name": "DATABASE_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:/app/prod/db-password"
    }
  ]

Alternativa mais simples: AWS Systems Manager Parameter Store (SSM)
Para segredos não-críticos: Task Definition environment variables via CI/CD
```

**GCP Cloud Run:**
```
Recomendado: GCP Secret Manager
  gcloud secrets create db-password --replication-policy="automatic"
  echo -n "value" | gcloud secrets versions add db-password --data-file=-

No Cloud Run, referenciar via:
  gcloud run services update [app] --update-secrets=DB_PASSWORD=db-password:latest
```

**DigitalOcean App Platform:**
```
Secrets em: App → Settings → App-Level Environment Variables → Type: Secret
Via CLI:
  doctl apps update [app-id] --spec .do/app.yaml
Secrets ficam criptografados e não aparecem em logs
```

**Self-hosted VPS:**
```
Opções (em ordem de recomendação):
  1. Doppler: doppler run -- docker compose up (injeta env vars automaticamente)
  2. 1Password CLI: op run --env-file=.env.template -- docker compose up
  3. .env file no servidor (fora do repo, permissões 600, owner root)
     scp .env user@vps:/app/.env
     chmod 600 /app/.env

Para CI/CD em VPS:
  - Armazenar secrets como GitHub Actions Secrets
  - No workflow: echo "$ENV_FILE" > .env (onde ENV_FILE é o secret com o conteúdo completo)
```

> **Checkpoint:** Escreve `.claude/checkpoint.md`:
> ```
> skill: deploy
> fase: secrets-strategy-done
> arquivos_modificados: [list]
> proximo: deploy-checklist
> ```
> Se contexto atingir ~60k tokens → escreve checkpoint e emite:
> `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

### Referência de secrets necessários

Gerar `docs/secrets.md` (ou seção em README) documentando cada secret necessário:

```markdown
## Secrets necessários para produção

| Nome | Descrição | Onde configurar | Obrigatório |
|------|-----------|-----------------|-------------|
| DATABASE_URL | Connection string completa do banco | [target secret store] | Sim |
| JWT_SECRET | Chave de assinatura JWT (min 32 chars) | [target secret store] | Sim |
| ... | ... | ... | ... |
```

---

## Phase 7 — Deploy Checklist

> **Emitir:** `▶ [7/8] Deploy Checklist`

Gerar checklist pré-deploy e executar itens automatizáveis.

### Checklist — executar em ordem

**Migrations:**
```bash
# Verificar se há migrations pendentes antes do deploy
rtk docker compose exec api npx prisma migrate status     # Prisma
rtk docker compose exec api python manage.py showmigrations  # Django
rtk docker compose exec api rails db:migrate:status      # Rails
rtk docker compose exec api flyway info                  # Flyway

# Se pendentes → executar antes do deploy
# Estratégia recomendada: migration como initContainer ou pre-deploy hook
```

**Smoke tests locais:**
```bash
# Build da imagem de produção localmente e testar
rtk docker build -t [app]:smoke-test .
rtk docker compose -f docker-compose.prod.yml up -d
rtk curl -f http://localhost:[port]/health || exit 1
rtk docker compose -f docker-compose.prod.yml down
```

**Testes automatizados:**
```bash
rtk npm test              # todos os testes devem passar
rtk npx cucumber-js       # BDD green
```

**Rollback plan:**

Documentar o plano de rollback específico para o target:

| Target | Rollback |
|--------|----------|
| Vercel | `vercel rollback` — reverte para o deployment anterior instantaneamente |
| Fly.io | `flyctl releases list` + `flyctl deploy --image [previous-image]` |
| Railway | Dashboard → Deployments → Redeploy versão anterior |
| AWS ECS | `aws ecs update-service --task-definition [previous-revision]` |
| GCP Cloud Run | `gcloud run services update-traffic --to-revisions=[rev]=100` |
| DigitalOcean | Dashboard → App → Activity → Rollback |
| VPS | `make rollback` (git checkout HEAD~1 + recompose) |

**Monitoring configurado:**

Verificar se há ao menos um mecanismo de observabilidade:
- Health check endpoint ativo e respondendo
- Logs estruturados (JSON) configurados
- Alertas de uptime (UptimeRobot, Better Uptime, ou nativo do provider)

Se não houver monitoring, emitir aviso:
```
⚠ Monitoring não detectado. Recomendado antes do deploy:
  - UptimeRobot (gratuito): https://uptimerobot.com
  - Configurar alert no health check endpoint: [url]/health
```

### Apresentar checklist ao usuário

```
PRE-DEPLOY CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Security gate: PASS
  ✅ Smoke test local: PASS
  ✅ Testes automatizados: PASS
  ✅ Migrations: [N pendentes / nenhuma]
  ✅ Secrets documentados: docs/secrets.md
  ✅ docker-compose.prod.yml: gerado
  ✅ IaC config: gerado ([arquivo])
  ✅ .gitignore: contém .env*
  ⚠  Monitoring: [status]
  ✅ Rollback plan: documentado

Pronto para deploy em [target]?
Responda "sim" para executar ou "não" para revisar antes.
```

Aguardar confirmação do usuário antes de Phase 8.

---

## Phase 8 — Post-Deploy Validation

> **Emitir:** `▶ [8/8] Post-Deploy Validation`

### 8.1 — Deploy execution

Executar o comando de deploy adequado ao target:

```bash
# Vercel
rtk vercel --prod

# Fly.io
rtk flyctl deploy

# Railway
rtk railway up

# AWS ECS (via CI/CD pipeline — não executar direto)
# Instrução: push para main dispara o pipeline CI/CD

# GCP Cloud Run
rtk gcloud run deploy [app-name] --image gcr.io/[project]/[app]:latest --region southamerica-east1

# DigitalOcean
rtk doctl apps create-deployment [app-id]

# Self-hosted VPS
rtk make deploy
```

### 8.2 — Smoke tests pós-deploy

Após o deploy completar, testar os endpoints críticos:

```bash
BASE_URL=[production-url]

# Health check
rtk curl -sf "$BASE_URL/health" | rtk jq '.status'

# Readiness check (se disponível)
rtk curl -sf "$BASE_URL/ready" || echo "No readiness endpoint"

# Auth endpoint (se aplicável)
rtk curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/status"

# Homepage / root (para apps com UI)
rtk curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/"
```

Critério de sucesso: todos os endpoints críticos retornam 2xx.

Se qualquer endpoint retornar erro:
1. Verificar logs: `rtk [provider] logs` (ex: `rtk flyctl logs`, `rtk vercel logs`)
2. Executar rollback imediato se serviço indisponível
3. Reportar ao usuário com detalhes do erro

### 8.3 — QA Gate pós-deploy

```
/qa-loop (escopo: [production-url], dimensões: qa-smoke)
```

O `qa-smoke` verifica:
- Endpoints críticos respondem dentro do SLA (< 500ms p95)
- Nenhum erro 5xx nos primeiros 60 segundos
- Headers de segurança presentes (X-Content-Type-Options, etc.)
- Redirecionamentos HTTPS funcionando

### 8.4 — Summary final

```
DEPLOY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:        [cloud target]
URL:           [production url]
Deploy ID:     [id do deploy, se disponível]

Arquivos gerados:
  docker-compose.prod.yml
  [arquivo IaC específico do target]
  docs/secrets.md

Validação:
  ✅ Health check: [url]/health → 200 OK
  ✅ Smoke tests: PASS
  ✅ QA gate (qa-smoke): PASS

Rollback disponível via: [comando de rollback]

Monitorar em: [URL do dashboard do provider ou UptimeRobot]
```

---

## Regras gerais

1. **Nunca commitar secrets** — bloquear automaticamente se detectados; corrigir antes de qualquer avanço.
2. **Nunca modificar docker-compose.yml** — o arquivo de desenvolvimento é intocável; gerar sempre `docker-compose.prod.yml`.
3. **IaC como código** — toda configuração de infraestrutura vai para o repositório (exceto secrets).
4. **Security gate obrigatório** — `/security-hardening` roda na Phase 3; CRITICAL = hard block, HIGH = user confirmation.
5. **Gate obrigatório** — Phase 8 só executa após confirmação explícita do usuário na Phase 7.
6. **Rollback plan first** — documentar rollback antes de executar o deploy, nunca depois.
7. **Architecture-aware** — sempre ler `.claude/architecture.json` para adaptar config de containers e IaC.

---

## Tratamento de falhas

| Situação | Comportamento |
|----------|---------------|
| Target não detectado | Pergunta ao usuário (Phase 1) |
| Security gate BLOCK DEPLOY | Halt pipeline; fix CRITICAL findings and re-run /deploy |
| Security gate CONDITIONAL | Warn HIGH findings; require user confirmation to proceed |
| Secrets hardcoded detectados | Bloqueia com lista de arquivos/linhas; não avança |
| Health check ausente | Gera endpoint `/health` mínimo antes de continuar |
| Smoke test local falha | Não executa deploy; reporta erro ao usuário |
| Deploy falha | Verifica logs, executa rollback se serviço indisponível |
| QA qa-smoke BLOCKER | Reporta ao usuário com evidências; não marca deploy como PASS |
| Migration pendente | Documenta no checklist; recomenda executar antes do deploy |
