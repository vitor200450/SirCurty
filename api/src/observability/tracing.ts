/**
 * OpenTelemetry bootstrap for the Sir Curty API.
 *
 * CRITICAL: this file MUST be imported as the very first line of main.ts,
 * before any NestJS or Node module is loaded. The OTel SDK patches Node's
 * module loader at require-time; importing it late means HTTP/pg spans are
 * missed entirely.
 *
 * Usage in main.ts:
 *   import './observability/tracing';   // <-- line 1, nothing before this
 *   import { NestFactory } from '@nestjs/core';
 *   ...
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { CompositePropagator } from '@opentelemetry/core';

// ---------------------------------------------------------------------------
// Configuration — all values fall back to safe defaults for local dev
// ---------------------------------------------------------------------------
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'sircurty-api';
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION ?? 'dev';
const DEPLOYMENT_ENV = process.env.OTEL_DEPLOYMENT_ENV ?? 'dev';
const COLLECTOR_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
  'http://otel-collector.observability.svc.cluster.local:4317';

// ---------------------------------------------------------------------------
// SDK setup
// ---------------------------------------------------------------------------
const exporter = new OTLPTraceExporter({
  url: COLLECTOR_ENDPOINT,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENV,
  }),

  // Batch spans before sending — reduces network overhead
  spanProcessor: new BatchSpanProcessor(exporter, {
    maxQueueSize: 512,
    scheduledDelayMillis: 2000,
  }),

  // Auto-instruments: HTTP (incoming + outgoing), Express, pg, DNS, net…
  // pg driver spans automatically capture the SQL query and appear as
  // children of the API span, completing the FE → API → DB chain.
  instrumentations: [
    getNodeAutoInstrumentations({
      // Reduce noise: disable fs instrumentation (very chatty with NestJS DI)
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Keep HTTP instrumentation but filter out health check endpoints
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          const url = req.url ?? '';
          return url.startsWith('/health');
        },
      },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
    }),
  ],

  // W3C traceparent/tracestate — matches what the browser SDK sends
  textMapPropagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  }),
});

// ---------------------------------------------------------------------------
// Start — synchronous so it finishes before any require() that follows
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  sdk.start();
}

/**
 * Flush pending spans and shut down the OpenTelemetry SDK.
 * Called by NestJS during graceful application shutdown.
 */
export async function shutdownTracing(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    await sdk.shutdown();
    console.log('[otel] SDK shut down successfully');
  } catch (err: unknown) {
    console.error('[otel] Error shutting down SDK', err);
  }
}
