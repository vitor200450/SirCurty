# Planejamento Inicial — Hackathon Cloud-Native

**Projeto:** Encurtador de Links

## 1. Conceito do projeto

- **Nome do projeto:** Sir Curty
- **Ideia central:** Uma plataforma para encurtar, organizar e monitorar links, com estatísticas de acesso e funcionalidades personalizadas.
- **Objetivo do encurtador:** Facilitar o compartilhamento e o gerenciamento de links.
- **Público-alvo:** Pessoas que querem gerenciar seus Links.
- **Problema/necessidade:** Links longos e complexos são difíceis de compartilhar e nem sempre oferecem informações sobre seus acessos.

## 2. Identidade e personalidade

- **Tema/universo:** Medieval
- **Personagem/mascote:** Um cavaleirinho (Sir Curty)
- **Personalidade:** Animado, Destemido e Carismático
- **História/conceito:** No portal, os links longos, confusos e perigosos assumem a forma de monstros e bestas terríveis. É aqui que entra o herói Sir Curty: com sua espada mágica, ele fatia essas criaturas, encurtando URLs gigantes para transformá-las em atalhos inofensivos e ágeis, usando seu escudo para garantir segurança. O encurtador é o reino em que Sir Curty vive e jurou proteger. Sua missão: cortar o caos dos links intermináveis e criar rotas seguras.
- **Identidade visual:** Estilo medieval moderno e amigável. Cores: Azul, Púrpura e Dourado. Estilo heroico e lúdico (ambiente carismático, não sombrio). Elementos: Sir Curty em destaque, espadas no botão de encurtar, escudo na área de segurança, pergaminhos com dados.
- **Tom de voz:** Simples e amigável

## 3. Diferencial do produto

- **O que torna único?** O cavaleirinho Sir Curty interage com o usuário a cada ação. Combinação de gerenciamento de links, estatísticas e identidade visual própria.
- **Principal diferencial vs. encurtadores comuns:** Mais dinâmico e divertido — além de usar as funcionalidades, o usuário mergulha e faz parte da história do Sir Curty. Acompanhamento visual dos acessos com personalização.
- **Funcionalidades exclusivas:**
  1. Mostrar/editar links criados com cookie anônimo ou login com Google
  2. Geração de QR Code
  3. Links de uso único
  4. Tabela de estatísticas gerais
  5. Links com nomes personalizados
  6. Ranking dos links mais acessados
  7. Opção de senha nos links
  8. Aviso para qual site o link encurtado está levando (tela antes de redirecionar)
  9. Filtro de palavras suspeitas para evitar encurtar links maliciosos
- **Brainstorm expandido:** `docs/features-brainstorm.md` (72 ideias: MVP + 11 quick wins + stretch); seção 3 permanece como núcleo, shortlist de priorização no brainstorm.- **Funcionalidade de destaque no pitch:** Painel dos links mais acessados com estatísticas + gerenciamento único de links.

## 4. Escopo inicial

- **Funcionalidades essenciais:** Criar links curtos; redirecionar para destino original; listar e gerenciar links; persistir dados no banco.
- **Extras prioritários:** Estatísticas de cliques, links personalizados, ranking.
- **Fora do escopo inicial:** Recursos complexos e inviáveis.

## 5. Experiência e funcionamento

- **Tela inicial:** Layout em pergaminho/medieval moderno, cores azul/púrpura/dourado. Painel central com o input de URL ("Cortar um monstro") e botão espada; abaixo, lista "Bestas já derrotadas" (links recentes). Barra lateral com estatísticas rápidas e escudo (segurança). Copy curta e amigável (Sir Curty falando).
- **Criação de link:** Usuário cola URL longa; opcionalmente define nome personalizado (vanity), senha, data de expiração e "uso único". Clique no botão espada dispara animação de corte e chamada à API para encurtar. Retorno exibe link curto + QR Code; toast "Monstro derrotado!".
- **Informações por link:** URL original (mascarada quando privada), link curto, código, autor (cookie anônimo ou Google), cliques, data de criação, último acesso, status (ativo/expirado/usado/bloqueado), flags (senha, único, vanity) e QR Code.
- **Presença do personagem:** Sir Curty aparece em loading (espada cortando), estados vazios ("nenhuma besta por aqui"), sucesso/erro e feedback de segurança. Escudo representa área protegida; pergaminhos exibem dados.
- **Funcionalidades exclusivas (prática):**
  1. **Cookie anônimo / login Google:** cookie anônimo vincula links ao navegador; login opcional vincula ao usuário; edição/exclusão somente pelo dono.
  2. **QR Code:** gerado no frontend e via API; download em PNG; não impacta cliques.
  3. **Links de uso único:** flag `singleUse`; após o primeiro redirect, o link é invalidado e exibe página "este link já foi consumido".
  4. **Tabela de estatísticas gerais:** cards de total de links, total de cliques, domínios mais encurtados e cliques por dia.
  5. **Links com nomes personalizados (vanity):** slug `/s/:custom`, único, validado por regex e tamanho.
  6. **Ranking:** tabela ordenada por cliques, com medalhas para o top 3.
  7. **Senha nos links:** interstitial solicita senha antes do redirect; rate limit básico.
  8. **Aviso de destino:** tela "Você está indo para X" com opções prosseguir/cancelar; registro de clique.
  9. **Filtro de palavras suspeitas:** bloqueio de domínios/padrões maliciosos com mensagem "Sir Curty recusou este monstro".
  - **Destaque extra sugerido:** gráficos de cliques por período e expiração por data/hora (link dinâmico opcional).

## 6. Decisões técnicas iniciais (detalhado)

### 6.1 Frontend (React + Vite + TypeScript)
- **App:** SPA com React Router; rotas principais: `/` (criar/listar links), `/s/:code` (interstitial/redirecionamento gerenciado pela API), `/dashboard` (estatísticas), `/login` (opcional).
- **UI/tema:** tema medieval moderno (Tailwind + shadcn/ui ou CSS modules), animações leves (Framer Motion), identidade Sir Curty (mascote SVG/Lottie), cópias amigáveis.
- **Estado/dados:** React Query (TanStack) para listagens/mutações; Zustand ou Context para usuário/tema; validação de forms com Zod + React Hook Form.
- **Integrações:** API via configuração de runtime (`window.__APP_CONFIG__.API_URL`, fallback para `VITE_API_URL` baked); Google Identity Services (opcional); gerador de QR Code local (`qrcode`); Web OpenTelemetry exporter (OTLP/HTTP) para traces do browser.
- **Config no Vite (importante):** Vite só lê `VITE_*` no **build**. Para permitsir ConfigMap em runtime, o frontend carrega `/env-config.js` gerado no startup do pod pelo entrypoint do Nginx (a partir do ConfigMap), com fallback para valores baked. Assim o mesmo build funciona em diferentes ambientes sem rebuild.
- **Build/deploy:** `npm ci` + `npm run build` (Vite) → imagem Nginx servindo `dist/` + script de entrypoint gerando `env-config.js` a partir do ConfigMap.
- **Observabilidade no browser:** span por criação de link e por clique no botão; propagar `traceparent` para a API.

### 6.2 API/backend (NestJS + TypeScript)
- **Módulos:** `links`, `clicks`, `auth`, `security`, `observability`, `health`.
- **Endpoints principais:**
  - `POST /api/links` — cria link (body: url, customSlug?, password?, expiresAt?, singleUse?) → retorna `{ code, shortUrl, qr }`
  - `GET /api/links` — lista do dono (cookie/anônimo ou usuário)
  - `GET /api/links/:code` — detalhes/estatísticas do dono
  - `PATCH /api/links/:code` — editar (URL/flags) por dono
  - `DELETE /api/links/:code` — remoção lógica por dono
  - `GET /s/:code` — redirecionamento (302/307) com interstitial controlado pelo frontend ou 302 direto após validações
  - `POST /api/links/:code/verify-password` — valida senha e emite token curto
  - `GET /api/stats/overview`, `GET /api/stats/top`, `GET /api/health`
- **Validações:** class-validator DTOs; normalização de URL; URL allowlist/denylist; CORS restrito.
- **Auth:** cookie httpOnly anônimo (`sircurty_anon_id`) + login Google opcional (Passport strategy); autorização por owner.
- **Segurança:** rate limit em criação/redirect (Nest throttler + Redis opcional), helmet, CSRF para cookie session, sanitize logs.
- **Swagger/OpenAPI:** `/docs` para facilitar demo e testes.
- **Health probes:** `/health/live`, `/health/ready` (DB conectado), `/metrics` (se expor OTel/Prom).

### 6.3 Banco de dados (PostgreSQL)
- **Engine:** PostgreSQL 16; migrations com **Prisma** (decisão lockada); seeds para dev.
- **Modelo inicial (detalhado na próxima etapa, sugestão):**
  - `users(id, google_sub, email, name, created_at)`
  - `links(id, code, custom_slug, original_url, owner_anon_id, owner_user_id, has_password, password_hash, is_single_use, used_at, expires_at, status, created_at, updated_at)`
  - `clicks(id, link_id, clicked_at, ip_hash, user_agent, referrer, country, city, is_bot)`
  - `link_aliases(id, link_id, alias, created_at)` (opcional)
- **Índices:** `UNIQUE(code)`, `UNIQUE(custom_slug)`, `INDEX(owner_*)`, `INDEX(clicks(link_id, clicked_at))`, `INDEX(expires_at)` para jobs de expiração.
- **Concorrência:** transações para resgatar uso único; upsert/unique constraints evitam duplicidade.
- **Backup/ops (hackathon):** PVC para Postgres no cluster; backup não obrigatório, mas documentado como risco.

### 6.4 Estratégia para gerar links curtos ⭐
- **Objetivo:** códigos curtos, únicos, rápidos de resolver, com suporte a vanity URLs e sem colisões.
- **Decisão lockada: ID autoincremental + scrambling (sqids/coprime modular) + Base62.**
  - Tabela gera `id` (bigint) automaticamente; código = `base62(id)` com padding/obfuscation opcional (≈ 6–7 chars para milhões de links).
  - Vantagens: sem retries de colisão, unicidade garantida pelo DB, lookup simples por `code`, performance previsível.
  - Exemplo: `id=123456` → `code="w7e"` (ilustrativo), redirecionamento `/s/w7e`.
- **Alternativa:** NanoID (7–8 chars alfanuméricos) com `UNIQUE(code)` + até 3 retries; mais “aleatório”, mas pode exigir retries sob carga.
- **Vanity (custom):** slug fornecido pelo usuário é reservado em `links.custom_slug` (UNIQUE); prioridade de resolução `custom_slug` antes de `code`; validação regex `^[a-zA-Z0-9_-]{3,32}$`; bloqueio de palavras reservadas (`admin`, `api`, `s`, `health`, etc.).
- **Prevenção de colisões com vanity:** bloquear custom slug igual a code existente; resolução por slug primeiro.
- **Base62 vs hex:** Base62 (~62 símbolos) maximiza densidade (7 chars ≈ 3,5 trihões), mais curto que hex.
- **Embaralhamento para evitar previsibilidade (lockado):** usar um gerador/codec de "scrambled IDs" (recomendado: `sqids` para TS/JS com salt/alfabeto customizado) para transformar o ID numérico em um código curto não sequencial; equivalente a uma permutação bijectiva do espaço de IDs, mantendo unicidade e comprimento constante (≈ 7 chars), sem retries e sem revelar ordem de criação.
  - Alternativa manual: multiplicação modular por uma constante coprima (`id * A mod M`) + Base62, com `M` próximo a `62^7` e `A` coprimo de `M`; documentar testes de unicidade/round-trip.
  - Filtrar palavras reservadas/profanas no alfabeto/decodificação (sqids suporta) e bloquear vanity conflitantes.
- **Expiração/uso único:** validações no redirect: `status=ACTIVE`, `expires_at > now`, `!single_use || used_at IS NULL`; marcar `used_at` dentro de transação (para uso único) antes do 302.
- **Redirect/fluxo de acesso:** Interstitial obrigatório para o diferencial “aviso de destino”. Portanto a rota `/s/:code` deve ser resolvida pelo **frontend** (Nginx `try_files $uri /index.html` garante fallback da SPA), que chama a API (`GET /api/links/:code/preview`) para obter destino/flags e só então redireciona (`window.location`). A API mantém também um redirect rápido (`/api/redirect/:code` ou `/s/:code?fast=1`) para casos sem JS e para testes/métricas. Isso preserva traces de browser + API.
- **Otimização sob carga (múltiplos acessos simultâneos):** aplicar um **temporizador/janela de agregação** para reduzir escrita por clique: cache de mapeamento curto→URL (in-memory/Redis com TTL curto, ex.: 30–120s); **batch insert de cliques** (buffer por N segundos ou M eventos) em vez de 1 INSERT por request; contador agregado por link em janelas de tempo; rate limit/token bucket por IP e por código; cabeçalhos de cache curtos (`Cache-Control: max-age=...`) apenas se aceitável stale; backpressure (fila) e degradação graciosa (registrar clique de forma assíncrona, sem bloquear o 302). O interstitial pode usar um pequeno temporizador (ex.: 1–2s) para UX + coleta de metadados antes do redirect.

### 6.5 Kubernetes (Rancher Desktop/minikube)
- **Workloads:**
  - `Deployment/frontend` (Nginx + build do Vite)
  - `Deployment/api` (Nest, 2+ réplicas se possível)
  - `StatefulSet/postgres` (1 réplica + PVC)
  - (Opcional) `Deployment/otel-collector`
- **Networking:** `Service` ClusterIP para cada componente; `Ingress` (nginx) com host `sircurty.local`; rotas `/api/*` → API, `/s/*` → frontend (SPA, para interstitial), fallback `/*` → frontend (Nginx `try_files`). evita o ingress “engolir” o redirect antes do frontend.
- **Config:** `ConfigMap` com chaves de runtime (`API_URL`, `APP_ENV`, `APP_BASE_URL`, `OTEL_ENDPOINT`) consumidas pelo entrypoint do frontend para gerar `env-config.js`; `Secret` para `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `JWT/cookie secret`. (Vite vars baked permanecem como fallback.)
- **Probes:** liveness/readiness em `/health/live` e `/health/ready`; startup probe opcional para API/Nest startup.
- **Resources:** requests/limits CPU/memória para todos; HPA opcional (não necessário).
- **Persistência:** PVC para Postgres; backups não automatizados no escopo inicial.

### 6.6 CI/CD (GitHub Actions)
- **Workflows sugeridos:**
  - `ci.yml`: install deps + lint + unit tests + build (frontend e api) em PRs.
  - `cd.yml`/release: build imagens (multi-arch opcional), push para registry (GHCR/Docker Hub), atualizar tag em manifests (kustomize) e commit no repo (GitOps trigger).
- **Testes mínimos:** DTO validation, serviço de encurtamento (geração/validação), redirect com uso único/expiração, auth básica.
- **Segurança do pipeline:** secrets no GitHub; `GITHUB_TOKEN` para GHCR; dependabot/renovate opcional.
- **Artefatos:** imagem `ghcr.io/<org>/sircurty-frontend:<sha>` e `...-api:<sha>`; tag `latest` apenas em main.

### 6.7 GitOps (ArgoCD)
- **Estrutura sugerida:** `k8s/base` (manifests comuns) + `k8s/overlays/dev` (kustomize); `ArgoCD Application` apontando para `k8s/` (path do overlay).
- **Comportamento:** auto-sync, prune e self-heal habilitados; health checks do ArgoCD; sync wave para DB antes da API.
- **Fluxo de deploy:** commit/merge → Actions build/push → bump de tag no manifest → ArgoCD detecta e aplica.
- **Rollback:** reverter tag/commit; ArgoCD reaplica estado anterior.

### 6.8 Observabilidade (OpenTelemetry + Grafana)

Detalhamento operacional: `docs/observability.md`.
- **Traces (decisão lockada - core):** Nest OTel SDK com auto-instrumentação HTTP/Express/Postgres; browser SDK emitindo spans da tela de criação/clique; propagação `traceparent`; dashboards essenciais no Grafana.
- **Coletor:** OTel Collector (in-cluster) recebendo OTLP (gRPC/HTTP) e exportando para Tempo (+ opcional Prometheus para métricas).
- **Logs:** padrão JSON (pino) com `trace_id`/`span_id`; Grafana Loki se disponível, senão logs do kubectl.
- **Dashboards Grafana:** (1) Visão geral (RPS, latência p95/p99, erros 4xx/5xx, saúde dos pods); (2) Links (top códigos por cliques, cliques por hora, domínios mais encurtados, links expirados/bloqueados); (3) Traces (exemplo de trace atravessando FE/API/DB).
- **Momento de prova:** gerar cliques ao vivo e ver dashboard/trace reagirem (script ou múltiplos navegadores).
- **Métricas customizadas (opcional):** contador de cliques por link; histograma de latência do redirect; counter de bloqueios/filtros.

### 6.9 Estrutura de pastas (proposta refinada)
```
SirCurty/
  frontend/
    src/{app,components,features,lib,hooks,styles}
    public/
    Dockerfile, nginx.conf, vite.config.ts
  api/
    src/{modules,common,config,database,observability}
    prisma/ (schema/migrations)
    Dockerfile, nest-cli.json
  k8s/
    base/ (deployments, services, ingress, configmap, secret sample)
    overlays/dev/
    argocd/
  .github/workflows/
    ci.yml, cd.yml
  docs/
    initial-planning.md, pitch.md, ai-usage.md, architecture.md
  scripts/
    seed.ts, generate-clicks.sh
```

### 6.10 Uso de IA (copiloto)
- Usar Kiro ou ferramenta equivalente para: scaffold do Nest/React, DTOs/schema Prisma, manifests K8s, workflows, consultas OTel, dashboard JSON, testes e documentação.
- Registrar prompts/decisões em `docs/ai-usage.md` (quem, quando, resultado, ajuste manual) para avaliação (10%).

## 7. Organização da equipe

- **Integrantes:** Alerandro, Eriky, José Vitor e Matheus
- **Responsabilidades (proposta):**
  - **José Vitor** — Frontend (React + Vite) e identidade visual (personagem/animações).
  - **Eriky** — API (NestJS), banco (PostgreSQL) e features exclusivas (QR, senha, vanity, filtros).
  - **Alerandro** — Kubernetes, CI/CD (GitHub Actions), GitOps (ArgoCD) e coordenação/integração geral.
  - **Matheus** — Observabilidade (OpenTelemetry + Grafana) e métricas/traces de demo.
- *Observação:* Uma pessoa pode assumir mais de uma responsabilidade (ex.: Jose Vitor também apoia UX; Alerandro apoia releases).

## 8. Estratégia de demonstração

- **O que mostraremos primeiro:** Personagem Sir Curty, tema medieval e proposta ("cortar bestas-monstros" dos links longos), seguido da criação de 1 link em segundos.
- **Fluxo principal ao vivo:** criar link curto → exibir QR Code → gerar cliques via script/loop e vários navegadores → interstitial de destino → link de uso único consumido → ranking/top links atualizando.
- **Cliques e traces em tempo real:** dashboard do Grafana subindo (cliques por link, latência, erros, saúde dos pods) + trace completo frontend → API → banco.
- **Funcionalidade de destaque:** painel de Sir Curty com ranking dos links mais acessados + gráfico de acessos por período + QR Code.
- **Pipeline:** mostrar Actions verde (build/test/push) → ArgoCD sincronizando → app atualizado; evidenciar uso de IA (copiloto) no código/manifests.

## 9. Resultado da reunião

- **Decisões aprovadas:** Frontend React+Vite (TS); Backend NestJS (TS); PostgreSQL; Sir Curty com tema medieval moderno/amigável; 9 features exclusivas; deploy em K8s + GitHub Actions + ArgoCD + OTel/Grafana; ordem de implementação conforme PDF.
- **Pontos a validar/pesquisar:** (1) instrumentação OTel no browser; (2) storage do QR (geração local vs. API); (3) OAuth Google para login; (4) heurística de filtro de URLs suspeitas; (5) best-effort analytics em RT.
- **Pendências:** manifests K8s, workflow CI, dashboards, testes de redirect/uso único, roteiro de demo e docs do copiloto.
- **Próximas ações:** (1) implementar núcleo (API+DB+frontend mínimo); (2) containerizar e subir no cluster; (3) montar CI/CD+GitOps; (4) observabilidade; (5) identidade/features e demo script.
- **Responsável por cada ação:** Conforme seção 7 (José Vitor frontend/UX, Eriky API/DB/features, Alerandro cloud/integração, Matheus observabilidade).
- **Prazo para a próxima etapa:** até 2 dias: núcleo funcional local pronto; antes do pitch final: demo script validado.

## 10. Requisitos do hackathon vs. planejamento atual (gap analysis)

Fonte: `Hackathon · Encurtador de Links Cloud-Native.pdf` (7 páginas).

### Arquitetura obrigatória (todos os times)

| Requisito do desafio | Status no planejamento | Observações |
|---|---|---|
| Frontend criar/listar links | ✅ previsto | Resolvido: React + Vite (TS). |
| API encurtar + redirect | ✅ previsto | Resolvido: NestJS (TS). |
| Banco mapeando short → URL | ✅ previsto | PostgreSQL. |
| Três componentes rodando em Kubernetes | ⚠️ parcial | Cluster Rancher/minikube; falta manifests. |
| K8s: Deployments, Services, ConfigMap/Secret, probes | ⚠️ parcial | Cite probes/ConfigMap/Secret explicitamente; hoje só genérico. |
| GitHub Actions: build, teste e push de imagem | ⚠️ parcial | Adicionar etapa de testes automatizados. |
| ArgoCD: GitOps, repo como fonte da verdade | ✅ previsto | Falta estrutura gitops (k8s/overlays, argocd app). |
| OpenTelemetry: traces distribuídos FE → API → banco | ⚠️ parcial | Instrumentar banco (driver/SDK) e frontend (web SDK). |
| Grafana: dashboards cliques, latência, erros | ✅ previsto | Criar dashboard JSON e métricas nomeadas. |
| Uso documentado da IA (copiloto) | ⚠️ parcial | Criar log de prompts/decisões em `docs/ai-usage.md` (peso 10%). |

### Criatividade (peso 30%)

- ✅ Personagem: Sir Curty (cavaleirinho) — nome, personalidade e identidade visual.
- ✅ Identidade: tema medieval moderno/amigável, cores azul/púrpura/dourado, tom simples/amigável.
- ✅ Features exclusivas (9 listadas), compatíveis com sugestões do PDF (QR code, link que expira/uso único, vanity URL personalizada, ranking, preview antes do redirect, analytics/gráficos).
- ⚠️ Roteiro/timing de pitch detalhado em `docs/pitch.md`; copy de personagem a refinar.

### Observabilidade (peso 15%)

- Dashboard deve ser "útil": incluir cliques por link, latência p95/p99, taxa de erro, saúde dos pods.
- Trace deve cruzar os 3 componentes ao vivo (momento de prova do pitch).

### Pitch (15 min, peso 10%)

- ~3 min: personagem, identidade e unicidade.
- ~8 min: demo ao vivo (criar link, gerar cliques via loop/vários navegadores, dashboard subindo, trace cruzando).
- ~2 min: pipeline (Actions → ArgoCD) + como o Kiro ajudou.
- ~2 min: perguntas.
- Criar roteiro em `docs/pitch.md`.

### Entregáveis mínimos

- Repositório Git com código, manifests K8s e workflow GitHub Actions.
- Encurtador rodando no cluster (frontend + API + banco via ArgoCD).
- Dashboard Grafana + traces demonstráveis.
- Personagem, identidade e features exclusivas.
- README explicando ideia, como rodar e uso do Kiro.
- Pitch de 15 min com demo ao vivo.

### Categorias de prêmio (focos sugeridos pela equipe)

- Mais Criativo (personagem/features) → força da equipe.
- Melhor Observabilidade → foco em dashboard/traces de qualidade.
- Pipeline Impecável → CI/CD + GitOps redondos.
- Melhor uso do Kiro → documentar prompts/decisões.
- Melhor Portal (geral) → combinação ideia + engenharia.
- Escolha da Galera.

### Próximas ações recomendadas

1. Resolver ambiguidades técnicas (frontend framework, backend Nest).
2. Preencher responsabilidades da seção 7.
3. Criar estrutura de pastas `frontend/`, `api/`, `k8s/`, `.github/workflows/`.
4. Definir ordem de implementação conforme PDF (núcleo → containers/K8s → CI/CD+GitOps → observabilidade → personalidade).
5. Criar `README.md`, `docs/pitch.md`, `docs/kiro-usage.md`.
6. Configurar GitOps (ArgoCD Application) e CI (GitHub Actions).
7. Garantir evidências para demo ao vivo (script de cliques).