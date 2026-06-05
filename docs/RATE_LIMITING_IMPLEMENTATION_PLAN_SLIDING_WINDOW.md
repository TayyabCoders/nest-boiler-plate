# Production-Grade Rate Limiting Implementation Plan (Sliding Window Counter)

## Executive Summary

This document outlines a comprehensive implementation plan to add production-grade rate limiting to the NestJS boilerplate using the **Sliding Window Counter algorithm** with Redis distributed storage.

**Current State:**
- Fastify: Has rate limiting (HTTP + WebSocket) but with scalability issues (in-memory, fixed window)
- NestJS: **IMPLEMENTED** - Sliding Window Counter with Redis distributed storage

**Target State:**
- Production-grade rate limiting for both HTTP and WebSocket
- Sliding Window Counter algorithm (accurate, no burst issues)
- Redis distributed storage (scalable)
- Multiple rate limit tiers
- Comprehensive monitoring and metrics
- High availability and fault tolerance

**Implementation Status:**
- ✅ Phase 1 & 2: HTTP Rate Limiting with Sliding Window - COMPLETED
- ⏳ Phase 3: WebSocket Rate Limiting - PENDING
- ⏳ Phase 4: Advanced Features - PENDING
- ⏳ Phase 5: Testing & Documentation - PENDING

---

## 1. Architecture Overview

### 1.1 Technology Stack

**HTTP Rate Limiting:**
- Algorithm: **Sliding Window Counter** (custom implementation)
- Storage: Redis sorted sets (ZSET) with Lua scripts
- Redis Client: ioredis (supports single instance and cluster)
- Guard: Custom NestJS guard with tiered support
- Fallback: Fail-open strategy (allow requests if Redis fails)

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
- Redis Cluster support for high availability
- Fail-open strategy (allow requests if Redis unavailable)
- No in-memory fallback (Redis is required for distributed accuracy)

---

## 2. Implementation Phases

### Phase 1: Foundation Setup (Week 1) - ✅ COMPLETED

**Objective:** Set up basic infrastructure and dependencies

#### Tasks:

1. **Install Dependencies** ✅
   ```bash
   npm install ioredis
   ```

2. **Update Environment Configuration** ✅
   - Add rate limiting environment variables to `env.validation.ts`
   - Define tiered rate limit variables (global, auth, apiKey, ip, ws)

3. **Create Sliding Window Service** ✅
   - Create `src/infrastructure/rate-limit/sliding-window.service.ts`
   - Implement Redis ZSET-based sliding window algorithm
   - Add Lua script for atomic operations
   - Support Redis Cluster and single instance
   - Implement fail-open strategy

**Deliverables:**
- ✅ Updated environment configuration
- ✅ Sliding Window service with Redis
- ✅ Lua script for atomic operations

**Acceptance Criteria:**
- ✅ Configuration validates correctly
- ✅ Sliding window algorithm implemented
- ✅ Redis Cluster support added

---

### Phase 2: HTTP Rate Limiting (Week 2) - ✅ COMPLETED

**Objective:** Implement HTTP rate limiting with Sliding Window Counter algorithm

#### Tasks:

1. **Create Rate Limit Guard** ✅
   - Create `src/common/guards/sliding-window-rate-limit.guard.ts`
   - Implement tiered rate limit support (global, auth, apiKey, ip)
   - Add user-based, API key-based, and IP-based tracking
   - Attach rate limit info to request for headers

2. **Create Rate Limit Decorators** ✅
   - Create `src/common/decorators/rate-limit.decorator.ts`
   - Implement tiered decorators:
     - `@AuthRateLimit()` for auth endpoints
     - `@ApiKeyRateLimit()` for API key endpoints
     - `@IpRateLimit()` for IP-based limiting

3. **Add Global Rate Limiting** ✅
   - Apply global guard in `app.module.ts`
   - Configure default rate limit (100 req/min)
   - Add SlidingWindowRateLimitService as provider

4. **Update Exception Filter** ✅
   - Handle rate limit rejections in `AllExceptionsFilter`
   - Return proper 429 status with error details
   - Add rate limit headers:
     - `X-RateLimit-Limit`
     - `X-RateLimit-Remaining`
     - `X-RateLimit-Reset`
     - `Retry-After`

**Deliverables:**
- ✅ Sliding Window rate limit guard
- ✅ Tiered rate limit decorators
- ✅ Updated exception filter with 429 handling
- ✅ Rate limit headers
- ✅ Global rate limiting applied

**Acceptance Criteria:**
- ✅ Global rate limiting works (100 req/min)
- ✅ Auth endpoints have stricter limits (5 req/15min)
- ✅ Rate limit headers present in responses
- ✅ 429 status returned when limit exceeded
- ✅ Redis storage working correctly

---

### Phase 3: WebSocket Rate Limiting (Week 3) - ⏳ PENDING

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

### Phase 4: Advanced Features (Week 4) - ⏳ PENDING

**Objective:** Add advanced production features

#### Tasks:

1. **IP-based Rate Limiting**
   - Implement IP-based rate limit for DDoS protection
   - Create whitelist for trusted IPs
   - Create blacklist for abusive IPs
   - Add automatic IP blocking for repeated violations

2. **Circuit Breaker Pattern**
   - Implement circuit breaker for Redis failures
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

### Phase 5: Testing & Documentation (Week 5) - ⏳ PENDING

**Objective:** Comprehensive testing and documentation

#### Tasks:

1. **Unit Tests**
   - Test sliding window service
   - Test rate limit guard
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

**File:** `src/config/env.validation.ts` (Updated with Sliding Window configuration)

```typescript
// Rate Limiting Configuration (Sliding Window)
RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute in ms
RATE_LIMIT_MAX: z.coerce.number().default(100),
AUTH_RATE_LIMIT_TTL: z.coerce.number().default(900000), // 15 minutes in ms
AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
API_KEY_RATE_LIMIT_TTL: z.coerce.number().default(3600000), // 1 hour in ms
API_KEY_RATE_LIMIT_MAX: z.coerce.number().default(1000),
WS_RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute in ms
WS_RATE_LIMIT_MAX: z.coerce.number().default(100),
IP_RATE_LIMIT_TTL: z.coerce.number().default(60000), // 1 minute in ms
IP_RATE_LIMIT_MAX: z.coerce.number().default(1000),
```

### 3.2 Sliding Window Service

**File:** `src/infrastructure/rate-limit/sliding-window.service.ts` ✅ IMPLEMENTED

```typescript
@Injectable()
export class SlidingWindowRateLimitService implements OnModuleDestroy {
  private redisClient!: Redis | Cluster;

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;

    // Lua script for atomic sliding window check
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      
      -- Remove timestamps older than the window
      redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
      
      -- Count current requests in window
      local count = redis.call('ZCARD', key)
      
      if count < limit then
        -- Add current request timestamp
        redis.call('ZADD', key, now, now)
        -- Set expiry to window duration
        redis.call('EXPIRE', key, math.ceil(window / 1000))
        return {1, limit - count - 1, now + window}
      else
        -- Get oldest timestamp to calculate reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = oldest[2] and tonumber(oldest[2]) + window or now + window
        return {0, 0, resetTime}
      end
    `;

    const result = await this.redisClient.eval(
      luaScript,
      1,
      key,
      now,
      windowMs,
      limit,
    );

    const [allowed, remaining, reset] = result as [number, number, number];

    return {
      allowed: allowed === 1,
      remaining,
      reset,
      limit,
    };
  }
}
```

### 3.3 Rate Limit Guard

**File:** `src/common/guards/sliding-window-rate-limit.guard.ts` ✅ IMPLEMENTED

```typescript
@Injectable()
export class SlidingWindowRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tier = this.reflector.get<RateLimitTier>(
      RATE_LIMIT_TIER_KEY,
      context.getHandler(),
    ) || RateLimitTier.GLOBAL;

    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request, tier);

    const { ttl, limit } = this.getTierConfig(tier);

    const result: RateLimitResult = await this.rateLimitService.checkRateLimit(
      identifier,
      limit,
      ttl,
    );

    request.rateLimit = result;

    if (!result.allowed) {
      this.logger.warn(
        SlidingWindowRateLimitGuard.name,
        `Rate limit exceeded for ${identifier} (tier: ${tier})`,
      );
      return false;
    }

    return true;
  }
}
```

### 3.4 Rate Limit Decorators

**File:** `src/common/decorators/rate-limit.decorator.ts` ✅ IMPLEMENTED

```typescript
export const RATE_LIMIT_TIER_KEY = 'RATE_LIMIT_TIER';

export const RateLimitTierDecorator = (tier: RateLimitTier) =>
  SetMetadata(RATE_LIMIT_TIER_KEY, tier);

export const AuthRateLimit = () => RateLimitTierDecorator(RateLimitTier.AUTH);
export const ApiKeyRateLimit = () => RateLimitTierDecorator(RateLimitTier.API_KEY);
export const IpRateLimit = () => RateLimitTierDecorator(RateLimitTier.IP);
```

### 3.5 Exception Filter Update

**File:** `src/common/filters/http-exception.filter.ts` ✅ UPDATED

```typescript
// Handle rate limit rejections
const rateLimitInfo = (request as any).rateLimit as RateLimitResult;
if (rateLimitInfo && !rateLimitInfo.allowed) {
  status = HttpStatus.TOO_MANY_REQUESTS;
  const retryAfter = Math.ceil((rateLimitInfo.reset - Date.now()) / 1000);
  
  response.setHeader('Retry-After', retryAfter);
  response.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
  response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
  response.setHeader('X-RateLimit-Reset', rateLimitInfo.reset);
  
  errorResponse = {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  };
}
```

### 3.6 App Module Integration

**File:** `src/app.module.ts` ✅ UPDATED

```typescript
providers: [
  SlidingWindowRateLimitService,
  {
    provide: APP_GUARD,
    useClass: SlidingWindowRateLimitGuard,
  },
  // ... other providers
],
```

---

## 4. Sliding Window Algorithm Details

### 4.1 How It Works

The Sliding Window Counter algorithm uses Redis sorted sets (ZSET) to track request timestamps:

1. **Key Structure**: `rate_limit:{identifier}` where identifier is user ID, API key, or IP
2. **Timestamp Storage**: Each request adds its timestamp to the ZSET
3. **Window Cleanup**: Remove timestamps older than the window (e.g., older than 1 minute)
4. **Count Check**: Count remaining timestamps to determine if limit exceeded
5. **Atomic Operations**: Lua script ensures all operations are atomic

### 4.2 Advantages Over Fixed Window

- **No Burst Issues**: No sudden spikes at window boundaries
- **Accurate Counting**: True rolling window, not reset-based
- **Distributed**: Works across multiple instances with Redis
- **Precise**: Exact request counting within time window

### 4.3 Lua Script Explanation

```lua
-- Remove timestamps older than the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- Count current requests in window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Add current request timestamp
  redis.call('ZADD', key, now, now)
  -- Set expiry to window duration
  redis.call('EXPIRE', key, math.ceil(window / 1000))
  return {1, limit - count - 1, now + window}
else
  -- Get oldest timestamp to calculate reset time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetTime = oldest[2] and tonumber(oldest[2]) + window or now + window
  return {0, 0, resetTime}
end
```

---

## 5. Environment Variables

### 5.1 Rate Limiting Variables

```bash
# Rate Limiting Configuration (Sliding Window)
RATE_LIMIT_TTL=60000              # 1 minute in ms
RATE_LIMIT_MAX=100                # Global limit
AUTH_RATE_LIMIT_TTL=900000        # 15 minutes in ms
AUTH_RATE_LIMIT_MAX=5             # Auth endpoint limit
API_KEY_RATE_LIMIT_TTL=3600000    # 1 hour in ms
API_KEY_RATE_LIMIT_MAX=1000       # API key limit
WS_RATE_LIMIT_TTL=60000           # 1 minute in ms
WS_RATE_LIMIT_MAX=100             # WebSocket limit
IP_RATE_LIMIT_TTL=60000           # 1 minute in ms
IP_RATE_LIMIT_MAX=1000            # IP-based limit
```

### 5.2 Redis Configuration

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=false
REDIS_CLUSTER_NODES=host1:port1,host2:port2
REDIS_PREFIX=default
```

---

## 6. Usage Examples

### 6.1 Global Rate Limiting (Default)

All routes are rate limited by default with global settings (100 req/min).

### 6.2 Auth Endpoints

```typescript
import { AuthRateLimit } from '@common/decorators/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  @AuthRateLimit()
  @Post('login')
  async login() {
    // Rate limited: 5 req/15min
  }
}
```

### 6.3 API Key Endpoints

```typescript
import { ApiKeyRateLimit } from '@common/decorators/rate-limit.decorator';

@Controller('api')
export class ApiController {
  @ApiKeyRateLimit()
  @Get('data')
  async getData() {
    // Rate limited: 1000 req/hour
  }
}
```

### 6.4 IP-based Rate Limiting

```typescript
import { IpRateLimit } from '@common/decorators/rate-limit.decorator';

@Controller('public')
export class PublicController {
  @IpRateLimit()
  @Get('content')
  async getContent() {
    // Rate limited: 1000 req/min per IP
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

- Test sliding window service with mock Redis
- Test rate limit guard logic
- Test decorator metadata setting
- Test exception filter handling

### 7.2 Integration Tests

- Test end-to-end rate limiting
- Test rate limit headers
- Test 429 responses
- Test different tiers
- Test Redis failover

### 7.3 Load Tests

- Test with high concurrent requests
- Verify sliding window accuracy
- Test Redis performance under load
- Test multiple instances

---

## 8. Monitoring and Metrics

### 8.1 Prometheus Metrics

- `rate_limit_requests_total` - Total requests tracked
- `rate_limit_blocked_total` - Total blocked requests
- `rate_limit_remaining` - Current remaining requests
- `rate_limit_reset_time` - Time until reset

### 8.2 Grafana Dashboard

- Rate limit hit rate
- Blocked requests by tier
- Redis performance
- Rate limit errors

---

## 9. Troubleshooting

### 9.1 Rate Limit Not Working

- Check Redis connection
- Verify environment variables
- Check guard is applied globally
- Verify decorator is set correctly

### 9.2 Redis Connection Issues

- Check Redis is running
- Verify connection string
- Check network connectivity
- Verify authentication

### 9.3 Headers Not Present

- Check exception filter is applied
- Verify rate limit info attached to request
- Check guard is returning false on limit exceeded

---

## 10. Success Criteria

- ✅ Sliding Window algorithm implemented
- ✅ Redis distributed storage working
- ✅ Multi-tier rate limiting functional
- ✅ Rate limit headers present
- ✅ 429 status returned correctly
- ✅ Fail-open strategy working
- ✅ Environment configuration complete
- ⏳ WebSocket rate limiting (Phase 3)
- ⏳ IP whitelisting (Phase 4)
- ⏳ Circuit breaker (Phase 4)
- ⏳ Prometheus metrics (Phase 4)
- ⏳ Comprehensive tests (Phase 5)
- ⏳ Documentation complete (Phase 5)

---

## Appendix A: Comparison with Fixed Window

### Fixed Window Algorithm

- Simple counter that resets at fixed intervals
- Can have "burst" issues at window boundaries
- Example: 100 req/min, user can send 100 at 0:59 and 100 at 1:00

### Sliding Window Algorithm

- Tracks request timestamps in rolling window
- No burst issues at boundaries
- Example: 100 req/min, user can only send 100 in any 60-second period

### Performance Comparison

| Metric | Fixed Window | Sliding Window |
|--------|-------------|----------------|
| Memory Usage | O(1) | O(N) where N = requests in window |
| CPU Usage | O(1) | O(log N) for ZSET operations |
| Accuracy | Low (burst issues) | High (true rolling window) |
| Distributed Complexity | Low | Medium (requires Redis) |

---

## Appendix B: Redis Key Structure

### Key Format

```
rate_limit:{identifier}
```

### Identifier Examples

- `user:123` - User-based rate limiting
- `apikey:abc123` - API key-based rate limiting
- `ip:192.168.1.1` - IP-based rate limiting
- `auth:user:123` - Auth endpoint rate limiting

### Key Expiry

- Keys expire automatically after window duration
- Prevents memory buildup
- No manual cleanup needed

---

## Appendix C: Error Handling

### Redis Connection Failure

- Fail-open strategy: Allow requests if Redis is down
- Log errors for monitoring
- Alert on repeated failures

### Rate Limit Check Failure

- Return allowed: true to prevent service disruption
- Log error with context
- Monitor failure rate

---

**Document Version:** 2.0 (Sliding Window Implementation)
**Last Updated:** June 2026
**Status:** Phase 1 & 2 Complete, Phases 3-5 Pending
