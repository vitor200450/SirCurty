import { Injectable } from '@nestjs/common';
import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  Attributes,
  Span,
} from '@opentelemetry/api';

const TRACER_NAME = 'sircurty-api';

/**
 * TracingService — thin wrapper around the OTel API for manual spans.
 *
 * Auto-instrumentation already covers:
 *   - Every incoming HTTP request  → root span
 *   - Every outgoing HTTP call     → child span
 *   - Every PostgreSQL query       → child span (via @opentelemetry/instrumentation-pg)
 *
 * Use this service when you need to add semantic attributes to the current
 * span, or wrap a specific business operation in its own named span.
 *
 * Example (LinksService):
 *   constructor(private readonly tracing: TracingService) {}
 *
 *   async createLink(dto: CreateLinkDto) {
 *     return this.tracing.withSpan('links.create', async (span) => {
 *       span.setAttributes({
 *         'link.code': generatedCode,
 *         'link.target_domain': new URL(dto.url).hostname,
 *         'link.vanity': !!dto.slug,
 *       });
 *       // ... actual logic
 *     });
 *   }
 */
@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer(TRACER_NAME);

  /**
   * Wraps `fn` in a named child span.
   * Sets span status to ERROR automatically on exception and re-throws.
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Attributes,
    kind: SpanKind = SpanKind.INTERNAL,
  ): Promise<T> {
    const span = this.tracer.startSpan(name, { kind, attributes });
    return context.with(trace.setSpan(context.active(), span), async () => {
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
    });
  }

  /**
   * Adds attributes to the currently active span (the one auto-instrumentation
   * created for this HTTP request). Useful for enriching the root span with
   * business context without creating a new child span.
   *
   * Example:
   *   this.tracing.setCurrentSpanAttributes({ 'link.code': code });
   */
  setCurrentSpanAttributes(attributes: Attributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Marks the current span as an error.
   * Useful in exception filters to flag spans before they close.
   */
  recordError(err: Error): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    }
  }
}
