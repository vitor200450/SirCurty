import Joi from 'joi';

/**
 * Joi schema for environment variable validation.
 * Only variables required for the current bootstrap are declared here.
 * Add new variables as features are implemented.
 *
 * Note: @nestjs/config merges the original process.env back after Joi
 * validation, so unknown variables (POSTGRES_USER, PGADMIN_*, etc.) remain
 * accessible via ConfigService and process.env regardless of allowUnknown.
 */
export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),

  // Database — mandatory, no default.
  // Accepts both postgresql:// and postgres:// schemes.
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // CORS — comma-separated list of allowed origins.
  // Example: "http://localhost:5173,http://sircurty.local"
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:5173'),

  // Public base URL used to build short links returned in API responses.
  // Must NOT have a trailing slash.
  // Example: "http://localhost:3000" (dev) or "https://sircurty.local" (k8s)
  APP_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  // Reverse-proxy trust configuration for Express.
  // Set to the number of trusted proxy hops in front of the API.
  // In Kubernetes with a single Nginx ingress, use "1".
  // Leave unset (defaults to "0") in local development without a proxy.
  // Accepted values: integer string ("0", "1", "2") or "false".
  // Reference: https://expressjs.com/en/guide/behind-proxies.html
  TRUST_PROXY: Joi.alternatives()
    .try(Joi.number().integer().min(0).max(10), Joi.string().valid('false'))
    .default(0),
}).options({ allowUnknown: true });
