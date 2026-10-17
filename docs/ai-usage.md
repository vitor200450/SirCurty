# Log de uso de IA (copiloto)

Documentar aqui prompts e decisões tomadas com o Kiro ou outras ferramentas de IA
durante o desenvolvimento (peso de avaliação: 10%). A banca olha para a qualidade
das decisões assistidas, não apenas para o nome da ferramenta.

## Entradas

| Data | Ferramenta | Responsável | Objetivo | Prompt resumido | Resultado / decisão |
|---|---|---|---|---|---|
| 2026-10-15 | Kiro (Autopilot) | Matheus | Planejar a observabilidade | "Analisar o projeto e planejar a observabilidade" | Definir plano em 3 fases: stack K8s, API, frontend. Decisão: entregar em paralelo ao núcleo. |
| 2026-10-15 | Kiro (Autopilot) | Matheus | Implementar stack K8s de observabilidade | Aprovar o plano | Gerar manifests para OTel Collector, Tempo, Grafana com 3 dashboards e ingresses. |
| 2026-10-15 | Kiro (Autopilot) | Matheus | Instrumentar OTel na API NestJS | "Implementar o OTel na API" | Gerar bootstrap NodeSDK, TracingService e módulo global. Criar guia de integração para a API. |
| 2026-10-15 | Kiro (Autopilot) | Matheus | Instrumentar OTel no frontend | "Implementar o OTel no frontend" | Gerar bootstrap WebTracerProvider, FetchInstrumentation e hook `useOtelSpan`. Criar guia para o frontend. |
| 2026-10-16 | Kiro (Autopilot) | Matheus | Corrigir bugs e fazer gitflow | "Checar todos os arquivos" | Corrigir extensão `health_check` no OTel Collector e queries do dashboard `overview.json`. Mergear PR #2 em `develop`. |
| 2026-10-16 | Claude Code | José Vitor | Manifests Kubernetes da aplicação | "Criar uma branch feature nova e adiantar a parte de Kubernetes" | Gerou `k8s/base/app` (postgres, api, frontend, config, ingress), integrou no overlay dev e corrigiu `repoURL` do ArgoCD. Validado com `kustomize build`; não testado em cluster. |
