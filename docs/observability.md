# Observabilidade dentro do cluster (Sir Curty)

## Visão

Toda a observabilidade (traces, métricas e painéis) roda **dentro do mesmo cluster Kubernetes**,
na namespace `observability`, alimentada por OpenTelemetry. O app (namespace `sircurty`) envia
sinais para um coletor OTLP, que distribui para Tempo (traces) e Prometheus (métricas).

```
frontend (browser SDK) ─┐
api (Nest OTel SDK) ────┼── OTLP/gRPC/HTTP ──► otel-collector (observability)
postgres (driver/SDK?) ─┘                           │
                                                     ├──► Tempo (traces) ──┐
                                                     │        │            │
                                                     │        │ span       │
                                                     │        │ metrics    │
                                                     │        ▼            │
                                                     └──► Prometheus ──────┤
                                                              (métricas)     │
                                                                           Grafana ◄┘
                                                                        (datasources)
```

> **Por que o Prometheus é obrigatório:** as queries de agregação dos dashboards
> (`count_over_time`, `by(...)`) são TraceQL *metrics* e precisam de um backend de
> métricas para armazenar as séries — o Tempo sozinho devolve `400 parse error`.
> O Prometheus também é o que alimenta o Service Graph. Sem ele, sobram apenas
> os painéis de trace (busca e waterfall).

## Componentes (Kubernetes)

- **Namespace `sircurty`**: frontend, api, postgres.
- **Namespace `observability`**:
  - `Deployment/otel-collector` (OTLP receiver + processors + exporters)
  - `Deployment/tempo` (single binary) + PVC para traces
  - `Deployment/prometheus` + PVC (recebe as span metrics do Tempo via remote write)
  - `Deployment/grafana` + PVC (dashboards/datasources provisionados)
- Ingress:
  - `sircurty.local` → app (frontend + `/api`)
  - `grafana.sircurty.local` (ou `/grafana`) → Grafana
  - (opcional) `otel.sircurty.local` → collector (para browsers enviarem OTLP direto com CORS)

## Fluxo de dados

1. **Frontend (browser)** gera spans (`page load`, `create link`, `click button`) e envia via OTLP/HTTP para o collector (por ingress ou via proxy da API).
2. **API (Nest)** usa OTel SDK com auto-instrumentação (HTTP, Express, `pg`) gerando trace completo por requisição, incluindo queries ao Postgres.
3. **Collector** processa (batch, memory limiter, resource attributes) e exporta traces para Tempo.
4. **Tempo** guarda os traces e, com o `metrics_generator` ligado, gera as span metrics e envia ao Prometheus por remote write.
5. **Grafana** consome Tempo (traces e waterfall) e Prometheus (agregações e Service Graph).

## Spans nomeados (camada de negócio)

Além da auto-instrumentação, a API cria spans explícitos nas operações de link,
para carregar atributos que o framework não conhece:

| Span | Atributos | Alimenta |
|---|---|---|
| `links.create` | `link.code`, `link.target_domain`, `link.vanity`, `link.single_use`, `link.has_password` | contagem de links criados, domínios mais encurtados |
| `links.redirect` | `link.code`, `link.target_domain`, `link.status` | ranking de links por clique |
| `links.unlock` | `link.code`, `link.password_valid` | tentativas de desbloqueio (senha certa vs errada) |

O `link.code` é o que permite o ranking de links mais acessados e o gráfico de
domínios de destino saírem direto do trace, sem instrumentação extra.

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
- **Imports no frontend**: o SDK do browser precisa ser importado antes de qualquer
  outro módulo, e o `zone.js` junto — o `ZoneContextManager` do OTel depende dele
  para preservar o contexto de trace entre Promises e event handlers do React:

  ```typescript
  import "zone.js";
  import "./observability/tracing";
  ```

## Métricas de span (Tempo → Prometheus)

O `metrics_generator` do Tempo precisa estar ligado, com as dimensões que viram
labels no Prometheus:

```yaml
metrics_generator:
  storage:
    path: /var/tempo/generator/wal
    remote_write:
      - url: http://prometheus.observability.svc.cluster.local:9090/api/v1/write
  processor:
    service_graphs:
      wait: 10s
    span_metrics:
      dimensions:
        - service
        - span_name
        - status_code
        - link.code
        - link.target_domain

overrides:
  defaults:
    metrics_generator:
      processors: [service-graphs, span-metrics]
```

- `service-graphs` monta as arestas do Service Graph (quem chama quem).
- `span-metrics` gera as séries agregáveis (`traces_spanmetrics_calls_total`,
  `traces_spanmetrics_latency_bucket`).
- As dimensões viram labels Prometheus. A lista é curta de propósito: incluir a
  URL inteira ou o `userId` estouraria a cardinalidade do TSDB.
- O Prometheus precisa rodar com `--web.enable-remote-write-receiver`, que é o
  receptor do remote write do Tempo.

## Manifests

- `k8s/charts/sircurty/templates/observability/namespace.yaml`
- `k8s/charts/sircurty/templates/observability/otel-collector/{configmap,deployment,service}.yaml`
- `k8s/charts/sircurty/templates/observability/tempo/{configmap,deployment,service,pvc}.yaml`
- `k8s/charts/sircurty/templates/observability/prometheus/{configmap,deployment,service,pvc}.yaml`
- `k8s/charts/sircurty/templates/observability/grafana/{configmap-datasources,dashboard-provisioning,deployment,service,pvc}.yaml`

## Datasources e dashboards (provisionados via ConfigMap)

- Tempo como datasource de traces
- Prometheus como datasource de métricas
- O datasource do Tempo aponta `serviceMap.datasourceUid` para o Prometheus, que é
  o que habilita o Service Graph no Explore
- Dashboards versionados em `k8s/.../grafana/dashboards/*.json` montados via ConfigMap.

## Dashboards mínimos ("core")

1. **Visão geral:** RPS, latência p95/p99, erros 4xx/5xx, pods healthy.
2. **Links:** top códigos por cliques, cliques por hora, domínios mais encurtados, links expirados/bloqueados.
3. **Traces:** exemplo de trace atravessando frontend → API → banco (view waterfall).

## Probes e recursos

- Todos os pods com `liveness`/`readiness` (API em `/health/live` e `/health/ready`).
- Requests/limits de CPU e memória para evitar OOM em demo.
- Retenção curta (ex.: 24–48h) para traces; adequado ao hackathon.
- PVC suficiente para Tempo (ex.: 5–10Gi), Prometheus (ex.: 5Gi) e Grafana (1Gi).
- O Prometheus é o componente mais pesado da stack de observabilidade: pede ~512Mi
  e tem limit de 2Gi.

## Execução no pitch

1. Abrir Grafana (dashboard principal).
2. Criar link no app.
3. Rodar script de cliques (loop ou vários navegadores).
4. Mostrar dashboard subindo em tempo real.
5. Abrir um trace no Grafana e mostrar a cadeia frontend → API → banco.

> Os painéis de latência usam `rate(...[1m])` e ficam vazios sem spans recentes.
> Gere tráfego 1 a 2 minutos antes de abrir o dashboard.
> O acesso anônimo do Grafana é Viewer e não abre o Explore — o clique no Trace ID
> exige login como `admin`.

## Observações

- Sem Loki, use `kubectl logs` no pitch (aceitável).
- Se o cluster for muito limitado (Docker Desktop Kubernetes com pouca RAM), dá
  pra remover o Prometheus e ficar só com Tempo + Grafana + collector. O que se
  perde são os painéis de agregação e o Service Graph — o trace e o waterfall
  continuam funcionando.
- A propagação `traceparent` só vale entre componentes que estão instrumentados.
  Um serviço de terceiro no caminho precisaria instrumentar e propagar também.
- A granularidade da latência p95 segue os buckets padrão do Tempo. Para medir
  faixas específicas em produção, convém configurar buckets customizados.
- Fora do escopo inicial: alerting, SLOs formais, tracing de jobs assíncronos.
