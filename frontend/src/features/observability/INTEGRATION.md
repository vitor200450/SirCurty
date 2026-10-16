# Integração OTel no Frontend — Guia rápido (para o Alerandro)

## 1. Instalar as dependências

```bash
npm install \
  @opentelemetry/api \
  @opentelemetry/core \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-user-interaction \
  @opentelemetry/context-zone \
  zone.js
```

## 2. Importar o tracing no main.tsx

A linha de import **deve ser a primeira** do arquivo:

```tsx
// frontend/src/main.tsx
import './features/observability/tracing';   // <-- LINHA 1

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

## 3. Usar o hook useOtelSpan nos componentes

### Formulário de criação de link

```tsx
// frontend/src/features/links/components/LinkForm.tsx
import { useOtelSpan } from '../observability/useOtelSpan';
import { useMutation } from '@tanstack/react-query';

export function LinkForm() {
  const { withSpan } = useOtelSpan();
  const createMutation = useMutation({ mutationFn: createLink });

  const handleSubmit = async (data: CreateLinkInput) => {
    await withSpan('links.create.browser', async (span) => {
      span.setAttributes({
        'link.target_url': data.url,
        'link.vanity': !!data.slug,
        'link.has_password': !!data.password,
        'link.has_expiry': !!data.expiresAt,
      });
      await createMutation.mutateAsync(data);
      // A chamada fetch() dentro de createMutation é auto-instrumentada:
      // injeta traceparent → o span da API fica filho deste span do browser
    });
  };

  // ...
}
```

### Tela de interstitial (/s/:code)

```tsx
// frontend/src/routes/Preview.tsx  (ou similar)
import { useOtelSpan } from '../features/observability/useOtelSpan';

export function PreviewPage() {
  const { code } = useParams();
  const { withSpan } = useOtelSpan();

  const handleConfirmRedirect = async () => {
    await withSpan('links.redirect.browser', async (span) => {
      span.setAttributes({
        'link.code': code!,
        'link.interstitial': true,
      });
      window.location.href = targetUrl;
    });
  };

  // A chamada fetch() para GET /api/links/:code/preview já é instrumentada
  // automaticamente pelo FetchInstrumentation — sem código extra necessário.

  // ...
}
```

## 4. Variáveis de ambiente

### Em dev local (`vite dev`)

Criar `.env.local` (não commitar):

```env
VITE_OTEL_ENDPOINT=http://otel.sircurty.local
VITE_APP_ENV=dev
VITE_APP_VERSION=dev
```

### No cluster Kubernetes

O `OTEL_ENDPOINT` já é injetado automaticamente pelo `docker-entrypoint.sh`
a partir do ConfigMap do K8s — **não precisa de nada extra no frontend**.

O ConfigMap (`k8s/base/config/configmap.yaml`) deve ter:
```yaml
OTEL_ENDPOINT: "http://otel.sircurty.local"
```

## 5. Como verificar que está funcionando

1. Abrir o Grafana em `http://grafana.sircurty.local`
2. Ir em **Explore** → datasource **Tempo**
3. Buscar: `{ resource.service.name="sircurty-frontend" }`
4. Deve aparecer spans de `documentLoad`, `fetch`, `links.create.browser`, etc.
5. Clicar num span de fetch → ver o **trace completo** ligado ao span da API

## 6. Fluxo completo de propagação

```
Browser (useOtelSpan / FetchInstrumentation)
  └── traceparent header injetado no fetch()
        └── API NestJS (auto-instrumentação HTTP recebe o traceparent)
              └── span filho: links.create / links.redirect
                    └── span filho: SELECT/INSERT PostgreSQL (auto-instrumentação pg)
```

Todos aparecerão no mesmo trace no Grafana — waterfall de 3 camadas.
