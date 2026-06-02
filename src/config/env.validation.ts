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
  SECONDARY_LOGGING: z.enum(['NONE', 'MIXPANEL', 'GA']).default('NONE'),
  MIXPANEL_TOKEN: z.string().optional(),
  GA_TRACKING_ID: z.string().optional(),
  
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

  // RabbitMQ Config
  RABBITMQ_URL: z.string().default('amqp://localhost'),
  RABBITMQ_PREFETCH: z.coerce.number().default(1),
  RABBITMQ_MESSAGE_TTL: z.coerce.number().default(3600000), // 1 hour
})
.refine((data) => {
  if (data.SECONDARY_LOGGING === 'MIXPANEL' && !data.MIXPANEL_TOKEN) return false;
  return true;
}, {
  message: "MIXPANEL_TOKEN is required when SECONDARY_LOGGING is set to MIXPANEL",
  path: ["MIXPANEL_TOKEN"],
})
.refine((data) => {
  if (data.SECONDARY_LOGGING === 'GA' && !data.GA_TRACKING_ID) return false;
  return true;
}, {
  message: "GA_TRACKING_ID is required when SECONDARY_LOGGING is set to GA",
  path: ["GA_TRACKING_ID"],
});