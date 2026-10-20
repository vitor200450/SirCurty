# Minha parte: Kubernetes, CI/CD e GitOps — roteiro de apresentação

Objetivo: explicar em ~5 minutos como o código vira algo rodando no cluster, sem entrar em detalhes de implementação. Usar apenas nomes reais do repositório.

## Diagrama em uma linha

```
push em develop  →  CI (ci.yml)  →  CD (cd.yml)  →  bump de tag em values.yaml
                                              │
                                              ▼
                                        ArgoCD (Application sircurty-dev)
                                              │  auto-sync / prune / self-heal
                                              ▼
                                    Cluster Kubernetes (Docker Desktop)
```

## O que falar em cada bloco

### 1. Kubernetes (chart Helm)
- O cluster é um **Docker Desktop local**; o app roda no namespace `sircurty` (frontend, api, postgres, ingress) e a observabilidade em `observability` (otel-collector, tempo, prometheus, grafana).
- Tudo é um único chart Helm em `k8s/charts/sircurty`: `templates/` + `values.yaml` (tags de imagem, hosts, réplicas).
- Detalhes que valem mencionar se houver tempo:
  - `postgres`: StatefulSet com PVC de 1Gi (dados sobrevivem a restart).
  - `api`: Deployment com dois initContainers — `wait-for-postgres` e `migrate` (`prisma migrate deploy`) — e probes `/health/live` e `/health/ready`.
  - `frontend`: `nginx:alpine` servindo o build do Vite; configuração vem de um ConfigMap em runtime (sem rebuild de imagem).
  - Ingress NGINX: `/api` vai para a API, `/` (inclusive `/s/:code`) fica com o SPA por causa do interstitial.
  - O `Secret` (`sircurty-secrets`, senhas/JWT) **não está no repositório** — é criado manualmente no cluster.

### 2. CI (`.github/workflows/ci.yml`)
- Dispara em PRs e pushes para `develop` e `main`.
- Jobs: `api` (npm ci, prisma generate, lint, teste, build), `frontend` (idêntico), `manifests` (`helm lint` + `helm template` — falha se o chart estiver quebrado), `docker` (build das imagens sem publicar, depende de api e frontend).
- Lint/teste/build usam `--if-present`: scripts ausentes são pulados.

### 3. CD (`.github.workflows/cd.yml`)
- Dispara em push para `develop` (ignora mudanças só em `k8s/`, `docs/` e `*.md`, evitando loop).
- Job `build-and-push`: builda API e frontend e publica no **GHCR** (`ghcr.io/vitor200450/...`) com duas tags: o SHA do commit e `latest`. O pod usa a tag com SHA → imagem imutável e rollback simples.
- Job `bump-manifests`: atualiza `api.image.tag` e `frontend.image.tag` em `k8s/charts/sircurty/values.yaml` com `yq -i` e faz commit em `develop` (`chore: bump image tags to <sha>`).
- Não precisa de segredo extra: usa `GITHUB_TOKEN` com `contents: write` e `packages: write`.

### 4. GitOps (ArgoCD)
- `Application` `sircurty-dev` em `k8s/argocd/application.yaml` observa o branch `develop`, caminho `k8s/charts/sircurty`, release Helm `sircurty`.
- **auto-sync**: aplica sozinho qualquer commit novo.
- **prune**: remove do cluster o que sumiu do Git.
- **self-heal**: desfaz alterações manuais feitas direto no cluster.
- **Sync waves** (ordem de subida): 0 = namespaces/config/observabilidade → 1 = postgres → 2 = api → 3 = frontend/ingress. Garante que o banco existe antes da API e a API antes do frontend.

### 5. Rollback (a pergunta que vai cair)
- Reverter o commit do bump de tag (ou o commit problemático) em `develop`. O ArgoCD reaplica o estado anterior automaticamente.

## Fluxo da demo (pode decorar essa ordem)

1. Merge um PR em `develop`.
2. Actions fica verde (CI: lint, teste, build, `helm lint`/`template`).
3. CD dispara, publica imagens no GHCR com o SHA e faz commit de bump de tag em `develop`.
4. ArgoCD detecta o commit, faz sync do chart (respeitando as waves).
5. Pods são atualizados (rolling update); o app sobe com a nova imagem.
6. Abrir `http://sircurty.local` e `http://grafana.sircurty.local` ao vivo.

## O que NÃO dizer (evita besteira)

- Não dizer que o CD roda toda vez que muda `k8s/` — ele ignora esse diretório (`paths-ignore`).
- Não dizer que o Secret está versionado no Git — não está; é criado à mão no cluster.
- Não dizer que o frontend é rebuildado a cada deploy de imagem — a config vem do ConfigMap em runtime.
- Não falar de produção: existe apenas um ambiente (`dev` / Docker Desktop).
