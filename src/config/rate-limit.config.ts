export const rateLimitConfig = () => ({
  // Global rate limiting
  global: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'), // 1 minute
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },

  // Auth endpoints (login, register, password reset)
  auth: {
    ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '900000'), // 15 minutes
    limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  },

  // API key users
  apiKey: {
    ttl: parseInt(process.env.API_KEY_RATE_LIMIT_TTL || '3600000'), // 1 hour
    limit: parseInt(process.env.API_KEY_RATE_LIMIT_MAX || '1000'),
  },

  // WebSocket events
  websocket: {
    ttl: parseInt(process.env.WS_RATE_LIMIT_TTL || '60000'), // 1 minute
    limit: parseInt(process.env.WS_RATE_LIMIT_MAX || '100'),
  },

  // IP-based DDoS protection
  ip: {
    ttl: parseInt(process.env.IP_RATE_LIMIT_TTL || '60000'), // 1 minute
    limit: parseInt(process.env.IP_RATE_LIMIT_MAX || '1000'),
  },

  // Storage configuration
  storage: {
    type: process.env.RATE_LIMIT_STORAGE || 'redis', // 'redis' or 'memory'
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      clusterNodes: process.env.REDIS_CLUSTER_NODES,
      tls: process.env.REDIS_TLS === 'true',
    },
  },

  // Circuit breaker
  circuitBreaker: {
    enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
    recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '30000'),
  },
});
