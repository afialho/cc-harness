---
name: observability
description: Structured logging and OpenTelemetry instrumentation with Grafana stack by default (Prometheus + Loki + Tempo + Grafana + Alertmanager). Provides docker-compose for local dev and production setup guidance.
disable-model-invocation: true
argument-hint: [scope: logging | tracing | metrics | all]
---

# /observability — Structured Logging & OpenTelemetry → Grafana Stack

> Instrumentação via OpenTelemetry (código não muda se o backend mudar).
> Backend padrão: **Grafana Stack** — Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana (dashboards) + Alertmanager.
> Pipeline: App → OTel Collector → Prometheus / Loki / Tempo → Grafana.

---

## Stack Grafana (padrão)

```
App (OTLP) → OpenTelemetry Collector
                ├─ metrics → Prometheus → Grafana
                ├─ logs    → Loki       → Grafana
                └─ traces  → Tempo      → Grafana
                                Alertmanager ← Prometheus
```

Todos os componentes rodam em Docker. Código da aplicação envia OTLP para o collector — nunca diretamente para Prometheus, Loki ou Tempo.

---

## Workflow (6 Fases)

### Fase 1 — Instrumentation Inventory
> **Emit:** `▶ [1/6] Instrumentation Inventory`

Scan do codebase antes de adicionar qualquer coisa:

- `console.log` / `print` / `fmt.Println` → candidatos para structured log upgrade
- HTTP server framework: Express, Fastify, FastAPI, Rails, Gin, Fiber
- Database client: Prisma, TypeORM, Sequelize, SQLAlchemy, GORM, ActiveRecord
- HTTP clients externos: `fetch`, `axios`, `httpx`, `net/http`
- Background jobs: BullMQ, Sidekiq, Celery, Asynq
- Observability existente: loggers, tracing libs, metrics exporters

Output: tabela do que existe, o que falta, quais fases estão no escopo.

### Fase 2 — Structured Logging Setup
> **Emit:** `▶ [2/6] Structured Logging Setup`

Ignorar se scope for `tracing` ou `metrics` only.

**Campos obrigatórios em todo log:**

| Campo | Tipo | Notas |
|---|---|---|
| `timestamp` | ISO 8601 | UTC, sempre |
| `level` | string | ERROR, WARN, INFO, DEBUG |
| `message` | string | Descrição legível por humano |
| `service` | string | Nome do serviço |
| `version` | string | git SHA ou semver |
| `correlationId` | string | Propaga entre chamadas distribuídas |
| `requestId` | string | UUID por request |
| `userId` | string/null | Presente quando autenticado |

**Níveis — quando usar:**
- `ERROR` — falha que requer intervenção. Serviço degradado ou dados em risco.
- `WARN` — degradado mas funcional. Algo inesperado mas request teve sucesso.
- `INFO` — eventos de negócio: usuário registrado, pagamento processado.
- `DEBUG` — detalhe para dev. Desativar em produção via env var.

**Proibido em logs — nunca logar:**
- Senhas, API keys, tokens, secrets
- Números de cartão, conta bancária
- PII além de user IDs (sem email, nome, endereço, telefone)
- Bodies completos de request/response sem scrubbing

**Biblioteca por stack:**

| Stack | Biblioteca |
|---|---|
| Node.js | `pino` |
| Python | `structlog` |
| Go | `log/slog` (stdlib, Go 1.21+) |
| Ruby | `semantic_logger` |
| Java | `logback` + `logstash-logback-encoder` |
| C# | `Serilog` com JSON formatter |
| Rust | `tracing` crate + `tracing-subscriber` JSON layer |

**Correlation ID middleware:**

```typescript
// Node.js/Express
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] ?? uuidv4();
  const requestId = uuidv4();
  req.correlationId = correlationId;
  req.requestId = requestId;
  res.setHeader('x-correlation-id', correlationId);
  req.log = logger.child({ correlationId, requestId });
  next();
}
```

### Fase 3 — OpenTelemetry Instrumentation
> **Emit:** `▶ [3/6] OpenTelemetry Instrumentation`

Ignorar se scope for `logging` ou `metrics` only.

**Instalação por stack:**

```bash
# Node.js
rtk npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http

# Python
rtk pip install opentelemetry-sdk opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-sqlalchemy opentelemetry-exporter-otlp

# Go
rtk go get go.opentelemetry.io/otel \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
```

**SDK initialization (Node.js) — `src/shared/telemetry.ts`:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]:    process.env.OTEL_SERVICE_NAME    ?? 'unknown-service',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? '0.0.0',
    'deployment.environment':      process.env.NODE_ENV             ?? 'development',
  }),
  traceExporter:  new OTLPTraceExporter(),   // lê OTEL_EXPORTER_OTLP_ENDPOINT
  metricExporter: new OTLPMetricExporter(),
  logExporter:    new OTLPLogExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Env vars (apontam para otel-collector, nunca diretamente para backends):**

```bash
OTEL_SERVICE_NAME=my-api
OTEL_SERVICE_VERSION=1.2.3
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
NODE_ENV=production
```

**Spans manuais em lógica de negócio:**

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service');

async function processPayment(orderId: string, amount: number) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    try {
      span.setAttributes({ 'order.id': orderId, 'payment.amount_cents': amount });
      const result = await chargeCard(orderId, amount);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

> **Checkpoint:** Se contexto atingir ~60k tokens → escreve `.claude/checkpoint.md` com skill, fase, arquivos, próximo passo. Emite: `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

### Fase 4 — Key Metrics
> **Emit:** `▶ [4/6] Key Metrics`

Ignorar se scope for `logging` ou `tracing` only.

**RED method — para todo endpoint:**
- **Rate**: requests por segundo
- **Errors**: taxa de erro < 1%
- **Duration**: latência p50, p95, p99 (target: p95 < 500ms)

**Business metrics — definir 3-5 eventos-chave:**

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('business-metrics');

const signupCounter = meter.createCounter('signups.total', {
  description: 'Total successful user signups',
});

const paymentHistogram = meter.createHistogram('payment.duration_ms', {
  description: 'Payment processing duration',
  unit: 'ms',
});

signupCounter.add(1, { plan: 'free', source: 'organic' });
paymentHistogram.record(durationMs, { currency: 'USD', result: 'success' });
```

### Fase 5 — Health Endpoints
> **Emit:** `▶ [5/6] Health Endpoints`

Sempre implementar ambos.

```typescript
// Liveness — o processo está vivo?
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Readiness — todas as deps estão acessíveis?
app.get('/ready', async (_req, res) => {
  const checks = {
    db:    await pingDatabase() ? 'ok' : 'error',
    cache: await pingRedis()    ? 'ok' : 'error',
  };
  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    checks,
  });
});

// Prometheus scrape endpoint (exposto via otel-collector — raramente necessário na app)
// GET /metrics → usar prom-client se deploy usa scrape direto sem collector
```

### Fase 6 — Grafana Stack Setup
> **Emit:** `▶ [6/6] Grafana Stack Setup`

#### 6.1 — docker-compose para desenvolvimento local

Gerar `docker-compose.observability.yml` (separado do docker-compose principal para não poluir):

```yaml
# docker-compose.observability.yml
# Subir com: docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./.observability/collector.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics scrape
    depends_on:
      - tempo
      - loki

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./.observability/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  tempo:
    image: grafana/tempo:latest
    volumes:
      - ./.observability/tempo.yaml:/etc/tempo.yaml
    command: ["-config.file=/etc/tempo.yaml"]
    ports:
      - "3200:3200"   # Tempo HTTP
      - "4327:4317"   # OTLP gRPC (mapeado diferente para não conflitar)

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - ./.observability/grafana/datasources:/etc/grafana/provisioning/datasources
      - ./.observability/grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3030:3000"   # Grafana UI — http://localhost:3030
    depends_on:
      - prometheus
      - loki
      - tempo

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./.observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
```

#### 6.2 — Configurações dos componentes

Gerar `.observability/collector.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: app
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

Gerar `.observability/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: "otel-collector"
    static_configs:
      - targets: ["otel-collector:8889"]
```

Gerar `.observability/prometheus-alerts.yml`:

```yaml
groups:
  - name: app-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(app_http_server_duration_count{http_status_code=~"5.."}[5m]) /
              rate(app_http_server_duration_count[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 1% for 2 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(app_http_server_duration_bucket[5m])) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency > 500ms for 2 minutes"

      - alert: ServiceDown
        expr: up{job="otel-collector"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "OTel Collector is down"
```

Gerar `.observability/tempo.yaml`:

```yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/blocks
```

Gerar `.observability/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'default'

receivers:
  - name: 'default'
    # Adicionar webhook, Slack, PagerDuty conforme necessário:
    # slack_configs:
    #   - api_url: 'https://hooks.slack.com/services/...'
    #     channel: '#alerts'
```

Gerar `.observability/grafana/datasources/datasources.yaml`:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    url: http://loki:3100
    editable: true

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    editable: true
    jsonData:
      tracesToLogsV2:
        datasourceUid: Loki
      serviceMap:
        datasourceUid: Prometheus
```

#### 6.3 — Comandos úteis

```bash
# Subir stack de observabilidade junto com a app
rtk docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Abrir Grafana (user: admin / sem senha em dev)
open http://localhost:3030

# Ver traces no Tempo via Grafana
# Explore → Tempo → Search (por service name)

# Ver logs no Loki via Grafana
# Explore → Loki → {job="my-api"}

# Ver métricas no Prometheus
open http://localhost:9090

# Verificar que collector está recebendo dados
rtk curl -s http://localhost:8889/metrics | grep app_

# Health check da aplicação
rtk curl -s http://localhost:3000/health | rtk jq .
rtk curl -s http://localhost:3000/ready  | rtk jq .

# Tail de logs estruturados em dev (pino)
rtk npm run dev | rtk npx pino-pretty
```

#### 6.4 — Gerar `docs/OBSERVABILITY.md`

```markdown
# Observability

## Stack
Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana (dashboards) + Alertmanager

## Como subir localmente
```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```
Grafana: http://localhost:3030

## O que está instrumentado
- [ ] Structured logging (pino / structlog / slog)
- [ ] Correlation ID middleware
- [ ] HTTP request auto-instrumentation (OpenTelemetry)
- [ ] Database query auto-instrumentation
- [ ] External HTTP call auto-instrumentation
- [ ] Manual spans em operações críticas: [listar]
- [ ] RED metrics para todos os endpoints
- [ ] Business counters: [listar]
- [ ] /health endpoint
- [ ] /ready endpoint

## Variáveis de ambiente necessárias
```bash
OTEL_SERVICE_NAME=<nome-do-servico>
OTEL_SERVICE_VERSION=<git-sha-ou-semver>
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Alertas configurados
| Alerta | Condição | Severidade |
|--------|----------|------------|
| HighErrorRate | Error rate > 1% por 2min | P1 |
| HighLatency | p95 > 500ms por 2min | P2 |
| ServiceDown | OTel Collector down | P1 |
```

---

## Quick Reference

```bash
# Verificar SDK inicializa sem erros (Node.js)
rtk node -e "require('./src/shared/telemetry')" 2>&1

# Ver spans chegando no Tempo
open http://localhost:3030  # Grafana → Explore → Tempo

# Ver logs chegando no Loki
# Grafana → Explore → Loki → {service_name="my-api"}

# Ver métricas chegando no Prometheus
rtk curl -s http://localhost:8889/metrics | grep app_http
```

---

## Deviações permitidas

- Pular Fase 3 (tracing) se scope for `logging` ou `metrics` only
- Pular Fase 4 (metrics) se scope for `logging` ou `tracing` only
- Pular Fase 2 (logging) se scope for `tracing` ou `metrics` only
- **Nunca pular Fase 5** (health endpoints) — obrigatório para qualquer serviço containerizado
- **Nunca pular Fase 6** (Grafana stack) — docker-compose.observability.yml é o artefato de entrega
- Para produção: substituir `backend: local` do Tempo por object storage (S3, GCS) e configurar retenção no Prometheus
