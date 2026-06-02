# Logging Guide

## Overview

This guide explains how to use the production-grade logging system in the NestJS boilerplate. The logging system is powered by **Pino**, an industry-standard Node.js logger with structured JSON logging, performance monitoring, and security features.

## Features

- **Structured JSON Logging** - All logs are structured JSON for easy parsing by log aggregators
- **Request Lifecycle Tracking** - Automatic request ID, correlation ID, and response time tracking
- **Performance Monitoring** - Segment-based performance tracking with slow request detection
- **Data Redaction** - Automatic redaction of sensitive fields (passwords, tokens, etc.)
- **Error Classification** - Automatic error categorization and severity determination
- **Child Loggers** - Per-module child loggers for better context and filtering
- **Audit Logging** - Built-in audit logging for compliance
- **Environment-based Formatting** - Pretty printing in development, JSON in production

## Basic Usage

### Inject Logger

```typescript
import { Injectable } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class UserService {
  constructor(private readonly logger: ILogger) {}
}
```

### Log Levels

```typescript
this.logger.fatal('UserService', 'Fatal error occurred', { userId });
this.logger.error('UserService', 'Error occurred', error.stack, { userId });
this.logger.warn('UserService', 'Warning message', { context });
this.logger.log('UserService', 'Info message', { data });
this.logger.info('UserService', 'Info message', { data });
this.logger.debug('UserService', 'Debug message', { debugData });
this.logger.trace('UserService', 'Trace message', { traceData });
```

### Child Loggers

Create child loggers for better module-specific context:

```typescript
constructor(baseLogger: ILogger) {
  // Create child logger for this service
  this.logger = baseLogger.child('UserService');
}

// All logs will now include "UserService" as context
this.logger.log('UserService', 'User created', { userId });
```

**Note:** The `BaseService` automatically creates child loggers, so services extending it don't need to do this manually.

## Structured Logging Helpers

The boilerplate includes specialized logging helpers for common operations. Inject the `ILoggingHelpers` interface:

```typescript
import { Injectable } from '@nestjs/common';
import { LOGGING_HELPERS, ILoggingHelpers } from '@core/domain/logging-helpers.interface';

@Injectable()
export class OrderService {
  constructor(@Inject(LOGGING_HELPERS) private readonly loggingHelpers: ILoggingHelpers) {}
}
```

### Available Helpers

#### API Request Logging

```typescript
this.loggingHelpers.logRequest(req, res, 150);
```

Logs HTTP request details including method, URL, status code, response time, and user ID.

#### Database Query Logging

```typescript
this.loggingHelpers.logQuery('SELECT * FROM users', 25, 'read');
```

Logs database queries with duration and operation type. Automatically sanitizes sensitive data.

#### Cache Operation Logging

```typescript
this.loggingHelpers.logCache('get', 'user:123', true);
```

Logs cache operations (get, set, delete) with hit/miss status.

#### Queue Message Logging

```typescript
this.loggingHelpers.logQueue('orders', 'consume', message);
```

Logs queue message operations with message ID and type.

#### External API Call Logging

```typescript
this.loggingHelpers.logExternalApi('Stripe', 'POST', '/charges', 200, 350);
```

Logs external API calls with service, method, URL, status code, and duration.

#### Business Event Logging

```typescript
this.loggingHelpers.logBusinessEvent('USER_CREATED', { userId, email });
```

Logs business events for tracking and analytics.

#### Security Event Logging

```typescript
this.loggingHelpers.logSecurityEvent('LOGIN_FAILED', { email, ip });
```

Logs security-related events for monitoring and alerting.

#### Performance Metric Logging

```typescript
this.loggingHelpers.logPerformance('db_query_time', 150, 'ms');
```

Logs custom performance metrics.

#### Error Logging

```typescript
this.loggingHelpers.logError(error, { userId, action });
```

Logs errors with automatic classification (severity, category) and context.

#### Audit Logging

```typescript
this.loggingHelpers.auditLog('UPDATE', '123', 'User', '123', { email });
```

Logs audit trails for compliance with action, user, resource, and changes.

## Performance Monitoring

### Manual Performance Tracking

The request middleware automatically tracks overall request performance. For segment-based tracking:

```typescript
// Start a segment
req.performance.start('database');

// ... database operation ...

// End the segment
req.performance.end('database');

// Get all metrics
const metrics = req.performance.getMetrics();
```

Available segments:
- `auth` - Authentication/authorization
- `validation` - Request validation
- `business` - Business logic
- `database` - Database operations
- `total` - Total request time (auto-calculated)

### Slow Request Detection

Requests taking longer than `LOG_SLOW_REQUEST_THRESHOLD` (default: 1000ms) are automatically logged as slow requests.

## Configuration

### Environment Variables

```bash
# Log level (fatal, error, warn, info, debug, trace)
LOG_LEVEL=info

# Log format (json, pretty)
LOG_FORMAT=json

# Enable data redaction
LOG_REDACT_ENABLED=true

# Enable request logging
LOG_REQUEST_ENABLED=true

# Slow request threshold in milliseconds
LOG_SLOW_REQUEST_THRESHOLD=1000
```

### Development vs Production

**Development (NODE_ENV=development):**
- Pretty-printed logs with colors
- Human-readable timestamps
- More verbose by default

**Production (NODE_ENV=production):**
- Structured JSON logs
- ISO timestamps
- Optimized for log aggregators (ELK, Splunk, Datadog)

## Data Redaction

The logger automatically redacts sensitive fields to prevent data leakage:

**Redacted Fields:**
- `req.headers.authorization`
- `req.headers.cookie`
- `*.password`
- `*.token`
- `*.secret`
- `*.creditCard`
- `*.ssn`
- `*.apiKey`
- `*.accessToken`
- `*.refreshToken`

All redacted values are replaced with `[REDACTED]`.

## Error Classification

Errors are automatically classified by severity and category:

**Severity Levels:**
- `fatal` - Application cannot continue
- `error` - Error condition
- `warn` - Warning condition
- `info` - Informational

**Error Categories:**
- `database` - Database-related errors
- `network` - Network connectivity errors
- `validation` - Input validation errors
- `authentication` - Authentication failures
- `authorization` - Authorization failures
- `business_logic` - Business logic errors
- `external_service` - External API errors
- `unknown` - Uncategorized errors

Errors with severity `error` or `fatal` trigger alerts (can be integrated with PagerDuty, Slack, etc.).

## Request Context

Every HTTP request automatically includes:

- **Request ID** - Unique identifier for the request (from header or generated)
- **Correlation ID** - For distributed tracing (from header or generated)
- **Response Time** - Total request duration
- **Performance Segments** - Breakdown of time spent in different segments

**Response Headers:**
- `x-request-id` - Request identifier
- `x-correlation-id` - Correlation identifier
- `x-response-time` - Request duration in milliseconds

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// Fatal - Application cannot continue
this.logger.fatal('Service', 'Database connection failed');

// Error - Error conditions that need attention
this.logger.error('Service', 'Failed to process payment', error.stack);

// Warn - Warning conditions that don't prevent operation
this.logger.warn('Service', 'Rate limit approaching', { remaining: 10 });

// Info - Normal operational messages
this.logger.info('Service', 'User logged in', { userId });

// Debug - Detailed diagnostic information
this.logger.debug('Service', 'Cache miss', { key });

// Trace - Very detailed tracing information
this.logger.trace('Service', 'Function entry', { params });
```

### 2. Include Context

Always include relevant context in logs:

```typescript
// Good
this.logger.error('UserService', 'User creation failed', error.stack, {
  userId: '123',
  email: 'user@example.com',
  attempt: 3,
});

// Bad
this.logger.error('UserService', 'User creation failed');
```

### 3. Use Structured Helpers

Use the specialized helpers instead of generic logging for common operations:

```typescript
// Good
this.loggingHelpers.logQuery('SELECT * FROM users', 25, 'read');

// Bad
this.logger.debug('Database', 'Query took 25ms');
```

### 4. Use Child Loggers

Create child loggers for modules to improve log filtering:

```typescript
// Good
this.logger = baseLogger.child('UserService');

// Bad - no module context
this.logger = baseLogger;
```

### 5. Sanitize Sensitive Data

The logger automatically redacts known sensitive fields, but be careful with custom fields:

```typescript
// Good - automatically redacted
this.logger.info('Auth', 'Login attempt', { password: 'secret' });

// Good - manually redacted
this.logger.info('Auth', 'Login attempt', { 
  apiKey: apiKey.substring(0, 8) + '***' 
});
```

## Log Aggregation

The structured JSON logs are compatible with all major log aggregation platforms:

### ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# Filebeat configuration
filebeat.inputs:
- type: log
  paths:
    - /var/log/app/*.log
  json.keys_under_root: true
  json.add_error_key: true
```

### Datadog

```bash
# Install Datadog agent
# Logs are automatically sent with proper JSON parsing
```

### Splunk

```bash
# Use HEC (HTTP Event Collector) with JSON sourcetype
```

### CloudWatch Logs

```bash
# Send logs to CloudWatch Logs Insights
# JSON format enables powerful querying
```

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` - ensure it's set appropriately
2. Verify logger is injected correctly
3. Check for syntax errors in log calls

### Pretty Printing Not Working

1. Ensure `LOG_FORMAT=pretty` in development
2. Verify `NODE_ENV=development`
3. Check that `pino-pretty` is installed

### Data Not Redacted

1. Verify `LOG_REDACT_ENABLED=true`
2. Check that field names match redaction patterns
3. Add custom fields to redaction paths if needed

### Performance Impact

If logging is causing performance issues:

1. Increase `LOG_SLOW_REQUEST_THRESHOLD`
2. Set `LOG_LEVEL` to `warn` or `error` in production
3. Disable verbose logging in production
4. Consider sampling high-volume logs

## Migration from Old Logger

If you're migrating from the old ConsoleLogger-based implementation:

1. Update imports from `@nestjs/common` to `@core/domain/logger.interface`
2. Change method signatures to include context parameter
3. Add meta parameter for structured data
4. Consider using logging helpers for common operations
5. Update BaseService to use child loggers (already done)

**Before:**
```typescript
this.logger.log('User created');
this.logger.error('Error occurred', error.stack);
```

**After:**
```typescript
this.logger.log('UserService', 'User created', { userId });
this.logger.error('UserService', 'Error occurred', error.stack, { userId });
```

## Additional Resources

- [Pino Documentation](https://getpino.io/)
- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
- [Logging Best Practices](https://medium.com/@copyconstruct/logging-best-practices-5f4ff797dbb)
