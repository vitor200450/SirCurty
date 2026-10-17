# Manifests Kubernetes

Kustomize (base + overlays) com deploy via ArgoCD (GitOps).

```text
k8s/
  base/
    app/             # namespace `sircurty`: frontend, api, postgres, config, ingress
    observability/   # namespace `observability`: OTel Collector, Tempo, Grafana
  overlays/dev/      # junta base/app + base/observability (replicas=1, tags de imagem)
  argocd/application.yaml
```

## Componentes (`base/app`)

| Recurso | Tipo | Observações |
|---|---|---|
| `postgres` | StatefulSet + Service headless | PVC 1Gi via `volumeClaimTemplates`, probes `pg_isready` |
| `api` | Deployment + Service (3000) | probes `/health/live` e `/health/ready`, initContainer espera o Postgres |
| `frontend` | Deployment + Service (80) | Nginx; ConfigMap vira `env-config.js` via `docker-entrypoint.sh` |
| `sircurty-config` | ConfigMap | `API_URL`, `APP_ENV`, `APP_BASE_URL`, `OTEL_ENDPOINT`, config da API/Postgres |
| `sircurty-secrets` | Secret (criado fora do git) | `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` |
| `sircurty` | Ingress (nginx) | host `sircurty.local`: `/api` → api, `/` (inclui `/s/:code`) → frontend |

Sync waves (ArgoCD): `0` namespace/config/observability → `1` postgres → `2` api → `3` frontend/ingress.

## Pré-requisitos (Docker Desktop)

1. Kubernetes habilitado no Docker Desktop.
2. Ingress NGINX instalado:
   `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml`
3. Hosts locais em `/etc/hosts` (ou `C:\Windows\System32\drivers\etc\hosts`):
   ```text
   127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local
   ```

## Secret (nunca commitado)

O Secret precisa existir antes do sync (o namespace é criado pelo ArgoCD/kustomize; se o namespace ainda não existir, crie-o antes: `kubectl create namespace sircurty`):

```bash
kubectl -n sircurty create secret generic sircurty-secrets \
  --from-literal=POSTGRES_PASSWORD='<senha>' \
  --from-literal=DATABASE_URL='postgresql://sircurty:<senha>@postgres:5432/sircurty?schema=public' \
  --from-literal=JWT_SECRET='<string-aleatoria>'
```

`base/app/config/secret.example.yaml` é só referência e não entra no kustomization.

## Aplicar

Sem ArgoCD (teste local):

```bash
kubectl kustomize k8s/overlays/dev      # renderiza
kubectl apply -k k8s/overlays/dev
```

Com ArgoCD:

```bash
kubectl apply -f k8s/argocd/application.yaml
```

## Imagens

Os Deployments usam `ghcr.io/vitor200450/sircurty-api` e `ghcr.io/vitor200450/sircurty-frontend`.
O CD deve atualizar a tag no overlay:

```bash
cd k8s/overlays/dev
kustomize edit set image ghcr.io/vitor200450/sircurty-api=ghcr.io/vitor200450/sircurty-api:<sha>
kustomize edit set image ghcr.io/vitor200450/sircurty-frontend=ghcr.io/vitor200450/sircurty-frontend:<sha>
```

## CI/CD

- `.github/workflows/ci.yml` (PR/push em `develop` e `main`): lint/test/build da API e do frontend, `kubectl kustomize` do overlay e build (sem push) dos Dockerfiles.
- `.github/workflows/cd.yml` (push em `develop`): build e push das imagens para o GHCR (tag = SHA) e commit do bump de tag em `k8s/overlays/dev`; o ArgoCD detecta o commit e aplica.
- O bump faz push direto em `develop`: se a branch ficar protegida, liberar o `github-actions[bot]`.
- Migrations: o `initContainer` `migrate` da API roda `prisma migrate deploy` com a mesma imagem.

## Pendências

- Os Dockerfiles e os workflows assumem `package-lock.json`, scripts `build`/`test`/`lint` e `prisma/` em `api/`; ainda não foram executados porque `api/` e `frontend/` não têm código.
- Manifests e workflows validados apenas sintaticamente (`kustomize build`, parse do YAML); falta testar no cluster.
- Confirmar com a API o prefixo global `/api` (health fica em `/health/*`, sem prefixo) e o GHCR (pacotes públicos ou `imagePullSecret`).
