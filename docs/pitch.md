# Roteiro do pitch (15 min)

- ~3 min — O portal: personagem, identidade e o que torna o encurtador único.
- ~8 min — Demo ao vivo: criar link, gerar cliques (loop/vários navegadores),
  dashboard do Grafana subindo, trace atravessando frontend → API → banco.
- ~2 min — Por baixo do capô: pipeline (Actions → ArgoCD) e uso de IA como copiloto (Kiro ou equivalente).
- ~2 min — Perguntas da banca.

## Momento de prova

Gerar cliques ao vivo e mostrar o dashboard reagindo em tempo real.

## Antes de entrar (10 min antes)

- [ ] Docker Desktop aberto e nada pesado rodando (builds ou containers de outros projetos): o cluster tem ~4 GB de RAM.
- [ ] `kubectl get pods -A`: tudo `Running`. `kubectl -n argocd get application sircurty-dev`: `Synced`/`Healthy`.
- [ ] `http://localhost` abre. Se não abrir, finalize o processo `wslrelay` travado no Windows e teste de novo (já foi a causa de falha antes).
- [ ] Login do Google feito em `http://localhost` (nunca em `sircurty.local`, que o Google recusa).
- [ ] Grafana em `http://grafana.sircurty.local` já logado como `admin` / `sircurty` (sem isso o clique no Trace ID não abre o Explore), com o intervalo em "Last 1 hour".
- [ ] Gere tráfego 1 a 2 minutos antes: os painéis de latência usam `rate(...[1m])` e ficam vazios sem spans recentes.
- [ ] Abas prontas: app, dashboard do Grafana (Serviços e Traces), GitHub (PRs e Actions) e o ArgoCD, se estiver ligado.

## Roteiro da demo (~8 min)

1. **Criar link** na home: URL comum, depois um com código próprio (vanity), um com senha e um de uso único.
2. **Abrir o link curto**: contagem 3-2-1 e redirect. Mostrar a senha errada (erro no formulário) e o código inexistente (tela "Pergaminho não Encontrado!").
3. **Dashboard do usuário**: cliques subindo e os selos "Consumido"/"Expirado". Fazer login com o Google e mostrar que os links criados como anônimo continuam lá.
4. **Momento de prova**: gerar cliques e mostrar no Grafana os painéis de Serviços reagindo.
5. **Trace atravessando as camadas**: no dashboard de Traces, abrir um trace (Trace ID) e mostrar frontend → API → banco.
6. **Por baixo do capô**: PR com CI verde, merge, CD publicando a imagem e o commit de bump, ArgoCD aplicando (tudo no histórico do GitHub). Para provar o self-heal ao vivo: `kubectl delete deploy frontend -n sircurty`; o ArgoCD recria em ~17 s (medido), e o frontend fica fora do ar nesse tempo, então faça isso no final.

## Plano B (internet cai ou algo do cluster falha)

| Se falhar | O que continua funcionando | O que fazer |
|---|---|---|
| Internet | O cluster e as imagens ficam locais (`IfNotPresent`), então o app, o Grafana e os traces seguem. O Google, o GitHub/GHCR e o ArgoCD (que sincroniza pelo GitHub) não respondem. | Demonstrar só o fluxo anônimo. Mostrar o pipeline (Actions, ArgoCD, PRs) por prints ou gravação feitos antes. |
| Login do Google | O app anônimo completo. | Seguir sem login e pular a parte de "links sobrevivem ao login". |
| Ingress (`http://localhost` não abre) | Pods e serviços do cluster. | Matar o `wslrelay` travado. Para o Grafana, `kubectl -n observability port-forward svc/grafana 3001:3000` e abrir `http://127.0.0.1:3001`. |
| Pod que não volta | O ArgoCD recria sozinho (self-heal). | Esperar ~20 s; se não voltar, `kubectl describe pod` e `kubectl logs`. |
| Cluster inteiro quebrado | Nada do ambiente. | Reaplicar o chart (`helm upgrade --install sircurty k8s/charts/sircurty --namespace default`) e recriar o Secret conforme o `README.md`. Sem tempo para isso: exibir prints e a gravação da demo. |

Tenha **prints dos dashboards do Grafana e uma gravação curta da demo completa** feitos com o ambiente saudável; são o único plano B que não depende do cluster.
