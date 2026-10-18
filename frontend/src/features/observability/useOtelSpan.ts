import { useCallback } from 'react';
import { SpanStatusCode, SpanKind, Attributes } from '@opentelemetry/api';
import { tracer } from './tracing';

/**
 * useOtelSpan — React hook for manual OTel spans in the browser.
 *
 * Returns a `withSpan` function that wraps any async operation in a named
 * span, sets status automatically, and records exceptions on error.
 *
 * The span is automatically a child of the current active context, so
 * if a FetchInstrumentation span is already active, this will nest inside it.
 *
 * ---
 * USAGE EXAMPLES
 * ---
 *
 * 1. Criação de link (LinkForm component):
 *
 *   const { withSpan } = useOtelSpan();
 *
 *   const handleSubmit = async (data: CreateLinkInput) => {
 *     await withSpan('links.create.browser', async (span) => {
 *       span.setAttributes({
 *         'link.target_url': data.url,
 *         'link.vanity': !!data.slug,
 *         'link.has_password': !!data.password,
 *         'link.has_expiry': !!data.expiresAt,
 *       });
 *       await createLink(data);   // React Query mutation — fetch() is auto-instrumented
 *     });
 *   };
 *
 * 2. Clique no botão de redirect no interstitial (/s/:code):
 *
 *   const { withSpan } = useOtelSpan();
 *
 *   const handleRedirect = async () => {
 *     await withSpan('links.redirect.browser', async (span) => {
 *       span.setAttributes({
 *         'link.code': code,
 *         'link.interstitial': true,
 *       });
 *       window.location.href = targetUrl;
 *     });
 *   };
 *
 * 3. Carregamento de preview no interstitial (fetch para /api/links/:code/preview):
 *   The FetchInstrumentation already handles this automatically —
 *   no manual span needed.
 */
export function useOtelSpan() {
  const withSpan = useCallback(
    async <T>(
      name: string,
      fn: (span: ReturnType<typeof tracer.startSpan>) => Promise<T>,
      attributes?: Attributes,
      kind: SpanKind = SpanKind.CLIENT,
    ): Promise<T> => {
      const span = tracer.startSpan(name, { kind, attributes });
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: unknown) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        if (err instanceof Error) {
          span.recordException(err);
        }
        throw err;
      } finally {
        span.end();
      }
    },
    [],
  );

  return { withSpan };
}
