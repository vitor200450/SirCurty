# Checklist de teste manual end-to-end (apresentação)

Roteiro para validar o Sir Curty no cluster local (Docker Desktop) antes e durante a demo.
Marque cada item; se algum falhar, a coluna "Se falhar" aponta o primeiro lugar para olhar.

## 0. Pré-requisitos

- [ ] Kubernetes do Docker Desktop ativo: `kubectl get nodes` mostra `desktop-control-plane Ready`.
- [ ] Ingress NGINX rodando: `kubectl get pods -n ingress-nginx` com o controller `1/1 Running`.
- [ ] Arquivo hosts com `127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local`.
- [ ] `GOOGLE_CLIENT_ID` presente no Secret `sircurty-secrets` (sem ele a API não sobe). A origem
      usada no navegador precisa estar em "Authorized JavaScript origins" no Google Cloud Console.
- [ ] Secret criado: `kubectl get secret sircurty-secrets -n sircurty` (some se o namespace for apagado).
- [ ] Imagens locais: use uma tag nova a cada rebuild (`local2`, `local3`...) no `helm upgrade --set`;
      reusar `:local` faz o node manter a imagem antiga em cache (`IfNotPresent`).
- [ ] Feche builds Docker pesados antes da demo: com ~4 GB para o cluster, um build em paralelo
      derruba o kube-apiserver (`TLS handshake timeout`).

## 1. Deploy

| Passo | Esperado | Se falhar |
|---|---|---|
| `kubectl get pods -n sircurty` | `postgres-0`, `api-*`, `frontend-*` todos `1/1 Running` | `kubectl describe pod` / `kubectl logs` |
| `kubectl get pods -n observability` | `otel-collector`, `tempo`, `prometheus`, `grafana` `1/1 Running` | idem |
| `kubectl logs deploy/api -n sircurty -c migrate` | `prisma migrate deploy` sem erro (migrations aplicadas) | `DATABASE_URL` no Secret |
| `kubectl get ingress -A` | `sircurty.local`, `grafana.sircurty.local`, `otel.sircurty.local` | ingress-nginx instalado? |

## 2. Saúde da API

- [ ] `kubectl -n sircurty port-forward svc/api 3000:3000` e abra `http://localhost:3000/health/live` → `{"status":"ok"}`.
- [ ] `http://localhost:3000/health/ready` → `{"status":"ok","db":"ok"}` (consulta o Postgres).
- [ ] Prova de readiness: `kubectl scale statefulset postgres -n sircurty --replicas=0`, aguarde e veja o
      pod da API ficar `0/1` (ready falha com 503); volte com `--replicas=1`.

## 3. Fluxo principal no navegador (`http://sircurty.local`)

- [ ] A home carrega (castelo, mascote, formulário). DevTools → Network: `/env-config.js` retorna 200.
- [ ] Encurtar uma URL válida (ex.: `https://example.com`) → aparece o link curto `http://sircurty.local/s/<code>`.
- [ ] URL inválida → mensagem de validação, nenhuma chamada à API.
- [ ] O link aparece na tabela do dashboard (dono = cookie anônimo `sircurty_anon_id`).
- [ ] Abrir o link curto → tela de interstitial com contagem 3‑2‑1 → redireciona para o destino.
- [ ] Network: o fim da contagem chama `/api/redirect/<code>` e recebe `302` para o destino.
- [ ] Voltar ao dashboard: o contador de cliques do link subiu.

## 3.1 Login com Google

- [ ] `/env-config.js` contém `GOOGLE_CLIENT_ID` com o ID real.
- [ ] Sem login, `GET /api/auth/me` retorna `401`.
- [ ] Botão de login do Google na navbar abre o popup; após login, nome/e-mail aparecem na navbar.
- [ ] Links criados como anônimo antes do login continuam no dashboard depois do login.
- [ ] Logout encerra a sessão (`/api/auth/me` volta a `401`) e o cookie `sircurty_session` some.

## 4. Features exclusivas

- [ ] **Vanity URL**: em opções avançadas, defina um código próprio → link usa esse código; repetir o
      mesmo código dá erro de conflito.
- [ ] **Senha**: crie link com senha → abrir mostra o formulário; senha errada é recusada; senha certa redireciona.
- [ ] **Uso único**: crie link de uso único → primeiro acesso redireciona; segundo acesso cai na página de link consumido.
- [ ] **Expiração** (se usada na demo): link expirado mostra a página de link expirado.
- [ ] **Editar / excluir** pelo dashboard; link excluído deixa de abrir.
- [ ] **Estatísticas**: modal de stats do link mostra os cliques registrados.

## 5. Teste via API (sem navegador)

Corpo JSON em arquivo (no PowerShell, JSON inline quebra as aspas e gera um 400 enganoso):

```bash
echo '{"url":"https://example.com"}' > body.json
curl -s -X POST http://sircurty.local/api/links -H "Content-Type: application/json" -d @body.json
# → {"code":"...","shortUrl":"http://sircurty.local/s/..."}   (campo de entrada é "url", não "originalUrl")
curl -si http://sircurty.local/api/redirect/<code> | head -5   # → HTTP/1.1 302, Location: https://example.com
curl -si http://sircurty.local/s/<code> | head -1               # → 200 (HTML da SPA / interstitial)
```

- [ ] Rate limit: ~100 requisições em 60 s para `/api/links` passam a retornar `429`.

## 6. Observabilidade (`http://grafana.sircurty.local`)

- [ ] Grafana abre com os dashboards provisionados (overview, links, traces).
- [ ] Após ~1 min de tráfego, os painéis de cliques/links criados/top links mostram números (PromQL sobre
      `traces_spanmetrics_calls_total` no Prometheus) e o Service Graph mostra `user → sircurty-api`.
- [ ] Explore → Tempo: depois de criar/abrir links, aparecem traces `sircurty-api` com spans HTTP e `pg`.
- [ ] Trace FE→API: requisições do navegador para `otel.sircurty.local/v1/traces` retornam 2xx e o trace
      do frontend (`sircurty-frontend`) compartilha o trace id da chamada à API (`traceparent`).

## 7. CI/CD e GitOps (depois do merge na `develop`)

- [ ] PR para `develop`: workflow **CI** verde (api, frontend, manifests com `helm lint`/`template`, docker build).
- [ ] Merge: workflow **CD** publica `sircurty-api` e `sircurty-frontend` no GHCR com a tag do SHA.
- [ ] Commit automático `chore: bump image tags to <sha>` em `k8s/charts/sircurty/values.yaml`.
- [ ] ArgoCD (`sircurty-dev`) fica `Synced`/`Healthy` e faz rolling update dos pods com a nova tag.
- [ ] Self-heal: `kubectl delete deploy frontend -n sircurty` → ArgoCD recria sozinho.
- [ ] Pacotes do GHCR públicos (ou `imagePullSecret`), senão os pods ficam em `ImagePullBackOff`.
