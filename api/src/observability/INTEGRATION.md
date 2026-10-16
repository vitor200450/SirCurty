# Integração OTel na API — Guia rápido

## 1. Instalar as dependências

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/api \
  @opentelemetry/core \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/auto-instrumentations-node
```

## 2. Importar o tracing no main.ts

A linha de import **deve ser a primeira** do arquivo, antes de qualquer outro import:

```typescript
// api/src/main.ts
import './observability/tracing';   // <-- LINHA 1 — não mover!

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}
bootstrap();
```

## 3. Registrar o ObservabilityModule no AppModule

```typescript
// api/src/app.module.ts
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ObservabilityModule,   // registra TracingService globalmente
    // ... outros módulos
  ],
})
export class AppModule {}
```

## 4. Usar o TracingService nos serviços de domínio

### Enriquecer o span raiz com atributos de negócio

```typescript
// api/src/modules/links/links.service.ts
import { TracingService } from '../observability/tracing.service';

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracing: TracingService,
  ) {}

  async findByCode(code: string) {
    // Adiciona o código do link ao span HTTP que auto-instrumentação já criou
    this.tracing.setCurrentSpanAttributes({ 'link.code': code });
    return this.prisma.link.findUnique({ where: { code } });
  }

  async createLink(dto: CreateLinkDto) {
    // Span filho nomeado — aparece no waterfall do Grafana
    return this.tracing.withSpan('links.create', async (span) => {
      const link = await this.prisma.link.create({ data: { ...dto } });
      span.setAttributes({
        'link.code': link.code,
        'link.target_domain': new URL(link.originalUrl).hostname,
        'link.vanity': !!link.slug,
      });
      return link;
    });
  }

  async redirectByCode(code: string) {
    return this.tracing.withSpan('links.redirect', async (span) => {
      const link = await this.prisma.link.findUnique({ where: { code } });
      span.setAttributes({
        'link.code': code,
        'link.found': !!link,
        'link.expired': link ? isExpired(link) : false,
      });
      return link;
    });
  }
}
```

### Registrar erros no span (exception filter)

```typescript
// api/src/common/filters/all-exceptions.filter.ts
import { TracingService } from '../../observability/tracing.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly tracing: TracingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof Error) {
      this.tracing.recordError(exception);
    }
    // ... resposta HTTP normal
  }
}
```

## 5. Variáveis de ambiente (ConfigMap do K8s)

| Variável | Valor em dev | Descrição |
|---|---|---|
| `OTEL_SERVICE_NAME` | `sircurty-api` | Aparece como label no Grafana |
| `OTEL_SERVICE_VERSION` | `<git-sha>` | Injetado pelo CI no build |
| `OTEL_DEPLOYMENT_ENV` | `dev` | Separar ambientes no Grafana |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector.observability.svc.cluster.local:4317` | Endereço do collector dentro do cluster |

## 6. O que você ganha automaticamente (sem nenhum código extra)

- Span para cada requisição HTTP recebida pelo NestJS/Express
- Span filho para cada query ao PostgreSQL via `pg` driver (incluindo o SQL)
- Propagação automática do `traceparent` recebido do browser → aparece como span pai
- Trace completo: **Browser → API → PostgreSQL** visível no waterfall do Grafana
