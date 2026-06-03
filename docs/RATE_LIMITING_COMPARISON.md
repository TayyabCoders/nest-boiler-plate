# Rate Limiting Implementation Comparison: Fastify vs NestJS Boilerplate

## Executive Summary

This report provides an end-to-end analysis of rate limiting implementations between the Fastify boilerplate (`E:\node-boiler-plate`) and the NestJS boilerplate (`e:\nest boiler`).

**Key Finding:** The Fastify boilerplate has a comprehensive rate limiting implementation, while the NestJS boilerplate **does not have any rate limiting implemented**.

---

## 1. Fastify Boilerplate Rate Limiting Analysis

### 1.1 Implementation Locations

Rate limiting is implemented across multiple files:

- **`src/config/appConfig.js`** (lines 93-105) - Configuration
- **`src/edge/socketio/middleware.js`** (lines 142-165) - Socket.io rate limiting
- **`src/app.js`** (lines 49-52) - HTTP rate limiting plugin registration
- **`src/utils/constants.js`** (line 102) - Cache key constants

### 1.2 HTTP Rate Limiting

**File:** `src/app.js` (lines 49-52)

```javascript
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

**Configuration:** `src/config/appConfig.js` (lines 93-105)

```javascript
rateLimit: {
  global: {
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  auth: {
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
    timeWindow: process.env.AUTH_RATE_LIMIT_WINDOW || '15 minutes',
    skipSuccessfulRequests: true
  }
}
```

**Features:**
- Uses `@fastify/rate-limit` plugin
- Global rate limit: 100 requests per minute
- Auth-specific rate limit: 5 requests per 15 minutes
- Environment variable configuration
- Skip successful requests option for auth endpoints
- Configurable via environment variables

### 1.3 Socket.io Rate Limiting

**File:** `src/edge/socketio/middleware.js` (lines 142-165)

```javascript
const rateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (socket, next) => {
    const now = Date.now();
    const userId = socket.userId || socket.id;

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      return next(new Error('Rate limit exceeded'));
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};
```

**Features:**
- Custom in-memory implementation using Map
- Sliding window algorithm
- Per-user or per-socket tracking
- Configurable max requests and time window
- Default: 100 requests per 60 seconds
- Returns error when limit exceeded

### 1.4 Cache Integration

**File:** `src/utils/constants.js` (line 102)

```javascript
CACHE_KEYS: {
  RATE_LIMIT: 'rate'
}
```

**Note:** Cache key is defined but not actively used in the current implementation. The Socket.io middleware uses in-memory Map instead of Redis/cache.

---

## 2. NestJS Boilerplate Rate Limiting Analysis

### 2.1 Current Status

**NOT IMPLEMENTED** - The NestJS boilerplate does not have any rate limiting mechanism.

### 2.2 Evidence

**File:** `src/main.ts` - No rate limiting middleware or guards
**File:** `src/app.module.ts` - No rate limiting modules imported
**File:** `src/config/app.config.ts` - Minimal config, no rate limiting settings
**File:** `package.json` - No `@nestjs/throttler` or rate limiting packages

### 2.3 What's Missing

- No rate limiting package installed (e.g., `@nestjs/throttler`)
- No rate limiting configuration
- No HTTP rate limiting middleware
- No WebSocket/Socket.io rate limiting
- No rate limiting guards or interceptors
- No rate limit storage strategy (Redis, in-memory, etc.)

---

## 3. Comparative Analysis

### 3.1 Feature Comparison Matrix

| Feature | Fastify Boilerplate | NestJS Boilerplate |
|---------|-------------------|-------------------|
| HTTP Rate Limiting | ✅ Implemented (@fastify/rate-limit) | ❌ Not Implemented |
| WebSocket Rate Limiting | ✅ Implemented (Custom) | ❌ Not Implemented |
| Configuration System | ✅ Environment variables | ❌ Not Implemented |
| Multiple Rate Limit Tiers | ✅ (Global + Auth) | ❌ Not Implemented |
| Redis/Cache Integration | ⚠️ Key defined but not used | ❌ Not Implemented |
| Sliding Window Algorithm | ✅ (Socket.io) | ❌ Not Implemented |
| Per-user Tracking | ✅ (Socket.io) | ❌ Not Implemented |
| Skip Successful Requests | ✅ (Auth endpoints) | ❌ Not Implemented |

### 3.2 Architecture Comparison

#### Fastify Approach

**Strengths:**
- **Plugin-based**: Uses established `@fastify/rate-limit` plugin
- **Dual-layer**: Separate implementations for HTTP and WebSocket
- **Configurable**: Environment variable driven configuration
- **Tiered limits**: Different limits for different endpoint types
- **Custom implementation**: Socket.io middleware allows fine-grained control

**Weaknesses:**
- **In-memory storage**: Socket.io middleware uses in-memory Map (not distributed)
- **No Redis integration**: Despite cache key being defined, not used
- **Potential memory leaks**: In-memory Map grows without cleanup
- **No persistence**: Rate limit state lost on server restart
- **Scalability issues**: In-memory storage doesn't work in multi-instance deployments

#### NestJS Approach

**Strengths:**
- N/A (Not implemented)

**Weaknesses:**
- **No protection**: Completely vulnerable to abuse
- **No DDoS protection**: Susceptible to denial-of-service attacks
- **No resource management**: No control over API usage
- **Security risk**: Missing critical security feature

---

## 4. Detailed Analysis of Fastify Implementation

### 4.1 HTTP Rate Limiting (@fastify/rate-limit)

**Pros:**
- Mature, well-tested plugin
- Built-in Redis support (if configured)
- Automatic headers (X-RateLimit-Limit, X-RateLimit-Remaining, etc.)
- Custom skip functions
- IP-based and user-based limiting
- Whitelist/blacklist support

**Cons in Current Implementation:**
- Not using Redis (default in-memory)
- Configuration in appConfig.js not fully utilized in app.js
- Hardcoded values in app.js instead of using config

**Recommendation:**
```javascript
// Should use config values
await app.register(rateLimit, {
  max: appConfig.security.rateLimit.global.max,
  timeWindow: appConfig.security.rateLimit.global.timeWindow,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  redis: getRedis(), // Add Redis for distributed systems
});
```

### 4.2 Socket.io Rate Limiting (Custom)

**Pros:**
- Simple implementation
- Per-user tracking
- Configurable limits
- Sliding window algorithm

**Cons:**
- **Critical Issue**: In-memory Map storage
  - Not distributed across instances
  - Memory leak risk (no cleanup)
  - Lost on restart
  - Doesn't scale horizontally
- No Redis integration despite cache infrastructure
- No rate limit headers
- No logging of rate limit events
- No whitelist/blacklist

**Recommendation:**
Use Redis for distributed rate limiting:
```javascript
const rateLimitMiddleware = async (maxRequests = 100, windowMs = 60000) => {
  return async (socket, next) => {
    const { cache } = container.resolve('cache');
    const userId = socket.userId || socket.id;
    const key = `rate_limit:${userId}`;
    
    const current = await cache.incr(key);
    if (current === 1) {
      await cache.expire(key, windowMs / 1000);
    }
    
    if (current > maxRequests) {
      return next(new Error('Rate limit exceeded'));
    }
    
    next();
  };
};
```

---

## 5. Recommended NestJS Implementation

### 5.1 Package Installation

```bash
npm install @nestjs/throttler
```

### 5.2 Configuration

**File:** `src/config/app.config.ts`

```typescript
export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mode: process.env.APP_MODE || 'HTTP',
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60000, // 1 minute
    limit: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },
  authRateLimit: {
    ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL) || 900000, // 15 minutes
    limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  },
});
```

### 5.3 Module Setup

**File:** `src/app.module.ts`

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    // ... other imports
  ],
})
export class AppModule {}
```

### 5.4 Guard Usage

**Apply globally or per-controller:**

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  // Stricter limits for auth endpoints
}
```

### 5.5 WebSocket Rate Limiting

For Socket.io, implement Redis-based rate limiting similar to the recommended Fastify approach.

---

## 6. Best Practices Comparison

### 6.1 What Fastify Does Well

1. **Separation of concerns**: HTTP and WebSocket rate limiting are separate
2. **Configuration-driven**: Environment variables for easy tuning
3. **Tiered limits**: Different limits for different endpoint types
4. **Custom implementation**: Allows fine-grained control for WebSocket

### 6.2 What Both Should Implement

1. **Redis-based storage**: For distributed systems
2. **Rate limit headers**: Inform clients of limits
3. **Logging and metrics**: Track rate limit violations
4. **Whitelist/blacklist**: For trusted IPs or abusive users
5. **Graceful degradation**: Queue requests instead of hard rejection
6. **Burst handling**: Allow short bursts within limits
7. **Cleanup mechanisms**: Prevent memory leaks

### 6.3 What NestJS Should Adopt

1. **@nestjs/throttler**: Standard NestJS rate limiting solution
2. **Guard-based approach**: Declarative rate limiting with decorators
3. **Multiple throttlers**: Different limits for different routes
4. **Redis storage**: For distributed deployments
5. **WebSocket rate limiting**: Custom middleware for Socket.io

---

## 7. Security Implications

### 7.1 Fastify Boilerplate

**Security Level:** ⚠️ **Moderate**

**Strengths:**
- Basic protection against DDoS
- Auth endpoints have stricter limits
- WebSocket connections are rate limited

**Vulnerabilities:**
- In-memory storage (not distributed)
- No IP whitelisting for trusted sources
- No advanced abuse detection
- Socket.io rate limit can be bypassed by reconnecting

### 7.2 NestJS Boilerplate

**Security Level:** 🔴 **Critical**

**Vulnerabilities:**
- **No protection against DDoS attacks**
- **No API abuse prevention**
- **No resource exhaustion protection**
- **Vulnerable to brute force attacks**
- **No protection against scraping**
- **WebSocket connections unlimited**
- **Authentication endpoints unprotected**

**Risk Assessment:** HIGH RISK - Production deployment without rate limiting is dangerous.

---

## 8. Performance Impact Analysis

### 8.1 Fastify Implementation

**HTTP Rate Limiting:**
- Minimal overhead (O(1) lookup)
- Plugin is optimized
- In-memory: Very fast
- Redis: Slightly slower but still fast

**Socket.io Rate Limiting:**
- In-memory Map: Fast but memory-intensive
- No cleanup: Memory grows over time
- Sliding window: O(n) where n = requests in window

**Recommendation:** Implement Redis for both to improve scalability and add cleanup.

### 8.2 NestJS (Not Implemented)

No performance impact (no rate limiting), but this means:
- No protection against resource exhaustion
- Potential server overload under attack
- Unfair resource allocation

---

## 9. Scalability Analysis

### 9.1 Fastify Implementation

**Current State:** ❌ **Not Scalable**

**Reasons:**
- In-memory storage doesn't work across instances
- Rate limit state is local to each instance
- Load balancer will distribute requests, breaking rate limits
- No shared state between instances

**Required for Scalability:**
- Redis for distributed rate limiting
- Shared state across all instances
- Consistent hashing or similar strategy

### 9.2 NestJS Implementation

**Current State:** N/A (Not implemented)

**For Scalability (when implemented):**
- Must use Redis or similar distributed store
- @nestjs/throttler supports Redis out of the box
- Can use Redis Cluster for high availability

---

## 10. Recommendations

### 10.1 For Fastify Boilerplate

**Priority 1 (Critical):**
- Migrate Socket.io rate limiting to Redis
- Add cleanup mechanism for rate limit data
- Use configuration values in app.js instead of hardcoded values

**Priority 2 (High):**
- Add rate limit headers to responses
- Implement logging for rate limit violations
- Add IP whitelisting for trusted sources
- Add metrics for rate limit hits

**Priority 3 (Medium):**
- Implement burst handling
- Add adaptive rate limiting based on load
- Implement gradual backoff for repeated violations

### 10.2 For NestJS Boilerplate

**Priority 1 (Critical):**
- **Implement rate limiting immediately** using @nestjs/throttler
- Add Redis storage for distributed systems
- Implement stricter limits for auth endpoints
- Add WebSocket rate limiting

**Priority 2 (High):**
- Add rate limit headers
- Implement logging and metrics
- Add configuration system
- Add IP whitelisting

**Priority 3 (Medium):**
- Implement multiple rate limit tiers
- Add burst handling
- Implement adaptive rate limiting

---

## 11. Implementation Roadmap for NestJS

### Phase 1: Basic HTTP Rate Limiting (Week 1)

1. Install `@nestjs/throttler`
2. Configure basic global rate limit (100 req/min)
3. Apply to all routes
4. Test basic functionality

### Phase 2: Advanced HTTP Rate Limiting (Week 2)

1. Add Redis storage
2. Implement tiered limits (auth, public, admin)
3. Add rate limit headers
4. Add logging and metrics

### Phase 3: WebSocket Rate Limiting (Week 3)

1. Implement Redis-based Socket.io rate limiting
2. Add per-user tracking
3. Add cleanup mechanisms
4. Test with multiple connections

### Phase 4: Advanced Features (Week 4)

1. Add IP whitelisting
2. Implement burst handling
3. Add adaptive rate limiting
4. Comprehensive testing

---

## 12. Conclusion

### Which Implementation is Better?

**Fastify boilerplate is significantly better** because it actually has rate limiting implemented, whereas the NestJS boilerplate has none.

### Fastify Implementation Rating: **6/10**

**Strengths:**
- ✅ Has rate limiting for both HTTP and WebSocket
- ✅ Configurable via environment variables
- ✅ Tiered limits for different endpoint types
- ✅ Uses established plugin for HTTP

**Weaknesses:**
- ❌ In-memory storage (not scalable)
- ❌ No Redis integration for Socket.io
- ❌ Memory leak potential
- ❌ Not distributed-ready
- ❌ Configuration not fully utilized

### NestJS Implementation Rating: **0/10**

**Strengths:**
- None (not implemented)

**Weaknesses:**
- ❌ No rate limiting at all
- ❌ Critical security vulnerability
- ❌ Not production-ready
- ❌ No protection against abuse

### Final Verdict

**The Fastify implementation is better by default because it exists.** However, both need significant improvements:

1. **Fastify**: Migrate to Redis-based storage for scalability
2. **NestJS**: Implement rate limiting from scratch using @nestjs/throttler

**Recommendation:** Implement the recommended improvements for both boilerplates to achieve production-ready rate limiting with:
- Redis-based distributed storage
- Tiered rate limits
- Comprehensive logging and metrics
- IP whitelisting
- Burst handling
- Adaptive rate limiting

---

## 13. Code Examples

### 13.1 Recommended Fastify Improvements

**Redis-based HTTP Rate Limiting:**
```javascript
await app.register(rateLimit, {
  max: appConfig.security.rateLimit.global.max,
  timeWindow: appConfig.security.rateLimit.global.timeWindow,
  redis: getRedis(),
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  skipOnError: false,
});
```

**Redis-based Socket.io Rate Limiting:**
```javascript
const rateLimitMiddleware = async (maxRequests = 100, windowMs = 60000) => {
  return async (socket, next) => {
    const { cache } = container.resolve('cache');
    const userId = socket.userId || socket.id;
    const key = `socket:rate_limit:${userId}`;
    
    try {
      const current = await cache.incr(key);
      if (current === 1) {
        await cache.expire(key, windowMs / 1000);
      }
      
      if (current > maxRequests) {
        logger.warn('Socket rate limit exceeded', { userId, current });
        return next(new Error('Rate limit exceeded'));
      }
      
      next();
    } catch (error) {
      logger.error('Rate limit check failed', error);
      next(); // Fail open
    }
  };
};
```

### 13.2 Recommended NestJS Implementation

**app.config.ts:**
```typescript
export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mode: process.env.APP_MODE || 'HTTP',
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },
  authRateLimit: {
    ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '900000'),
    limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  },
});
```

**app.module.ts:**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('rateLimit.ttl'),
            limit: config.get<number>('rateLimit.limit'),
          },
        ],
        storage: new ThrottlerStorageRedisService(new Redis()),
      }),
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

**Controller with custom limits:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login() {
    // Stricter limits for auth
  }
}
```

---

## Appendix A: Environment Variables

### Fastify Boilerplate

```bash
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW=15 minutes
```

### NestJS Boilerplate (Recommended)

```bash
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_TTL=900000
AUTH_RATE_LIMIT_MAX=5
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Appendix B: Testing Recommendations

### Test Cases for Rate Limiting

1. **Basic Limit Test**: Send requests up to limit, verify last succeeds
2. **Exceed Limit Test**: Send requests beyond limit, verify rejection
3. **Window Reset Test**: Wait for window to expire, verify requests allowed again
4. **Different Users Test**: Verify limits are per-user, not global
5. **WebSocket Test**: Test Socket.io rate limiting
6. **Redis Failover Test**: Test behavior when Redis is unavailable
7. **Header Test**: Verify rate limit headers are present
8. **Whitelist Test**: Verify whitelisted IPs bypass limits

---

**Report Generated:** June 3, 2026
**Analysis Scope:** End-to-end rate limiting implementation comparison
**Status:** Complete
