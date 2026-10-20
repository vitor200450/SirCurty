# Sir Curty — Frontend

Frontend do **Sir Curty**, um encurtador de links com temática medieval. A aplicação permite criar e gerenciar links curtos, personalizar seus códigos, protegê-los com senha, limitar seu uso e acompanhar estatísticas.

O projeto utiliza React, TypeScript e Vite, com interface responsiva, temas claro e escuro e autenticação com Google.

## Funcionalidades

### Criação de links

- Encurtamento de URLs HTTP e HTTPS.
- Validação de URLs e de nomes personalizados.
- Criação de links com código personalizado (_slug_).
- Links de uso único.
- Proteção por senha.
- Cópia do link curto para a área de transferência.

### Visualização e redirecionamento

- Página de visualização acessada pela rota `/s/:code`.
- Contagem regressiva antes do redirecionamento.
- Solicitação de senha para links protegidos.
- Tratamento de links consumidos, expirados ou desativados.
- Página específica para informar o motivo do bloqueio.

### Dashboard

- Listagem dos links do usuário.
- Edição da URL de destino.
- Configuração ou remoção da data de expiração.
- Ativação e desativação de links.
- Alteração da opção de uso único.
- Exclusão de links com confirmação.
- Consulta de estatísticas de acessos e ranking de links.

### Autenticação e interface

- Login com Google.
- Consulta da sessão atual e logout.
- Temas claro e escuro.
- Interface com identidade visual medieval e mascote.

## Tecnologias

| Tecnologia       | Utilização                    |
| ---------------- | ----------------------------- |
| React 19         | Interface e componentes       |
| TypeScript 6     | Tipagem estática              |
| Vite 8           | Desenvolvimento e build       |
| React Router 7   | Navegação entre páginas       |
| TanStack Query 5 | Consultas, mutações e cache   |
| Zod 4            | Validação de dados            |
| Tailwind CSS 4   | Estilização                   |
| ESLint 10        | Análise estática do código    |
| Google OAuth     | Autenticação com Google       |
| OpenTelemetry    | Instrumentação e rastreamento |

O projeto também utiliza a Fetch API para as requisições HTTP e PostCSS na cadeia de estilos.

## Requisitos

Antes de iniciar, tenha instalado:

- Node.js compatível com a versão do Vite utilizada pelo projeto.
- npm.
- A API do Sir Curty em execução para utilizar as funcionalidades que dependem do backend.
- Um Client ID do Google OAuth configurado para autenticação.

## Instalação

Clone o repositório e entre na pasta do frontend:

```bash
git clone <URL_DO_REPOSITORIO>
cd frontend
```

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente necessárias e inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Por padrão, o Vite disponibiliza a aplicação em `http://localhost:5173`. O terminal informa o endereço efetivamente utilizado.

## Scripts disponíveis

| Comando           | Descrição                                                   |
| ----------------- | ----------------------------------------------------------- |
| `npm run dev`     | Inicia o servidor de desenvolvimento do Vite                |
| `npm run build`   | Executa a verificação TypeScript e gera o build de produção |
| `npm run lint`    | Executa o ESLint                                            |
| `npm run preview` | Serve localmente o build gerado para pré-visualização       |

Para validar o projeto antes de abrir um pull request:

```bash
npm run lint
npm run build
```

O `package.json` não define atualmente um script de testes automatizados.

## Variáveis de ambiente

Crie ou atualize o arquivo `.env.development` na raiz do frontend:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=seu_google_client_id
VITE_OTEL_ENDPOINT=http://localhost:4318
```

Os valores são exemplos de configuração local. Ajuste os endereços de acordo com o ambiente utilizado.

| Variável                | Obrigatória                    | Descrição                                                                                                                               |
| ----------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | Não                            | URL base da API. Na ausência dela, o frontend utiliza `/api`.                                                                           |
| `VITE_GOOGLE_CLIENT_ID` | Necessária para o login Google | Client ID utilizado pelo provedor de autenticação Google.                                                                               |
| `VITE_OTEL_ENDPOINT`    | Não                            | Endpoint alternativo para exportação de traces em ambientes de desenvolvimento, caso a configuração de runtime não forneça um endpoint. |

**Importante:** variáveis prefixadas com `VITE_` são incorporadas ao código disponibilizado ao navegador durante o build. Não coloque segredos, senhas ou chaves privadas nesses valores.

### Configuração da API

O cliente HTTP utiliza `VITE_API_BASE_URL` como base para as requisições. Caso a variável não esteja definida, o valor padrão é `/api`.

Durante o desenvolvimento, o `vite.config.ts` encaminha as requisições que começam com `/api` para:

```text
http://localhost:3000
```

Assim, com a configuração padrão, uma requisição para `/api/links` chega ao backend como `/api/links`.

Se o backend estiver em outra porta ou endereço, ajuste o proxy do Vite ou configure `VITE_API_BASE_URL` para apontar diretamente à API.

As requisições HTTP incluem credenciais, permitindo o envio de cookies de sessão quando aplicável.

### Configuração do Google OAuth

O frontend utiliza `@react-oauth/google`. Defina `VITE_GOOGLE_CLIENT_ID` com o Client ID da aplicação configurada no Google Cloud.

O fluxo de login envia o ID token ao backend, que é responsável por processar a autenticação e estabelecer a sessão. O frontend consulta a sessão atual pelo endpoint `/auth/me` e solicita o logout ao backend.

A configuração de origens autorizadas no Google OAuth deve corresponder aos endereços utilizados pela aplicação.

## Rotas da aplicação

| Rota              | Descrição                                          |
| ----------------- | -------------------------------------------------- |
| `/`               | Página principal, criação de links e dashboard     |
| `/s/:code`        | Visualização e redirecionamento de um link curto   |
| `/link-bloqueado` | Página que informa o motivo do bloqueio de um link |

A navegação é gerenciada pelo React Router. Em produção, o servidor web precisa encaminhar as rotas da aplicação para `index.html` para que o React Router possa resolvê-las.

A página `/link-bloqueado` aceita o parâmetro `reason` para identificar o motivo do bloqueio, com suporte aos valores `consumido`, `expirado` e `desativado`.

## Integração com a API

O acesso HTTP é centralizado principalmente em `src/lib/api.ts`, enquanto as operações de autenticação estão em `src/features/auth/auth.service.ts`.

### Endpoints de links

Os endpoints abaixo são relativos à base configurada em `VITE_API_BASE_URL`, que por padrão é `/api`.

| Método   | Endpoint               | Finalidade                              |
| -------- | ---------------------- | --------------------------------------- |
| `POST`   | `/links`               | Criar um link curto                     |
| `GET`    | `/links`               | Listar links                            |
| `GET`    | `/links/:code`         | Consultar um link                       |
| `GET`    | `/links/:code/preview` | Obter os dados para visualização        |
| `POST`   | `/links/:code/unlock`  | Desbloquear um link protegido por senha |
| `PATCH`  | `/links/:code`         | Atualizar um link                       |
| `DELETE` | `/links/:code`         | Solicitar a exclusão de um link         |
| `GET`    | `/links/:code/stats`   | Consultar estatísticas de acessos       |
| `GET`    | `/stats/top?limit=10`  | Consultar o ranking de links            |

### Endpoints de autenticação

| Método | Endpoint       | Finalidade                                  |
| ------ | -------------- | ------------------------------------------- |
| `POST` | `/auth/google` | Autenticar utilizando um ID token do Google |
| `GET`  | `/auth/me`     | Consultar a sessão e o usuário atual        |
| `POST` | `/auth/logout` | Encerrar a sessão                           |

A implementação utiliza `credentials: "include"` nas requisições de autenticação e no cliente HTTP principal. A configuração de cookies, CORS e sessão deve ser compatível com o backend.

## Estrutura do projeto

```text
frontend/
├── public/
│   ├── favicon.png
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── blocked-links/
│   │   ├── dashboard/
│   │   ├── hero/
│   │   ├── preview/
│   │   ├── Dashboard.tsx
│   │   ├── Hero.tsx
│   │   ├── NavBar.tsx
│   │   └── Preview.tsx
│   ├── features/
│   │   ├── auth/
│   │   └── observability/
│   ├── hooks/
│   │   ├── useDashboard.ts
│   │   ├── useLinkCreator.ts
│   │   └── useLinkPreview.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── linkValidation.ts
│   ├── pages/
│   │   └── BlockedLinkPage.tsx
│   ├── types/
│   │   └── link.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── docker-entrypoint.sh
├── eslint.config.js
├── index.html
├── nginx.conf
├── package.json
├── package-lock.json
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

### Responsabilidades principais

- **`src/App.tsx`** — compõe a página principal e gerencia o tema da interface.
- **`src/main.tsx`** — inicializa React, React Router, TanStack Query, autenticação e rotas.
- **`src/components/`** — componentes visuais da aplicação, incluindo dashboard, formulário, visualização e páginas de bloqueio.
- **`src/hooks/useLinkCreator.ts`** — estado e fluxo de criação de links.
- **`src/hooks/useDashboard.ts`** — consultas e mutações do dashboard.
- **`src/hooks/useLinkPreview.ts`** — consulta de visualização, desbloqueio por senha e tratamento de estados do link.
- **`src/lib/api.ts`** — cliente HTTP e operações relacionadas aos links.
- **`src/lib/linkValidation.ts`** — regras de validação com Zod.
- **`src/features/auth/`** — contexto, provedor, serviços e tipos de autenticação.
- **`src/features/observability/`** — implementação e documentação da integração com OpenTelemetry.
- **`src/types/link.ts`** — tipos TypeScript utilizados no domínio de links.
- **`vite.config.ts`** — configuração do Vite e proxy da API.
- **`nginx.conf`** — configuração do servidor Nginx para servir a aplicação em produção.
- **`docker-entrypoint.sh`** — gera a configuração de runtime em `env-config.js` antes de iniciar o Nginx.

## Gerenciamento de estado e cache

O TanStack Query gerencia as consultas e mutações do dashboard. Entre as consultas utilizadas estão a listagem de links e o ranking.

Após operações de criação, edição ou exclusão, o frontend invalida as consultas relevantes para atualizar os dados exibidos.

O cliente de consultas também possui uma política de tentativas de repetição: erros HTTP 4xx não são repetidos pela configuração global; os demais erros podem ser repetidos até o limite configurado. As consultas específicas do dashboard e da visualização de links possuem configurações próprias.

## Observabilidade

O diretório `src/features/observability/` contém a integração com OpenTelemetry, incluindo configuração de tracing, exportação OTLP HTTP e instrumentações para carregamento da página, requisições `fetch` e interações do usuário.

A implementação de tracing consulta `window.__APP_CONFIG__.OTEL_ENDPOINT` e, como alternativa, `VITE_OTEL_ENDPOINT`.

Em produção, o `docker-entrypoint.sh` gera um arquivo `env-config.js` contendo valores como `API_URL`, `APP_ENV`, `APP_BASE_URL` e `OTEL_ENDPOINT`.

**Atenção:** o cliente HTTP e o serviço de autenticação apresentados neste projeto utilizam `VITE_API_BASE_URL` ou `/api`; portanto, não se deve presumir que alterar `API_URL` no arquivo de runtime altera automaticamente a base das requisições. Da mesma forma, a disponibilidade dos módulos de tracing não garante, por si só, que a instrumentação esteja inicializada em todos os carregamentos. Verifique a inicialização e o ambiente de implantação antes de considerar a telemetria operacional.

Para detalhes adicionais, consulte `src/features/observability/INTEGRATION.md`.

## Build de produção

Gere os arquivos estáticos com:

```bash
npm run build
```

O Vite gera o resultado em `dist/`. Para testar localmente a versão compilada:

```bash
npm run preview
```

O comando `preview` é destinado à validação do build, não substituindo a configuração de um servidor de produção.

## Nginx e configuração de runtime

O repositório contém `nginx.conf`, que configura o Nginx para:

- Servir os arquivos estáticos de `dist/`.
- Utilizar `index.html` como fallback para rotas da SPA.
- Aplicar cache prolongado a determinados arquivos estáticos.
- Evitar cache do arquivo `/env-config.js`.

O script `docker-entrypoint.sh` gera `/usr/share/nginx/html/env-config.js` a partir de variáveis de ambiente, incluindo:

| Variável        | Valor padrão |
| --------------- | ------------ |
| `API_URL`       | `/api`       |
| `APP_ENV`       | `production` |
| `APP_BASE_URL`  | vazio        |
| `OTEL_ENDPOINT` | vazio        |

Essas variáveis são distintas das variáveis `VITE_*` usadas durante o build. Confira quais módulos consomem a configuração de runtime antes de definir o processo de implantação.

A pasta do frontend analisada contém a configuração do Nginx e o script de entrada, mas não contém um `Dockerfile` ou um arquivo Docker Compose. A construção da imagem e a orquestração precisam ser fornecidas pelo repositório ou pelo ambiente de implantação correspondente.

## Contribuição

Antes de enviar alterações:

1. Mantenha a tipagem TypeScript consistente com os contratos da API.
2. Reutilize o cliente HTTP e os hooks existentes quando apropriado.
3. Preserve o tratamento de erros e a invalidação do cache após mutações.
4. Execute o ESLint e o build de produção.
5. Não inclua arquivos `.env` com credenciais, tokens ou valores privados nos commits.

```bash
npm run lint
npm run build
```

## Licença

Consulte o arquivo de licença do repositório principal, caso exista, para verificar as condições de uso e distribuição.
