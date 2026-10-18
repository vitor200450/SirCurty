# 🏰 Sir Curty — Frontend

Interface do **Sir Curty**, um encurtador de links cloud-native com temática medieval.
Desenvolvida em React + Vite + TypeScript, a SPA comunica com a API NestJS e guia o utilizador por todos os fluxos: criar links, aceder a links protegidos, e monitorizar estatísticas.

---

## 📁 Estrutura de ficheiros

```
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg                  # Sprites SVG (GitHub, Discord, X, Bluesky...)
├── src/
│   ├── assets/                    # Imagens estáticas (mascote, fundos de castelo)
│   ├── components/
│   │   ├── Navbar.tsx             # Barra de navegação com toggle de tema
│   │   ├── Hero.tsx               # Formulário principal de criação de links
│   │   ├── Dashboard.tsx          # Tabela de links + modais de edição e estatísticas
│   │   ├── Preview.tsx            # Tela interstitial antes do redirect
│   │   └── LinkDestruido.tsx      # Tela exibida quando um link expirou/foi destruído
│   ├── lib/
│   │   └── api.ts                 # Cliente centralizado de fetch para a API
│   ├── types/
│   │   └── link.ts                # Tipos TypeScript espelhando os DTOs da API
│   ├── App.tsx                    # Componente raiz: estado global + orquestração
│   ├── main.tsx                   # Entry point: QueryClient + BrowserRouter + rotas
│   └── index.css                  # Tailwind v4 (@import "tailwindcss")
├── vite.config.ts                 # Proxy /api e /s → localhost:3000 em dev
├── tailwind.config.js             # (legado v3, ignorado pelo Tailwind v4)
├── postcss.config.js              # Plugin @tailwindcss/postcss
└── nginx.conf                     # Config Nginx para servir a SPA em produção
```

---

## ✨ Funcionalidades

### Criação de links (`Hero.tsx`)
- Campo de URL com validação client-side via **Zod** antes de qualquer chamada à API
- Chama `POST /api/links` e exibe o link curto gerado imediatamente
- Feitiços avançados configuráveis:
  - **✏️ Slug personalizado** — define o código do link (ex: `sircurty.io/s/meu-link`)
  - **🔥 Uso único** — o link é consumido atomicamente na primeira visita e fica inacessível
  - **🔒 Proteção com senha** — o destino só é revelado após o visitante introduzir a senha correta

### Tela interstitial (`Preview.tsx`)
Acedida via rota `/s/:code`. Gere os seguintes fluxos:

| Situação | Comportamento |
|---|---|
| Link normal | Mostra destino + contagem regressiva de 3 s → redirect |
| Link com senha | Formulário de senha → `POST /api/links/:code/unlock` → contagem → redirect |
| Link uso único (1.ª vez) | Mostra aviso "será destruído" → contagem → redirect |
| Link uso único (2.ª+ vez) | API retorna 410 → redireciona para `/link-destruido` |
| Senha + uso único (1.ª vez) | Senha → unlock → contagem → redirect |
| Senha + uso único (2.ª+ vez) | Senha → unlock retorna 410 → `/link-destruido` |
| Link inexistente ou eliminado | API retorna 404 → `/link-destruido` |

### Tela de link destruído (`LinkDestruido.tsx`)
Página exibida quando um link de uso único já foi consumido, expirou, foi desativado ou não existe.

### Dashboard (`Dashboard.tsx`)
- Lista todos os links do utilizador (cookie anónimo) via `GET /api/links`
- Indicadores de uso único 🔥 e proteção com senha 🔒 por linha
- Badge de estado: **Ativo** / **Inativo**
- **Ação 📊 — Modal de estatísticas:** cliques totais + gráfico de barras de cliques por dia (`GET /api/links/:code/stats`)
- **Ação ✏️ — Modal de edição:** alterar URL, expiração, uso único e estado do link (`PATCH /api/links/:code`)
- **Ação 🔥 — Eliminar:** soft-delete com confirmação (`DELETE /api/links/:code`)
- Sidebar com top 5 links mais clicados (`GET /api/stats/top`), clicáveis para abrir o modal de stats

### Navbar (`Navbar.tsx`)
- Logo + título "Sir Curty"
- Toggle de tema claro ☀️ / escuro 🌙

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 |
| Build | Vite 8 |
| Linguagem | TypeScript 6 (strict) |
| Estilos | Tailwind CSS v4 + PostCSS |
| Validação | Zod v4 |
| Routing | React Router v7 |
| Data fetching | TanStack React Query v5 |
| HTTP | Fetch nativo (cliente em `src/lib/api.ts`) |

---

## 🔌 Integração com a API

Todas as chamadas passam por `/api` (prefixo global da API NestJS).
Em desenvolvimento, o Vite faz proxy de `/api` e `/s` para `http://localhost:3000`, evitando problemas de CORS.

```
# vite.config.ts
server.proxy:
  /api  →  http://localhost:3000
  /s    →  http://localhost:3000
```

O cookie `sircurty_anon_id` (gerido pela API) é enviado automaticamente em todas as
requests via `credentials: 'include'`, associando os links ao utilizador anónimo.

### Endpoints consumidos

| Método | Rota | Usado em |
|---|---|---|
| `POST` | `/api/links` | Criar link (Hero) |
| `GET` | `/api/links` | Listar links (Dashboard) |
| `GET` | `/api/links/:code/preview` | Interstitial (Preview) |
| `POST` | `/api/links/:code/unlock` | Desbloquear link com senha (Preview) |
| `PATCH` | `/api/links/:code` | Editar link (Dashboard modal) |
| `DELETE` | `/api/links/:code` | Eliminar link (Dashboard) |
| `GET` | `/api/links/:code/stats` | Estatísticas de cliques (Dashboard modal) |
| `GET` | `/api/stats/top` | Top links por cliques (Dashboard sidebar) |

---

## 🚀 Correr localmente

### Pré-requisitos
- Node.js ≥ 20
- API NestJS a correr em `http://localhost:3000` (com PostgreSQL ligado)

### Instalação e arranque

```bash
cd frontend
npm install
npm run dev
```

O frontend fica disponível em `http://localhost:5173`.

### Outros comandos

```bash
npm run build      # Build de produção (output em dist/)
npm run preview    # Pré-visualizar o build de produção
npm run lint       # ESLint
```

---

## 🐳 Produção (Docker / Kubernetes)

O build de produção é servido por **Nginx** (`nginx.conf`).
O entrypoint (`docker-entrypoint.sh`) injeta variáveis de ambiente em runtime antes de iniciar o Nginx.
A configuração inclui `try_files $uri /index.html` para suporte correto ao client-side routing do React Router.

---

*Forjado com honra para o Hackathon Cloud-Native. ⚔️📜*
