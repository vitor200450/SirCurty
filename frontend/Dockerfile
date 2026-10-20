# React + Vite build served by Nginx. Runtime config (API_URL, OTEL_ENDPOINT, ...)
# is rendered into /env-config.js at startup by docker-entrypoint.sh.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /usr/local/bin/sircurty-entrypoint.sh
RUN chmod +x /usr/local/bin/sircurty-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/usr/local/bin/sircurty-entrypoint.sh"]
