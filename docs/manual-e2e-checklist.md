# Checklist de teste manual end-to-end (apresentação)

Roteiro para validar o Sir Curty no cluster local (Docker Desktop) antes e durante a demo.
Marque cada item; se algum falhar, a coluna "Se falhar" aponta o primeiro lugar para olhar.

## Estado atual (2026-10-19, pós-merge do PR #14)

- [x] PR #9 merged na `develop` (commit `85d2630`): Helm chart, CI/CD, ArgoCD, Prometheus, fix do redirect `/link-bloqueado`, `ignoreDifferences` do postgres.
- [x] ArgoCD instalado (namespace `argocd`), Application `sircurty-dev` em `Synced`/`Healthy`.
- [x] Imagens do GHCR públicas (`sircurty-api`, `sircurty-frontend`, tag atual `71b4da7b…`, pós-PR #13), pull anônimo OK.
- [x] Acesso `http://sircurty.local` funcionando (o `wslrelay` travado no Windows foi a causa de falha anterior; finalizar o processo se travar de novo).
- [x] E2E pelo ingress passando: home 200, `env-config.js` com `GOOGLE_CLIENT_ID` real, redirect 302, link de uso único 2ª vez → `/link-bloqueado?reason=consumido`.
- [x] Self-heal do ArgoCD verificado (escalar frontend para 0 réplicas → recria sozinho em ~1 min).
- [x] `api/.gitignore` ignora `dist/`, `node_modules/`, `coverage/` — nada rastreado no índice, não é problema de git.
- [x] Cluster persistiu após reboot do PC (2026-10-19): todos os pods `Running`, `sircurty-dev` `Synced`/`Healthy`, ingress responde 200 (home e Grafana).
- [x] PR #10 merged na `develop` (commit `341d4e8`): tela própria de link não encontrado (`/link-bloqueado?reason=nao-encontrado`); antes, `/s/<código inexistente>` piscava o loading e deixava a tela escura. CI verde, CD publicou as imagens `341d4e89…`, bump `c3edcfd` e ArgoCD `Synced`/`Healthy` com pods novos `1/1`.
- [x] Seções 2, 3 e 6 executadas via CLI em 2026-10-19 (health live/ready, readiness 503 com o postgres fora, self-heal do frontend, API via ingress, rate limit 429 na requisição #100).
- [x] PR #11 merged: o dashboard mostra "Consumido" (uso único já usado, novo campo `isConsumed` na API) e "Expirado" (`expiresAt` no passado), em vez de "Ativo".
- [x] PR #12 merged (`abf5e35`): o app também é servido em `http://localhost` (host canônico; `sircurty.local` segue como alias), por causa da origem do Google OAuth.
- [x] PR #13 merged (`71b4da7`): senha errada em link protegido mostra o erro no formulário. Era uma regressão da PR #10: a mensagem do 401 (`Senha inválida ou link não encontrado.`) caía na tela de link não encontrado. CD, ArgoCD e pods com a tag `71b4da7b…` conferidos (`Synced`/`Healthy`).
- [x] PR #14 merged (`208da4c`): painéis de busca do dashboard Traces trocam o tipo `traces` por `table`. Antes mostravam `No data found in response`, mesmo com spans no Tempo (a mesma query no Explore devolve a tabela de traces). Depois do deploy os traces passaram a aparecer no dashboard. O clique no Trace ID abre o Explore, que exige papel Editor (o acesso anônimo do Grafana é Viewer): para abrir o detalhe, entre como `admin`/`sircurty`.

O que falta para 100% entregável (prioridade para amanhã):

- [ ] Browser user-flow checks (só um humano faz): login real do Google, reload, logout, anonymous links sobrevivendo ao login, contagem, dashboard (listar/editar/deletar/stats), cada tipo de link, Grafana/service graph/traces.
- [ ] ArgoCD UI acessível: `dex` está scaled to 0 para economizar ~4 GB RAM — reativar para logar na UI.
- [ ] Google login de verdade no browser: o Google recusa `http://sircurty.local` (`Erro 400: invalid_request`: origem HTTP só vale para `localhost`; `.local` não é TLD público). Use `http://localhost`, que já está registrado no Console; o chart passa a servir o app nesse host (PR #12 já mergeada; os pods atuais rodam a tag pós-merge, mas o `shortUrl` com `localhost` não foi conferido).
- [x] `docs/ai-usage.md`: log de uso de IA (quem, quando, prompt, resultado, ajuste manual). (Preenchido em 2026-10-19 a partir da memória e das sessões.)
- [x] `README.md` quickstart na raiz: como levantar o projeto localmente. (Escrito em 2026-10-19; o caminho B, sem Kubernetes, não foi executado.)
- [ ] Execução completa deste checklist (este documento).
- [x] Pitch/demo script com fallback local (caso a internet falhe na apresentação). (Em `docs/pitch.md`: roteiro, checklist de pré-demo e plano B.)

---

## 0. Pré-requisitos

- [x] Kubernetes do Docker Desktop ativo: `kubectl get nodes` mostra `desktop-control-plane Ready`.
- [x] Ingress NGINX rodando: `kubectl get pods -n ingress-nginx` com o controller `1/1 Running`.
- [x] Arquivo hosts com `127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local`.
- [x] `GOOGLE_CLIENT_ID` presente no Secret `sircurty-secrets` (sem ele a API não sobe). A origem
      usada no navegador para o login precisa estar em "Authorized JavaScript origins" no Google Cloud Console (use `http://localhost`; `http://sircurty.local` é recusado pelo Google).
- [x] Secret criado: `kubectl get secret sircurty-secrets -n sircurty` (some se o namespace for apagado).
- [x] ArgoCD instalado: `kubectl get pods -n argocd` com `argocd-server`, `argocd-repo-server`, `argocd-application-controller`, `argocd-redis` `1/1 Running`.
- [x] Application `sircurty-dev` em `Synced`/`Healthy`: `kubectl -n argocd get application sircurty-dev`.
- [x] Imagens locais (hoje o cluster usa as imagens do GHCR com tag do SHA, nenhuma `:local`): use uma tag nova a cada rebuild (`local2`, `local3`...) no `helm upgrade --set`;
      reusar `:local` faz o node manter a imagem antiga em cache (`IfNotPresent`).
- [x] Feche builds Docker pesados antes da demo (verificado em 2026-10-19: nenhum build ou container em execução): com ~4 GB para o cluster, um build em paralelo
      derruba o kube-apiserver (`TLS handshake timeout`).

## 1. Deploy

| Passo | Esperado | Se falhar |
|---|---|---|
| `kubectl get pods -n sircurty` | `postgres-0`, `api-*`, `frontend-*` todos `1/1 Running` | `kubectl describe pod` / `kubectl logs` |
| `kubectl get pods -n observability` | `otel-collector`, `tempo`, `prometheus`, `grafana` `1/1 Running` | idem |
| `kubectl logs deploy/api -n sircurty -c migrate` | `prisma migrate deploy` sem erro (migrations aplicadas) | `DATABASE_URL` no Secret |
| `kubectl get ingress -A` | `sircurty.local`, `grafana.sircurty.local`, `otel.sircurty.local` | ingress-nginx instalado? |
| `kubectl -n argocd get application sircurty-dev` | `Synced` / `Healthy` | `kubectl -n argocd describe application sircurty-dev` |

## 2. Saúde da API

- [x] `kubectl -n sircurty port-forward svc/api 3000:3000` e abra `http://localhost:3000/health/live` → `{"status":"ok"}`.
- [x] `http://localhost:3000/health/ready` → `{"status":"ok","db":"ok"}` (consulta o Postgres).
- [x] Prova de readiness: `kubectl delete pod postgres-0 -n sircurty` e consulte `/health/ready` em loop → 503 por ~6 s e volta a 200.
      (Não use `scale --replicas=0`: o self-heal do ArgoCD religa o postgres em segundos e o 503 não aparece.)

## 3. Self-heal do ArgoCD (GitOps)

- [x] `kubectl -n sircurty scale deploy frontend --replicas=0` → aguardar ~1 min → `kubectl -n sircurty get deploy frontend` volta a `1/1` pronto (ArgoCD recriou sozinho; medido ~17 s).
- [x] `kubectl -n argocd get application sircurty-dev` continua `Synced`/`Healthy` depois do self-heal.

## 4. Fluxo principal no navegador (`http://localhost`; `http://sircurty.local` segue funcionando, mas sem login Google)

- [x] A home carrega (castelo, mascote, formulário). DevTools → Network: `/env-config.js` retorna 200.
- [x] `/env-config.js` contém `GOOGLE_CLIENT_ID` com o ID real (não o placeholder `change-me`).
- [x] Encurtar uma URL válida (ex.: `https://example.com`) → aparece o link curto `http://sircurty.local/s/<code>`.
- [x] URL inválida → mensagem de validação, nenhuma chamada à API.
- [x] O link aparece na tabela do dashboard (dono = cookie anônimo `sircurty_anon_id`).
- [x] Abrir o link curto → tela de interstitial com contagem 3‑2‑1 → redireciona para o destino.
- [x] Network: o fim da contagem chama `/api/redirect/<code>` e recebe `302` para o destino.
- [x] Voltar ao dashboard: o contador de cliques do link subiu.
- [x] Link de uso único: primeiro acesso redireciona; segundo acesso cai em `/link-bloqueado?reason=consumido` (página de link consumido).
- [x] Link indisponível (desativado/expirado) → `/link-bloqueado` com reason correto (`desativado`/`expirado`).
- [x] Código inexistente (ex.: `/s/algumacoisa123`) → redireciona para `/link-bloqueado?reason=nao-encontrado` com a tela "Pergaminho não Encontrado!" (sem tela escura). O 404 em `/api/links/<código>/preview` no console é esperado.

## 4.1 Login com Google

- [x] Sem login, `GET /api/auth/me` retorna `401`.
- [x] Botão de login do Google na navbar abre o popup; após login, nome/e-mail aparecem na navbar.
- [x] Links criados como anônimo antes do login continuam no dashboard depois do login. (Vale só no mesmo host: o cookie anônimo é por host, então crie os links e faça o login em `http://localhost`. A migração é `transferAnonymousLinks`, em `POST /api/auth/google`; ela ainda não tem teste unitário.)
- [x] Logout encerra a sessão (`/api/auth/me` volta a `401`) e o cookie `sircurty_session` some.

## 5. Features exclusivas

- [x] **Vanity URL**: em opções avançadas, defina um código próprio → link usa esse código; repetir o
      mesmo código dá erro de conflito.
- [x] **Senha**: crie link com senha → abrir mostra o formulário; senha errada mostra "Senha incorreta! A chave não abre este cadeado." no formulário (sem ir para `/link-bloqueado`; corrigido na PR #13); senha certa redireciona.
- [x] **Uso único**: crie link de uso único → primeiro acesso redireciona; segundo acesso cai na página de link consumido.
- [x] **Expiração** (se usada na demo): link expirado mostra a página de link expirado.
- [x] **Editar / excluir** pelo dashboard; link excluído deixa de abrir.
- [x] **Status no dashboard** (PR #11): link de uso único já aberto aparece como "Consumido" e link com `expiresAt` no passado como "Expirado", não "Ativo".
- [x] **Estatísticas**: modal de stats do link mostra os cliques registrados.

## 6. Teste via API (sem navegador)

Corpo JSON em arquivo (no PowerShell, JSON inline quebra as aspas e gera um 400 enganoso):

```bash
echo '{"url":"https://example.com"}' > body.json
curl -s -X POST http://sircurty.local/api/links -H "Content-Type: application/json" -d @body.json
# → {"code":"...","shortUrl":"http://sircurty.local/s/..."}   (campo de entrada é "url", não "originalUrl")
curl -si http://sircurty.local/api/redirect/<code> | head -5   # → HTTP/1.1 302, Location: https://example.com
curl -si http://sircurty.local/s/<code> | head -1               # → 200 (HTML da SPA / interstitial)
```

- [x] Rate limit: ~100 requisições em 60 s para `/api/links` passam a retornar `429` (verificado: 429 na requisição #100; o guard roda antes da validação, então dá para testar com corpo inválido sem criar links).

## 7. Observabilidade (`http://grafana.sircurty.local`)

- [x] Grafana abre com os dashboards provisionados (overview, links, traces).
- [x] Após ~1 min de tráfego, os painéis de cliques/links criados/top links mostram números (PromQL sobre
      `traces_spanmetrics_calls_total` no Prometheus) e o Service Graph mostra `user → sircurty-api`.
- [x] Explore → Tempo: depois de criar/abrir links, aparecem traces `sircurty-api` com spans HTTP e `pg`. (Conferido em 2026-10-19: o Tempo tem traces de `sircurty-api` e `sircurty-frontend`, e o Prometheus recebe `traces_spanmetrics_*` com o label `service`.)
- [x] Dashboard **Traces Distribuídos**: "Todos os Traces" e "Redirect — Cadeia Completa" listam traces em tabela (PR #14). "Traces com Erro" e "Traces Lentos (> 1s)" ficam vazios enquanto não houver erro nem trace acima de 1s (gere uma senha errada ou código inexistente para ter spans de erro).
- Pendente de verificar: `links.json` e `overview.json` também têm um painel `"type": "traces"` (podem ter o mesmo defeito), e o alvo `otel-collector:8888` aparece com `up=0` no Prometheus.
- [x] Trace FE→API: requisições do navegador para `otel.sircurty.local/v1/traces` retornam 2xx e o trace
      do frontend (`sircurty-frontend`) compartilha o trace id da chamada à API (`traceparent`).

## 8. CI/CD e GitOps (depois do merge na `develop`)

- [x] PR para `develop`: workflow **CI** verde (api, frontend, manifests com `helm lint`/`template`, docker build). (Verificado em 2026-10-19 nas PRs #13 e #14: `api`, `docker`, `frontend` e `manifests` com `pass`.)
- [x] Merge: workflow **CD** publica `sircurty-api` e `sircurty-frontend` no GHCR com a tag do SHA. (CD `success` nas PRs #10, #11 e #13; a tag `71b4da7b…` existe no GHCR para as duas imagens. O CD ignora mudanças só em `k8s/**`, `docs/**` e `**.md` (`paths-ignore`): a PR #14 não gerou CD nem bump, e o Argo aplicou a mudança mesmo assim.)
- [x] Commit automático `chore: bump image tags to <sha>` em `k8s/charts/sircurty/values.yaml`. (Commits de `github-actions[bot]`: `340f262`, `41ee7f9`, `c3edcfd`. O diff não foi aberto; o arquivo alterado vem do `cd.yml`.)
- [x] ArgoCD (`sircurty-dev`) fica `Synced`/`Healthy` e faz rolling update dos pods com a nova tag. (`Synced`/`Healthy` em `208da4c`; pods recriados com cada tag nova ao longo do dia. A estratégia `RollingUpdate` do deployment não foi conferida.)
- [x] Self-heal: `kubectl delete deploy frontend -n sircurty` → ArgoCD recria sozinho. (Medido em 2026-10-19: recriado em 17 s, UID novo, `1/1`, `Synced`/`Healthy`; o frontend fica fora do ar por esse tempo.)
- [x] Pacotes do GHCR públicos (ou `imagePullSecret`), senão os pods ficam em `ImagePullBackOff`. (Pull anônimo do manifest devolve 200 para as duas imagens; os deployments não têm `imagePullSecrets` e os pods estão `Running`.)

## 9. Entregáveis de apresentação (ainda não feitos)

- [x] `docs/ai-usage.md` preenchido: log de uso de IA (quem, quando, prompt, resultado, ajuste manual).
- [x] `README.md` na raiz com quickstart (como levantar o projeto localmente).
- [x] Execução completa deste manual e2e checklist.
- [x] Pitch/demo script com fallback local (caso a internet falhe na apresentação).
- [x] Login real do Google no browser (exige abrir o app por `http://localhost`, origin já registrada no Google Cloud Console).
