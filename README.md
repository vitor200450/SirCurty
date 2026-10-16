# Sir Curty — Encurtador de Links Cloud-Native

Projeto para o Hackathon Cloud-Native (Encurtador de Links com Kiro).  
Encurtador com identidade própria: tema medieval, mascote **Sir Curty** e features exclusivas.

## Visão

Uma plataforma para encurtar, organizar e monitorar links, com estatísticas de acesso
e funcionalidades personalizadas. Links longos assumem a forma de "monstros";
Sir Curty os fatia com sua espada mágica e os transforma em atalhos seguros.

## Arquitetura (obrigatória)

- **Frontend**: criar/listar/gerenciar links.
- **API**: encurtar + redirect.
- **Banco de dados**: mapeamento short code → URL (PostgreSQL).
- **Kubernetes**: Deployments, Services, ConfigMaps/Secrets, probes.
- **CI/CD**: GitHub Actions (build, teste, push de imagem).
- **GitOps**: ArgoCD (repo como fonte da verdade do cluster).
- **Observabilidade**: OpenTelemetry (traces FE → API → DB) + dashboards no Grafana.

## Estrutura do repositório

```
SirCurty/
  frontend/            # app web (React/Next)
  api/                 # Nest API + redirect
  k8s/                 # manifests Kubernetes + ArgoCD
  .github/workflows/   # GitHub Actions
  docs/                # planejamento, pitch, log do Kiro
```

## Como rodar (local)

> A ser preenchido conforme a implementação dos componentes.

## Como a IA foi usada

Ver `docs/ai-usage.md` (prompts e decisões documentadas — Kiro ou outra ferramenta equivalente).

## Entregáveis

- Código + manifests K8s + workflow GitHub Actions.
- Encurtador rodando no cluster via ArgoCD.
- Dashboard Grafana + traces demonstráveis.
- Personagem, identidade e features exclusivas.
- Pitch de 15 min com demo ao vivo.
