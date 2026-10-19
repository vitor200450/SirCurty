# Manifests Kubernetes

Chart Helm (`k8s/charts/sircurty`) com deploy via ArgoCD (GitOps).

```text
k8s/
  charts/sircurty/
    Chart.yaml
    values.yaml            # tags de imagem (bump do CD), hosts, replicas, ambiente
    dashboards/*.json      # dashboards do Grafana, carregados com .Files.Get
    templates/
      app/                 # namespace `sircurty`: frontend, api, postgres, config, ingress
      observability/       # namespace `observability`: OTel Collector, Tempo, Grafana
  argocd/application.yaml
  secret.example.yaml      # referencia do Secret (nao faz parte do chart)
```

## Componentes (`templates/app`)

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

O Secret precisa existir no namespace `sircurty`. Com ArgoCD, o namespace é criado no sync; se o
pod subir antes do Secret ele fica em `CreateContainerConfigError` e se recupera sozinho assim que
o Secret existir.

```bash
kubectl create namespace sircurty   # só se o namespace ainda não existir
kubectl -n sircurty create secret generic sircurty-secrets \
  --from-literal=POSTGRES_PASSWORD='<senha>' \
  --from-literal=DATABASE_URL='postgresql://sircurty:<senha>@postgres:5432/sircurty?schema=public' \
  --from-literal=JWT_SECRET='<string-aleatoria>'
```

`secret.example.yaml` é só referência e não faz parte do chart.

## Aplicar

Sem ArgoCD (teste local):

```bash
helm lint k8s/charts/sircurty
helm template sircurty k8s/charts/sircurty      # renderiza
helm upgrade --install sircurty k8s/charts/sircurty --namespace default
```

O chart cria os namespaces `sircurty` e `observability`; o release em si fica em `default`.

Com ArgoCD:

```bash
kubectl apply -f k8s/argocd/application.yaml
```

## Imagens

Os Deployments usam `ghcr.io/vitor200450/sircurty-api` e `ghcr.io/vitor200450/sircurty-frontend`.
As tags ficam em `k8s/charts/sircurty/values.yaml` (`api.image.tag`, `frontend.image.tag`); o CD as
atualiza com:

```bash
cd k8s/charts/sircurty
yq -i '.api.image.tag = "<sha>" | .frontend.image.tag = "<sha>"' values.yaml
```

Para testar uma imagem local: `--set api.image.tag=local`.

## CI/CD

- `.github/workflows/ci.yml` (PR/push em `develop` e `main`): lint/test/build da API e do frontend, `helm lint` + `helm template` do chart e build (sem push) dos Dockerfiles.
- `.github/workflows/cd.yml` (push em `develop`): build e push das imagens para o GHCR (tag = SHA) e commit do bump de tag em `k8s/charts/sircurty/values.yaml`; o ArgoCD detecta o commit e aplica.
- O bump faz push direto em `develop`: se a branch ficar protegida, liberar o `github-actions[bot]`.
- Migrations: o `initContainer` `migrate` da API roda `prisma migrate deploy --config prisma7.config.ts` com a mesma imagem.

## Testar com imagens locais (sem GHCR)

O Docker Desktop compartilha o image store com o node do Kubernetes, então imagens buildadas
localmente ficam visíveis para o cluster sem `docker push`:

```bash
docker build -t ghcr.io/vitor200450/sircurty-api:local api
docker build -t ghcr.io/vitor200450/sircurty-frontend:local frontend
helm upgrade --install sircurty k8s/charts/sircurty -n default \
  --set api.image.tag=local --set frontend.image.tag=local
```

## Pendências

- O sync real do ArgoCD e os workflows no GitHub Actions dependem do chart, do `cd.yml` e dos Dockerfiles chegarem à `develop`.
- Confirmar o GHCR (pacotes públicos ou `imagePullSecret`).
