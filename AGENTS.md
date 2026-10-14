# AGENTS.md — Sir Curty (Encurtador de Links Cloud-Native)

Guia para agentes de IA (Kiro, Copilot, ChatGPT, etc.) atuarem de forma consistente neste repositório.

## Projeto

- **Nome:** Sir Curty — encurtador de links cloud-native.
- **Contexto:** Hackathon Cloud-Native (Kubernetes, CI/CD, GitOps, tracing, dashboards).
- **Objetivo:** encurtar/organizar/monitorar links com identidade medieval + personagem Sir Curty e features exclusivas.

## Stack oficial

- Frontend: React + Vite + TypeScript (`frontend/`)
- API: NestJS + TypeScript (`api/`)
- ORM/migrações: Prisma (`api/prisma/`)
- Banco: PostgreSQL
- Infra: Kubernetes + Kustomize + GitHub Actions + ArgoCD
- Observabilidade: OpenTelemetry (traces FE→API→DB) + Grafana (dashboards core)
- Links curtos: ID autoincremental + scrambling (`sqids` ou multiplicação modular) + Base62, com vanity URLs

## Estrutura esperada

- `frontend/` — SPA React (Nginx serve build; `try_files $uri /index.html`)
- `api/` — NestJS (módulos por domínio)
- `k8s/` — `base/`, `overlays/dev/`, `argocd/`
- `.github/workflows/` — `ci.yml`, `cd.yml`
- `docs/` — planejamento, arquitetura, observabilidade, pitch, AI usage
- `scripts/` — seed, geração de cliques para demo

## Convenções

- TypeScript strict em tudo.
- Código e commits em **inglês** para mensagens de commit; documentação em **português** (decisão do squad).
- Commits: `type: lowercase imperative description` (ex.: `feat: add link preview endpoint`), sem attribution de AI.
- Não committar: PDF do desafio, segredos, `.env`, dumps.
- Segredos sempre via `Secret`/GitHub Secrets, nunca no repo.
- Logs de IA em `docs/ai-usage.md` (quem, quando, prompt, resultado, ajuste manual).

## Preferências de implementação

- API: módulos por bounded context (`links`, `clicks`, `auth`, `security`, `health`), DTOs com `class-validator`, health em `/health/live` e `/health/ready`.
- Frontend: features por domínio, React Query para dados, Zod para validação.
- Redirect por interstitial: rota SPA `/s/:code` -> API `GET /api/links/:code/preview` -> redirect via `window.location`.
- OTel: propagar `traceparent` do browser para API e API→Postgres.

## Ordem sugerida de implementação (conforme desafio)

1. Núcleo funcional (API+DB+frontend mínimo)
2. Containers + Kubernetes
3. CI/CD + GitOps
4. Observabilidade
5. Personalidade + features exclusivas

## Regras para agentes

- Não reescrever decisões lockadas sem aprovação (stack, Base62+scrambling, interstitial, OTel core).
- Manter o `.gitignore` protegendo o PDF.
- Atualizar docs quando mudar arquitetura/decisões.
- Preferir pequenos commits focados.
- Em caso de dúvida sobre responsabilidades, consultar `docs/planejamento-inicial.md`.
