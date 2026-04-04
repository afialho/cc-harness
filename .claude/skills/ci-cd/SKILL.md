---
name: ci-cd
description: Generate CI/CD pipeline (GitHub Actions, GitLab CI, etc.) with quality gates, security scans, and deployment automation.
disable-model-invocation: true
argument-hint: [platform? e.g. github-actions]
---

# /ci-cd — CI/CD Pipeline Generation

> Generates complete CI/CD pipelines for any platform: GitHub Actions, GitLab CI, Bitbucket Pipelines, CircleCI.
> Includes quality gates, security scans, Conventional Commits validation, caching, and deploy automation per environment.

---

## Pipeline Overview

```
/ci-cd [platform?]
    │
    ├─ [1/7] CI/CD Platform Detection
    │         └─ detect or ask for the platform
    │
    ├─ [2/7] Stack Detection
    │         └─ read package.json, pyproject.toml, go.mod, Gemfile
    │
    ├─ [3/7] Pipeline Design
    │         └─ define stages + parallelism strategy
    │
    ├─ [4/7] Generate Pipeline File
    │         ├─ PR gate: install + test + lint + security (no deploy)
    │         ├─ Main gate: + build + deploy staging
    │         └─ Tag/manual: deploy production
    │
    ├─ [5/7] Secrets & Env Vars
    │         └─ document required secrets + setup instructions
    │
    ├─ [6/7] Branch Strategy
    │         └─ document branch → environment mapping
    │
    └─ [7/7] Quality Gates Integration
              └─ dependency audit + SAST + license check
```

---

## Phase 1 — CI/CD Platform Detection

> **Emit:** `▶ [1/7] CI/CD Platform Detection`

### 1.1 — Automatic detection

Inspect the repository for existing CI/CD artifacts:

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

### 1.2 — Supported platforms

| Platform | Generated file | Automatic detection |
|------------|---------------|---------------------|
| **GitHub Actions** | `.github/workflows/ci.yml` | Remote contains `github.com` |
| **GitLab CI** | `.gitlab-ci.yml` | Remote contains `gitlab.com` |
| **Bitbucket Pipelines** | `bitbucket-pipelines.yml` | Remote contains `bitbucket.org` |
| **CircleCI** | `.circleci/config.yml` | `.circleci/` existe |

### 1.3 — Pause if platform not detected

If no platform is identified:

```
CI/CD PLATFORM not detected. What is the platform?

  1. GitHub Actions  (github.com)
  2. GitLab CI       (gitlab.com or self-hosted)
  3. Bitbucket Pipelines
  4. CircleCI

Reply with the number or the platform name.
```

Wait for response. If argument is passed directly (`/ci-cd github-actions`), use it without asking.

---

## Phase 2 — Stack Detection

> **Emit:** `▶ [2/7] Stack Detection`

Identify the project stack to determine test, lint, build, and security scan commands.

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

### Command mapping per stack

Consolidate the detected commands:

```
DETECTED STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Language:     [Node.js 20 / Python 3.12 / Go 1.22 / ...]
Package mgr:  [npm / yarn / pnpm / poetry / ...]
Framework:    [Next.js / Express / FastAPI / ...]
Test:         [npm test / pytest / go test ./... / ...]
Lint:         [npm run lint / ruff check . / golangci-lint run / ...]
Type-check:   [npx tsc --noEmit / mypy . / N/A]
Build:        [npm run build / go build / mvn package / ...]
Cache key:    [package-lock.json / poetry.lock / go.sum / ...]
```

If no test command is detected, warn the user and use `echo "No test command configured"` as a placeholder.

---

## Phase 3 — Pipeline Design

> **Emit:** `▶ [3/7] Pipeline Design`

Define the pipeline structure before generating the file.

### Pipeline stages

```
install → test → lint/type-check → security-scan → build → deploy
```

### Parallelism rules

Independent jobs run in parallel when possible:

```
install
  └─ (parallel after install)
       ├─ test
       ├─ lint
       ├─ type-check   (if applicable)
       └─ security-scan
            └─ build   (after test + lint + security-scan pass)
                 └─ deploy  (conditional by branch/tag)
```

### Triggers by context

| Trigger | Jobs executed | Deploy |
|---------|--------------|--------|
| Pull Request | install + test + lint + type-check + security-scan | Never |
| Push to `main` | All above + build | Deploy → staging |
| Tag `v*.*.*` | All above + build | Deploy → production |
| `workflow_dispatch` | Configurable | Deploy → production (manual) |

### Present design to user

```
PIPELINE DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform:     [platform]
Stack:        [stack]

Stages:
  install → [test ∥ lint ∥ security-scan] → build → deploy

Triggers:
  PR:   install + test + lint + security-scan (no deploy)
  main: all + build + deploy → staging
  v*:   all + build + deploy → production
  manual: deploy → production (workflow_dispatch)

Caching: [detected strategy]
Commit convention: validated on PR title

Generate pipeline? (yes/no)
```

Wait for confirmation. If the user wants adjustments, incorporate them before proceeding.

---

## Phase 4 — Generate Pipeline File

> **Emit:** `▶ [4/7] Generate Pipeline File`

Generate the complete pipeline file based on the detected platform and stack.

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
      - run: npx tsc --noEmit  # remove if no TypeScript

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
          path: dist/  # adjust per project: dist/, .next/, build/

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
          # Replace with the target-specific deploy command:
          # vercel --token $VERCEL_TOKEN --env staging
          # flyctl deploy --remote-only
          # railway up
          echo "Deploy staging — configure the appropriate command here"

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
          # Replace with the target-specific deploy command:
          # vercel --prod --token $VERCEL_TOKEN
          # flyctl deploy --remote-only
          # railway up --environment production
          echo "Deploy production — configure the appropriate command here"
```

Automatically adapt according to the detected stack:
- Node.js (npm): como acima
- Node.js (pnpm): substituir `npm ci` por `pnpm install --frozen-lockfile`, cache: `'pnpm'`
- Node.js (yarn): substituir `npm ci` por `yarn install --frozen-lockfile`, cache: `'yarn'`
- Python: usar `actions/setup-python`, `pip install`, `pytest`, `ruff check`, `pip audit`
- Go: usar `actions/setup-go`, `go test ./...`, `golangci-lint`, `govulncheck`
- Ruby: usar `ruby/setup-ruby`, `bundle install`, `rspec`, `rubocop`, `bundler-audit`
- Java (Maven): usar `actions/setup-java`, `mvn test`, `mvn spotbugs:check`, `mvn package`
- Rust: usar `actions/rust-cache`, `cargo test`, `cargo clippy`, `cargo audit`, `cargo build --release`

> **Checkpoint:** If context reaches ~60k tokens → write `.claude/checkpoint.md` with skill, phase, files, next step. Emit: `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

### GitLab CI — `.gitlab-ci.yml`

Generate equivalent for GitLab with:
- `stages: [install, validate, test, lint, security, build, deploy-staging, deploy-production]`
- `cache` por `$CI_COMMIT_REF_SLUG`
- `rules:` equivalent to GitHub Actions `if:` conditions
- `environment:` blocks para staging e production
- `needs:` for parallel DAG (GitLab CI Directed Acyclic Graph)
- Conventional Commits validation via `commitlint` job in MRs

### Bitbucket Pipelines — `bitbucket-pipelines.yml`

Generate with:
- `pipelines.pull-requests['**']`: PR gate (sem deploy)
- `pipelines.branches.main`: build + deploy staging
- `pipelines.tags['v*.*.*']`: build + deploy production
- `caches:` block appropriate for the stack
- `parallel:` for simultaneous test + lint + security

### CircleCI — `.circleci/config.yml`

Generate with:
- `version: 2.1`
- `orbs:` appropriate for the stack (node, python, go, etc.)
- `workflows:` with `when:` conditions per branch/tag
- `jobs:` using `parallelism` and `requires:` for dependency control
- Cache via `restore_cache` / `save_cache`

---

## Phase 5 — Secrets & Env Vars

> **Emit:** `▶ [5/7] Secrets & Env Vars`

Document all secrets required in the pipeline and setup instructions per platform.

### Identified secrets

Inspect the generated pipeline and `.env.example` to list all secrets:

```
SECRETS REQUIRED IN PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret                Description                    Jobs that use it
──────────────────────────────────────────────────────────────────
VERCEL_TOKEN          Token de deploy Vercel          deploy-*
DATABASE_URL          URL do banco em staging/prod    deploy-*
SNYK_TOKEN            Token Snyk (se usar Snyk)       security-scan
DOCKER_USERNAME       Docker Hub username             build (se push)
DOCKER_PASSWORD       Docker Hub password             build (se push)
```

### Setup instructions per platform

**GitHub Actions:**
```
1. Go to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret from the table above

For environments (staging/production):
  Settings → Environments → New environment
  In each environment: add environment-specific secrets
  Configure: Required reviewers for production (recommended)

Access in workflow:
  ${{ secrets.VERCEL_TOKEN }}
  ${{ secrets.DATABASE_URL }}
```

**GitLab CI:**
```
1. Go to: Settings → CI/CD → Variables
2. Click "Add variable"
3. Check "Masked" for sensitive secrets
4. Check "Protected" for production secrets
   (Protected variables only reach protected branches/tags)

For separate environments:
  Create variables with prefix: STAGING_DATABASE_URL, PROD_DATABASE_URL
  Or use GitLab Environments: Settings → CI/CD → Environments

Access in pipeline:
  $VERCEL_TOKEN
  $DATABASE_URL
```

**Bitbucket Pipelines:**
```
1. Go to: Repository Settings → Repository variables
2. Para variables por deployment: Deployments → [env] → Variables
3. Check "Secured" to mask the value in logs

Access in pipeline:
  $VERCEL_TOKEN
  $DATABASE_URL
```

**CircleCI:**
```
1. Go to: Project Settings → Environment Variables
2. Click "Add environment variable"
3. Para contextos compartilhados: Organization Settings → Contexts

Acessar no config:
  $VERCEL_TOKEN
  $DATABASE_URL
```

---

## Phase 6 — Branch Strategy

> **Emit:** `▶ [6/7] Branch Strategy`

Document the complete mapping between branches, events, and deploy environments.

### Branch → environment mapping

```
BRANCH STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch / Evento       Pipeline executado          Deploy
──────────────────────────────────────────────────────
feature/*             None (no automatic CI)       —
pull_request → main   PR Gate (sem deploy)        —
push → main           Full CI + Build             Staging
tag v*.*.*            Full CI + Build             Production
workflow_dispatch     Full CI + Build             Manual (staging ou production)
```

### Branch convention

| Tipo | Prefixo | Exemplo |
|------|---------|---------|
| Feature | `feature/` | `feature/user-notifications` |
| Bug fix | `fix/` | `fix/login-redirect` |
| Release | `release/` | `release/v1.2.0` |
| Hotfix | `hotfix/` | `hotfix/critical-auth-bug` |

### Conventional Commits — PR validation

The pipeline validates the PR title using the Conventional Commits format:

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

Breaking changes: add `!` after the type (`feat(auth)!: remove legacy endpoint`).

### Branch protection policy (recommended)

Configure in the provider:

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

> **Emit:** `▶ [7/7] Quality Gates Integration`

Add advanced quality jobs to the pipeline: dependency audit, SAST, and license check.

### Dependency Audit

**Node.js:**
```yaml
- run: npm audit --audit-level=high
# Alternative with more detailed report:
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

**Trivy (language-agnostic — recommended):**
```yaml
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'
```

**Semgrep (language-specific rules):**
```yaml
- uses: semgrep/semgrep-action@v1
  with:
    config: >-
      p/owasp-top-ten
      p/nodejs
      p/python
      p/secrets
```

**CodeQL (GitHub Actions — free for public repos):**
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

### Complete Quality Gates Job (GitHub Actions)

Add to the pipeline generated in Phase 4:

```yaml
quality-gates:
  name: Quality Gates
  runs-on: ubuntu-latest
  needs: install
  steps:
    - uses: actions/checkout@v4
    - name: Setup runtime
      # (insert stack-appropriate setup)
    - name: Install dependencies
      run: # (insert install command)

    - name: Dependency audit
      run: # (insert stack audit command)

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
      run: # (insert stack license check command)
      continue-on-error: true  # warning, non-blocking by default
```

### Final Summary

After generating all files:

```
CI/CD PIPELINE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform:     [platform]
Stack:        [detected stack]

Generated file: [file path]

Pipeline stages:
  PR Gate:    install → test ∥ lint ∥ security-scan ∥ commit-lint
  Main:       all + build → deploy staging
  Tag v*:     all + build → deploy production
  Manual:     workflow_dispatch → deploy (staging or production)

Quality gates:
  ✅ Dependency audit: [tool]
  ✅ SAST: Trivy
  ✅ License check: [tool]
  ✅ Conventional Commits: validated on PR title

Secrets to configure: [N] — see docs/ci-secrets.md

Next steps:
  1. Configure secrets on [platform] (docs/ci-secrets.md)
  2. Protect main branch with required status checks
  3. Adjust deploy commands in deploy-staging and deploy-production steps
  4. Push and open a test PR to validate the pipeline
```

Generate `docs/ci-secrets.md` with the complete secrets table and setup instructions.

---

## General Rules

1. **Never include secrets in the pipeline file** — only reference them via CI/CD environment variables.
2. **PR gate does not deploy** — never add deploy steps to jobs that run on pull_request.
3. **Caching is required** — every pipeline must have dependency caching configured; no cache = slow pipeline.
4. **Parallelism where possible** — test, lint, and security-scan are independent; run in parallel after install.
5. **Conventional Commits on PR title** — always validate; it is the trigger for automatic changelog and semver.
6. **Quality gates jobs do not block license check** — license check is `continue-on-error: true` by default (warning, not blocker) unless the user specifies a restrictive policy.
7. **Architecture-aware** — read `.claude/architecture.json`; hexagonal projects must have separate jobs for domain unit tests and integration tests.

---

## Failure Handling

| Situation | Behavior |
|-----------|----------|
| Platform not detected | Ask the user (Phase 1) |
| Stack not detected | Use placeholder with explanatory comment; notify the user |
| No test command | Generate job with `echo "No test command"` and notify the user |
| Lint not configured | Omit lint job; document that lint was not detected |
| SAST with HIGH/CRITICAL findings | Pipeline fails; report in job summary |
| License check with disallowed license | Warning only (continue-on-error: true by default) |
| Unknown deploy command | Generate placeholder with comment `# TODO: configure deploy command` |
