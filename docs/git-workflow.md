# Estratégia GitFlow (simplificada) — Sir Curty

## Visão geral

Usamos um **GitFlow simplificado** para o hackathon: `main` (estável) + `develop` (integração) +
feature branches curtos. Removemos `release/*` e `hotfix/*` para reduzir complexidade.

```
main (estável/demo)
  └─ develop (integração)
       ├─ feature/<area>-<tarefa>
       └─ feature/<area>-<tarefa>
```

## Branches principais

- **`main`**: branch estável. Sempre pronta para demo/pitch. Merge apenas a partir de `develop` (quando estável).
- **`develop`**: integração diária. Toda feature parte daqui e retorna via PR.
- **`feature/<area>-<tarefa>`**: trabalho curto e focado (ex.: `feature/api-links-core`, `feature/frontend-interstitial`).

## Fluxo de trabalho

1. Criar feature a partir de `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/<area>-<tarefa>
   ```
2. Desenvolver, commitar pequeno, rodar testes/build local.
3. Rebase com `develop` frequentemente:
   ```bash
   git fetch origin
   git rebase origin/develop
   ```
4. Abrir PR `feature/* → develop`, review por 1 pessoa (ou dono da área).
5. Merge (preferir squash ou merge commit consistente).
6. Antes do pitch: congelar mudanças em `develop` (apenas bugfix), depois merge `develop → main`; opcionalmente criar tag `v1.0-hackathon`.

## Propriedade por diretório (evita conflitos)

- `frontend/` → José Vitor
- `api/` → Eriky
- `k8s/`, `.github/` → Alerandro
- Dashboards/OTel → Matheus (com PRs nos hooks de API/frontend)
- `docs/` → compartilhado (preferir append)

## Regras anti-conflito

- Contrato de API primeiro (DTOs/OpenAPI) antes de paralelizar.
- Escopo por branch; evitar mudanças transversais não combinadas.
- Rebase diário com `develop`.
- PR pequeno (< ~300 linhas).
- Não editar arquivos do outro dono sem PR.
- Um dono por lockfile/`prisma/schema.prisma`.
- Não usar `git add .` em worktree sujo.
- `main` só recebe merge de `develop`.

## Freeze antes do pitch

- 1–2 dias antes: congelar `develop` (apenas bugfix) e focar em demo/roteiro.
- Merge `develop → main`, rodar pipeline e validar no cluster.
- Tag de release opcional (ex.: `v1.0-hackathon`).

## Referências

- Divisão de responsabilidades: `docs/initial-planning.md` (seção 7)
- Escopo/prioridade: `docs/initial-planning.md` (seção 4)
- Estrutura de pastas: `docs/structure.md`
