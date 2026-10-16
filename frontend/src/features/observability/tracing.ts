/**
 * OpenTelemetry bootstrap for the Sir Curty browser SDK.
 *
 * USAGE: import this file once, as early as possible in main.tsx:
 *
 *   import './features/observability/tracing';   // <-- before React, before anything
 *   import React from 'react';
 *   import ReactDOM from 'react-dom/client';
 *   ...
 *
 * The SDK reads OTEL_ENDPOINT from window.__APP_CONFIG__ (injected at
 * container startup by docker-entrypoint.sh from the K8s ConfigMap).
 * Falls back to VITE_OTEL_ENDPOINT for local `vite dev` runs.
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { CompositePropagator } from '@opentelemetry/core';
import { context, propagation, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';

// ---------------------------------------------------------------------------
// Runtime configuration — reads from ConfigMap-injected window.__APP_CONFIG__
// with Vite env var as fallback for local dev
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_URL?: string;
      APP_ENV?: string;
      APP_BASE_URL?: string;
      OTEL_ENDPOINT?: string;
    };
  }
}

const cfg = window.__APP_CONFIG__ ?? {};
const OTEL_ENDPOINT =
  cfg.OTEL_ENDPOINT ||
  import.meta.env.VITE_OTEL_ENDPOINT ||
  'http://otel.sircurty.local';

const SERVICE_NAME = 'sircurty-frontend';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';
const DEPLOYMENT_ENV = cfg.APP_ENV ?? import.meta.env.VITE_APP_ENV ?? 'dev';

// ---------------------------------------------------------------------------
// Provider setup
// ---------------------------------------------------------------------------
const exporter = new OTLPTraceExporter({
  // Full URL to the collector's OTLP/HTTP endpoint (exposed via Ingress with CORS)
  url: `${OTEL_ENDPOINT}/v1/traces`,
});

const provider = new WebTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENV,
  }),
  spanProcessors: [
    new BatchSpanProcessor(exporter, {
      maxQueueSize: 256,
      scheduledDelayMillis: 2000,
    }),
  ],
});

// ZoneContextManager preserves async context across Promise chains / event handlers
provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  }),
});

// ---------------------------------------------------------------------------
// Auto-instrumentations
// ---------------------------------------------------------------------------
registerInstrumentations({
  instrumentations: [
    // Instruments document load: navigation timing, resource timing
    new DocumentLoadInstrumentation(),

    // Instruments fetch() calls — automatically injects traceparent header
    // so every API call carries the browser trace context into the API.
    // This is the key link in: Browser span → API span → PostgreSQL span.
    new FetchInstrumentation({
      // Only propagate headers to our own API to avoid leaking trace context
      // to third-party origins (QR code libs, Google Fonts, etc.)
      propagateTraceHeaderCorsUrls: [
        // Matches both /api/* on same origin and the explicit API_URL
        new RegExp(`^${cfg.API_URL ?? '/api'}`),
        /^https?:\/\/sircurty\.local/,
      ],
      // Clear timing resources after each span to avoid memory growth
      clearTimingResources: true,
    }),

    // Instruments click events — creates spans for user interactions
    // (optional; comment out if too noisy)
    new UserInteractionInstrumentation({
      eventNames: ['click'],
    }),
  ],
});

// Export the tracer so useOtelSpan and other modules can create custom spans
export const tracer = trace.getTracer(SERVICE_NAME);
export { context, propagation };
