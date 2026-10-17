# Infraestrutura: Kubernetes, CI/CD e GitOps

Responsável: José Vitor. Este documento explica como as três partes se encaixam. Detalhes de uso
e comandos estão em `k8s/README.md`.

## Visão geral

```text
dev -> PR -> develop
              │
              ├─ CI  (ci.yml)  lint + test + build + valida manifests + build dos Dockerfiles
              │
              └─ CD  (cd.yml)  build/push das imagens (GHCR, tag = SHA)
                                └─ commit do bump de tag em k8s/overlays/dev
                                      │
                                      ▼
                              ArgoCD (observa `develop`, path k8s/overlays/dev)
                                      │  auto-sync / prune / self-heal
                                      ▼
                      Cluster Kubernetes (Docker Desktop)
                      ├─ ns sircurty:       frontend, api, postgres, ingress
                      └─ ns observability:  otel-collector, tempo, grafana
```

O Git é a fonte da verdade: o ArgoCD só aplica o que está commitado. Para mudar o que roda no
cluster, muda-se o repositório (e o rollback é reverter o commit).

## 1. Kubernetes (`k8s/`)

Os manifests usam Kustomize, com `base/` (comum) e `overlays/dev/` (ajustes do ambiente).

### Namespace `sircurty` (`k8s/base/app/`)

| Componente | Tipo | Como funciona |
|---|---|---|
| `postgres` | StatefulSet + Service headless | 1 réplica, volume de 1Gi (`volumeClaimTemplates`) para os dados sobreviverem a restarts. Probes com `pg_isready`. |
| `api` | Deployment + Service (3000) | Probes em `/health/live` e `/health/ready`. Dois initContainers: `wait-for-postgres` espera o banco e `migrate` roda `prisma migrate deploy`. |
| `frontend` | Deployment + Service (80) | Nginx servindo o build do Vite. O `docker-entrypoint.sh` gera `/env-config.js` a partir de variáveis do ConfigMap (configuração em runtime, sem rebuild). |
| `sircurty-config` | ConfigMap | Valores não sensíveis: `API_URL`, `APP_ENV`, `APP_BASE_URL`, `OTEL_ENDPOINT`, porta, nome do serviço OTel, banco e usuário do Postgres. |
| `sircurty-secrets` | Secret | `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`. **Criado manualmente no cluster, nunca commitado** (`secret.example.yaml` é só referência e não entra no kustomization). |
| `sircurty` | Ingress (nginx) | Host `sircurty.local`: `/api` vai para a API; `/` (inclusive `/s/:code`) vai para o frontend. O interstitial precisa ser resolvido pela SPA, então o ingress não manda `/s/*` para a API. |

Todos os containers têm requests/limits de CPU e memória.

### Namespace `observability` (`k8s/base/observability/`)

OTel Collector, Tempo e Grafana (dashboards versionados em JSON). É a parte do Matheus; o overlay
apenas a inclui junto com o app. A API e o browser enviam traces ao Collector, que os guarda no
Tempo; o Grafana lê o Tempo. Ver `docs/observability.md`.

### Overlay `dev` (`k8s/overlays/dev/`)

- Junta `base/observability` e `base/app`.
- Define uma réplica por Deployment (economiza recursos no Docker Desktop).
- Campo `images`: guarda a tag das imagens da API e do frontend. É esse campo que o CD altera.

### Rede e acesso local

Requer o Ingress NGINX instalado e, no arquivo hosts:

```text
127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local
```

## 2. CI (`.github/workflows/ci.yml`)

Roda em PRs e pushes para `develop` e `main`. Jobs:

1. **api**: `npm ci`, `prisma generate`, lint, testes e build.
2. **frontend**: `npm ci`, lint, testes e build.
3. **manifests**: `kubectl kustomize k8s/overlays/dev` (falha se algum manifest estiver quebrado).
4. **docker**: builda as duas imagens sem publicar (depende de api e frontend), para pegar Dockerfile
   quebrado antes do merge.

Lint, testes e build usam `--if-present`: se um script ainda não existir, o passo é pulado.

## 3. CD (`.github/workflows/cd.yml`)

Roda a cada push em `develop` (ignorando mudanças só em `k8s/`, `docs/` e `*.md`).

1. **build-and-push**: builda API e frontend e publica no GHCR com duas tags: o SHA do commit e
   `latest`. O pod usa a tag com SHA, o que garante imagem imutável e rollback simples.
2. **bump-manifests**: roda `kustomize edit set image` em `k8s/overlays/dev` com o novo SHA e faz
   commit/push em `develop` (`chore: bump image tags to <sha>`).

Esse commit não dispara o CD de novo por causa do `paths-ignore: k8s/**`. O push usa o
`GITHUB_TOKEN` (`contents: write`, `packages: write`); nenhum segredo extra é necessário.

## 4. GitOps (ArgoCD, `k8s/argocd/application.yaml`)

A `Application` `sircurty-dev` observa o branch `develop`, no path `k8s/overlays/dev`.

- **auto-sync**: aplica sozinho qualquer commit novo.
- **prune**: remove do cluster o que foi removido do Git.
- **self-heal**: desfaz alterações manuais feitas direto no cluster.
- **retry** com backoff e `ServerSideApply` (os ConfigMaps dos dashboards são grandes).
- **Sync waves** (ordem de subida): `0` namespaces/config/observabilidade → `1` postgres →
  `2` api → `3` frontend e ingress. Assim o banco existe antes da API e a API antes do frontend.

**Rollback**: reverter o commit do bump de tag (ou o commit problemático) em `develop`; o ArgoCD
reaplica o estado anterior.

## 5. Dockerfiles

- `api/Dockerfile`: build multi-stage com Node 20; gera o Prisma Client, compila e roda
  `node dist/main.js` como usuário `node`. Mantém o `node_modules` completo para o CLI do Prisma
  estar disponível no initContainer `migrate`.
- `frontend/Dockerfile`: build do Vite e runtime `nginx:alpine`, com `nginx.conf` (fallback da SPA)
  e o `docker-entrypoint.sh`.

## Subir do zero

1. Docker Desktop com Kubernetes habilitado e Ingress NGINX instalado.
2. Entradas no arquivo hosts (ver acima).
3. `kubectl create namespace sircurty` e criar o Secret `sircurty-secrets` (comando em `k8s/README.md`).
4. Instalar o ArgoCD e aplicar `kubectl apply -f k8s/argocd/application.yaml`.
5. Acompanhar o sync na UI do ArgoCD; abrir `http://sircurty.local` e `http://grafana.sircurty.local`.

Sem ArgoCD (teste rápido): `kubectl apply -k k8s/overlays/dev`.

## Roteiro para a demo

Merge em `develop` → Actions verde (CI e CD) → commit de bump de tag → ArgoCD sincronizando →
pods novos (rolling update) → app atualizado; Grafana mostrando saúde e traces.

## Limitações conhecidas

- Nada foi executado ainda em cluster real nem no GitHub Actions; `api/` e `frontend/` ainda não
  têm código, então CI/CD e Dockerfiles só foram validados sintaticamente.
- Os workflows assumem `package-lock.json`, scripts `build`/`test`/`lint` e `prisma/` em `api/`.
- O bump de tag faz push direto em `develop`; se a branch for protegida, liberar o
  `github-actions[bot]`.
- Os pacotes do GHCR precisam ser públicos ou ser criado um `imagePullSecret`.
- O prefixo global `/api` da API deve ser confirmado (o health fica em `/health/*`, sem prefixo).
