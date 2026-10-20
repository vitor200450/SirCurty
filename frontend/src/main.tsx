// OpenTelemetry must be imported before any other module: the browser SDK
// patches global APIs (fetch, XHR) at require-time, so a late import misses
// every instrumented call. ZoneContextManager requires zone.js.
import "zone.js";
import "./features/observability/tracing";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./features/auth/AuthProvider";

import App from "./App";
import Preview from "./components/Preview";
import { BlockedLinkPage } from "./pages/BlockedLinkPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && /4\d\d/.test(error.message)) {
          return false;
        }

        return failureCount < 2;
      },
    },
  },
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado no HTML.");
}

createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider
      clientId={
        window.__APP_CONFIG__?.GOOGLE_CLIENT_ID ||
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        ""
      }
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/s/:code" element={<Preview />} />
              <Route path="/link-bloqueado" element={<BlockedLinkPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
