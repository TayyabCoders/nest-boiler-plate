import { z } from 'zod';



export const envSchema = z.object({

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DB_HOST: z.string().default('localhost'),

  DB_PORT: z.coerce.number().default(5432),

  DB_USERNAME: z.string(),

  DB_PASSWORD: z.string(),

  DB_NAME: z.string(),

  DB_SYNC: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  DB_LOGGING: z.enum(['true', 'false']).default('false'),

  DB_SSL: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  PORT: z.coerce.number().default(3000),

  APP_MODE: z.enum(['HTTP', 'MICROSERVICE', 'HYBRID']).default('HTTP'),

  

  // Logging Config

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  LOG_REDACT_ENABLED: z.preprocess((val) => val === 'true', z.boolean()).default(true),

  LOG_REQUEST_ENABLED: z.preprocess((val) => val === 'true', z.boolean()).default(true),

  LOG_SLOW_REQUEST_THRESHOLD: z.coerce.number().default(1000),

  

  // JWT Config

  JWT_SECRET: z.string(),

  JWT_EXPIRATION: z.string().default('1d'),



  // Microservice Config

  MS_HOST: z.string().default('0.0.0.0'),

  MS_PORT: z.coerce.number().default(3001),



  // Mail Config

  MAIL_TRANSPORT: z.enum(['SMTP', 'AZURE']).default('SMTP'),

  SMTP_HOST: z.string().optional(),

  SMTP_PORT: z.coerce.number().optional(),

  SMTP_USER: z.string().optional(),

  SMTP_PASS: z.string().optional(),

  SMTP_FROM: z.string().optional(),

  SMTP_SECURE: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  AZURE_EMAIL_CONNECTION_STRING: z.string().optional(),

  AZURE_EMAIL_SENDER: z.string().optional(),



  // Redis Config (for Cache)

  REDIS_HOST: z.string().default('localhost'),

  REDIS_PORT: z.coerce.number().default(6379),

  REDIS_PASSWORD: z.string().optional(),

  REDIS_TLS: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  REDIS_CACHE_TTL: z.coerce.number().default(600), // Default 10 minutes

  REDIS_CLUSTER_NODES: z.string().optional(), // Comma-separated: "host1:port1,host2:port2"

  REDIS_PREFIX: z.string().default('default'), // Key prefix for namespace isolation



  // RabbitMQ Config

  RABBITMQ_URL: z.string().default('amqp://localhost'),

  RABBITMQ_PREFETCH: z.coerce.number().default(1),

  RABBITMQ_MESSAGE_TTL: z.coerce.number().default(3600000), // 1 hour



  // Rate Limiting Config

  RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute

  RATE_LIMIT_MAX: z.coerce.number().default(100),

  AUTH_RATE_LIMIT_TTL: z.coerce.number().default(900000), // 15 minutes

  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),

  API_KEY_RATE_LIMIT_TTL: z.coerce.number().default(3600000), // 1 hour

  API_KEY_RATE_LIMIT_MAX: z.coerce.number().default(1000),

  WS_RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute

  WS_RATE_LIMIT_MAX: z.coerce.number().default(100),

  IP_RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute

  IP_RATE_LIMIT_MAX: z.coerce.number().default(1000),

  RATE_LIMIT_STORAGE: z.enum(['redis', 'memory']).default('redis'),

  CIRCUIT_BREAKER_ENABLED: z.preprocess((val) => val === 'true', z.boolean()).default(true),

  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().default(5),

  CIRCUIT_BREAKER_RECOVERY_TIMEOUT: z.coerce.number().default(30000),

});