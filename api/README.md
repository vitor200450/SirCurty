# Sir Curty API

API REST do **Sir Curty**, uma aplicação de encurtamento de URLs com gerenciamento de links, identidade anônima, slugs personalizados, proteção por senha, expiração, links de uso único e estatísticas de acesso.

Desenvolvida com NestJS, TypeScript, Prisma ORM e PostgreSQL, a API centraliza as regras de negócio, a persistência dos dados, o redirecionamento dos links e o registro de cliques.

## Sumário

- [1. Visão geral](#1-visão-geral)
- [2. Funcionalidades](#2-funcionalidades)
- [3. Tecnologias](#3-tecnologias)
- [4. Arquitetura e organização](#4-arquitetura-e-organização)
- [5. Requisitos](#5-requisitos)
- [6. Configuração do ambiente](#6-configuração-do-ambiente)
- [7. Banco de dados e migrações](#7-banco-de-dados-e-migrações)
- [8. Executando a API](#8-executando-a-api)
- [9. Endpoints](#9-endpoints)
- [10. Contratos de requisição e resposta](#10-contratos-de-requisição-e-resposta)
- [11. Regras de negócio](#11-regras-de-negócio)
- [12. Identidade anônima e segurança](#12-identidade-anônima-e-segurança)
- [13. Registro de cliques e estatísticas](#13-registro-de-cliques-e-estatísticas)
- [14. Tratamento de erros](#14-tratamento-de-erros)
- [15. Testes e qualidade](#15-testes-e-qualidade)
- [16. Considerações operacionais](#16-considerações-operacionais)

---

## 1. Visão geral

O Sir Curty permite criar URLs curtas que redirecionam para endereços de destino, oferecendo mecanismos para gerenciar os links e acompanhar seus acessos.

A API utiliza uma identidade anônima baseada em cookie para associar links ao navegador que os criou. Isso permite disponibilizar operações de gerenciamento sem exigir uma conta de usuário no fluxo atual.

Além do redirecionamento convencional, a aplicação oferece recursos como:

- Criação de links com códigos aleatórios ou slugs personalizados.
- Atualização do endereço de destino e das configurações dos links.
- Proteção de links por senha.
- Expiração programada.
- Links de uso único.
- Ativação, desativação e exclusão lógica.
- Registro de cliques e consulta de estatísticas.
- Ranking de links por quantidade de acessos.
- Verificação de disponibilidade da API e do banco de dados.

A API é responsável pelas regras de negócio e pela persistência. A interface web pode consumir seus endpoints para apresentar as funcionalidades ao usuário.

## 2. Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Encurtamento | Cria URLs curtas para destinos HTTP ou HTTPS. |
| Slugs personalizados | Permite definir um código próprio, respeitando as regras de validação. |
| Gerenciamento de links | Lista, consulta, atualiza e exclui logicamente os links do proprietário. |
| Identidade anônima | Associa links a uma identidade persistida em cookie. |
| Proteção por senha | Exige uma senha antes de liberar o endereço de destino. |
| Expiração | Impede a utilização de links após a data configurada. |
| Uso único | Permite consumir o link uma única vez, inclusive sob requisições concorrentes. |
| Redirecionamento | Encaminha o navegador para o destino configurado. |
| Estatísticas | Apresenta o total de cliques e a distribuição diária dos acessos. |
| Ranking | Retorna os links do proprietário ordenados por quantidade de cliques. |
| Health checks | Verifica a disponibilidade da aplicação e a conectividade com o banco. |

## 3. Tecnologias

### Backend

- **Node.js:** ambiente de execução JavaScript.
- **TypeScript:** tipagem estática e organização do código.
- **NestJS 11:** framework para construção da API.
- **Express:** plataforma HTTP utilizada pelo NestJS.
- **Prisma ORM 7:** acesso ao banco de dados e gerenciamento de migrações.
- **PostgreSQL 16:** banco de dados relacional.
- **Joi:** validação das variáveis de ambiente.
- **class-validator:** validação dos DTOs.
- **class-transformer:** transformação e serialização dos objetos.
- **Helmet:** configuração de cabeçalhos HTTP relacionados à segurança.
- **bcrypt:** hash e verificação de senhas dos links.
- **Jest:** testes unitários e de integração.
- **Supertest:** testes HTTP.
- **ESLint e Prettier:** análise estática e formatação.

### Infraestrutura

- Docker Compose para executar PostgreSQL e pgAdmin.
- Prisma Client com adaptador PostgreSQL.
- Módulos ESM e TypeScript com configuração `NodeNext`.

## 4. Arquitetura e organização

A API segue a organização modular do NestJS, separando as responsabilidades de gerenciamento de links, estatísticas, infraestrutura de banco de dados e funcionalidades compartilhadas.

### Estrutura de diretórios

```text
api/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── common/
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   ├── config/
│   │   └── env.validation.ts
│   ├── infrastructure/
│   │   └── database/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   └── anonymous.middleware.ts
│   │   ├── clicks/
│   │   │   ├── dto/
│   │   │   ├── clicks.module.ts
│   │   │   ├── clicks.service.ts
│   │   │   └── stats.controller.ts
│   │   ├── health/
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   └── links/
│   │       ├── dto/
│   │       ├── links.controller.ts
│   │       ├── links.module.ts
│   │       ├── links.service.ts
│   │       └── redirect.controller.ts
│   ├── utils/
│   │   └── slug.util.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env.example
├── nest-cli.json
├── package.json
├── prisma7.config.ts
├── tsconfig.build.json
├── tsconfig.e2e.json
└── tsconfig.json
```

Arquivos auxiliares, testes específicos e configurações adicionais foram omitidos da árvore para facilitar a leitura.

### Responsabilidades dos módulos

#### `AppModule`

Módulo principal da aplicação. Registra a configuração global, o banco de dados e os módulos funcionais.

Também aplica o middleware de identidade anônima a todas as requisições.

#### `LinksModule`

Responsável pelo ciclo de vida dos links:

- Criação e validação das configurações.
- Listagem dos links do proprietário.
- Consulta de detalhes e pré-visualização.
- Atualização de configurações.
- Exclusão lógica.
- Redirecionamento e desbloqueio de links protegidos.

#### `ClicksModule`

Responsável pelo registro dos acessos e pela consulta de estatísticas.

Exporta `ClicksService`, permitindo que o módulo de links registre cliques sem duplicar essa lógica.

#### `HealthModule`

Disponibiliza endpoints para verificar a disponibilidade da aplicação e do banco de dados.

#### `PrismaModule`

Disponibiliza globalmente o `PrismaService`, responsável pela conexão com o PostgreSQL e pelo ciclo de vida do Prisma Client.

#### Componentes compartilhados

- `AnonymousMiddleware`: identifica o navegador por meio de cookie.
- `HttpExceptionFilter`: padroniza as respostas de erro.
- `ValidationPipe`: valida e transforma os dados recebidos.
- `slug.util.ts`: centraliza a geração e as regras dos slugs.

### Fluxo simplificado de uma requisição

```text
Cliente
  |
  v
NestJS / Express
  |
  v
Helmet + CORS + Middleware de identidade
  |
  v
ValidationPipe
  |
  v
Controller
  |
  v
Service
  |
  v
PrismaService
  |
  v
PostgreSQL
```

O fluxo representa a arquitetura geral. A ordem efetiva dos componentes HTTP também depende da configuração de cada middleware e dos interceptadores globais.

## 5. Requisitos

Para executar a API localmente, são necessários:

- Node.js compatível com as dependências do projeto.
- npm.
- Docker e Docker Compose, caso o PostgreSQL seja executado em contêiner.
- Acesso a um banco PostgreSQL.
- Variáveis de ambiente configuradas.

A API utiliza a variável `DATABASE_URL` para se conectar ao banco. Os scripts Prisma usam a configuração definida em `prisma7.config.ts`.

## 6. Configuração do ambiente

### 6.1. Instalar as dependências

Na raiz do repositório:

```bash
cd api
npm install
```

### 6.2. Configurar as variáveis de ambiente

Crie o arquivo local a partir do exemplo:

```bash
cp .env.example .env
```

Edite `api/.env` de acordo com o ambiente.

Exemplo de configuração para desenvolvimento local:

```dotenv
NODE_ENV=development
PORT=3000

POSTGRES_USER=sircurty
POSTGRES_PASSWORD=changeme
POSTGRES_DB=sircurty

DATABASE_URL=postgresql://sircurty:changeme@localhost:5432/sircurty

ALLOWED_ORIGINS=http://localhost:5173
APP_BASE_URL=http://localhost:3000

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=changeme

TRUST_PROXY=0
```

**Importante:** os valores acima são exemplos de desenvolvimento. Utilize senhas próprias e adequadas ao ambiente. Não versione arquivos `.env` nem compartilhe credenciais.

### 6.3. Variáveis de ambiente

| Variável | Obrigatória | Padrão ou finalidade |
|---|---|---|
| `NODE_ENV` | Não | `development`; aceita `development`, `production` e `test`. |
| `PORT` | Não | `3000`; porta HTTP da API. |
| `DATABASE_URL` | Sim | URI de conexão PostgreSQL. |
| `POSTGRES_USER` | Conforme o Compose | Usuário inicial do PostgreSQL. |
| `POSTGRES_PASSWORD` | Conforme o Compose | Senha inicial do PostgreSQL. |
| `POSTGRES_DB` | Conforme o Compose | Banco inicial do PostgreSQL. |
| `ALLOWED_ORIGINS` | Não | `http://localhost:5173`; origens CORS separadas por vírgulas. |
| `APP_BASE_URL` | Não | `http://localhost:3000`; base utilizada para montar URLs curtas. |
| `TRUST_PROXY` | Não | `0`; controla a confiança nos proxies. |
| `PGADMIN_DEFAULT_EMAIL` | Conforme o Compose | E-mail inicial do pgAdmin. |
| `PGADMIN_DEFAULT_PASSWORD` | Conforme o Compose | Senha inicial do pgAdmin. |

As variáveis `POSTGRES_*` e `PGADMIN_*` são utilizadas pelo Docker Compose. A aplicação NestJS utiliza diretamente `DATABASE_URL` para acessar o banco.

O arquivo `.env.example` documenta as variáveis esperadas para o ambiente local.

### 6.4. Validação das variáveis

As variáveis são validadas por `env.validation.ts`, utilizando Joi.

Entre as verificações estão:

- Valores permitidos para `NODE_ENV`.
- Intervalo válido para `PORT`.
- URI PostgreSQL válida em `DATABASE_URL`.
- Formato URI para `APP_BASE_URL`.
- Validação de `TRUST_PROXY`.

A aplicação utiliza `ConfigModule` globalmente. O arquivo `.env` não é carregado pelo `ConfigModule` quando `NODE_ENV=test`; nesse cenário, as variáveis precisam estar disponíveis no ambiente do processo.

O arquivo `prisma7.config.ts`, por sua vez, carrega as variáveis com `dotenv/config` para os comandos Prisma.

### 6.5. Observação sobre `APP_BASE_URL`

`APP_BASE_URL` deve ser configurada sem barra final para evitar URLs com barras duplicadas.

Exemplo recomendado:

```dotenv
APP_BASE_URL=http://localhost:3000
```

A URL curta retornada pela API utiliza o formato:

```text
{APP_BASE_URL}/s/{code}
```

## 7. Banco de dados e migrações

### 7.1. Subir a infraestrutura

O arquivo `compose.yaml`, localizado na raiz do repositório, define dois serviços:

| Serviço | Porta local | Finalidade |
|---|---|---|
| `postgres` | `5432` | Banco de dados PostgreSQL 16. |
| `pgadmin` | `5050` | Interface de administração do banco. |

Como o arquivo Compose está na raiz e as variáveis de exemplo estão em `api/.env`, execute na raiz do repositório:

```bash
docker compose --env-file api/.env up -d
```

Verifique os serviços:

```bash
docker compose ps
```

Acesse o pgAdmin em:

```text
http://localhost:5050
```

As portas são vinculadas a `127.0.0.1`, limitando a exposição aos acessos locais. O PostgreSQL e o pgAdmin utilizam volumes persistentes para preservar seus dados.

O Compose verifica a disponibilidade do PostgreSQL com `pg_isready` e aguarda a saúde do banco antes de iniciar o pgAdmin.

Para interromper os serviços sem apagar os volumes:

```bash
docker compose down
```

Para apagar também os volumes persistentes, seria necessário executar explicitamente `docker compose down -v`. **Essa operação remove os dados armazenados nesses volumes.**

### 7.2. Gerar o Prisma Client

Na pasta `api/`:

```bash
npm run prisma:generate
```

O comando utiliza a configuração `prisma7.config.ts` e gera o cliente no diretório:

```text
src/generated/prisma/
```

Esse diretório é gerado a partir do schema e não deve ser tratado como código-fonte escrito manualmente.

### 7.3. Executar as migrações

Para aplicar as migrações em desenvolvimento:

```bash
npm run prisma:migrate:dev
```

Para consultar o estado das migrações:

```bash
npm run prisma:migrate:status
```

Para aplicar migrações já existentes em um ambiente de implantação:

```bash
npm run prisma:migrate:deploy
```

A diferença principal é que `migrate:dev` é voltado ao desenvolvimento e à criação de migrações, enquanto `migrate:deploy` aplica as migrações existentes sem criar novas.

**A inicialização do Docker Compose não executa as migrações automaticamente.** O banco precisa estar acessível e o schema deve ser preparado separadamente.

### 7.4. Prisma Studio

Para inspecionar os dados do banco:

```bash
npm run prisma:studio
```

O Prisma Studio permite consultar os registros das tabelas e auxilia na depuração durante o desenvolvimento.

### 7.5. Modelos de dados

O schema principal está em `prisma/schema.prisma`.

#### `User`

Armazena usuários, com campos como:

- `id`
- `googleSub`
- `email`
- `name`
- `createdAt`
- `updatedAt`

Os identificadores externos e e-mails possuem restrições de unicidade. A existência desse modelo no banco não significa que o fluxo de autenticação Google esteja disponível na API atual.

#### `Link`

Armazena os links encurtados e suas configurações:

- `id`
- `slug`
- `originalUrl`
- `ownerAnonId`
- `ownerUserId`
- `passwordHash`
- `isSingleUse`
- `usedAt`
- `expiresAt`
- `status`
- `createdAt`
- `updatedAt`

O campo `slug` é único e identifica o link nas rotas públicas.

Os campos `ownerAnonId` e `ownerUserId` representam as possibilidades de associação a uma identidade anônima ou a um usuário. O fluxo atual de gerenciamento utiliza a identidade anônima.

#### `Click`

Armazena os registros de acesso:

- `id`
- `linkId`
- `clickedAt`
- `ipHash`
- `userAgent`
- `referrer`
- `country`
- `city`
- `isBot`

A relação com `Link` utiliza uma chave estrangeira com `ON DELETE RESTRICT`, impedindo a exclusão física de um link enquanto houver cliques associados.

O campo `ipHash` armazena um hash do endereço IP, não o IP bruto. Os campos de localização e identificação de bots existem no schema, mas não são preenchidos pela lógica atual de registro de cliques.

#### Status de um link

O enum `LinkStatus` define:

| Status | Significado |
|---|---|
| `ACTIVE` | Link habilitado. |
| `DISABLED` | Link desabilitado. |
| `DELETED` | Link excluído logicamente. |

A expiração e o consumo de um link de uso único são estados adicionais representados por seus respectivos campos. Um link pode continuar com status `ACTIVE` mesmo depois de expirar ou ser consumido.

## 8. Executando a API

### 8.1. Ambiente de desenvolvimento

Depois de configurar o banco, instalar as dependências e preparar o schema:

```bash
npm run start:dev
```

O NestJS inicia a aplicação em modo de desenvolvimento, com reinicialização automática ao detectar alterações.

Por padrão, a API fica disponível em:

```text
http://localhost:3000
```

### 8.2. Compilação

Para compilar o projeto:

```bash
npm run build
```

A saída é gerada em `dist/`.

Para executar a versão compilada:

```bash
npm run start:prod
```

### 8.3. Scripts disponíveis

| Comando | Finalidade |
|---|---|
| `npm run start` | Inicia a aplicação pelo NestJS. |
| `npm run start:dev` | Inicia em modo de desenvolvimento. |
| `npm run start:debug` | Inicia em modo de depuração. |
| `npm run build` | Compila a aplicação. |
| `npm run start:prod` | Executa a versão compilada. |
| `npm run lint` | Executa o ESLint com correção automática (`--fix`). |
| `npm run format` | Formata os arquivos TypeScript de `src` e `test`. |
| `npm test` | Executa os testes unitários. |
| `npm run test:watch` | Executa os testes em modo de observação. |
| `npm run test:cov` | Executa os testes com cobertura. |
| `npm run test:debug` | Executa os testes com suporte à depuração. |
| `npm run test:e2e` | Executa os testes E2E. |
| `npm run prisma:generate` | Gera o Prisma Client. |
| `npm run prisma:migrate:dev` | Executa migrações em desenvolvimento. |
| `npm run prisma:migrate:deploy` | Aplica migrações existentes. |
| `npm run prisma:migrate:status` | Consulta o estado das migrações. |
| `npm run prisma:studio` | Abre o Prisma Studio. |

**Atenção:** `npm run lint` e `npm run format` podem modificar arquivos. Para apenas verificar o código, utilize os comandos de verificação da seção de testes e qualidade.

## 9. Endpoints

### 9.1. Convenções

A maioria dos endpoints utiliza o prefixo `/api`.

As exceções são:

- `/s/:code`: redirecionamento público.
- `/health/live`: disponibilidade da aplicação.
- `/health/ready`: disponibilidade da aplicação e do banco.

Os exemplos a seguir usam:

```text
http://localhost:3000
```

A tabela considera o comportamento implementado atualmente.

### 9.2. Resumo das rotas

#### Links

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/links` | Cria um link. |
| `GET` | `/api/links` | Lista os links do proprietário. |
| `GET` | `/api/links/:code` | Consulta um link do proprietário. |
| `PATCH` | `/api/links/:code` | Atualiza as configurações de um link. |
| `DELETE` | `/api/links/:code` | Exclui logicamente um link. |
| `GET` | `/api/links/:code/preview` | Consulta a pré-visualização pública. |
| `POST` | `/api/links/:code/unlock` | Desbloqueia um link protegido por senha. |
| `GET` | `/s/:code` | Redireciona para o destino do link. |

#### Estatísticas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/links/:code/stats` | Consulta as estatísticas de um link do proprietário. |
| `GET` | `/api/stats/top` | Lista os links do proprietário ordenados por cliques. |

#### Saúde da aplicação

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health/live` | Verifica se a aplicação está respondendo. |
| `GET` | `/health/ready` | Verifica se o banco de dados está acessível. |

#### Rota raiz

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api` | Retorna a resposta padrão `Hello World!`. |

### 9.3. Criar um link

**Endpoint:** `POST /api/links`

Exemplo de requisição:

```http
POST /api/links
Content-Type: application/json
```

```json
{
  "url": "https://example.com/article",
  "customSlug": "meu-artigo",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "singleUse": false
}
```

Os campos `customSlug`, `password`, `expiresAt` e `singleUse` são opcionais.

Exemplo de resposta:

```json
{
  "code": "meu-artigo",
  "shortUrl": "http://localhost:3000/s/meu-artigo"
}
```

A resposta contém `code` e `shortUrl`. O endpoint não retorna um QR Code.

### 9.4. Listar links

**Endpoint:** `GET /api/links`

Retorna os links associados à identidade anônima atual, excluindo os links com status `DELETED`.

Os resultados são ordenados por data de criação, do mais recente para o mais antigo.

Exemplo de resposta:

```json
[
  {
    "id": 1,
    "slug": "meu-artigo",
    "originalUrl": "https://example.com/article",
    "isSingleUse": false,
    "expiresAt": null,
    "status": "ACTIVE",
    "createdAt": "2026-10-17T02:00:00.000Z",
    "updatedAt": "2026-10-17T02:00:00.000Z",
    "hasPassword": false
  }
]
```

### 9.5. Consultar um link

**Endpoint:** `GET /api/links/:code`

Retorna os detalhes de um link pertencente à identidade anônima atual.

Se o link não existir, estiver excluído ou pertencer a outra identidade, a API responde com `404 Not Found`.

### 9.6. Atualizar um link

**Endpoint:** `PATCH /api/links/:code`

Exemplo:

```json
{
  "url": "https://example.com/new-destination",
  "expiresAt": null,
  "singleUse": true,
  "status": "DISABLED"
}
```

Todos os campos são opcionais. O exemplo mostra a atualização do destino, a remoção da expiração, a ativação do modo de uso único e a desativação do link.

O endpoint aceita `ACTIVE` ou `DISABLED` no campo `status`. A exclusão lógica é realizada por `DELETE`.

O `slug` e o proprietário não podem ser alterados por esse endpoint.

### 9.7. Excluir um link

**Endpoint:** `DELETE /api/links/:code`

A exclusão é lógica: o status do link passa a ser `DELETED`. O registro não é removido fisicamente do banco.

Em caso de sucesso, a API retorna `204 No Content`.

### 9.8. Pré-visualizar um link

**Endpoint:** `GET /api/links/:code/preview`

Retorna informações públicas sobre o link sem realizar o redirecionamento.

Exemplo de resposta para um link sem senha:

```json
{
  "code": "meu-artigo",
  "originalUrl": "https://example.com/article",
  "requiresPassword": false,
  "expiresAt": null,
  "isSingleUse": false
}
```

Para links protegidos por senha, `originalUrl` é retornado como `null`, evitando revelar o destino antes do desbloqueio.

Links inexistentes ou excluídos retornam `404`. Links desativados ou expirados retornam `410 Gone`.

### 9.9. Desbloquear um link

**Endpoint:** `POST /api/links/:code/unlock`

Exemplo de requisição:

```json
{
  "password": "MinhaSenha123"
}
```

Exemplo de resposta:

```json
{
  "url": "https://example.com/article"
}
```

A resposta não expõe o identificador interno do link.

O registro do clique acontece após o desbloqueio bem-sucedido. Tentativas malsucedidas não são registradas como acessos ao destino.

### 9.10. Redirecionar

**Endpoint:** `GET /s/:code`

Exemplo:

```http
GET /s/meu-artigo
```

Quando o link pode ser utilizado, a API responde com:

```http
HTTP/1.1 302 Found
Location: https://example.com/article
```

O navegador segue o cabeçalho `Location` para acessar o destino.

Comportamentos relevantes:

| Condição | Resultado |
|---|---|
| Link válido e disponível | `302 Found`. |
| Link inexistente ou excluído | `404 Not Found`. |
| Link desativado ou expirado | `410 Gone`. |
| Link protegido por senha, sem desbloqueio | `403 Forbidden`. |
| Link de uso único já consumido | `410 Gone`. |

O registro do clique é assíncrono e não deve impedir o redirecionamento caso ocorra uma falha ao salvar as estatísticas.

### 9.11. Consultar estatísticas de um link

**Endpoint:** `GET /api/links/:code/stats`

Retorna o total de cliques e sua distribuição diária.

Exemplo:

```json
{
  "code": "meu-artigo",
  "total": 12,
  "dailyClicks": [
    {
      "day": "2026-10-15",
      "count": 5
    },
    {
      "day": "2026-10-16",
      "count": 7
    }
  ]
}
```

As datas utilizam o calendário UTC e são ordenadas cronologicamente.

O endpoint retorna `404 Not Found` quando o link não existe, foi excluído ou não pertence ao proprietário atual.

### 9.12. Ranking de links

**Endpoint:** `GET /api/stats/top`

Parâmetro opcional:

| Parâmetro | Padrão | Limites |
|---|---|---|
| `limit` | `10` | Mínimo `1`, máximo `50`. |

Exemplo:

```http
GET /api/stats/top?limit=5
```

Retorna uma lista de links do proprietário, ordenados pela quantidade de cliques em ordem decrescente.

O resultado utiliza o formato de `LinkResponseDto`, que não inclui a contagem de cliques. O ranking é utilizado para ordenar os links, mas não retorna o total de acessos de cada item.

Links sem cliques também podem aparecer quando não há links mais acessados suficientes para preencher o limite solicitado.

### 9.13. Health checks

#### Liveness

```http
GET /health/live
```

Resposta:

```json
{
  "status": "ok"
}
```

Esse endpoint verifica se a aplicação está respondendo, sem consultar o banco de dados.

#### Readiness

```http
GET /health/ready
```

Quando o banco está acessível:

```json
{
  "status": "ok",
  "db": "ok"
}
```

Se o banco não estiver acessível, a API responde com `503 Service Unavailable`, sem expor detalhes internos da conexão.

## 10. Contratos de requisição e resposta

### 10.1. `CreateLinkDto`

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `url` | `string` | Sim | URL HTTP ou HTTPS válida, com protocolo explícito. |
| `customSlug` | `string` | Não | De 3 a 32 caracteres; letras, números, hífen e sublinhado. |
| `password` | `string` | Não | De 1 a 128 caracteres, sem aceitar conteúdo exclusivamente em branco. |
| `expiresAt` | `string` ou `null` | Não | Data em formato ISO; a data definida deve ser futura. |
| `singleUse` | `boolean` | Não | Indica se o link pode ser utilizado apenas uma vez. |

O limite efetivo de senha para operações criptográficas é de 72 bytes em UTF-8, devido à limitação do bcrypt. Uma senha pode passar pela validação de comprimento do DTO e ainda ser rejeitada por ultrapassar esse limite em bytes.

Quando `singleUse` não é informado, o valor padrão é `false`.

### 10.2. `UpdateLinkDto`

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `url` | `string` | Não | URL HTTP ou HTTPS válida. |
| `expiresAt` | `string` ou `null` | Não | Data ISO futura ou `null` para remover a expiração. |
| `singleUse` | `boolean` | Não | Atualiza a configuração de uso único. |
| `status` | `string` | Não | Aceita `ACTIVE` ou `DISABLED`. |

O DTO não permite alterar o `slug` nem o proprietário do link.

### 10.3. `LinkResponseDto`

O DTO de resposta dos links contém:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `number` | Identificador interno do link. |
| `slug` | `string` | Código utilizado na URL curta. |
| `originalUrl` | `string` | URL de destino. |
| `isSingleUse` | `boolean` | Indica se o link é de uso único. |
| `expiresAt` | `string` ou `null` | Data de expiração. |
| `status` | `string` | Status do link. |
| `createdAt` | `string` | Data de criação. |
| `updatedAt` | `string` | Data da última atualização. |
| `hasPassword` | `boolean` | Indica se o link possui senha configurada. |

O DTO não expõe o hash da senha nem os identificadores do proprietário.

### 10.4. `LinkPreviewDto`

Contém:

- `code`
- `originalUrl`
- `requiresPassword`
- `expiresAt`
- `isSingleUse`

O destino é ocultado quando o link exige senha.

### 10.5. `UnlockLinkDto`

Recebe o campo `password`, com comprimento permitido pelo DTO entre 1 e 128 caracteres. O serviço aplica também o limite efetivo do bcrypt.

### 10.6. `ClickStatsDto`

Contém:

- `code`: código do link.
- `total`: total de cliques registrados.
- `dailyClicks`: lista de agrupamentos diários.

Cada elemento de `dailyClicks` contém:

- `day`: data no formato `YYYY-MM-DD`, em UTC.
- `count`: quantidade de cliques registrados naquele dia.

### 10.7. Validação global

A API utiliza `ValidationPipe` com as opções:

- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `validationError.target: false`

Na prática:

- Os DTOs validam os dados recebidos.
- Os valores podem ser transformados conforme as regras declaradas.
- Propriedades não declaradas no DTO são rejeitadas.
- Os erros de validação não incluem o objeto interno completo que foi validado.

As respostas de erro são padronizadas pelo filtro global de exceções.

## 11. Regras de negócio

### 11.1. Geração de códigos

Os códigos automáticos são gerados com uma fonte criptograficamente segura de aleatoriedade, utilizando `randomBytes(9).toString('base64url')`, que produz 12 caracteres Base64URL.

Os slugs personalizados seguem a expressão regular:

```regex
^[a-zA-Z0-9_-]{3,32}$
```

A aplicação também bloqueia nomes reservados, incluindo caminhos e recursos como `api`, `s`, `admin`, `health`, `docs`, `login`, `logout`, `dashboard`, `metrics`, `assets`, `static`, `public`, `null` e `undefined`.

A verificação de palavras reservadas não diferencia maiúsculas de minúsculas.

O PostgreSQL garante a unicidade global do campo `slug`. Para slugs automáticos, a aplicação realiza novas tentativas diante de colisões, com um máximo de cinco tentativas. Para slugs personalizados já ocupados, retorna conflito.

O código identifica o recurso, mas não substitui a verificação de propriedade.

### 11.2. Propriedade dos links

As operações administrativas utilizam o identificador anônimo resolvido pelo middleware.

A API compara a identidade atual com o proprietário registrado para o link. A consulta de um recurso que pertence a outra identidade retorna `404 Not Found`, evitando disponibilizar seus dados por meio do CRUD.

A identidade anônima é baseada no navegador e no cookie. Não equivale a uma conta autenticada e não garante a recuperação dos links em outro navegador ou dispositivo.

### 11.3. Senhas

As senhas dos links são armazenadas como hashes bcrypt, nunca como texto puro.

A validação da senha acontece antes da liberação do destino. O serviço também verifica o estado do link e a validade de sua expiração.

Quando o link está protegido, o endpoint de redirecionamento direto não libera o destino: é necessário utilizar o endpoint de desbloqueio.

### 11.4. Expiração

Uma expiração deve representar uma data futura no momento da criação ou atualização.

A expiração pode ser removida durante uma atualização enviando:

```json
{
  "expiresAt": null
}
```

Links expirados não podem ser utilizados para redirecionamento ou desbloqueio. A expiração é uma condição de disponibilidade separada do status persistido.

### 11.5. Uso único

O campo `isSingleUse` habilita o consumo único. O campo `usedAt` registra quando o link foi consumido.

O serviço utiliza uma atualização condicional atômica para impedir que duas requisições concorrentes consumam o mesmo link com sucesso.

Quando duas requisições tentam consumir simultaneamente o mesmo link, apenas uma pode concluir a operação. A outra recebe `410 Gone`.

Esse comportamento foi validado por um teste E2E com duas requisições concorrentes e PostgreSQL.

### 11.6. Exclusão lógica

A exclusão altera o status para `DELETED`, preservando o registro no banco.

Links excluídos:

- Não aparecem na listagem normal.
- Não podem ser consultados pelo CRUD.
- Não podem ser redirecionados.
- Não disponibilizam estatísticas pelo endpoint de proprietário.

A exclusão lógica preserva o histórico de cliques associado ao link.

### 11.7. Desativação

O status `DISABLED` impede a utilização do link sem removê-lo do cadastro.

Um link pode voltar a ficar disponível mediante atualização do status para `ACTIVE`, desde que não esteja expirado, excluído ou consumido, conforme suas configurações.

## 12. Identidade anônima e segurança

### 12.1. Cookie de identidade

A API utiliza o cookie:

```text
sircurty_anon_id
```

Quando necessário, o middleware gera um identificador aleatório de 32 bytes e o representa em hexadecimal, produzindo 64 caracteres.

O valor armazenado no banco é o hash SHA-256 do identificador, não o valor bruto do cookie.

O cookie possui as seguintes propriedades:

| Propriedade | Configuração |
|---|---|
| `Path` | `/` |
| `HttpOnly` | `true` |
| `Max-Age` | `31536000` segundos |
| `SameSite` | `Lax` em conexões não seguras; `None` com `Secure` em HTTPS. |
| `Secure` | Ativado em conexões HTTPS reconhecidas pelo middleware. |

A identidade é resolvida automaticamente nas requisições, inclusive nas rotas públicas.

### 12.2. CORS

A origem permitida é configurada por `ALLOWED_ORIGINS`, que aceita uma lista separada por vírgulas.

A configuração permite credenciais e os métodos:

- `GET`
- `POST`
- `PATCH`
- `DELETE`
- `OPTIONS`

Os cabeçalhos permitidos incluem `Content-Type` e `Authorization`.

Como a identidade anônima depende de cookie, o cliente web deve estar configurado para enviar e receber credenciais quando necessário. Em clientes baseados em `fetch`, isso normalmente exige `credentials: 'include'`.

Em ambientes HTTPS e entre origens diferentes, a política de cookies e CORS deve ser configurada de forma compatível.

### 12.3. Cabeçalhos HTTP

A API utiliza Helmet para definir cabeçalhos relacionados à segurança HTTP.

### 12.4. Confiança em proxies

`TRUST_PROXY` controla a confiança nas informações encaminhadas por proxies. O padrão é `0`, desabilitando a confiança por padrão.

Em ambientes com proxy reverso, configure essa variável conforme a topologia real. Uma configuração excessivamente permissiva pode permitir que cabeçalhos encaminhados influenciem a interpretação da requisição.

O middleware de identidade considera informações de HTTPS para definir as propriedades do cookie.

### 12.5. Limites de segurança

O código aleatório reduz a previsibilidade, mas não substitui controles de autorização.

Também é importante observar que a implementação analisada não possui um mecanismo de rate limiting específico para tentativas de descoberta de slugs ou desbloqueio de senhas.

Links protegidos por senha oferecem uma barreira adicional de acesso ao destino, mas não devem ser utilizados como substituto de autenticação e autorização em aplicações que exigem controle de acesso rigoroso.

## 13. Registro de cliques e estatísticas

### 13.1. Registro

Os cliques são persistidos na tabela `clicks`.

O registro pode incluir:

- Identificador do link.
- Data e hora do acesso.
- Hash SHA-256 do endereço IP, quando disponível.
- User-Agent.
- Referer.

O User-Agent é limitado a 512 caracteres e o Referer a 2.048 caracteres.

A lógica atual não preenche automaticamente os campos `country`, `city` e `isBot`.

### 13.2. Quando os cliques são registrados

O redirecionamento público registra o acesso de forma assíncrona. Se o registro falhar, a aplicação registra o erro sem alterar o redirecionamento já autorizado.

No fluxo de desbloqueio, o clique é registrado somente após a validação bem-sucedida da senha.

Tentativas malsucedidas de desbloqueio não são contabilizadas como cliques de destino.

### 13.3. Agregação diária

As estatísticas agrupam os cliques por dia utilizando o calendário UTC.

Isso evita que a mesma data seja interpretada de maneira diferente conforme o fuso horário do servidor ou do cliente.

### 13.4. Ranking

O ranking considera a quantidade de cliques de cada link, ordenada de forma decrescente.

A consulta inclui links sem cliques quando necessário, mas o DTO retornado não expõe explicitamente a contagem que determina a posição no ranking.

### 13.5. Diferença entre analytics e monitoramento

As estatísticas de cliques são dados funcionais do produto e são persistidas no PostgreSQL.

Elas não devem ser confundidas com métricas operacionais de infraestrutura, como disponibilidade, uso de CPU, latência e erros de serviço.

## 14. Tratamento de erros

O filtro global `HttpExceptionFilter` padroniza as respostas de erro.

Formato:

```json
{
  "statusCode": 404,
  "message": "Link not found",
  "timestamp": "2026-10-17T02:00:00.000Z",
  "path": "/api/links/meu-artigo"
}
```

Os valores do exemplo são ilustrativos.

### 14.1. Mapeamento de erros Prisma

| Código ou condição | HTTP | Mensagem genérica |
|---|---:|---|
| `P2002` | `409` | `Resource already exists` |
| `P2025` | `404` | `Resource not found` |
| `P2003` | `422` | `Related resource not found` |
| `P2011` | `400` | `Missing required field` |
| `P2000` | `400` | `Input value is too long` |
| Erro conhecido não mapeado | `500` | `Internal server error` |
| Erro de validação Prisma | `500` | `Internal server error` |
| Erro de inicialização Prisma | `503` | `Service temporarily unavailable` |

Exceções HTTP geradas pela aplicação mantêm seu status e suas mensagens conforme o filtro.

Erros internos inesperados não têm suas mensagens técnicas expostas ao cliente. O filtro registra informações de diagnóstico no servidor, conforme a categoria do erro.

### 14.2. Códigos HTTP frequentes

| Código | Significado |
|---|---|
| `200 OK` | Operação concluída. |
| `201 Created` | Link criado. |
| `204 No Content` | Exclusão lógica concluída. |
| `302 Found` | Redirecionamento. |
| `400 Bad Request` | Dados inválidos ou operação incompatível com as regras. |
| `401 Unauthorized` | Identidade não resolvida ou falha de autenticação de senha. |
| `403 Forbidden` | Link protegido acessado diretamente sem desbloqueio. |
| `404 Not Found` | Recurso inexistente, excluído ou fora do escopo do proprietário. |
| `409 Conflict` | Conflito de unicidade, como slug personalizado ocupado. |
| `410 Gone` | Link desativado, expirado ou já consumido. |
| `422 Unprocessable Entity` | Referência a recurso relacionado inválido. |
| `500 Internal Server Error` | Falha interna inesperada. |
| `503 Service Unavailable` | Serviço indisponível, incluindo falha de conectividade com o banco. |

A mensagem exata pode variar conforme o endpoint e a exceção gerada. O formato padronizado inclui `statusCode`, `message`, `timestamp` e `path`.

## 15. Testes e qualidade

### 15.1. Testes unitários

Executar:

```bash
npm test
```

Para execução sequencial:

```bash
npm test -- --runInBand
```

Para cobertura:

```bash
npm run test:cov
```

Os testes unitários cobrem, entre outros aspectos:

- Regras de negócio de links.
- Geração e validação de slugs.
- Registro e agregação de cliques.
- Controladores.
- Health checks.
- Tratamento de exceções.

### 15.2. Testes E2E

Os testes E2E são executados por:

```bash
npm run test:e2e
```

O script carrega o arquivo `.env.test` e configura `NODE_ENV=test`.

A configuração exige que o banco selecionado seja `sircurty_test`. Se outro banco estiver configurado, a suíte é interrompida para evitar alterações acidentais em um banco incorreto.

Crie e configure o banco de testes antes da execução. O banco precisa estar acessível e possuir o schema esperado pelas migrações.

Para executar os testes sequencialmente:

```bash
npm run test:e2e -- --runInBand
```

A suíte E2E inclui um teste de concorrência para garantir que duas requisições simultâneas não consumam o mesmo link de uso único.

Os testes removem os cliques associados antes de excluir os links criados, respeitando as restrições de integridade referencial.

**Nunca configure `.env.test` para apontar para um banco com dados importantes.**

### 15.3. ESLint

O script `npm run lint` executa o ESLint com `--fix`.

Para verificar o código sem aplicar correções automáticas:

```bash
npx eslint src test
```

### 15.4. Prettier

Para verificar a formatação sem modificar arquivos:

```bash
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

Para aplicar a formatação configurada:

```bash
npm run format
```

### 15.5. Build

Para validar a compilação:

```bash
npm run build
```

A compilação de produção utiliza `tsconfig.build.json`, excluindo testes e arquivos de especificação.

## 16. Considerações operacionais

### 16.1. Persistência

Os dados funcionais da aplicação são armazenados no PostgreSQL. O Docker Compose utiliza volumes persistentes para os dados do banco e do pgAdmin.

A exclusão dos contêineres não implica necessariamente a exclusão dos volumes. Para ambientes importantes, mantenha uma estratégia de backup adequada.

### 16.2. Migrações em produção

As migrações devem ser versionadas e aplicadas de forma controlada durante a implantação.

O comando `prisma:migrate:deploy` aplica as migrações existentes. Ele não substitui a preparação das variáveis de ambiente, a disponibilidade do banco ou a validação da compatibilidade da versão implantada.

### 16.3. Identidade anônima

Como o gerenciamento depende de um cookie, a perda desse cookie pode impedir o acesso aos links associados à identidade anterior.

A API atual não deve ser descrita como um sistema completo de contas de usuário apenas porque o modelo `User` existe no schema.

### 16.4. Disponibilidade

Os health checks permitem distinguir a disponibilidade básica do processo da disponibilidade do banco:

- `/health/live`: verifica se a aplicação responde.
- `/health/ready`: verifica a conectividade com o banco.

Esses endpoints podem ser utilizados em verificações operacionais e orquestração, conforme a infraestrutura adotada.

### 16.5. Escopo atual

A API implementa o encurtamento, o gerenciamento anônimo de links, a proteção por senha, a expiração, o uso único, o redirecionamento e as estatísticas de cliques.

Recursos que não estejam implementados nos módulos e controladores atuais não devem ser considerados disponíveis apenas por existirem campos no banco ou possibilidades futuras de extensão.

---

**Sir Curty API** — serviço de encurtamento de URLs com gerenciamento de links e estatísticas de acesso.