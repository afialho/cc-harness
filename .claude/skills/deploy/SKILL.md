---
name: deploy
description: Deploy applications to production. Detects cloud target, audits environment, runs security gate, generates production Docker config, writes Infrastructure-as-Code, defines secrets strategy, runs pre-deploy checklist, and validates post-deploy health. 8-phase workflow.
disable-model-invocation: true
argument-hint: [target? e.g. vercel, fly.io, aws-ecs]
---

# /deploy — Deploy to Production

> Deploy orchestrator with 8 phases: target detection → environment audit → security gate → production Docker → IaC → secrets → pre-deploy checklist → post-deploy validation.
> Always reads `.claude/architecture.json` to adapt the deploy strategy to the project's architectural pattern.

---

## Pipeline Overview

```
/deploy [target?]
    │
    ├─ [1/8] Deployment Target Detection
    │         └─ detect or ask for the cloud target
    │
    ├─ [2/8] Environment Audit
    │         ├─ analyze docker-compose.yml
    │         ├─ check env vars + secrets
    │         └─ validate health check endpoints
    │
    ├─ [3/8] Security Gate
    │         └─ /security-hardening audit → BLOCK|CONDITIONAL|PASS
    │
    ├─ [4/8] Production Docker
    │         └─ generate/update docker-compose.prod.yml
    │
    ├─ [5/8] Infrastructure-as-Code
    │         └─ generate minimal target-specific config
    │
    ├─ [6/8] Secrets Strategy
    │         └─ secrets management guide per cloud target
    │
    ├─ [7/8] Deploy Checklist
    │         └─ migrations, smoke tests, rollback, monitoring
    │
    └─ [8/8] Post-Deploy Validation
              ├─ smoke tests on critical endpoints
              └─ /qa-loop (dimension: qa-smoke)
```

---

## Phase 1 — Deployment Target Detection

> **Emit:** `▶ [1/8] Deployment Target Detection`

### 1.1 — Architectural context reading

Before detecting the target, read `.claude/architecture.json` if it exists:
- `pattern` → indicates whether it is hexagonal, MVC, Next.js, feature-based
- `deployTarget` → if already defined in the file, use as default and confirm with the user

### 1.2 — Automatic detection

Inspect the repository for existing infrastructure artifacts:

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

### 1.3 — Supported targets

| Target | Detected file | Deploy command |
|--------|-------------------|-------------------|
| **Vercel** | `vercel.json` | `vercel --prod` |
| **Fly.io** | `fly.toml` | `flyctl deploy` |
| **Railway** | `railway.json` / `.railway/` | `railway up` |
| **AWS ECS/Fargate** | `task-definition.json` / `appspec.yml` | `aws ecs update-service` |
| **GCP Cloud Run** | `app.yaml` / GCP annotations | `gcloud run deploy` |
| **DigitalOcean App Platform** | `.do/app.yaml` | `doctl apps update` |
| **Self-hosted VPS** | `docker-compose.prod.yml` / `Makefile` | `docker compose -f docker-compose.prod.yml up -d` |

### 1.4 — Pause if target not detected

If no artifact is found, ask the user:

```
DEPLOY TARGET not detected. What is the target?

  1. Vercel (Next.js apps, static sites, serverless)
  2. Fly.io (containerized apps, global latency)
  3. Railway (simplicity, full-stack, integrated PostgreSQL)
  4. AWS ECS/Fargate (enterprise, high scale)
  5. GCP Cloud Run (serverless containers, GCP ecosystem)
  6. DigitalOcean App Platform (simplicity, predictable cost)
  7. Self-hosted VPS (full control, Docker Compose)

Reply with the number or the target name.
```

Wait for a response before proceeding.

If the argument is passed directly (`/deploy vercel`), use it without asking.

---

## Phase 2 — Environment Audit

> **Emit:** `▶ [2/8] Environment Audit`

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

### Audit report

Present a structured report to the user before proceeding:

```
ENVIRONMENT AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected services:    [list with ports]
Documented env vars:  [N] in .env.example
Missing env vars:     [list or "none"]
Health check:         [present/absent per service]
Readiness probes:     [present/absent]
Exposed secrets:      [risk list or "none"]
Migration tooling:    [detected or "none"]
```

If **exposed secrets** are found → block immediately:
```
⛔ BLOCKED: hardcoded secrets detected. Fix before proceeding.
[list of files and lines with the issue]
```

If **missing env vars** are found → generate action list before proceeding:
```
⚠ Undocumented env vars detected. Add to .env.example:
[list of vars]
Continuing after documentation...
```

---

## Phase 3 — Security Gate

> **Emit:** `▶ [3/8] Security Gate`

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
  Continue deploy? (yes/no)
  ```
  Wait for user confirmation. If "no" → halt deploy.

- **PASS** — Emit `✅ Security gate: PASS` and proceed to Phase 4.

> **Checkpoint:** Write `.claude/checkpoint.md`:
> ```
> skill: deploy
> phase: security-gate-passed
> modified_files: [list]
> next: production-docker
> ```
> If context reaches ~60k tokens → write checkpoint and emit:
> `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

---

## Phase 4 — Production Docker

> **Emit:** `▶ [4/8] Production Docker`

Generate or update `docker-compose.prod.yml` with production configuration. **Never modify `docker-compose.yml`** — the dev file remains untouched.

### Rules for docker-compose.prod.yml

**Resource limits** — all services must have limits:
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

**Restart policies** — all services:
```yaml
restart: unless-stopped
```

**No development volumes** — remove hot-reload, source mounts, node_modules volumes:
```yaml
# REMOVE in prod:
# volumes:
#   - ./src:/app/src
#   - /app/node_modules
```

**Production env vars** — use environment variables without hardcoded defaults:
```yaml
environment:
  NODE_ENV: production
  DATABASE_URL: ${DATABASE_URL}
  JWT_SECRET: ${JWT_SECRET}
  # never hardcode credentials here
```

**Required health checks** — every exposed service must have:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Isolated networks** — no `network_mode: host`:
```yaml
networks:
  app-network:
    driver: bridge
```

**Logging configured** — for observability:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Base template

Generate a complete `docker-compose.prod.yml` based on services detected in the audit (Phase 2), applying all rules above. Adapt according to `pattern` in `.claude/architecture.json`:

- **hexagonal / MVC / feature-based**: API container + DB container + cache container (if detected)
- **nextjs-app-router**: web container (Next.js) + API container (if separate) + DB + cache
- **self-hosted VPS**: include reverse proxy (nginx or Caddy) as an additional service

---

## Phase 5 — Infrastructure-as-Code

> **Emit:** `▶ [5/8] Infrastructure-as-Code`

Generate minimal configuration specific to the target detected in Phase 1.

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

Adapt `framework` according to the detected stack. For APIs (not Next.js), use `"framework": null` with `routes`.

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

### AWS ECS/Fargate — Minimal Terraform

Generate `infra/main.tf` with:
- `aws_ecs_cluster`
- `aws_ecs_task_definition` (referencing ECR image variables)
- `aws_ecs_service` with `desired_count = 1`
- `aws_lb` + `aws_lb_target_group` + `aws_lb_listener`
- `variables.tf` with: `aws_region`, `ecr_image_uri`, `container_cpu`, `container_memory`
- `outputs.tf` with: `load_balancer_dns`, `ecs_cluster_name`

Use conservative modules, no over-engineering. The goal is minimal functional infrastructure.

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

### Self-hosted VPS — Deploy `Makefile`

Generate `Makefile` with targets:
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

> **Emit:** `▶ [6/8] Secrets Strategy`

Document the secrets management strategy appropriate for the target and project scale.

### Absolute rule

**Never** commit secrets to the repository. Check `.gitignore` and ensure it includes:
```
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
secrets/
```

If `.gitignore` is incomplete, generate the missing entries immediately.

### Strategy per target

**Vercel:**
```
Secrets in: Vercel Dashboard → Settings → Environment Variables
Separate environments: Development / Preview / Production
Access via CLI:
  rtk vercel env add SECRET_NAME production
  rtk vercel env ls
Do not use: vercel.json for secrets (file is public in repo)
```

**Fly.io:**
```
Secrets in: Fly Secrets (encrypted at rest)
Commands:
  rtk flyctl secrets set DATABASE_URL="postgres://..."
  rtk flyctl secrets list
  rtk flyctl secrets unset SECRET_NAME
Automatically injected as env vars in the container
```

**Railway:**
```
Secrets in: Railway Dashboard → Service → Variables
Or via CLI:
  rtk railway variables set DATABASE_URL="postgres://..."
Service Variables are automatically injected
```

**AWS ECS/Fargate:**
```
Recommended: AWS Secrets Manager
  aws secretsmanager create-secret --name /app/prod/db-password --secret-string "value"
  
In task-definition.json, reference via secrets:
  "secrets": [
    {
      "name": "DATABASE_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:/app/prod/db-password"
    }
  ]

Simpler alternative: AWS Systems Manager Parameter Store (SSM)
For non-critical secrets: Task Definition environment variables via CI/CD
```

**GCP Cloud Run:**
```
Recommended: GCP Secret Manager
  gcloud secrets create db-password --replication-policy="automatic"
  echo -n "value" | gcloud secrets versions add db-password --data-file=-

In Cloud Run, reference via:
  gcloud run services update [app] --update-secrets=DB_PASSWORD=db-password:latest
```

**DigitalOcean App Platform:**
```
Secrets in: App → Settings → App-Level Environment Variables → Type: Secret
Via CLI:
  doctl apps update [app-id] --spec .do/app.yaml
Secrets are encrypted and do not appear in logs
```

**Self-hosted VPS:**
```
Options (in order of recommendation):
  1. Doppler: doppler run -- docker compose up (injects env vars automatically)
  2. 1Password CLI: op run --env-file=.env.template -- docker compose up
  3. .env file on the server (outside the repo, permissions 600, owner root)
     scp .env user@vps:/app/.env
     chmod 600 /app/.env

For CI/CD on VPS:
  - Store secrets as GitHub Actions Secrets
  - In workflow: echo "$ENV_FILE" > .env (where ENV_FILE is the secret with the full content)
```

> **Checkpoint:** Write `.claude/checkpoint.md`:
> ```
> skill: deploy
> phase: secrets-strategy-done
> modified_files: [list]
> next: deploy-checklist
> ```
> If context reaches ~60k tokens → write checkpoint and emit:
> `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

### Required secrets reference

Generate `docs/secrets.md` (or README section) documenting each required secret:

```markdown
## Secrets required for production

| Name | Description | Where to configure | Required |
|------|-------------|-------------------|----------|
| DATABASE_URL | Full database connection string | [target secret store] | Yes |
| JWT_SECRET | JWT signing key (min 32 chars) | [target secret store] | Yes |
| ... | ... | ... | ... |
```

---

## Phase 7 — Deploy Checklist

> **Emit:** `▶ [7/8] Deploy Checklist`

Generate pre-deploy checklist and execute automatable items.

### Checklist — execute in order

**Migrations:**
```bash
# Check for pending migrations before deploy
rtk docker compose exec api npx prisma migrate status     # Prisma
rtk docker compose exec api python manage.py showmigrations  # Django
rtk docker compose exec api rails db:migrate:status      # Rails
rtk docker compose exec api flyway info                  # Flyway

# If pending → execute before deploy
# Recommended strategy: migration as initContainer or pre-deploy hook
```

**Local smoke tests:**
```bash
# Build production image locally and test
rtk docker build -t [app]:smoke-test .
rtk docker compose -f docker-compose.prod.yml up -d
rtk curl -f http://localhost:[port]/health || exit 1
rtk docker compose -f docker-compose.prod.yml down
```

**Automated tests:**
```bash
rtk npm test              # all tests must pass
rtk npx cucumber-js       # BDD green
```

**Rollback plan:**

Document the rollback plan specific to the target:

| Target | Rollback |
|--------|----------|
| Vercel | `vercel rollback` — reverts to the previous deployment instantly |
| Fly.io | `flyctl releases list` + `flyctl deploy --image [previous-image]` |
| Railway | Dashboard → Deployments → Redeploy previous version |
| AWS ECS | `aws ecs update-service --task-definition [previous-revision]` |
| GCP Cloud Run | `gcloud run services update-traffic --to-revisions=[rev]=100` |
| DigitalOcean | Dashboard → App → Activity → Rollback |
| VPS | `make rollback` (git checkout HEAD~1 + recompose) |

**Monitoring configured:**

Check that at least one observability mechanism exists:
- Health check endpoint active and responding
- Structured logs (JSON) configured
- Uptime alerts (UptimeRobot, Better Uptime, or provider-native)

If no monitoring exists, emit warning:
```
⚠ Monitoring not detected. Recommended before deploy:
  - UptimeRobot (free): https://uptimerobot.com
  - Configure alert on health check endpoint: [url]/health
```

### Present checklist to user

```
PRE-DEPLOY CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Security gate: PASS
  ✅ Local smoke test: PASS
  ✅ Automated tests: PASS
  ✅ Migrations: [N pending / none]
  ✅ Secrets documented: docs/secrets.md
  ✅ docker-compose.prod.yml: generated
  ✅ IaC config: generated ([file])
  ✅ .gitignore: contains .env*
  ⚠  Monitoring: [status]
  ✅ Rollback plan: documented

Ready to deploy to [target]?
Reply "yes" to execute or "no" to review first.
```

Wait for user confirmation before Phase 8.

---

## Phase 8 — Post-Deploy Validation

> **Emit:** `▶ [8/8] Post-Deploy Validation`

### 8.1 — Deploy execution

Execute the deploy command appropriate for the target:

```bash
# Vercel
rtk vercel --prod

# Fly.io
rtk flyctl deploy

# Railway
rtk railway up

# AWS ECS (via CI/CD pipeline — do not execute directly)
# Instruction: push to main triggers the CI/CD pipeline

# GCP Cloud Run
rtk gcloud run deploy [app-name] --image gcr.io/[project]/[app]:latest --region southamerica-east1

# DigitalOcean
rtk doctl apps create-deployment [app-id]

# Self-hosted VPS
rtk make deploy
```

### 8.2 — Post-deploy smoke tests

After deploy completes, test critical endpoints:

```bash
BASE_URL=[production-url]

# Health check
rtk curl -sf "$BASE_URL/health" | rtk jq '.status'

# Readiness check (if available)
rtk curl -sf "$BASE_URL/ready" || echo "No readiness endpoint"

# Auth endpoint (if applicable)
rtk curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/status"

# Homepage / root (for apps with UI)
rtk curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/"
```

Success criteria: all critical endpoints return 2xx.

If any endpoint returns an error:
1. Check logs: `rtk [provider] logs` (e.g.: `rtk flyctl logs`, `rtk vercel logs`)
2. Execute immediate rollback if service is unavailable
3. Report to user with error details

### 8.3 — Post-deploy QA Gate

```
/qa-loop (scope: [production-url], dimensions: qa-smoke)
```

The `qa-smoke` checks:
- Critical endpoints respond within SLA (< 500ms p95)
- No 5xx errors in the first 60 seconds
- Security headers present (X-Content-Type-Options, etc.)
- HTTPS redirects working

### 8.4 — Final summary

```
DEPLOY COMPLETE
━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━��━━━━━━━━━━
Target:        [cloud target]
URL:           [production url]
Deploy ID:     [deploy id, if available]

Generated files:
  docker-compose.prod.yml
  [target-specific IaC file]
  docs/secrets.md

Validation:
  ✅ Health check: [url]/health → 200 OK
  ✅ Smoke tests: PASS
  ✅ QA gate (qa-smoke): PASS

Rollback available via: [rollback command]

Monitor at: [provider dashboard URL or UptimeRobot]
```

---

## General Rules

1. **Never commit secrets** — automatically block if detected; fix before any progress.
2. **Never modify docker-compose.yml** — the development file is untouchable; always generate `docker-compose.prod.yml`.
3. **IaC as code** — all infrastructure configuration goes into the repository (except secrets).
4. **Required security gate** — `/security-hardening` runs in Phase 3; CRITICAL = hard block, HIGH = user confirmation.
5. **Required gate** — Phase 8 only executes after explicit user confirmation in Phase 7.
6. **Rollback plan first** — document rollback before executing the deploy, never after.
7. **Architecture-aware** — always read `.claude/architecture.json` to adapt container and IaC config.

---

## Failure Handling

| Situation | Behavior |
|-----------|----------|
| Target not detected | Ask the user (Phase 1) |
| Security gate BLOCK DEPLOY | Halt pipeline; fix CRITICAL findings and re-run /deploy |
| Security gate CONDITIONAL | Warn HIGH findings; require user confirmation to proceed |
| Hardcoded secrets detected | Block with file/line list; do not proceed |
| Health check missing | Generate minimal `/health` endpoint before continuing |
| Local smoke test fails | Do not execute deploy; report error to user |
| Deploy fails | Check logs, execute rollback if service is unavailable |
| QA qa-smoke BLOCKER | Report to user with evidence; do not mark deploy as PASS |
| Pending migration | Document in checklist; recommend executing before deploy |
