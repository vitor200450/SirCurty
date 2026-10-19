# Observabilidade dentro do cluster (Sir Curty)

## Visão

Toda a observabilidade (traces, métricas e painéis) roda **dentro do mesmo cluster Kubernetes**,
na namespace `observability`, alimentada por OpenTelemetry. O app (namespace `sircurty`) envia
sinais para um coletor OTLP, que distribui para Tempo (traces) e, opcionalmente, Prometheus/Loki.

```
frontend (browser SDK) ─┐
api (Nest OTel SDK) ────┼── OTLP/gRPC/HTTP ──► otel-collector (observability)
postgres (driver/SDK?) ─┘                           │
                                                     ├──► Tempo (traces) ──┐
                                                     ├──► Prometheus (metrics) (opcional)
                                                     └──► Loki (logs) (opcional)
                                                               │
                                                           Grafana ◄┘ (datasources)
```

## Componentes (Kubernetes)

- **Namespace `sircurty`**: frontend, api, postgres.
- **Namespace `observability`**:
  - `Deployment/otel-collector` (OTLP receiver + processors + exporters)
  - `Deployment/tempo` (single binary) + PVC para traces
  - `Deployment/prometheus` (opcional) + PVC
  - `Deployment/loki` (opcional) + PVC
  - `Deployment/grafana` + PVC (dashboards/datasources provisionados)
- Ingress:
  - `sircurty.local` → app (frontend + `/api`)
  - `grafana.sircurty.local` (ou `/grafana`) → Grafana
  - (opcional) `otel.sircurty.local` → collector (para browsers enviarem OTLP direto com CORS)

## Fluxo de dados

1. **Frontend (browser)** gera spans (`page load`, `create link`, `click button`) e envia via OTLP/HTTP para o collector (por ingress ou via proxy da API).
2. **API (Nest)** usa OTel SDK com auto-instrumentação (HTTP, Express, `pg`) gerando trace completo por requisição, incluindo queries ao Postgres.
3. **Collector** processa (batch, memory limiter, resource attributes) e exporta traces para Tempo; métricas para Prometheus (se habilitado); logs para Loki (se habilitado).
4. **Grafana** consome Tempo (traces) + Prometheus/Loki e exibe dashboards e exploração de traces.

## Configuração OTel (app)

- Resource attributes obrigatórios:
  - `service.name` (`sircurty-frontend`, `sircurty-api`)
  - `deployment.environment` (`dev`/`hackathon`)
  - `service.version` (git sha/imagem)
- Samplers: `always_on` em dev/demo; ajustar se necessário.
- Propagação: `traceparent`/`tracestate` do browser para a API; da API para Postgres (auto-instrumentação).
- Exporter:
  - API: OTLP gRPC para `otel-collector.observability.svc:4317`
  - Frontend: OTLP HTTP para `http://otel.sircurty.local` (ou proxy)

## Manifests sugeridos

- `k8s/charts/sircurty/templates/observability/namespace.yaml`
- `k8s/charts/sircurty/templates/observability/otel-collector/{configmap,deployment,service}.yaml`
- `k8s/charts/sircurty/templates/observability/tempo/{configmap,deployment,service,pvc}.yaml`
- `k8s/charts/sircurty/templates/observability/grafana/{configmap-datasources,dashboard-provisioning,deployment,service,pvc}.yaml`
- (opcional) Prometheus/Loki.

## Datasources e dashboards (provisionados via ConfigMap)

- Tempo como datasource de traces
- Prometheus (se habilitado) para métricas
- Dashboards versionados em `k8s/.../grafana/dashboards/*.json` montados via ConfigMap.

## Dashboards mínimos ("core")

1. **Visão geral:** RPS, latência p95/p99, erros 4xx/5xx, pods healthy.
2. **Links:** top códigos por cliques, cliques por hora, domínios mais encurtados, links expirados/bloqueados.
3. **Traces:** exemplo de trace atravessando frontend → API → banco (view waterfall).

## Probes e recursos

- Todos os pods com `liveness`/`readiness` (API em `/health/live` e `/health/ready`).
- Requests/limits de CPU e memória para evitar OOM em demo.
- Retenção curta (ex.: 24–48h) para traces; adequado ao hackathon.
- PVC suficiente para Tempo (ex.: 5–10Gi) e Grafana (1Gi).

## Execução no pitch

1. Abrir Grafana (dashboard principal).
2. Criar link no app.
3. Rodar script de cliques (loop ou vários navegadores).
4. Mostrar dashboard subindo em tempo real.
5. Abrir um trace no Grafana e mostrar a cadeia frontend → API → banco.

## Observações

- Sem Loki, use `kubectl logs` no pitch (aceitável).
- Se o cluster for limitado (Docker Desktop Kubernetes), prefira **Tempo + Grafana + collector** (sem Prometheus/Loki) para reduzir consumo.
- Fora do escopo inicial: alerting, SLOs formais, tracing de jobs assíncronos.
