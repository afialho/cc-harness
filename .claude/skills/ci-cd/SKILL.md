---
name: ci-cd
description: Generate CI/CD pipeline (GitHub Actions, GitLab CI, etc.) with quality gates, security scans, and deployment automation.
disable-model-invocation: true
argument-hint: [platform? e.g. github-actions]
---

# /ci-cd — Geração de Pipeline CI/CD

> Gera pipelines CI/CD completos para qualquer plataforma: GitHub Actions, GitLab CI, Bitbucket Pipelines, CircleCI.
> Inclui quality gates, security scans, Conventional Commits validation, caching e automação de deploy por ambiente.

---

## Visão geral do pipeline

```
/ci-cd [platform?]
    │
    ├─ [1/7] CI/CD Platform Detection
    │         └─ detecta ou pergunta a plataforma
    │
    ├─ [2/7] Stack Detection
    │         └─ lê package.json, pyproject.toml, go.mod, Gemfile
    │
    ├─ [3/7] Pipeline Design
    │         └─ define stages + estratégia de paralelismo
    │
    ├─ [4/7] Generate Pipeline File
    │         ├─ PR gate: install + test + lint + security (sem deploy)
    │         ├─ Main gate: + build + deploy staging
    │         └─ Tag/manual: deploy produção
    │
    ├─ [5/7] Secrets & Env Vars
    │         └─ documenta secrets necessários + instruções de setup
    │
    ├─ [6/7] Branch Strategy
    │         └─ documenta mapeamento branch → ambiente
    │
    └─ [7/7] Quality Gates Integration
              └─ dependency audit + SAST + license check
```

---

## Phase 1 — CI/CD Platform Detection

> **Emitir:** `▶ [1/7] CI/CD Platform Detection`

### 1.1 — Detecção automática

Inspecionar o repositório em busca de artefatos de CI/CD existentes:

```
Agent: code-explorer
Task: Detect CI/CD platform artifacts. Report:
      1. Presence of: .github/workflows/*.yml, .gitlab-ci.yml,
         bitbucket-pipelines.yml, .circleci/config.yml, Jenkinsfile,
         .travis.yml, azure-pipelines.yml
      2. Contents of any detected pipeline files
      3. Remote URL from .git/config to infer platform (github.com, gitlab.com, etc.)
      4. Contents of .claude/architecture.json if it exists
      5. Presence of: package.json, pyproject.toml, go.mod, Gemfile,
         pom.xml, build.gradle, Cargo.toml, composer.json
```

### 1.2 — Plataformas suportadas

| Plataforma | Arquivo gerado | Detecção automática |
|------------|---------------|---------------------|
| **GitHub Actions** | `.github/workflows/ci.yml` | Remote contém `github.com` |
| **GitLab CI** | `.gitlab-ci.yml` | Remote contém `gitlab.com` |
| **Bitbucket Pipelines** | `bitbucket-pipelines.yml` | Remote contém `bitbucket.org` |
| **CircleCI** | `.circleci/config.yml` | `.circleci/` existe |

### 1.3 — Pausa se plataforma não detectada

Se nenhuma plataforma for identificada:

```
CI/CD PLATFORM não detectada. Qual é a plataforma?

  1. GitHub Actions  (github.com)
  2. GitLab CI       (gitlab.com ou self-hosted)
  3. Bitbucket Pipelines
  4. CircleCI

Responda com o número ou o nome da plataforma.
```

Aguardar resposta. Se argumento passado diretamente (`/ci-cd github-actions`), usar sem perguntar.

---

## Phase 2 — Stack Detection

> **Emitir:** `▶ [2/7] Stack Detection`

Identificar a stack do projeto para determinar comandos de test, lint, build e security scan.

```
Agent: code-explorer
Task: Detect project stack and extract build/test/lint commands. Report:
      1. Language + runtime: Node.js (npm/yarn/pnpm), Python (pip/poetry/uv),
         Go, Ruby (bundler), Java (Maven/Gradle), Rust (cargo), PHP (composer)
      2. Test command: from package.json scripts.test, pyproject.toml [tool.pytest],
         Makefile test target, go test ./..., bundle exec rspec, etc.
      3. Lint command: eslint, ruff, golangci-lint, rubocop, spotbugs, clippy, phpstan
      4. Type-check command (if applicable): tsc --noEmit, mypy, pyright
      5. Build command: npm run build, go build, mvn package, cargo build --release
      6. Node.js version from .nvmrc, .node-version, or engines field in package.json
      7. Python version from .python-version, pyproject.toml, or runtime.txt
      8. Go version from go.mod
      9. Package manager lock file: package-lock.json, yarn.lock, pnpm-lock.yaml,
         poetry.lock, Pipfile.lock, Gemfile.lock, go.sum, Cargo.lock
      10. Framework: Next.js, Express, FastAPI, Django, Rails, Gin, Spring Boot, etc.
```

### Mapeamento de comandos por stack

Consolidar os comandos detectados:

```
STACK DETECTADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Linguagem:    [Node.js 20 / Python 3.12 / Go 1.22 / ...]
Package mgr:  [npm / yarn / pnpm / poetry / ...]
Framework:    [Next.js / Express / FastAPI / ...]
Test:         [npm test / pytest / go test ./... / ...]
Lint:         [npm run lint / ruff check . / golangci-lint run / ...]
Type-check:   [npx tsc --noEmit / mypy . / N/A]
Build:        [npm run build / go build / mvn package / ...]
Cache key:    [package-lock.json / poetry.lock / go.sum / ...]
```

Se nenhum test command for detectado, avisar ao usuário e usar `echo "No test command configured"` como placeholder.

---

## Phase 3 — Pipeline Design

> **Emitir:** `▶ [3/7] Pipeline Design`

Definir a estrutura do pipeline antes de gerar o arquivo.

### Stages do pipeline

```
install → test → lint/type-check → security-scan → build → deploy
```

### Regras de paralelismo

Jobs independentes rodam em paralelo quando possível:

```
install
  └─ (paralelo após install)
       ├─ test
       ├─ lint
       ├─ type-check   (se aplicável)
       └─ security-scan
            └─ build   (após test + lint + security-scan passarem)
                 └─ deploy  (condicional por branch/tag)
```

### Triggers por contexto

| Trigger | Jobs executados | Deploy |
|---------|-----------------|--------|
| Pull Request | install + test + lint + type-check + security-scan | Nunca |
| Push para `main` | Todos acima + build | Deploy → staging |
| Tag `v*.*.*` | Todos acima + build | Deploy → production |
| `workflow_dispatch` | Configurável | Deploy → produção (manual) |

### Apresentar design ao usuário

```
PIPELINE DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plataforma:   [plataforma]
Stack:        [stack]

Stages:
  install → [test ∥ lint ∥ security-scan] → build → deploy

Triggers:
  PR:   install + test + lint + security-scan (sem deploy)
  main: todos + build + deploy → staging
  v*:   todos + build + deploy → production
  manual: deploy → production (workflow_dispatch)

Caching: [estratégia detectada]
Convenção de commits: validada no PR title

Gerar pipeline? (sim/não)
```

Aguardar confirmação. Se o usuário quiser ajustes, incorporar antes de avançar.

---

## Phase 4 — Generate Pipeline File

> **Emitir:** `▶ [4/7] Generate Pipeline File`

Gerar o arquivo de pipeline completo baseado na plataforma e stack detectadas.

### GitHub Actions — `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      deploy_env:
        description: 'Deploy environment'
        required: true
        default: 'production'
        type: choice
        options: [staging, production]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  install:
    name: Install dependencies
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci

  # Conventional Commits validation (PR only)
  commit-lint:
    name: Validate PR title (Conventional Commits)
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: [feat, fix, test, refactor, docs, chore, perf, style, ci, build, revert]

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  lint:
    name: Lint & Type-check
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit  # remover se não houver TypeScript

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      # Dependency audit
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high
      # SAST via Trivy
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test, lint, security-scan]
    if: github.event_name != 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/  # ajustar conforme o projeto: dist/, .next/, build/

  deploy-staging:
    name: Deploy → Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: staging
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy to staging
        id: deploy
        run: |
          # Substituir pelo comando de deploy específico do target:
          # vercel --token $VERCEL_TOKEN --env staging
          # flyctl deploy --remote-only
          # railway up
          echo "Deploy staging — configure o comando adequado aqui"

  deploy-production:
    name: Deploy → Production
    runs-on: ubuntu-latest
    needs: build
    if: startsWith(github.ref, 'refs/tags/v') || (github.event_name == 'workflow_dispatch' && github.event.inputs.deploy_env == 'production')
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Deploy to production
        id: deploy
        run: |
          # Substituir pelo comando de deploy específico do target:
          # vercel --prod --token $VERCEL_TOKEN
          # flyctl deploy --remote-only
          # railway up --environment production
          echo "Deploy production — configure o comando adequado aqui"
```

Adaptar automaticamente conforme a stack detectada:
- Node.js (npm): como acima
- Node.js (pnpm): substituir `npm ci` por `pnpm install --frozen-lockfile`, cache: `'pnpm'`
- Node.js (yarn): substituir `npm ci` por `yarn install --frozen-lockfile`, cache: `'yarn'`
- Python: usar `actions/setup-python`, `pip install`, `pytest`, `ruff check`, `pip audit`
- Go: usar `actions/setup-go`, `go test ./...`, `golangci-lint`, `govulncheck`
- Ruby: usar `ruby/setup-ruby`, `bundle install`, `rspec`, `rubocop`, `bundler-audit`
- Java (Maven): usar `actions/setup-java`, `mvn test`, `mvn spotbugs:check`, `mvn package`
- Rust: usar `actions/rust-cache`, `cargo test`, `cargo clippy`, `cargo audit`, `cargo build --release`

> **Checkpoint:** Se contexto atingir ~60k tokens → escreve `.claude/checkpoint.md` com skill, fase, arquivos, próximo passo. Emite: `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

### GitLab CI — `.gitlab-ci.yml`

Gerar equivalente para GitLab com:
- `stages: [install, validate, test, lint, security, build, deploy-staging, deploy-production]`
- `cache` por `$CI_COMMIT_REF_SLUG`
- `rules:` equivalentes aos `if:` do GitHub Actions
- `environment:` blocks para staging e production
- `needs:` para DAG paralelo (GitLab CI Directed Acyclic Graph)
- Conventional Commits validation via `commitlint` job em MRs

### Bitbucket Pipelines — `bitbucket-pipelines.yml`

Gerar com:
- `pipelines.pull-requests['**']`: PR gate (sem deploy)
- `pipelines.branches.main`: build + deploy staging
- `pipelines.tags['v*.*.*']`: build + deploy production
- `caches:` block adequado à stack
- `parallel:` para test + lint + security simultâneos

### CircleCI — `.circleci/config.yml`

Gerar com:
- `version: 2.1`
- `orbs:` adequados (node, python, go, etc.)
- `workflows:` com `when:` conditions por branch/tag
- `jobs:` usando `parallelism` e `requires:` para controle de dependências
- Cache via `restore_cache` / `save_cache`

---

## Phase 5 — Secrets & Env Vars

> **Emitir:** `▶ [5/7] Secrets & Env Vars`

Documentar todos os secrets necessários no pipeline e instruções de setup por plataforma.

### Secrets identificados

Inspecionar o pipeline gerado e o `.env.example` para listar todos os secrets:

```
SECRETS NECESSÁRIOS NO PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret                Descrição                      Jobs que usam
──────────────────────────────────────────────────────────────────
VERCEL_TOKEN          Token de deploy Vercel          deploy-*
DATABASE_URL          URL do banco em staging/prod    deploy-*
SNYK_TOKEN            Token Snyk (se usar Snyk)       security-scan
DOCKER_USERNAME       Docker Hub username             build (se push)
DOCKER_PASSWORD       Docker Hub password             build (se push)
```

### Instruções de setup por plataforma

**GitHub Actions:**
```
1. Vá em: Settings → Secrets and variables → Actions
2. Clique em "New repository secret"
3. Adicione cada secret da tabela acima

Para environments (staging/production):
  Settings → Environments → New environment
  Em cada environment: add secrets específicos do ambiente
  Configure: Required reviewers para production (recomendado)

Acessar no workflow:
  ${{ secrets.VERCEL_TOKEN }}
  ${{ secrets.DATABASE_URL }}
```

**GitLab CI:**
```
1. Vá em: Settings → CI/CD → Variables
2. Clique em "Add variable"
3. Marque "Masked" para secrets sensíveis
4. Marque "Protected" para secrets de produção
   (Protected variables só chegam em protected branches/tags)

Para environments separados:
  Criar variáveis com prefixo: STAGING_DATABASE_URL, PROD_DATABASE_URL
  Ou usar GitLab Environments: Settings → CI/CD → Environments

Acessar no pipeline:
  $VERCEL_TOKEN
  $DATABASE_URL
```

**Bitbucket Pipelines:**
```
1. Vá em: Repository Settings → Repository variables
2. Para variables por deployment: Deployments → [env] → Variables
3. Marque "Secured" para mascarar o valor nos logs

Acessar no pipeline:
  $VERCEL_TOKEN
  $DATABASE_URL
```

**CircleCI:**
```
1. Vá em: Project Settings → Environment Variables
2. Clique em "Add environment variable"
3. Para contextos compartilhados: Organization Settings → Contexts

Acessar no config:
  $VERCEL_TOKEN
  $DATABASE_URL
```

---

## Phase 6 — Branch Strategy

> **Emitir:** `▶ [6/7] Branch Strategy`

Documentar o mapeamento completo entre branches, eventos e ambientes de deploy.

### Mapeamento branch → ambiente

```
BRANCH STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch / Evento       Pipeline executado          Deploy
──────────────────────────────────────────────────────
feature/*             Nenhum (sem CI automático)  —
pull_request → main   PR Gate (sem deploy)        —
push → main           Full CI + Build             Staging
tag v*.*.*            Full CI + Build             Production
workflow_dispatch     Full CI + Build             Manual (staging ou production)
```

### Convenção de branches

| Tipo | Prefixo | Exemplo |
|------|---------|---------|
| Feature | `feature/` | `feature/user-notifications` |
| Bug fix | `fix/` | `fix/login-redirect` |
| Release | `release/` | `release/v1.2.0` |
| Hotfix | `hotfix/` | `hotfix/critical-auth-bug` |

### Conventional Commits — validação no PR

O pipeline valida o título do PR usando o formato Conventional Commits:

```
feat(scope): description
fix(scope): description
test(scope): description
refactor(scope): description
docs(scope): description
chore(scope): description
perf(scope): description
style(scope): description
ci(scope): description
build(scope): description
revert(scope): description
```

Breaking changes: adicionar `!` após o type (`feat(auth)!: remove legacy endpoint`).

### Política de proteção de branch (recomendada)

Configurar no provider:

```
Branch: main
  ✅ Require PR before merging
  ✅ Require status checks to pass: [test, lint, security-scan]
  ✅ Require branches up to date before merging
  ✅ Restrict who can push to matching branches

Branch: main (production-grade adicional)
  ✅ Require signed commits
  ✅ Require linear history
```

---

## Phase 7 — Quality Gates Integration

> **Emitir:** `▶ [7/7] Quality Gates Integration`

Adicionar jobs de qualidade avançada no pipeline: dependency audit, SAST e license check.

### Dependency Audit

**Node.js:**
```yaml
- run: npm audit --audit-level=high
# Alternativa com relatório mais detalhado:
- run: npx better-npm-audit audit --level high
```

**Python:**
```yaml
- run: pip install pip-audit && pip-audit
```

**Go:**
```yaml
- run: go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...
```

**Ruby:**
```yaml
- run: gem install bundler-audit && bundler-audit check --update
```

**Rust:**
```yaml
- run: cargo install cargo-audit && cargo audit
```

### SAST — Static Application Security Testing

**Trivy (agnóstico de linguagem — recomendado):**
```yaml
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'
```

**Semgrep (regras específicas por linguagem):**
```yaml
- uses: semgrep/semgrep-action@v1
  with:
    config: >-
      p/owasp-top-ten
      p/nodejs
      p/python
      p/secrets
```

**CodeQL (GitHub Actions — gratuito para repos públicos):**
```yaml
- uses: github/codeql-action/init@v3
  with:
    languages: javascript  # ou python, go, ruby, java
- uses: github/codeql-action/analyze@v3
```

### License Check

**Node.js:**
```yaml
- run: npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"
```

**Python:**
```yaml
- run: pip install pip-licenses && pip-licenses --allow-only="MIT;Apache Software License;BSD License"
```

**Go:**
```yaml
- run: go install github.com/google/go-licenses@latest && go-licenses check ./...
```

### Job completo de Quality Gates (GitHub Actions)

Adicionar ao pipeline gerado na Phase 4:

```yaml
quality-gates:
  name: Quality Gates
  runs-on: ubuntu-latest
  needs: install
  steps:
    - uses: actions/checkout@v4
    - name: Setup runtime
      # (inserir setup adequado à stack)
    - name: Install dependencies
      run: # (inserir install command)

    - name: Dependency audit
      run: # (inserir audit command da stack)

    - name: SAST — Trivy
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        severity: 'HIGH,CRITICAL'
        exit-code: '1'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy SARIF
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'

    - name: License check
      run: # (inserir license check command da stack)
      continue-on-error: true  # warning, não bloqueante por padrão
```

### Summary final

Após gerar todos os arquivos:

```
CI/CD PIPELINE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plataforma:   [plataforma]
Stack:        [stack detectada]

Arquivo gerado: [caminho do arquivo]

Pipeline stages:
  PR Gate:    install → test ∥ lint ∥ security-scan ∥ commit-lint
  Main:       todos + build → deploy staging
  Tag v*:     todos + build → deploy production
  Manual:     workflow_dispatch → deploy (staging ou production)

Quality gates:
  ✅ Dependency audit: [ferramenta]
  ✅ SAST: Trivy
  ✅ License check: [ferramenta]
  ✅ Conventional Commits: validado no PR title

Secrets a configurar: [N] — ver docs/ci-secrets.md

Próximos passos:
  1. Configurar secrets no [plataforma] (docs/ci-secrets.md)
  2. Proteger branch main com status checks obrigatórios
  3. Ajustar comandos de deploy nas steps deploy-staging e deploy-production
  4. Fazer push e abrir um PR de teste para validar o pipeline
```

Gerar `docs/ci-secrets.md` com a tabela completa de secrets e instruções de setup.

---

## Regras gerais

1. **Nunca incluir secrets no arquivo de pipeline** — apenas referenciar via variáveis de ambiente do CI/CD.
2. **PR gate não faz deploy** — nunca adicionar deploy steps em jobs que rodam em pull_request.
3. **Caching obrigatório** — todo pipeline deve ter cache de dependências configurado; sem cache = pipeline lento.
4. **Paralelismo onde possível** — test, lint e security-scan são independentes; rodar em paralelo após install.
5. **Conventional Commits no PR title** — sempre validar; é o gatilho para changelog automático e semver.
6. **Jobs de quality gates não bloqueiam license check** — license check é `continue-on-error: true` por padrão (warning, não blocker) a menos que o usuário especifique policy restritiva.
7. **Architecture-aware** — ler `.claude/architecture.json`; projetos hexagonais devem ter jobs separados para domain unit tests e integration tests.

---

## Tratamento de falhas

| Situação | Comportamento |
|----------|---------------|
| Plataforma não detectada | Pergunta ao usuário (Phase 1) |
| Stack não detectada | Usa placeholder com comentário explicativo; avisa ao usuário |
| Nenhum test command | Gera job com `echo "No test command"` e avisa ao usuário |
| Lint não configurado | Omite job de lint; documenta que lint não foi detectado |
| SAST com findings HIGH/CRITICAL | Pipeline falha; reporta no job summary |
| License check com licença não permitida | Warning apenas (continue-on-error: true por padrão) |
| Deploy command desconhecido | Gera placeholder com comentário `# TODO: configure deploy command` |
