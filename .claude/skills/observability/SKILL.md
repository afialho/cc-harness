---
name: observability
description: Structured logging and OpenTelemetry instrumentation with Grafana stack by default (Prometheus + Loki + Tempo + Grafana + Alertmanager). Provides docker-compose for local dev and production setup guidance.
argument-hint: [scope: logging | tracing | metrics | all]
---

# /observability — Structured Logging & OpenTelemetry → Grafana Stack

> Instrumentation via OpenTelemetry (code does not change if the backend changes).
> Default backend: **Grafana Stack** — Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana (dashboards) + Alertmanager.
> Pipeline: App → OTel Collector → Prometheus / Loki / Tempo → Grafana.

---

## Grafana Stack (default)

```
App (OTLP) → OpenTelemetry Collector
                ├─ metrics → Prometheus → Grafana
                ├─ logs    → Loki       → Grafana
                └─ traces  → Tempo      → Grafana
                                Alertmanager ← Prometheus
```

All components run in Docker. Application code sends OTLP to the collector — never directly to Prometheus, Loki, or Tempo.

---

## Workflow (6 Phases)

### Phase 1 — Instrumentation Inventory
> **Emit:** `▶ [1/6] Instrumentation Inventory`

Scan the codebase before adding anything:

- `console.log` / `print` / `fmt.Println` → candidates for structured log upgrade
- HTTP server framework: Express, Fastify, FastAPI, Rails, Gin, Fiber
- Database client: Prisma, TypeORM, Sequelize, SQLAlchemy, GORM, ActiveRecord
- HTTP clients externos: `fetch`, `axios`, `httpx`, `net/http`
- Background jobs: BullMQ, Sidekiq, Celery, Asynq
- Existing observability: loggers, tracing libs, metrics exporters

Output: table of what exists, what is missing, which phases are in scope.

### Phase 2 — Structured Logging Setup
> **Emit:** `▶ [2/6] Structured Logging Setup`

Skip if scope is `tracing` or `metrics` only.

**Required fields in every log:**

| Field | Type | Notes |
|---|---|---|
| `timestamp` | ISO 8601 | UTC, always |
| `level` | string | ERROR, WARN, INFO, DEBUG |
| `message` | string | Human-readable description |
| `service` | string | Service name |
| `version` | string | git SHA or semver |
| `correlationId` | string | Propagated across distributed calls |
| `requestId` | string | UUID per request |
| `userId` | string/null | Present when authenticated |

**Levels — when to use:**
- `ERROR` — failure requiring intervention. Service degraded or data at risk.
- `WARN` — degraded but functional. Something unexpected but request succeeded.
- `INFO` — business events: user registered, payment processed.
- `DEBUG` — detail for dev. Disable in production via env var.

**Forbidden in logs — never log:**
- Passwords, API keys, tokens, secrets
- Credit card numbers, bank account numbers
- PII beyond user IDs (no email, name, address, phone)
- Full request/response bodies without scrubbing

**Library per stack:**

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

### Phase 3 — OpenTelemetry Instrumentation
> **Emit:** `▶ [3/6] OpenTelemetry Instrumentation`

Skip if scope is `logging` or `metrics` only.

**Installation per stack:**

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
  traceExporter:  new OTLPTraceExporter(),   // reads OTEL_EXPORTER_OTLP_ENDPOINT
  metricExporter: new OTLPMetricExporter(),
  logExporter:    new OTLPLogExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Env vars (point to otel-collector, never directly to backends):**

```bash
OTEL_SERVICE_NAME=my-api
OTEL_SERVICE_VERSION=1.2.3
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
NODE_ENV=production
```

**Manual spans in business logic:**

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

> **Checkpoint:** If context reaches ~60k tokens → write `.claude/checkpoint.md` with skill, phase, files, next step. Emit: `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

### Phase 4 — Key Metrics
> **Emit:** `▶ [4/6] Key Metrics`

Skip if scope is `logging` or `tracing` only.

**RED method — for every endpoint:**
- **Rate**: requests per second
- **Errors**: error rate < 1%
- **Duration**: latency p50, p95, p99 (target: p95 < 500ms)

**Business metrics — define 3-5 key events:**

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

### Phase 5 — Health Endpoints
> **Emit:** `▶ [5/6] Health Endpoints`

Always implement both.

```typescript
// Liveness — is the process alive?
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Readiness — are all deps reachable?
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

// Prometheus scrape endpoint (exposed via otel-collector — rarely needed in the app)
// GET /metrics → use prom-client if deploy uses direct scrape without collector
```

### Phase 6 — Grafana Stack Setup
> **Emit:** `▶ [6/6] Grafana Stack Setup`

#### 6.1 — docker-compose for local development

Generate `docker-compose.observability.yml` (separate from the main docker-compose to avoid pollution):

```yaml
# docker-compose.observability.yml
# Start with: docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

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
      - "4327:4317"   # OTLP gRPC (mapped differently to avoid conflict)

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

#### 6.2 — Component configurations

Generate `.observability/collector.yaml`:

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

Generate `.observability/prometheus.yml`:

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

Generate `.observability/prometheus-alerts.yml`:

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

Generate `.observability/tempo.yaml`:

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

Generate `.observability/alertmanager.yml`:

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
    # Add webhook, Slack, PagerDuty as needed:
    # slack_configs:
    #   - api_url: 'https://hooks.slack.com/services/...'
    #     channel: '#alerts'
```

Generate `.observability/grafana/datasources/datasources.yaml`:

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

#### 6.3 — Useful commands

```bash
# Start observability stack alongside the app
rtk docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Open Grafana (user: admin / no password in dev)
open http://localhost:3030

# View traces in Tempo via Grafana
# Explore → Tempo → Search (by service name)

# View logs in Loki via Grafana
# Explore → Loki → {job="my-api"}

# View metrics in Prometheus
open http://localhost:9090

# Verify that collector is receiving data
rtk curl -s http://localhost:8889/metrics | grep app_

# Application health check
rtk curl -s http://localhost:3000/health | rtk jq .
rtk curl -s http://localhost:3000/ready  | rtk jq .

# Tail structured logs in dev (pino)
rtk npm run dev | rtk npx pino-pretty
```

#### 6.4 — Generate `docs/OBSERVABILITY.md`

```markdown
# Observability

## Stack
Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana (dashboards) + Alertmanager

## How to start locally
```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```
Grafana: http://localhost:3030

## What is instrumented
- [ ] Structured logging (pino / structlog / slog)
- [ ] Correlation ID middleware
- [ ] HTTP request auto-instrumentation (OpenTelemetry)
- [ ] Database query auto-instrumentation
- [ ] External HTTP call auto-instrumentation
- [ ] Manual spans on critical operations: [list]
- [ ] RED metrics for all endpoints
- [ ] Business counters: [list]
- [ ] /health endpoint
- [ ] /ready endpoint

## Required environment variables
```bash
OTEL_SERVICE_NAME=<service-name>
OTEL_SERVICE_VERSION=<git-sha-or-semver>
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Configured alerts
| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | Error rate > 1% for 2min | P1 |
| HighLatency | p95 > 500ms for 2min | P2 |
| ServiceDown | OTel Collector down | P1 |
```

---

## Quick Reference

```bash
# Verify SDK initializes without errors (Node.js)
rtk node -e "require('./src/shared/telemetry')" 2>&1

# View spans arriving in Tempo
open http://localhost:3030  # Grafana → Explore → Tempo

# View logs arriving in Loki
# Grafana → Explore → Loki → {service_name="my-api"}

# View metrics arriving in Prometheus
rtk curl -s http://localhost:8889/metrics | grep app_http
```

---

## Allowed deviations

- Skip Phase 3 (tracing) if scope is `logging` or `metrics` only
- Skip Phase 4 (metrics) if scope is `logging` or `tracing` only
- Skip Phase 2 (logging) if scope is `tracing` or `metrics` only
- **Never skip Phase 5** (health endpoints) — required for any containerized service
- **Never skip Phase 6** (Grafana stack) — docker-compose.observability.yml is the delivery artifact
- For production: replace Tempo's `backend: local` with object storage (S3, GCS) and configure retention in Prometheus
