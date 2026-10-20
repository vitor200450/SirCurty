# Sir Curty API

API REST do **Sir Curty**, uma aplicação de encurtamento de URLs com autenticação Google, gerenciamento de links, identidade anônima, slugs personalizados, proteção por senha, expiração, links de uso único e estatísticas de acesso.

Desenvolvida com NestJS, TypeScript, Prisma ORM e PostgreSQL, a API centraliza as regras de negócio, a autenticação, o gerenciamento de sessões, a persistência dos dados, o redirecionamento dos links e o registro de cliques.

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
- [12. Autenticação, sessões e identidade anônima](#12-autenticação-sessões-e-identidade-anônima)
- [13. Segurança dos links](#13-segurança-dos-links)
- [14. Registro de cliques e estatísticas](#14-registro-de-cliques-e-estatísticas)
- [15. Tratamento de erros](#15-tratamento-de-erros)
- [16. Testes e qualidade](#16-testes-e-qualidade)
- [17. Considerações operacionais](#17-considerações-operacionais)

---

## 1. Visão geral

O Sir Curty permite criar URLs curtas que redirecionam para endereços de destino, oferecendo mecanismos para gerenciar os links e acompanhar seus acessos.

A API suporta dois tipos de proprietário:

- **Usuário autenticado:** identificado por uma sessão válida criada após a autenticação com Google.
- **Visitante anônimo:** identificado por um cookie persistente associado ao navegador.

Os links são associados a um desses proprietários. As operações de gerenciamento e consulta de estatísticas verificam a identidade atual antes de disponibilizar os dados.

Quando um visitante anônimo entra em uma conta Google, os links anônimos podem ser transferidos para o usuário autenticado, conforme as regras de migração implementadas pela aplicação.

Além disso, a API oferece:

- Autenticação com Google.
- Criação, validação e revogação de sessões.
- Consulta do usuário autenticado.
- Criação de links com códigos aleatórios ou slugs personalizados.
- Atualização e exclusão lógica de links.
- Proteção de links por senha.
- Expiração programada.
- Links de uso único.
- Redirecionamento HTTP.
- Registro de cliques.
- Estatísticas diárias de acesso.
- Ranking de links por quantidade de cliques.
- Verificação da disponibilidade da API e do banco de dados.

A interface web consome os endpoints da API e utiliza cookies para manter a sessão e a identidade anônima.

## 2. Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Autenticação Google | Valida o token de identidade fornecido pelo Google e identifica o usuário. |
| Gerenciamento de sessões | Cria, consulta e revoga sessões persistidas no banco de dados. |
| Cookie de sessão | Mantém a sessão autenticada por meio de um cookie HTTP. |
| Identidade anônima | Associa links a uma identidade persistida em cookie. |
| Migração de links | Permite transferir links da identidade anônima para a conta autenticada durante o login. |
| Encurtamento | Cria URLs curtas para destinos HTTP ou HTTPS. |
| Slugs personalizados | Permite definir um código próprio, respeitando as regras de validação. |
| Gerenciamento de links | Lista, consulta, atualiza e exclui logicamente os links do proprietário. |
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
- **Google OAuth:** autenticação baseada no token de identidade do Google.
- **google-auth-library:** validação de tokens de identidade do Google.
- **Joi:** validação das variáveis de ambiente.
- **class-validator:** validação dos DTOs.
- **class-transformer:** transformação dos objetos.
- **Helmet:** configuração de cabeçalhos HTTP relacionados à segurança.
- **bcrypt:** hash e verificação de senhas dos links.
- **Jest:** testes unitários e de integração.
- **Supertest:** testes HTTP.
- **ESLint e Prettier:** análise estática e formatação.

### Infraestrutura

- Docker Compose para executar PostgreSQL e pgAdmin.
- Prisma Client com adaptador PostgreSQL.
- Sessões persistidas no banco de dados.
- Módulos ESM e TypeScript com configuração `NodeNext`.

## 4. Arquitetura e organização

A API segue a organização modular do NestJS, separando autenticação, gerenciamento de links, estatísticas, infraestrutura de banco de dados e funcionalidades compartilhadas.

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
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── anonymous.middleware.ts
│   │   │   ├── session.service.ts
│   │   │   └── session-cookie.ts
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
│   │       ├── link-owner.ts
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

A árvore é ilustrativa: arquivos auxiliares, DTOs adicionais, testes e configurações específicas podem variar conforme a versão do projeto.

### Responsabilidades dos módulos

#### `AppModule`

Módulo principal da aplicação. Registra a configuração global, o banco de dados e os módulos funcionais.

Também aplica o middleware de identidade anônima às requisições.

#### `AuthModule`

Responsável pela autenticação e pelas sessões:

- Validação do token de identidade do Google.
- Identificação ou criação do usuário.
- Criação de sessões persistidas.
- Validação de sessões existentes.
- Consulta do usuário autenticado.
- Revogação de sessões durante o logout.
- Gerenciamento do cookie de sessão.
- Manutenção da identidade anônima.
- Suporte à transferência de links anônimos para a conta autenticada.

#### `LinksModule`

Responsável pelo ciclo de vida dos links:

- Criação e validação das configurações.
- Listagem dos links do proprietário.
- Consulta de detalhes e pré-visualização.
- Atualização de configurações.
- Exclusão lógica.
- Redirecionamento.
- Desbloqueio de links protegidos por senha.
- Verificação de expiração e uso único.

O módulo utiliza o resolvedor de proprietário para identificar a conta ou a identidade anônima responsável pelos links.

#### `ClicksModule`

Responsável pelo registro dos acessos e pela consulta de estatísticas.

Exporta `ClicksService`, permitindo que o módulo de links registre cliques sem duplicar essa lógica.

As estatísticas utilizam a mesma lógica de resolução de proprietário aplicada ao gerenciamento dos links.

#### `HealthModule`

Disponibiliza endpoints para verificar a disponibilidade da aplicação e do banco de dados.

#### `PrismaModule`

Disponibiliza o `PrismaService`, responsável pela conexão com o PostgreSQL e pelo ciclo de vida do Prisma Client.

#### Componentes compartilhados

- `AnonymousMiddleware`: identifica o navegador por meio de cookie.
- `SessionService`: gerencia a validação e o ciclo de vida das sessões.
- `session-cookie.ts`: centraliza constantes e operações relacionadas aos cookies de sessão.
- `link-owner.ts`: resolve o proprietário autenticado ou anônimo de uma requisição.
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
Validação e resolução de identidade
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

A ordem efetiva dos componentes HTTP depende da configuração dos middlewares, pipes, guards e filtros da aplicação.

### Fluxo de autenticação

```text
Frontend
   |
   v
Token de identidade do Google
   |
   v
POST /api/auth/google
   |
   v
Validação do token
   |
   v
Identificação ou criação do usuário
   |
   v
Criação da sessão persistida
   |
   v
Cookie HttpOnly de sessão
   |
   v
Requisições autenticadas
```

O token de identidade do Google é utilizado para autenticação. As requisições seguintes utilizam o cookie de sessão emitido pela API.

## 5. Requisitos

Para executar a API localmente, são necessários:

- Node.js compatível com as dependências do projeto.
- npm.
- Docker e Docker Compose, caso o PostgreSQL seja executado em contêiner.
- Acesso a um banco PostgreSQL.
- Variáveis de ambiente configuradas.
- Credenciais de cliente Google OAuth para habilitar a autenticação Google.

A API utiliza `DATABASE_URL` para se conectar ao banco. Os scripts Prisma usam a configuração definida em `prisma7.config.ts`.

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

GOOGLE_CLIENT_ID=your-google-oauth-client-id

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=changeme

TRUST_PROXY=0
```

Os valores são exemplos para desenvolvimento. Utilize credenciais próprias e não versione arquivos `.env`.

O `GOOGLE_CLIENT_ID` deve corresponder ao cliente OAuth utilizado pelo frontend para obter o token de identidade do Google.

### 6.3. Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `NODE_ENV` | Ambiente de execução: `development`, `production` ou `test`. |
| `PORT` | Porta HTTP da API; normalmente `3000`. |
| `DATABASE_URL` | URI de conexão PostgreSQL. |
| `GOOGLE_CLIENT_ID` | Identifica o cliente Google OAuth esperado durante a validação do token. |
| `POSTGRES_USER` | Usuário inicial do PostgreSQL no Docker Compose. |
| `POSTGRES_PASSWORD` | Senha inicial do PostgreSQL no Docker Compose. |
| `POSTGRES_DB` | Banco inicial do PostgreSQL no Docker Compose. |
| `ALLOWED_ORIGINS` | Origens CORS permitidas, separadas por vírgulas. |
| `APP_BASE_URL` | Base utilizada para montar as URLs curtas. |
| `TRUST_PROXY` | Controla a confiança nos proxies reversos. |
| `PGADMIN_DEFAULT_EMAIL` | E-mail inicial do pgAdmin. |
| `PGADMIN_DEFAULT_PASSWORD` | Senha inicial do pgAdmin. |

As variáveis `POSTGRES_*` e `PGADMIN_*` são utilizadas pela infraestrutura Docker Compose. A aplicação NestJS utiliza diretamente `DATABASE_URL` para acessar o banco.

Consulte `.env.example` e `env.validation.ts` para confirmar os valores obrigatórios e as regras exatas da versão em execução.

### 6.4. Validação das variáveis

As variáveis são validadas por `env.validation.ts`, utilizando Joi.

As verificações incluem configurações de ambiente, porta, conexão PostgreSQL, URL base e confiança em proxies. A validação das variáveis específicas de autenticação deve permanecer alinhada ao schema de ambiente utilizado pela versão atual.

A aplicação utiliza `ConfigModule` globalmente. Em ambientes de teste, as variáveis precisam estar disponíveis no ambiente do processo conforme a configuração de testes.

O arquivo `prisma7.config.ts` carrega as variáveis necessárias para os comandos Prisma.

### 6.5. `APP_BASE_URL`

Configure `APP_BASE_URL` sem barra final.

Exemplo:

```dotenv
APP_BASE_URL=http://localhost:3000
```

A URL curta utiliza o formato:

```text
{APP_BASE_URL}/s/{code}
```

## 7. Banco de dados e migrações

### 7.1. Subir a infraestrutura

O arquivo `compose.yaml`, localizado na raiz do repositório, define os serviços de infraestrutura.

| Serviço | Porta local | Finalidade |
|---|---:|---|
| `postgres` | `5432` | Banco de dados PostgreSQL. |
| `pgadmin` | `5050` | Interface de administração do banco. |

Na raiz do repositório:

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

Para interromper os serviços sem apagar os volumes:

```bash
docker compose down
```

Para remover também os volumes persistentes:

```bash
docker compose down -v
```

**Atenção:** a segunda operação remove os dados armazenados nos volumes afetados.

### 7.2. Gerar o Prisma Client

Na pasta `api/`:

```bash
npm run prisma:generate
```

O cliente gerado é utilizado pelos serviços que acessam o banco.

### 7.3. Executar as migrações

Para desenvolvimento:

```bash
npm run prisma:migrate:dev
```

Para consultar o estado das migrações:

```bash
npm run prisma:migrate:status
```

Para aplicar migrações existentes em um ambiente de implantação:

```bash
npm run prisma:migrate:deploy
```

`migrate:dev` é voltado ao desenvolvimento e à criação de migrações; `migrate:deploy` aplica as migrações versionadas existentes.

A inicialização do Docker Compose não garante que as migrações tenham sido executadas.

### 7.4. Prisma Studio

Para inspecionar os dados:

```bash
npm run prisma:studio
```

### 7.5. Modelos de dados

O schema principal está em `prisma/schema.prisma`.

#### `User`

Armazena os usuários autenticados, incluindo informações como:

- Identificador interno.
- Identificador Google (`googleSub`).
- E-mail.
- Nome.
- Datas de criação e atualização.

O identificador externo do Google permite associar novas autenticações à conta correspondente.

#### Sessões

As sessões persistidas permitem validar e revogar a autenticação sem depender de um token JWT enviado em cada requisição.

O cookie contém um token de sessão aleatório. A implementação armazena o hash do token no banco, em vez de persistir o valor bruto do cookie.

Os campos exatos do modelo de sessão devem ser consultados em `schema.prisma`.

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

Os campos `ownerAnonId` e `ownerUserId` permitem associar um link a uma identidade anônima ou a um usuário autenticado.

#### `Click`

Armazena os registros de acesso, incluindo:

- `id`
- `linkId`
- `clickedAt`
- `ipHash`
- `userAgent`
- `referrer`
- `country`
- `city`
- `isBot`

Os campos de localização e identificação de bots só devem ser considerados preenchidos quando houver lógica específica implementada para isso.

#### Status de um link

| Status | Significado |
|---|---|
| `ACTIVE` | Link habilitado. |
| `DISABLED` | Link desabilitado. |
| `DELETED` | Link excluído logicamente. |

Expiração e consumo de uso único são condições adicionais representadas por seus respectivos campos.

## 8. Executando a API

### 8.1. Desenvolvimento

Depois de configurar o banco, instalar as dependências e aplicar as migrações:

```bash
npm run start:dev
```

Por padrão, a API fica disponível em:

```text
http://localhost:3000
```

### 8.2. Compilação

```bash
npm run build
```

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
| `npm run lint` | Executa o ESLint com as opções definidas no script. |
| `npm run format` | Formata os arquivos TypeScript. |
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

Consulte `api/package.json` para os nomes e comportamentos exatos dos scripts disponíveis na versão instalada.

## 9. Endpoints

### 9.1. Convenções

Os endpoints da API utilizam o prefixo `/api`, exceto as rotas públicas de redirecionamento e os health checks.

Base local:

```text
http://localhost:3000
```

Os exemplos abaixo pressupõem a configuração atual de rotas. O prefixo global e os decorators dos controllers são a referência definitiva para os caminhos implantados.

### 9.2. Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/google` | Autentica com o token de identidade do Google e cria uma sessão. |
| `GET` | `/api/auth/me` | Consulta a sessão atual e os dados do usuário autenticado. |
| `POST` | `/api/auth/logout` | Revoga a sessão atual e encerra a autenticação. |

#### Login com Google

**Endpoint:** `POST /api/auth/google`

Recebe o token de identidade obtido pelo frontend:

```json
{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

A API valida o token e identifica o usuário. Se necessário, cria o registro da conta e uma sessão persistida.

A resposta inclui os dados do usuário e as informações de expiração da sessão, conforme o contrato do endpoint.

O cookie de sessão é enviado por meio do cabeçalho `Set-Cookie`. O token de sessão não precisa ser exposto no corpo JSON para que o cliente mantenha a autenticação.

#### Consultar a sessão atual

**Endpoint:** `GET /api/auth/me`

Exemplo de resposta:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Example User"
  }
}
```

O objeto é ilustrativo. Os campos retornados devem corresponder ao DTO efetivo do usuário.

A requisição utiliza o cookie de sessão enviado pelo navegador. Uma sessão ausente, inválida ou expirada não deve ser considerada autenticada.

#### Logout

**Endpoint:** `POST /api/auth/logout`

Encerra a sessão atual, revoga o registro de sessão correspondente e limpa o cookie de sessão.

Exemplo de resposta:

```json
{
  "success": true
}
```

A operação não exclui a conta do usuário nem os links associados a ela.

### 9.3. Links

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/links` | Cria um link. |
| `GET` | `/api/links` | Lista os links do proprietário atual. |
| `GET` | `/api/links/:code` | Consulta um link do proprietário. |
| `PATCH` | `/api/links/:code` | Atualiza as configurações de um link. |
| `DELETE` | `/api/links/:code` | Exclui logicamente um link. |
| `GET` | `/api/links/:code/preview` | Consulta a pré-visualização pública. |
| `POST` | `/api/links/:code/unlock` | Desbloqueia um link protegido por senha. |
| `GET` | `/s/:code` | Redireciona para o destino do link. |

As operações de gerenciamento utilizam o proprietário resolvido a partir da sessão autenticada ou da identidade anônima.

### 9.4. Estatísticas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/links/:code/stats` | Consulta as estatísticas de um link do proprietário. |
| `GET` | `/api/stats/top` | Lista os links do proprietário ordenados por cliques. |

O escopo de propriedade aplicado às estatísticas é o mesmo utilizado pelo gerenciamento de links.

### 9.5. Saúde da aplicação

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health/live` | Verifica se a aplicação está respondendo. |
| `GET` | `/health/ready` | Verifica se a aplicação e o banco estão disponíveis. |

### 9.6. Rota raiz

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api` | Retorna a resposta padrão da aplicação. |

### 9.7. Criar um link

**Endpoint:** `POST /api/links`

Exemplo:

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

A resposta contém o código e a URL curta.

### 9.8. Listar links

**Endpoint:** `GET /api/links`

Retorna os links associados ao proprietário atual, excluindo links com status `DELETED`.

Os resultados são ordenados por data de criação, do mais recente para o mais antigo.

O proprietário é resolvido da seguinte maneira:

- Se houver uma sessão válida, utiliza o identificador do usuário autenticado.
- Caso contrário, utiliza a identidade anônima resolvida pelo middleware.

### 9.9. Consultar um link

**Endpoint:** `GET /api/links/:code`

Retorna os detalhes de um link pertencente ao proprietário atual.

Se o link não existir, estiver excluído ou pertencer a outro proprietário, a API retorna `404 Not Found`.

### 9.10. Atualizar um link

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

Todos os campos são opcionais. O exemplo atualiza o destino, remove a expiração, ativa o modo de uso único e desativa o link.

O endpoint aceita `ACTIVE` ou `DISABLED` no campo `status`. A exclusão lógica é realizada por `DELETE`.

O slug e o proprietário não podem ser alterados por esse endpoint.

### 9.11. Excluir um link

**Endpoint:** `DELETE /api/links/:code`

A exclusão é lógica: o status do link passa a ser `DELETED`. O registro não é removido fisicamente do banco.

Em caso de sucesso, a API retorna `204 No Content`.

### 9.12. Pré-visualizar um link

**Endpoint:** `GET /api/links/:code/preview`

Retorna informações públicas sobre o link sem realizar o redirecionamento.

Exemplo para um link sem senha:

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

### 9.13. Desbloquear um link

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

### 9.14. Redirecionar

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

Comportamentos relevantes:

| Condição | Resultado |
|---|---|
| Link válido e disponível | `302 Found`. |
| Link inexistente ou excluído | `404 Not Found`. |
| Link desativado ou expirado | `410 Gone`. |
| Link protegido por senha, sem desbloqueio | `403 Forbidden`. |
| Link de uso único já consumido | `410 Gone`. |

O registro do clique é realizado de forma assíncrona e não deve impedir o redirecionamento caso ocorra uma falha ao salvar as estatísticas.

### 9.15. Consultar estatísticas de um link

**Endpoint:** `GET /api/links/:code/stats`

Exemplo de resposta:

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

### 9.16. Ranking de links

**Endpoint:** `GET /api/stats/top`

Parâmetro opcional:

| Parâmetro | Padrão | Limites |
|---|---:|---|
| `limit` | `10` | Mínimo `1`, máximo `50`. |

Exemplo:

```http
GET /api/stats/top?limit=5
```

Retorna uma lista de links do proprietário, ordenados pela quantidade de cliques em ordem decrescente.

O ranking considera a contagem de cliques para determinar a ordem. A resposta utiliza o DTO de links e pode não incluir a contagem de cada item.

### 9.17. Health checks

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

Verifica se a aplicação está respondendo, sem consultar o banco.

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

### 10.1. Autenticação Google

#### `GoogleLoginDto`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `idToken` | `string` | Sim | Token de identidade emitido pelo Google para o cliente OAuth configurado. |

A API valida o token antes de identificar o usuário e criar uma sessão.

Não envie o token de identidade do Google como substituto do cookie de sessão nas requisições subsequentes.

### 10.2. Usuário autenticado

O endpoint de sessão retorna um objeto `user` com os dados públicos definidos pelo contrato da API.

Os dados internos de autenticação, hashes de sessão e credenciais não devem ser expostos na resposta.

### 10.3. `CreateLinkDto`

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `url` | `string` | Sim | URL HTTP ou HTTPS válida, com protocolo explícito. |
| `customSlug` | `string` | Não | De 3 a 32 caracteres; letras, números, hífen e sublinhado. |
| `password` | `string` | Não | De 1 a 128 caracteres, sem aceitar conteúdo exclusivamente em branco. |
| `expiresAt` | `string` ou `null` | Não | Data ISO; a data definida deve ser futura. |
| `singleUse` | `boolean` | Não | Indica se o link pode ser utilizado apenas uma vez. |

O limite efetivo de senha para operações criptográficas é de 72 bytes em UTF-8, devido à limitação do bcrypt.

Quando `singleUse` não é informado, o valor padrão é `false`.

### 10.4. `UpdateLinkDto`

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `url` | `string` | Não | URL HTTP ou HTTPS válida. |
| `expiresAt` | `string` ou `null` | Não | Data ISO futura ou `null` para remover a expiração. |
| `singleUse` | `boolean` | Não | Atualiza a configuração de uso único. |
| `status` | `string` | Não | Aceita `ACTIVE` ou `DISABLED`. |

O DTO não permite alterar o slug nem o proprietário.

### 10.5. `LinkResponseDto`

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

O DTO não deve expor o hash da senha nem os identificadores internos de propriedade.

### 10.6. `LinkPreviewDto`

Contém:

- `code`
- `originalUrl`
- `requiresPassword`
- `expiresAt`
- `isSingleUse`

O destino é ocultado quando o link exige senha.

### 10.7. `UnlockLinkDto`

Recebe o campo `password`, com comprimento permitido pelo DTO entre 1 e 128 caracteres. O serviço aplica também o limite efetivo do bcrypt.

### 10.8. `ClickStatsDto`

Contém:

- `code`: código do link.
- `total`: total de cliques registrados.
- `dailyClicks`: lista de agrupamentos diários.

Cada elemento de `dailyClicks` contém:

- `day`: data no formato `YYYY-MM-DD`, em UTC.
- `count`: quantidade de cliques registrados naquele dia.

### 10.9. Validação global

A API utiliza `ValidationPipe` com opções como:

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

Cada link está associado a um usuário autenticado ou a uma identidade anônima.

O resolvedor de proprietário verifica a sessão de autenticação. Quando existe uma sessão válida, utiliza o identificador do usuário. Na ausência de sessão, utiliza a identidade anônima resolvida pelo middleware.

As operações de gerenciamento e estatísticas utilizam essa resolução para limitar o acesso aos recursos pertencentes ao proprietário atual.

A consulta de um link que pertence a outro proprietário retorna `404 Not Found`, evitando disponibilizar seus dados por meio das operações administrativas.

### 11.3. Migração de links anônimos

Quando um visitante autentica uma conta Google, os links associados à identidade anônima podem ser transferidos para o usuário autenticado.

O objetivo é preservar os links criados antes do login, evitando que o usuário perca o acesso ao próprio conteúdo ao entrar na conta.

A migração não equivale à transferência de links de outro usuário autenticado. A propriedade deve ser preservada e validada pelas regras do serviço.

### 11.4. Senhas

As senhas dos links são armazenadas como hashes bcrypt, nunca como texto puro.

A validação acontece antes da liberação do destino. O serviço também verifica o estado do link e a validade de sua expiração.

Quando o link está protegido, o endpoint de redirecionamento direto não libera o destino: é necessário utilizar o endpoint de desbloqueio.

### 11.5. Expiração

Uma expiração deve representar uma data futura no momento da criação ou atualização.

A expiração pode ser removida durante uma atualização:

```json
{
  "expiresAt": null
}
```

Links expirados não podem ser utilizados para redirecionamento ou desbloqueio. A expiração é uma condição de disponibilidade separada do status persistido.

### 11.6. Uso único

O campo `isSingleUse` habilita o consumo único. O campo `usedAt` registra quando o link foi consumido.

O serviço utiliza uma atualização condicional atômica para impedir que duas requisições concorrentes consumam o mesmo link com sucesso.

Quando duas requisições tentam consumir simultaneamente o mesmo link, apenas uma pode concluir a operação. A outra recebe `410 Gone`.

### 11.7. Exclusão lógica

A exclusão altera o status para `DELETED`, preservando o registro no banco.

Links excluídos:

- Não aparecem na listagem normal.
- Não podem ser consultados pelo CRUD.
- Não podem ser redirecionados.
- Não disponibilizam estatísticas pelo endpoint do proprietário.

A exclusão lógica preserva o histórico de cliques associado ao link.

### 11.8. Desativação

O status `DISABLED` impede a utilização do link sem removê-lo do cadastro.

Um link pode voltar a ficar disponível mediante atualização do status para `ACTIVE`, desde que não esteja expirado, excluído ou consumido, conforme suas configurações.

## 12. Autenticação, sessões e identidade anônima

### 12.1. Autenticação com Google

A autenticação utiliza o token de identidade do Google.

O fluxo é:

1. O frontend obtém um token de identidade do Google.
2. O frontend envia o token para `POST /api/auth/google`.
3. A API valida a assinatura e as informações do token, incluindo sua correspondência com o cliente OAuth configurado.
4. A API identifica a conta pelo identificador Google.
5. Caso necessário, cria o usuário.
6. A API cria uma sessão persistida e envia o cookie de sessão.
7. As requisições seguintes utilizam o cookie para identificar o usuário autenticado.

A API não deve confiar apenas nos dados de nome ou e-mail enviados pelo cliente. A identidade precisa ser validada a partir do token recebido do Google.

### 12.2. Cookie de sessão

O cookie de autenticação utilizado pela aplicação é:

```text
sircurty_session
```

A sessão é persistida no banco de dados. O cookie contém um token aleatório, enquanto a implementação armazena o hash do token para permitir a validação e a revogação da sessão.

O cookie é configurado para proteger o token de sessão, incluindo a propriedade `HttpOnly`. As propriedades de segurança relacionadas a HTTPS e `SameSite` devem permanecer alinhadas à configuração da aplicação e ao ambiente de implantação.

O token de sessão não deve ser armazenado no corpo JSON da resposta nem disponibilizado ao JavaScript do navegador.

### 12.3. Consultar e encerrar uma sessão

O endpoint `GET /api/auth/me` permite verificar a sessão atual.

O endpoint `POST /api/auth/logout` revoga a sessão atual e limpa o cookie correspondente.

A revogação no servidor é importante: apagar o cookie no navegador, isoladamente, não invalida um token que ainda pudesse ser apresentado.

### 12.4. Cookie de identidade anônima

A API também utiliza o cookie:

```text
sircurty_anon_id
```

Quando necessário, o middleware gera um identificador aleatório de 32 bytes e o representa em hexadecimal, produzindo 64 caracteres.

O valor armazenado no banco é o hash SHA-256 do identificador, não o valor bruto do cookie.

O cookie de identidade anônima possui as seguintes propriedades gerais:

| Propriedade | Configuração |
|---|---|
| `Path` | `/` |
| `HttpOnly` | `true` |
| `Max-Age` | `31536000` segundos |
| `SameSite` | Depende da configuração de segurança e do ambiente. |
| `Secure` | Ativado em conexões HTTPS reconhecidas pelo middleware. |

A identidade é resolvida automaticamente nas requisições, inclusive nas rotas públicas.

### 12.5. Resolução de proprietário

O componente `link-owner.ts` centraliza a resolução da identidade responsável por um link.

O comportamento é:

1. Verificar a presença do cookie de sessão.
2. Validar a sessão quando o cookie estiver presente.
3. Se a sessão for válida, resolver o proprietário pelo identificador do usuário.
4. Na ausência de sessão, utilizar o identificador anônimo resolvido pelo middleware.
5. Se nenhuma identidade puder ser resolvida, rejeitar a operação que exige proprietário.

Esse mecanismo evita duplicar a lógica de propriedade nos controllers e serviços de links e estatísticas.

### 12.6. CORS e cookies

A origem permitida é configurada por `ALLOWED_ORIGINS`, que aceita uma lista separada por vírgulas.

A configuração de CORS deve permitir credenciais para as origens autorizadas e os métodos utilizados pela aplicação.

Como a autenticação e a identidade anônima dependem de cookies, o cliente web deve estar configurado para enviar e receber credenciais.

Em clientes baseados em `fetch`, isso normalmente exige:

```typescript
credentials: "include"
```

Em ambientes HTTPS e entre origens diferentes, a política de cookies, CORS e a configuração de proxies deve ser compatível com a topologia real.

### 12.7. Limites da identidade anônima

A identidade anônima depende do cookie armazenado no navegador. A perda desse cookie pode impedir o acesso aos links associados à identidade anterior.

O login permite associar os links anônimos à conta autenticada conforme as regras de migração da aplicação.

## 13. Segurança dos links

### 13.1. Cabeçalhos HTTP

A API utiliza Helmet para definir cabeçalhos relacionados à segurança HTTP.

### 13.2. Confiança em proxies

`TRUST_PROXY` controla a confiança nas informações encaminhadas por proxies. O padrão recomendado é manter a confiança desabilitada até que a topologia do ambiente seja conhecida.

Em ambientes com proxy reverso, configure essa variável de acordo com a infraestrutura real.

### 13.3. Senhas e limites

As senhas dos links são armazenadas em hash bcrypt. O limite efetivo de 72 bytes em UTF-8 deve ser considerado, pois uma senha pode passar pela validação de comprimento do DTO e ainda ser rejeitada pelo limite criptográfico.

### 13.4. Limites de segurança

O código aleatório reduz a previsibilidade, mas não substitui os controles de autorização.

Links protegidos por senha oferecem uma barreira adicional ao destino, mas não devem ser utilizados como substituto de autenticação e autorização em aplicações que exigem controle de acesso rigoroso.

A aplicação deve ser avaliada quanto à necessidade de rate limiting para tentativas de descoberta de slugs, login e desbloqueio de senhas, conforme os controles efetivamente habilitados na implantação.

## 14. Registro de cliques e estatísticas

### 14.1. Registro

Os cliques são persistidos na tabela `Click`.

O registro pode incluir:

- Identificador do link.
- Data e hora do acesso.
- Hash SHA-256 do endereço IP, quando disponível.
- User-Agent.
- Referer.

O User-Agent é limitado a 512 caracteres e o Referer a 2.048 caracteres.

Os campos de localização e identificação de bots não devem ser considerados preenchidos automaticamente sem uma implementação específica.

### 14.2. Quando os cliques são registrados

O redirecionamento público registra o acesso de forma assíncrona. Se o registro falhar, a aplicação registra o erro sem alterar o redirecionamento já autorizado.

No fluxo de desbloqueio, o clique é registrado somente após a validação bem-sucedida da senha.

Tentativas malsucedidas de desbloqueio não são contabilizadas como cliques de destino.

### 14.3. Estatísticas por proprietário

O endpoint `GET /api/links/:code/stats` consulta os cliques de um link pertencente ao proprietário atual.

O endpoint `GET /api/stats/top` lista os links do mesmo proprietário, ordenados pela quantidade de acessos.

A resolução de proprietário considera tanto usuários autenticados quanto identidades anônimas.

### 14.4. Agregação diária

As estatísticas agrupam os cliques por dia utilizando o calendário UTC.

Isso evita que a mesma data seja interpretada de maneira diferente conforme o fuso horário do servidor ou do cliente.

### 14.5. Analytics e monitoramento

As estatísticas de cliques são dados funcionais do produto e são persistidas no PostgreSQL.

Elas não devem ser confundidas com métricas operacionais de infraestrutura, como disponibilidade, uso de CPU, latência e erros de serviço.

## 15. Tratamento de erros

O filtro global `HttpExceptionFilter` padroniza as respostas de erro.

Exemplo:

```json
{
  "statusCode": 404,
  "message": "Link not found",
  "timestamp": "2026-10-17T02:00:00.000Z",
  "path": "/api/links/meu-artigo"
}
```

Os valores são ilustrativos.

### 15.1. Mapeamento de erros Prisma

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

Exceções HTTP geradas pela aplicação mantêm seus status e suas mensagens conforme o filtro.

Erros internos inesperados não devem expor mensagens técnicas ao cliente.

### 15.2. Códigos HTTP frequentes

| Código | Significado |
|---|---|
| `200 OK` | Operação concluída. |
| `201 Created` | Link criado. |
| `204 No Content` | Exclusão lógica concluída. |
| `302 Found` | Redirecionamento. |
| `400 Bad Request` | Dados inválidos ou operação incompatível com as regras. |
| `401 Unauthorized` | Identidade não resolvida ou autenticação inválida. |
| `403 Forbidden` | Operação proibida, como tentativa de acessar diretamente um link protegido. |
| `404 Not Found` | Recurso inexistente, excluído ou fora do escopo do proprietário. |
| `409 Conflict` | Conflito de unicidade, como slug personalizado ocupado. |
| `410 Gone` | Link desativado, expirado ou já consumido. |
| `422 Unprocessable Entity` | Referência a recurso relacionado inválido. |
| `500 Internal Server Error` | Falha interna inesperada. |
| `503 Service Unavailable` | Serviço indisponível, incluindo falha de conectividade com o banco. |

O status e a mensagem exatos dependem do endpoint e da exceção gerada. A resposta padronizada inclui `statusCode`, `message`, `timestamp` e `path`.

## 16. Testes e qualidade

### 16.1. Testes unitários

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

Os testes unitários devem cobrir as regras de negócio de links, geração de slugs, registro e agregação de cliques, controllers, autenticação e tratamento de exceções, conforme os testes existentes.

### 16.2. Testes E2E

Os testes E2E são executados por:

```bash
npm run test:e2e
```

A configuração utiliza um banco de testes dedicado. Confirme o nome do banco e as variáveis exigidas pelo script antes da execução.

Para executar sequencialmente:

```bash
npm run test:e2e -- --runInBand
```

Os testes que exercitam operações com banco devem utilizar um ambiente isolado, preparado pelas migrações necessárias.

**Nunca configure os testes para apontar para um banco com dados importantes.**

### 16.3. ESLint

Para verificar o código sem aplicar correções automáticas:

```bash
npx eslint src test
```

### 16.4. Prettier

Para verificar a formatação sem modificar arquivos:

```bash
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

Para aplicar a formatação configurada:

```bash
npm run format
```

### 16.5. Build

Para validar a compilação:

```bash
npm run build
```

A compilação de produção utiliza `tsconfig.build.json`, excluindo testes e arquivos de especificação conforme a configuração do projeto.

## 17. Considerações operacionais

### 17.1. Persistência

Os dados funcionais da aplicação são armazenados no PostgreSQL. O Docker Compose utiliza volumes persistentes para os dados do banco e do pgAdmin.

Mantenha uma estratégia de backup adequada para ambientes importantes.

### 17.2. Migrações em produção

As migrações devem ser versionadas e aplicadas de forma controlada durante a implantação.

O comando `prisma:migrate:deploy` aplica as migrações existentes. Ele não substitui a preparação das variáveis de ambiente, a disponibilidade do banco ou a validação de compatibilidade da versão implantada.

### 17.3. Sessões

As sessões são persistidas no banco e associadas a um cookie de autenticação.

O logout deve revogar a sessão no servidor, além de limpar o cookie no cliente. A política de expiração e as configurações de segurança devem permanecer consistentes entre o backend e o frontend.

### 17.4. Identidade anônima

O gerenciamento de links anônimos depende do cookie `sircurty_anon_id`. A perda desse cookie pode impedir a recuperação dos links que não tenham sido associados a uma conta.

O fluxo de autenticação Google permite que os links anônimos sejam associados ao usuário autenticado de acordo com as regras de migração implementadas.

### 17.5. Disponibilidade

Os health checks permitem distinguir a disponibilidade básica do processo da disponibilidade do banco:

- `/health/live`: verifica se a aplicação responde.
- `/health/ready`: verifica a conectividade com o banco.

Esses endpoints podem ser utilizados em verificações operacionais e na orquestração, conforme a infraestrutura adotada.

### 17.6. Escopo atual

A API implementa autenticação Google com sessões persistidas, gerenciamento de links para usuários autenticados e visitantes anônimos, proteção por senha, expiração, uso único, redirecionamento e estatísticas de cliques.

O comportamento efetivo de cada endpoint deve permanecer alinhado aos controllers, DTOs, serviços, configurações e migrações presentes na versão implantada.

---

**Sir Curty API** — serviço de encurtamento de URLs com autenticação, gerenciamento de links e estatísticas de acesso.