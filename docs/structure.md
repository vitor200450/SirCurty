# Estrutura de pastas recomendada (Sir Curty)

## Visão geral (monorepo)

```text
SirCurty/
  frontend/                 # React + Vite + TypeScript
  api/                      # NestJS + TypeScript + Prisma
  k8s/                      # Chart Helm + ArgoCD Application
  .github/workflows/        # CI/CD GitHub Actions
  docs/                     # Planejamento, arquitetura, pitch, observabilidade, AI usage
  scripts/                  # Seed, geração de cliques, utilitários
  README.md
```

## frontend/

```text
frontend/
  src/
    app/                    # bootstrap (providers, router, layout principal)
    routes/                 # páginas/rotas (Home, LinkDetails, Dashboard, Preview)
    features/
      links/                # criação, listagem, ações (hooks/components da feature)
      dashboard/            # estatísticas/ranking/gráficos
      auth/                 # cookie anônimo + Google login (opcional)
      observability/        # setup OTel browser, spans, exporter
    components/             # UI reutilizável (Button, Card, Modal, etc.)
    hooks/                  # hooks genéricos
    lib/                    # api client, validators (Zod), utils
    assets/                 # imagens/mascote SVG/Lottie, ícones
    styles/                 # tokens, tema medieval, global CSS
  public/
    env-config.js        # fallback opcional; versão runtime gerada no container
  e2e/                    # testes E2E (Playwright/Cypress) - opcional
  Dockerfile
  nginx.conf                # SPA (try_files $uri /index.html)
  vite.config.ts
  tsconfig.json
  package.json
```

## api/ (NestJS)

```text
api/
  src/
    main.ts
    app.module.ts
    modules/
      links/                # controller, service, dto, entity, tests
      clicks/               # registro de acessos/estatísticas
      auth/                 # cookie anônimo + Google (opcional)
      security/             # filtros de URLs, senha, rate limit
      health/               # probes
      observability/        # métricas/traces helpers (opcional)
    common/
      filters/              # exception filters
      interceptors/         # logging, tracing
      pipes/                # validation/global pipes
      guards/               # auth guards
      decorators/           # custom decorators
    config/                 # env validation (Joi/Zod), config modules
    infrastructure/
      database/             # Prisma service, repositories
      cache/                # (opcional) Redis
    utils/                  # base62/sqids encode/decode, hash, validators
  prisma/
    schema.prisma
    migrations/
    seed.ts
  test/
    unit/
    integration/
  Dockerfile
  nest-cli.json
  tsconfig*.json
  package.json
```

## k8s/

```text
k8s/
  charts/sircurty/
    Chart.yaml
    values.yaml           # tags de imagem, hosts, replicas
    dashboards/           # JSON do Grafana
    templates/
      app/                # frontend, api, postgres, config, ingress
      observability/      # otel-collector, tempo, grafana, ingresses
  secret.example.yaml
  argocd/
    application.yaml
```

## docs/

```text
docs/
  initial-planning.md   # visão geral + decisões
  structure.md             # esta estrutura
  architecture.md           # desenho de arquitetura (opcional)
  observability.md          # OTel + Grafana in-cluster
  pitch.md                 # roteiro do pitch
  ai-usage.md              # log de prompts/decisões de IA
```

## .github/workflows/

```text
.github/workflows/
  ci.yml                   # lint/test/build (PR)
  cd.yml                   # build/push imagem + bump de tag (merge em main)
```

## scripts/

```text
scripts/
  reset-cluster.ps1        # recria o cluster local do zero
```

## Princípios da estrutura

- **Separar por domínio/feature** no frontend (evita arquivos gigantes).
- **Módulos Nest por bounded context** (links, clicks, auth, security, health).
- **Infraestrutura isolada** em `infrastructure/` (DB/cache) e `config/`.
- **K8s declarativo com Helm** (chart + values) para facilitar GitOps.
- **Observabilidade versionada** (dashboards JSON + manifests) no repositório.
- **Scripts de demo** separados para não poluir código de produção.
- **Docs centralizados** (decisões, pitch, uso de IA) para avaliação do hackathon.
```

Gerado por recomendação para o projeto Sir Curty (hackathon cloud-native).
