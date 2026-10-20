#!/bin/sh
set -e

# Gera /usr/share/nginx/html/env-config.js a partir de variáveis de ambiente
# (injetadas via ConfigMap/Secret no pod), com fallback seguro.
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${API_URL:-/api}",
  APP_ENV: "${APP_ENV:-production}",
  APP_BASE_URL: "${APP_BASE_URL:-}",
  OTEL_ENDPOINT: "${OTEL_ENDPOINT:-}",
  GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID:-}"
};
EOF

exec nginx -g 'daemon off;'
