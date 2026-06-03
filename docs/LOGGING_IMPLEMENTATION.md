# Logging Implementation - NestJS Boilerplate

## Overview

This document explains the logging implementation approach for the NestJS boilerplate, following NestJS best practices and patterns. Unlike Fastify which uses hooks, NestJS uses **Middleware**, **Guards**, **Interceptors**, and **Filters** to achieve similar functionality.

## Architecture Comparison

### Fastify Approach (Reference)
- **Hooks**: `loggingHook`, `contextHook`, `performanceHook`, `onSendHook`, `errorHook`, `authHook`
- Hooks are applied globally or per-route
- Execute in specific lifecycle phases

### NestJS Approach (Implementation)
- **Middleware**: Request logging, context initialization
- **Guards**: Authentication, authorization
- **Interceptors**: Response transformation, performance monitoring
- **Exception Filters**: Error handling and logging

## Fastify Boilerplate Reference Code

### 1. Logging Hooks (src/hooks/logging.hook.js)

```javascript
const { logger, logRequest } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const loggingHook = async (request, reply) => {
  // Generate request ID if not present
  if (!request.id) {
    request.id = request.headers['x-request-id'] || uuidv4();
  }

  // Set request ID in response headers
  reply.header('x-request-id', request.id);

  // Log request start
  logger.info({
    type: 'request_start',
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip
  });
};

// Request context hook - adds contextual information
const contextHook = async (request, reply) => {
  request.context = {
    startTime: Date.now(),
    requestId: request.id,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    correlationId: request.headers['x-correlation-id'] || uuidv4()
  };

  // Set correlation ID in response
  reply.header('x-correlation-id', request.context.correlationId);
};

// Performance monitoring hook
const performanceHook = async (request, reply) => {
  const segments = {
    auth: 0,
    validation: 0,
    business: 0,
    database: 0,
    total: 0
  };

  request.performance = {
    start: (segment) => {
      segments[segment] = Date.now();
    },
    end: (segment) => {
      if (segments[segment]) {
        const duration = Date.now() - segments[segment];
        logger.debug({
          type: 'performance_segment',
          requestId: request.id,
          segment,
          duration
        });
      }
    },
    getMetrics: () => segments
  };
};

// Combined onSend hook for logging and performance
const onSendHook = async (request, reply, payload) => {
  // Guard clause to handle cases where context wasn't initialized
  if (!request.context || !request.context.startTime) {
    logger.warn({
      type: 'missing_context',
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode
    }, 'Request context not initialized, skipping performance logging');
    return payload;
  }

  const duration = Date.now() - request.context.startTime;

  // Logging hook onSend logic
  logRequest(request, reply, duration);
  reply.header('x-response-time', `${duration}ms`);

  if (duration > 1000) {
    logger.warn({
      type: 'slow_request',
      requestId: request.id,
      method: request.method,
      url: request.url,
      duration,
      statusCode: reply.statusCode
    }, `Slow request detected: ${duration}ms`);
  }

  // Performance hook onSend logic
  if (request.performance && request.context && request.context.startTime) {
    const segments = request.performance.getMetrics();
    segments.total = Date.now() - request.context.startTime;

    if (segments.total > 100) {
      logger.info({
        type: 'request_performance',
        requestId: request.id,
        metrics: segments
      });
    }
  }

  return payload;
};

module.exports = {
  loggingHook,
  contextHook,
  performanceHook,
  onSendHook
};
```

### 2. Auth Hook (src/hooks/auth.hook.js)

```javascript
const { logger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const authHook = async (request, reply) => {
  const errorPayloads = {
    'missingAuth': { status: HTTP_STATUS.UNAUTHORIZED, error: ERROR_MESSAGES.UNAUTHORIZED, message: 'Missing authorization header' },
    'invalidAuth': { status: HTTP_STATUS.UNAUTHORIZED, error: ERROR_MESSAGES.UNAUTHORIZED, message: 'Invalid authorization format' },
    'inactiveUser': { status: HTTP_STATUS.UNAUTHORIZED, error: ERROR_MESSAGES.UNAUTHORIZED, message: 'User not found or account inactve' }
  }

  const action = {
    'error': (type) => {
      const { status, error, message } = errorPayloads[type]
      reply.code(status).send({
        error: error,
        message: message
      })
      return true;
    },
    'success': () => false
  }

  try {
    // Skip auth for public routes
    const publicRoutes = [
      '/health',
      '/metrics',
      '/documentation',
      '/api/v1/auth/verifyOtp',
      '/api/v1/auth/resendOtp',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password'
    ];

    const isPublicRoute = publicRoutes.some(route =>
      request.url.startsWith(route)
    );

    if (isPublicRoute) {
      return;
    }

    // Check for authorization header
    const authHeader = request.headers.authorization;

    if (action[authHeader ? 'success' : 'error']('missingAuth')) return reply;

    // Extract token
    const [bearer, token] = authHeader.split(' ');

    if (action[(bearer === 'Bearer' || token) ? 'success' : 'error']('invalidAuth')) return reply;

    try {
      // Verify token
      const decoded = await request.server.jwt.verify(token);

      // Check if user still exists and is active
      const userRepository = request.server.container.resolve('userRepository');
      const user = await userRepository.findById(decoded.id);


      if (action[user && user.status ? 'success' : 'error']('inactiveUser')) return reply;

      // Attach user to request
      request.user = {
        id: user.id,
        email: user.email,
        status: user.status,
      };

      // Log successful authentication
      logger.debug('User authenticated' + user.email);

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
          error: ERROR_MESSAGES.INVALID_TOKEN,
          message: 'Token has expired'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
          error: ERROR_MESSAGES.INVALID_TOKEN,
          message: 'Invalid token'
        });
      }

      throw error;
    }

  } catch (error) {
    logger.error(`Auth hook error:, ${error}`);
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Authentication error'
    });
  }
};

// Role-based access control decorator
const requireRole = (...allowedRoles) => {
  return async (request, reply) => {
    if (!request.user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      logger.warn('Access denied', {
        userId: request.user.id,
        userRole: request.user.role,
        requiredRoles: allowedRoles,
        path: request.url
      });

      return reply.code(HTTP_STATUS.FORBIDDEN).send({
        error: ERROR_MESSAGES.FORBIDDEN,
        message: 'Insufficient permissions'
      });
    }
  };
};

// Optional auth - doesn't fail if no token, but attaches user if valid
const optionalAuth = async (request, reply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer === 'Bearer' && token) {
    try {
      const decoded = await request.server.jwt.verify(token);
      const userRepository = request.server.container.resolve('userRepository');
      const user = await userRepository.findById(decoded.id);

      if (user && user.status === 'active') {
        request.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status
        };
      }
    } catch (error) {
      // Ignore token errors for optional auth
      logger.debug('Optional auth token error:', error.message);
    }
  }
};

module.exports = { authHook, requireRole, optionalAuth };
```

### 3. Error Hook (src/hooks/error.hook.js)

```javascript
const { logger, logError } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const errorHook = async (request, reply, error) => {
  // Log the error with context
  logError(error, {
    requestId: request.id,
    method: request.method,
    url: request.url,
    userId: request.user?.id,
    ip: request.ip
  });

  // Handle specific error types
  if (error.validation) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
  }

  if (error.name === 'SequelizeValidationError') {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: 'Validation Error',
      message: 'Database validation failed',
      details: error.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return reply.code(HTTP_STATUS.CONFLICT).send({
      error: 'Conflict',
      message: 'Duplicate entry found',
      details: error.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: 'Constraint Error',
      message: 'Foreign key constraint failed'
    });
  }

  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
      details: error.details
    });
  }

  // Default to internal server error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
    error: ERROR_MESSAGES.INTERNAL_ERROR,
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack })
  });
};

// Not found handler
const notFoundHandler = (request, reply) => {
  reply.code(HTTP_STATUS.NOT_FOUND).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: HTTP_STATUS.NOT_FOUND
  });
};

// Method not allowed handler
const methodNotAllowedHandler = (request, reply) => {
  reply.code(405).send({
    error: 'Method Not Allowed',
    message: `Method ${request.method} not allowed for ${request.url}`,
    statusCode: 405
  });
};

module.exports = {
  errorHook,
  notFoundHandler,
  methodNotAllowedHandler
};
```

## Implementation Components

### 1. Request Logging Middleware

**File**: `src/common/middleware/request-logging.middleware.ts`

**Purpose**: Similar to Fastify's `loggingHook` + `contextHook` + `performanceHook`

**Responsibilities**:
- Generate unique request ID (x-request-id)
- Generate correlation ID (x-correlation-id)
- Initialize request context (startTime, userAgent, ip)
- Set up performance tracking segments
- Log request start
- Log request completion with response time
- Log slow requests (>1000ms)
- Log performance metrics for requests >100ms

**Usage**:
```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
```

**Performance Segments**:
- `auth`: Authentication/authorization time
- `validation`: Request validation time
- `business`: Business logic execution time
- `database`: Database query time
- `total`: Total request duration

### 2. Authentication Guard

**File**: `src/common/guards/auth.guard.ts`

**Purpose**: Similar to Fastify's `authHook`

**Responsibilities**:
- Verify JWT token from Authorization header
- Check user status (active/inactive)
- Attach user to request object
- Log authentication events
- Handle token expiration and validation errors

**Usage**:
```typescript
// Controller level
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {}

// Method level
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {}

// Global application
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
]
```

### 3. Role-Based Access Control Guard

**File**: `src/common/guards/roles.guard.ts`

**Purpose**: Similar to Fastify's `requireRole` decorator

**Responsibilities**:
- Check if user has required role
- Log access denied events
- Return 403 Forbidden if unauthorized

**Usage**:
```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('admin')
export class AdminController {}
```

### 4. Performance Interceptor

**File**: `src/common/interceptors/performance.interceptor.ts`

**Purpose**: Similar to Fastify's `performanceHook`

**Responsibilities**:
- Measure execution time of handlers
- Log performance metrics
- Track database query times
- Identify slow endpoints

**Usage**:
```typescript
// Global
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: PerformanceInterceptor,
  },
]

// Controller/Method level
@UseInterceptors(PerformanceInterceptor)
@Controller('users')
export class UsersController {}
```

### 5. Transform Interceptor

**File**: `src/common/interceptors/transform.interceptor.ts`

**Purpose**: Standardize response format

**Responsibilities**:
- Wrap responses in consistent format
- Add metadata (timestamp, requestId)
- Handle pagination metadata

**Response Format**:
```typescript
{
  success: true,
  data: T,
  meta: {
    requestId: string,
    timestamp: string,
    // ... other metadata
  }
}
```

### 6. Exception Filter

**File**: `src/common/filters/http-exception.filter.ts`

**Purpose**: Similar to Fastify's `errorHook`

**Responsibilities**:
- Catch all exceptions
- Log errors with context
- Classify errors by severity
- Return standardized error responses
- Trigger alerts for critical errors

**Error Classification**:
- **FATAL**: System-level errors, require immediate attention
- **ERROR**: Application errors, should be investigated
- **WARN**: Client errors (4xx), expected behavior
- **INFO**: Informational errors

**Usage**:
```typescript
// Global
providers: [
  {
    provide: APP_FILTER,
    useClass: HttpExceptionFilter,
  },
]
```

### 7. Logging Helpers Service

**File**: `src/infrastructure/logger/logging-helpers.service.ts`

**Purpose**: Centralized logging helper methods

**Methods**:
- `logRequest(req, res, responseTime)`: Log API requests
- `logQuery(query, duration, operation)`: Log database queries
- `logCache(operation, key, hit)`: Log cache operations
- `logQueue(queue, operation, message)`: Log queue messages
- `logExternalApi(service, method, url, statusCode, duration)`: Log external API calls
- `logBusinessEvent(event, data)`: Log business events
- `logSecurityEvent(event, data)`: Log security events
- `logPerformance(metric, value, unit)`: Log performance metrics
- `logError(error, context)`: Log errors with classification
- `auditLog(action, userId, resourceType, resourceId, changes)`: Log audit trails

## Request Lifecycle

```
1. Request arrives
   ↓
2. Middleware executes (RequestLoggingMiddleware)
   - Generate request/correlation IDs
   - Initialize context
   - Set up performance tracking
   - Log request start
   ↓
3. Guards execute (AuthGuard, RolesGuard)
   - Verify authentication
   - Check authorization
   ↓
4. Interceptors execute (before handler)
   - PerformanceInterceptor starts timing
   ↓
5. Controller handler executes
   - Business logic
   - Performance segments tracked
   ↓
6. Interceptors execute (after handler)
   - PerformanceInterceptor logs metrics
   - TransformInterceptor formats response
   ↓
7. Response sent
   ↓
8. Middleware finish event
   - Log request completion
   - Log slow requests
   - Log performance metrics
   ↓
9. Exception Filter (if error)
   - Catch and log errors
   - Return error response
```

## Logging Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **fatal** | System failures | Database connection lost, out of memory |
| **error** | Application errors | Unhandled exceptions, failed operations |
| **warn** | Warning conditions | Slow requests, deprecated usage |
| **info** | Informational | Request start/completion, user actions |
| **debug** | Debug information | Performance segments, query details |
| **trace** | Very detailed | Function entry/exit, variable states |

## Log Format

### Request Start
```json
{
  "level": "info",
  "time": "2024-06-03T11:00:00.000Z",
  "context": "Request",
  "message": "Request started",
  "type": "request_start",
  "requestId": "uuid",
  "correlationId": "uuid",
  "method": "GET",
  "url": "/api/v1/users",
  "userAgent": "Mozilla/5.0...",
  "ip": "127.0.0.1"
}
```

### API Request
```json
{
  "level": "info",
  "time": "2024-06-03T11:00:00.100Z",
  "context": "API",
  "message": "API Request",
  "type": "api_request",
  "method": "GET",
  "url": "/api/v1/users",
  "statusCode": 200,
  "responseTime": 100,
  "userId": "user-uuid",
  "requestId": "uuid"
}
```

### Request Completed
```json
{
  "level": "info",
  "time": "2024-06-03T11:00:00.100Z",
  "context": "",
  "message": "",
  "type": "request_completed",
  "requestId": "uuid",
  "res": {
    "statusCode": 200,
    "headers": { ... }
  },
  "responseTime": 100
}
```

### Performance Segment
```json
{
  "level": "debug",
  "time": "2024-06-03T11:00:00.050Z",
  "context": "Performance",
  "message": "Segment: database",
  "type": "performance_segment",
  "requestId": "uuid",
  "segment": "database",
  "duration": 45
}
```

### Slow Request
```json
{
  "level": "warn",
  "time": "2024-06-03T11:00:01.500Z",
  "context": "Performance",
  "message": "Slow request detected",
  "type": "slow_request",
  "requestId": "uuid",
  "method": "GET",
  "url": "/api/v1/users",
  "duration": 1500,
  "statusCode": 200
}
```

### Error
```json
{
  "level": "error",
  "time": "2024-06-03T11:00:00.100Z",
  "context": "Error",
  "message": "Application Error",
  "type": "application_error",
  "severity": "error",
  "category": "database",
  "shouldAlert": true,
  "error": {
    "message": "Connection timeout",
    "stack": "...",
    "code": "ETIMEDOUT",
    "name": "Error"
  },
  "requestId": "uuid"
}
```

## Configuration

### Environment Variables
```env
# Logging Configuration
LOG_LEVEL=info              # Default log level
LOG_FORMAT=pretty           # pretty or json
LOG_REDACT_ENABLED=true     # Redact sensitive data
```

### Pino Configuration
**File**: `src/infrastructure/logger/pino.config.ts`

- **Development**: Pretty-printed logs with colors
- **Production**: JSON logs for log aggregation
- **Redaction**: Automatically redacts sensitive fields (passwords, tokens, etc.)

## Best Practices

### 1. Use Appropriate Log Levels
- Don't log everything at INFO level
- Use DEBUG for detailed performance segments
- Use WARN for expected error conditions (4xx)
- Use ERROR for unexpected errors (5xx)

### 2. Include Context
- Always include requestId in logs
- Include userId when available
- Include correlationId for distributed tracing

### 3. Don't Log Sensitive Data
- Passwords, tokens, secrets are automatically redacted
- Be careful with PII in logs
- Use auditLog for sensitive operations

### 4. Performance Considerations
- Logging should not impact performance
- Use async logging where possible
- Avoid logging in tight loops
- Sample high-volume logs in production

### 5. Structured Logging
- Use structured objects, not string concatenation
- Consistent field names across logs
- Use types for log metadata

## Monitoring & Alerting

### Metrics to Track
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Slow request percentage
- Database query times
- Cache hit rates

### Alerts to Configure
- Error rate > 5%
- Response time p95 > 1000ms
- 5xx errors detected
- Database connection failures
- Out of memory errors

## Comparison with Fastify

| Feature | Fastify | NestJS |
|---------|---------|--------|
| Request Logging | `loggingHook` | Middleware |
| Context | `contextHook` | Middleware |
| Performance | `performanceHook` | Interceptor |
| Response Logging | `onSendHook` | Middleware + Interceptor |
| Authentication | `authHook` | Guard |
| Error Handling | `errorHook` | Exception Filter |
| RBAC | `requireRole` | Guard + Decorator |

## Future Enhancements

1. **Distributed Tracing**: Integrate with OpenTelemetry/Jaeger
2. **Log Aggregation**: Integration with ELK, Loki, or CloudWatch
3. **Real-time Monitoring**: Dashboard with Grafana
4. **Alert Integration**: PagerDuty, Slack, email alerts
5. **Log Sampling**: Reduce log volume in production
6. **Structured Error Tracking**: Sentry integration
7. **Request Correlation**: Cross-service tracing
8. **Performance Profiling**: Detailed profiling for slow requests

## References

- [NestJS Middleware](https://docs.nestjs.com/middleware)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Pino Logger](https://getpino.io/)
- [Fastify Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
