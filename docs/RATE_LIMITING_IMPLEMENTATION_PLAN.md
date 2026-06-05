# Production-Grade Rate Limiting Implementation Plan

## Executive Summary

This document outlines a comprehensive implementation plan to add production-grade rate limiting to the NestJS boilerplate, matching and exceeding the capabilities of the Fastify boilerplate.

**Current State:**
- Fastify: Has rate limiting (HTTP + WebSocket) but with scalability issues
- NestJS: No rate limiting implemented

**Target State:**
- Production-grade rate limiting for both HTTP and WebSocket
- Redis-based distributed storage
- Multiple rate limit tiers
- Comprehensive monitoring and metrics
- High availability and fault tolerance

---

## 1. Architecture Overview

### 1.1 Technology Stack

**HTTP Rate Limiting:**
- Primary: `@nestjs/throttler` (official NestJS solution)
- Storage: Redis (via `@nestjs/throttler` with Redis adapter)
- Fallback: In-memory (for development/testing)

**WebSocket Rate Limiting:**
- Custom middleware with Redis storage
- Sliding window algorithm
- Per-user and per-socket tracking

### 1.2 Rate Limiting Strategy

**Multi-Tier Approach:**
1. **Global Rate Limit**: 100 requests/minute (configurable)
2. **Auth Rate Limit**: 5 requests/15 minutes (login, register, password reset)
3. **API Key Rate Limit**: 1000 requests/hour (for API key users)
4. **WebSocket Rate Limit**: 100 events/minute per connection
5. **IP-based Rate Limit**: 1000 requests/minute per IP (DDoS protection)

**Storage Strategy:**
- Redis for distributed systems (production)
- In-memory for single-instance (development)
- Automatic failover to in-memory if Redis unavailable

---

## 2. Implementation Phases

### Phase 1: Foundation Setup (Week 1)

**Objective:** Set up basic infrastructure and dependencies

#### Tasks:

1. **Install Dependencies**
   ```bash
   npm install @nestjs/throttler
   npm install @nestjs/throttler@latest
   npm install --save-dev @types/throttler
   ```

2. **Update Environment Configuration**
   - Add rate limiting environment variables to `.env.example`
   - Update `env.validation.ts` with rate limiting schema
   - Update `app.config.ts` with rate limiting configuration

3. **Create Rate Limiting Configuration Module**
   - Create `src/config/rate-limit.config.ts`
   - Define rate limit tiers and thresholds
   - Add Redis configuration for rate limit storage

4. **Update Cache Port Interface**
   - Add rate limiting specific methods to `ICacheProvider`
   - Add `incr`, `expire`, `ttl` methods for rate limiting

**Deliverables:**
- Updated environment configuration
- Rate limiting configuration module
- Updated cache port interface

**Acceptance Criteria:**
- All dependencies installed
- Configuration validates correctly
- Cache port has required methods

---

### Phase 2: HTTP Rate Limiting (Week 2)

**Objective:** Implement HTTP rate limiting with @nestjs/throttler

#### Tasks:

1. **Create Throttler Module**
   - Create `src/infrastructure/rate-limit/rate-limit.module.ts`
   - Configure Redis storage for throttler
   - Set up multiple throttlers for different tiers

2. **Implement Rate Limit Guard**
   - Create `src/common/guards/rate-limit.guard.ts`
   - Custom guard with enhanced error handling
   - Add rate limit headers to responses

3. **Add Global Rate Limiting**
   - Apply global throttler in `app.module.ts`
   - Configure default rate limit (100 req/min)
   - Add Redis storage configuration

4. **Implement Tiered Rate Limiting**
   - Create decorators for different tiers:
     - `@Throttle('auth')` for auth endpoints
     - `@Throttle('api-key')` for API key endpoints
     - `@Throttle('strict')` for sensitive operations
   - Configure each tier with specific limits

5. **Add Rate Limit Headers**
   - Implement interceptor to add headers:
     - `X-RateLimit-Limit`
     - `X-RateLimit-Remaining`
     - `X-RateLimit-Reset`
     - `Retry-After`

6. **Update Exception Filter**
   - Handle `ThrottlerException` in `AllExceptionsFilter`
   - Return proper 429 status with error details
   - Include retry-after header

**Deliverables:**
- Rate limit module with Redis storage
- Custom rate limit guard
- Tiered rate limit decorators
- Rate limit headers interceptor
- Updated exception filter

**Acceptance Criteria:**
- Global rate limiting works (100 req/min)
- Auth endpoints have stricter limits (5 req/15min)
- Rate limit headers present in responses
- 429 status returned when limit exceeded
- Redis storage working correctly

---

### Phase 3: WebSocket Rate Limiting (Week 3)

**Objective:** Implement WebSocket rate limiting with Redis

#### Tasks:

1. **Create WebSocket Rate Limit Middleware**
   - Create `src/infrastructure/websocket/rate-limit.middleware.ts`
   - Implement sliding window algorithm
   - Use Redis for distributed storage
   - Support per-user and per-socket tracking

2. **Integrate with Socket.io Gateway**
   - Apply middleware to all Socket.io gateways
   - Configure rate limit (100 events/min)
   - Add rate limit error handling

3. **Add WebSocket Rate Limit Events**
   - Emit rate limit warnings to clients
   - Provide rate limit status on connection
   - Implement backoff strategy

4. **Add WebSocket Metrics**
   - Track rate limit violations
   - Monitor WebSocket connection rates
   - Log rate limit events

**Deliverables:**
- WebSocket rate limit middleware
- Integrated with Socket.io gateways
- Rate limit events and warnings
- WebSocket metrics tracking

**Acceptance Criteria:**
- WebSocket connections rate limited
- Per-user tracking works
- Redis storage for WebSocket limits
- Rate limit warnings sent to clients
- Metrics collected

---

### Phase 4: Advanced Features (Week 4)

**Objective:** Add advanced production features

#### Tasks:

1. **IP-based Rate Limiting**
   - Implement IP-based rate limit for DDoS protection
   - Create whitelist for trusted IPs
   - Create blacklist for abusive IPs
   - Add automatic IP blocking for repeated violations

2. **Circuit Breaker Pattern**
   - Implement circuit breaker for Redis failures
   - Failover to in-memory storage
   - Automatic recovery when Redis is back
   - Health check for Redis connection

3. **Rate Limit Metrics**
   - Add Prometheus metrics for rate limits
   - Track: total requests, blocked requests, rate limit hits
   - Per-endpoint rate limit statistics
   - Dashboard for monitoring

4. **Graceful Degradation**
   - Implement queue-based rate limiting
   - Allow short bursts within limits
   - Adaptive rate limiting based on server load
   - Priority queues for important requests

5. **Cache Invalidation**
   - Implement cache invalidation on rate limit changes
   - Support dynamic rate limit updates
   - Admin API to adjust rate limits

**Deliverables:**
- IP-based rate limiting with whitelist/blacklist
- Circuit breaker for Redis
- Prometheus metrics
- Graceful degradation strategies
- Admin API for rate limit management

**Acceptance Criteria:**
- IP-based rate limiting works
- Circuit breaker activates on Redis failure
- Metrics available in Prometheus
- Graceful degradation under load
- Admin can adjust rate limits dynamically

---

### Phase 5: Testing & Documentation (Week 5)

**Objective:** Comprehensive testing and documentation

#### Tasks:

1. **Unit Tests**
   - Test rate limit guard
   - Test rate limit middleware
   - Test rate limit decorators
   - Test Redis storage
   - Test circuit breaker

2. **Integration Tests**
   - Test HTTP rate limiting end-to-end
   - Test WebSocket rate limiting
   - Test Redis failover
   - Test multiple rate limit tiers

3. **Load Testing**
   - Test with high concurrent requests
   - Test rate limit accuracy
   - Test Redis performance under load
   - Test circuit breaker behavior

4. **Documentation**
   - Update README with rate limiting setup
   - Add rate limiting configuration guide
   - Document environment variables
   - Add rate limiting best practices
   - Create troubleshooting guide

5. **Monitoring Setup**
   - Set up Grafana dashboard
   - Configure alerts for rate limit violations
   - Set up logging for rate limit events
   - Configure health checks

**Deliverables:**
- Comprehensive test suite
- Load test results
- Updated documentation
- Monitoring dashboard
- Alert configuration

**Acceptance Criteria:**
- All tests passing
- Load tests meet performance requirements
- Documentation complete
- Monitoring dashboard functional
- Alerts configured

---

## 3. Detailed Implementation Specifications

### 3.1 Configuration Structure

**File:** `src/config/rate-limit.config.ts`

```typescript
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
```

### 3.2 Rate Limit Module

**File:** `src/infrastructure/rate-limit/rate-limit.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nestjs/throttler';
import Redis from 'ioredis';
import { rateLimitConfig } from '@config/rate-limit.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = rateLimitConfig();
        
        // Configure Redis storage
        let redisClient: Redis;
        if (cfg.storage.redis.clusterNodes) {
          const nodes = cfg.storage.redis.clusterNodes.split(',').map(node => {
            const [host, port] = node.split(':');
            return { host, port: parseInt(port) };
          });
          redisClient = new Redis.Cluster(nodes, {
            redisOptions: {
              password: cfg.storage.redis.password,
              tls: cfg.storage.redis.tls ? {} : undefined,
            },
          });
        } else {
          redisClient = new Redis({
            host: cfg.storage.redis.host,
            port: cfg.storage.redis.port,
            password: cfg.storage.redis.password,
            tls: cfg.storage.redis.tls ? {} : undefined,
          });
        }
        
        const storage = new ThrottlerStorageRedisService(redisClient);
        
        return {
          throttlers: [
            {
              name: 'global',
              ttl: cfg.global.ttl,
              limit: cfg.global.limit,
              storage,
            },
            {
              name: 'auth',
              ttl: cfg.auth.ttl,
              limit: cfg.auth.limit,
              storage,
            },
            {
              name: 'apiKey',
              ttl: cfg.apiKey.ttl,
              limit: cfg.apiKey.limit,
              storage,
            },
            {
              name: 'ip',
              ttl: cfg.ip.ttl,
              limit: cfg.ip.limit,
              storage,
            },
          ],
          storage,
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
```

### 3.3 Rate Limit Guard

**File:** `src/common/guards/rate-limit.guard.ts`

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    reflector: Reflector,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {
    super(reflector, logger);
  }

  protected getTracker(req: Record<string, any>): string {
    // Custom tracker logic
    // Can use user ID, API key, or IP
    return req.user?.id || req.ip || req.connection.remoteAddress;
  }

  protected throwThrottlingException(): void {
    // Custom exception handling
    // Add rate limit headers
    // Log rate limit violations
  }
}
```

### 3.4 Rate Limit Decorators

**File:** `src/common/decorators/throttle.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { THROTTLER_OPTIONS } from '@nestjs/throttler';

export const Throttle = (name: string) => 
  SetMetadata(THROTTLER_OPTIONS, { name });

export const AuthThrottle = () => Throttle('auth');
export const ApiKeyThrottle = () => Throttle('apiKey');
export const IpThrottle = () => Throttle('ip');
```

### 3.5 WebSocket Rate Limit Middleware

**File:** `src/infrastructure/websocket/rate-limit.middleware.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ICacheProvider } from '@core/domain/ports/cache.port';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class WsRateLimitMiddleware {
  constructor(
    @Inject('ICacheProvider')
    private readonly cache: ICacheProvider,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  async handle(socket: any, next: (err?: Error) => void) {
    const userId = socket.user?.id || socket.id;
    const key = `ws:rate_limit:${userId}`;
    const ttl = 60000; // 1 minute
    const limit = 100;

    try {
      const current = await this.cache.incr(key);
      
      if (current === 1) {
        await this.cache.changeExpiry(key, ttl);
      }

      if (current > limit) {
        this.logger.warn(
          'WsRateLimitMiddleware',
          `WebSocket rate limit exceeded for user ${userId}`,
        );
        
        // Emit rate limit warning to client
        socket.emit('rate_limit_warning', {
          limit,
          reset: ttl,
        });
        
        return next(new Error('Rate limit exceeded'));
      }

      // Send remaining count to client
      socket.emit('rate_limit_status', {
        remaining: limit - current,
        limit,
        reset: ttl,
      });

      next();
    } catch (error) {
      this.logger.error(
        'WsRateLimitMiddleware',
        `Rate limit check failed for user ${userId}`,
        error,
      );
      // Fail open - allow request if cache fails
      next();
    }
  }
}
```

### 3.6 Rate Limit Headers Interceptor

**File:** `src/common/interceptors/rate-limit.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();
        
        // Add rate limit headers if available
        if (response.rateLimit) {
          response.setHeader('X-RateLimit-Limit', response.rateLimit.limit);
          response.setHeader('X-RateLimit-Remaining', response.rateLimit.remaining);
          response.setHeader('X-RateLimit-Reset', response.rateLimit.reset);
        }
        
        return data;
      }),
    );
  }
}
```

---

## 4. Environment Variables

Add to `.env.example`:

```bash
# Rate Limiting Configuration
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_TTL=900000
AUTH_RATE_LIMIT_MAX=5
API_KEY_RATE_LIMIT_TTL=3600000
API_KEY_RATE_LIMIT_MAX=1000
WS_RATE_LIMIT_TTL=60000
WS_RATE_LIMIT_MAX=100
IP_RATE_LIMIT_TTL=60000
IP_RATE_LIMIT_MAX=1000

# Rate Limit Storage
RATE_LIMIT_STORAGE=redis

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
```

---

## 5. File Structure

```
src/
├── common/
│   ├── decorators/
│   │   └── throttle.decorator.ts
│   ├── guards/
│   │   └── rate-limit.guard.ts
│   └── interceptors/
│       └── rate-limit.interceptor.ts
├── config/
│   └── rate-limit.config.ts
├── infrastructure/
│   ├── rate-limit/
│   │   └── rate-limit.module.ts
│   └── websocket/
│       └── rate-limit.middleware.ts
└── core/
    └── domain/
        └── ports/
            └── cache.port.ts (updated)
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

- Test rate limit guard logic
- Test rate limit middleware
- Test rate limit decorators
- Test Redis storage operations
- Test circuit breaker logic

### 6.2 Integration Tests

- Test HTTP rate limiting end-to-end
- Test WebSocket rate limiting
- Test Redis failover
- Test multiple rate limit tiers
- Test IP-based rate limiting

### 6.3 Load Tests

- Use k6 or Artillery for load testing
- Test with 1000+ concurrent requests
- Test rate limit accuracy under load
- Test Redis performance
- Test circuit breaker behavior

### 6.4 Test Scenarios

1. **Basic Rate Limiting**
   - Send 100 requests in 1 minute (should succeed)
   - Send 101st request (should fail with 429)

2. **Auth Rate Limiting**
   - Send 5 login requests in 15 minutes (should succeed)
   - Send 6th login request (should fail with 429)

3. **WebSocket Rate Limiting**
   - Send 100 WebSocket events in 1 minute (should succeed)
   - Send 101st event (should fail)

4. **Redis Failover**
   - Stop Redis
   - Verify circuit breaker activates
   - Restart Redis
   - Verify automatic recovery

5. **IP-based Rate Limiting**
   - Send 1000 requests from single IP (should succeed)
   - Send 1001st request (should fail)
   - Add IP to whitelist
   - Verify requests succeed

---

## 7. Monitoring & Metrics

### 7.1 Prometheus Metrics

Track the following metrics:

- `rate_limit_requests_total` - Total requests
- `rate_limit_blocked_total` - Total blocked requests
- `rate_limit_hits_total` - Rate limit hits per tier
- `rate_limit_remaining` - Remaining requests per key
- `redis_rate_limit_errors_total` - Redis errors
- `circuit_breaker_state` - Circuit breaker state (open/closed)

### 7.2 Grafana Dashboard

Create dashboard with:
- Rate limit request rate
- Rate limit block rate
- Redis connection status
- Circuit breaker state
- Per-endpoint rate limit statistics

### 7.3 Alerts

Configure alerts for:
- High rate limit block rate (> 10%)
- Redis connection failures
- Circuit breaker open state
- Unusual rate limit patterns

---

## 8. Security Considerations

### 8.1 DDoS Protection

- IP-based rate limiting as first line of defense
- Automatic IP blocking for repeated violations
- CAPTCHA for suspicious patterns
- Request validation before rate limit check

### 8.2 Bypass Prevention

- Use multiple identifiers (IP, user ID, API key)
- Hash identifiers to prevent enumeration
- Use Redis with authentication
- Validate all rate limit keys

### 8.3 Rate Limit Evasion

- Detect and prevent header spoofing
- Use X-Forwarded-For with trust proxy
- Implement request fingerprinting
- Monitor for suspicious patterns

---

## 9. Performance Optimization

### 9.1 Redis Optimization

- Use Redis Cluster for high throughput
- Enable pipelining for batch operations
- Use connection pooling
- Configure appropriate timeouts

### 9.2 Cache Optimization

- Use local L1 cache for frequently accessed limits
- Implement cache warming for known users
- Use compression for large values
- Optimize key patterns

### 9.3 Algorithm Optimization

- Use sliding window for accuracy
- Implement token bucket for burst handling
- Use fixed window for simplicity where appropriate
- Optimize Redis Lua scripts

---

## 10. Rollout Plan

### 10.1 Staging Deployment

1. Deploy to staging environment
2. Run load tests
3. Monitor metrics
4. Adjust configuration as needed
5. Get approval from team

### 10.2 Production Deployment

1. Deploy during low-traffic period
2. Enable in monitoring mode (log only, don't block)
3. Monitor for 24 hours
4. Enable blocking mode
5. Monitor for 48 hours
6. Adjust limits based on usage patterns

### 10.3 Rollback Plan

- Feature flag to disable rate limiting
- Revert to previous version if issues arise
- Monitor for 24 hours after rollback
- Document lessons learned

---

## 11. Maintenance & Operations

### 11.1 Regular Tasks

- Review rate limit metrics weekly
- Adjust limits based on usage patterns
- Update whitelist/blacklist as needed
- Review and update documentation

### 11.2 Incident Response

- Monitor for rate limit issues
- Have runbooks for common issues
- Escalation procedures
- Post-incident reviews

### 11.3 Capacity Planning

- Monitor Redis capacity
- Plan for scaling
- Review rate limit limits quarterly
- Update based on business needs

---

## 12. Success Criteria

### 12.1 Functional Requirements

- ✅ HTTP rate limiting implemented
- ✅ WebSocket rate limiting implemented
- ✅ Multiple rate limit tiers working
- ✅ Redis storage configured
- ✅ Circuit breaker working
- ✅ Rate limit headers present
- ✅ Metrics collected

### 12.2 Non-Functional Requirements

- ✅ Performance: < 5ms overhead per request
- ✅ Availability: 99.9% uptime
- ✅ Scalability: Support 10,000+ requests/second
- ✅ Reliability: Failover to in-memory if Redis fails
- ✅ Observability: All metrics tracked
- ✅ Security: Prevent DDoS attacks

### 12.3 Business Requirements

- ✅ Protect against abuse
- ✅ Fair resource allocation
- ✅ Comply with SLAs
- ✅ Maintain user experience
- ✅ Cost-effective operation

---

## 13. Risks & Mitigations

### 13.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Redis failure | High | Circuit breaker, in-memory fallback |
| Performance degradation | Medium | Optimize Redis, use local cache |
| Incorrect limits | Medium | Monitor, adjust dynamically |
| Bypass attacks | High | Multiple identifiers, validation |

### 13.2 Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Configuration errors | High | Validation, testing, monitoring |
| Capacity issues | Medium | Capacity planning, scaling |
| Team knowledge gap | Low | Documentation, training |

---

## 14. Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-------------------|
| Phase 1: Foundation | Week 1 | Dependencies, configuration, cache port |
| Phase 2: HTTP Rate Limiting | Week 2 | Throttler module, guards, decorators |
| Phase 3: WebSocket Rate Limiting | Week 3 | WebSocket middleware, integration |
| Phase 4: Advanced Features | Week 4 | IP limiting, circuit breaker, metrics |
| Phase 5: Testing & Documentation | Week 5 | Tests, docs, monitoring setup |

**Total Duration:** 5 weeks

---

## 15. Resources Required

### 15.1 Development Resources

- 1 Senior Backend Developer (full-time)
- 1 DevOps Engineer (part-time, for monitoring setup)
- 1 QA Engineer (part-time, for testing)

### 15.2 Infrastructure Resources

- Redis instance (or cluster)
- Monitoring stack (Prometheus, Grafana)
- Load testing environment
- Staging environment

### 15.3 Budget Estimate

- Development: 5 weeks × 40 hours = 200 hours
- Infrastructure: $500/month (Redis, monitoring)
- Load testing: $200 (cloud resources)
- **Total:** ~$2,000-3,000 (depending on rates)

---

## 16. Next Steps

1. **Immediate Actions:**
   - Get approval for implementation plan
   - Allocate resources
   - Set up development environment

2. **Week 1 Actions:**
   - Install dependencies
   - Create configuration
   - Update cache port

3. **Week 2 Actions:**
   - Implement HTTP rate limiting
   - Add guards and decorators
   - Test basic functionality

4. **Ongoing Actions:**
   - Weekly progress reviews
   - Adjust timeline as needed
   - Communicate with stakeholders

---

**Document Version:** 1.0
**Last Updated:** June 3, 2026
**Owner:** Backend Team
**Status:** Pending Approval
