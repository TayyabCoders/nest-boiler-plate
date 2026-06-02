# Logging Implementation Plan
## Upgrading NestJS Boilerplate to Production-Grade Logging

**Created:** June 2, 2026  
**Status:** Planning Phase  
**Target:** Match Fastify boilerplate logging capabilities

---

## Executive Summary

This implementation plan outlines the steps required to upgrade the NestJS boilerplate logging system from a basic ConsoleLogger wrapper to a production-grade logging solution matching the Fastify boilerplate's capabilities. The plan follows a phased approach to ensure minimal disruption while adding critical logging features.

**Goal:** Transform the current basic logging into enterprise-grade logging with structured logging, security features, performance monitoring, and comprehensive request lifecycle tracking.

---

## Current State Analysis

### Existing Implementation
- **Files:** 3 files (87 lines total)
  - `src/core/domain/logger.interface.ts` (6 lines)
  - `src/infrastructure/logger/logger.module.ts` (16 lines)
  - `src/infrastructure/logger/logger.adapter.ts` (65 lines)
- **Logger:** NestJS ConsoleLogger (extended)
- **Features:** Basic log levels, context strings, incomplete secondary logging
- **Status:** Not production-ready

### Gaps Identified
1. No structured logging (JSON format)
2. No data redaction (security risk)
3. No request/response serialization
4. No request lifecycle hooks
5. No performance monitoring
6. No audit logging
7. No specialized logging helpers
8. No child logger support
9. Incomplete secondary logging
10. No environment-based formatting

---

## Implementation Strategy

### Approach
1. **Adopt Pino** - Industry-standard Node.js logger (same as Fastify)
2. **Maintain Architecture** - Keep DDD, DI, and TypeScript patterns
3. **Phased Rollout** - Implement features incrementally
4. **Backward Compatibility** - Preserve existing ILogger interface
5. **Configuration-Driven** - Use environment variables for flexibility

### Technology Stack
- **Core Logger:** Pino (pino, pino-pretty)
- **Type Definitions:** @types/pino
- **Serialization:** Pino built-in serializers
- **Formatting:** pino-pretty (development), JSON (production)

---

## Phase 1: Foundation Setup

### Objective
Replace ConsoleLogger with Pino while maintaining existing interface

### Tasks

#### 1.1 Install Dependencies
```bash
npm install pino pino-pretty
npm install --save-dev @types/pino
```

#### 1.2 Update Environment Configuration
**File:** `src/config/env.validation.ts`

Add logging configuration:
```typescript
LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
LOG_REDACT_ENABLED: z.preprocess((val) => val === 'true', z.boolean()).default(true),
LOG_REQUEST_ENABLED: z.preprocess((val) => val === 'true', z.boolean()).default(true),
LOG_SLOW_REQUEST_THRESHOLD: z.coerce.number().default(1000),
```

#### 1.3 Create Pino Configuration
**File:** `src/infrastructure/logger/pino.config.ts`

```typescript
import pino from 'pino';

export const createPinoConfig = (configService: ConfigService) => {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const logFormat = configService.get<string>('LOG_FORMAT') || (isDevelopment ? 'pretty' : 'json');
  
  return {
    name: 'nest-boilerplate',
    level: configService.get<string>('LOG_LEVEL') || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    redact: configService.get<boolean>('LOG_REDACT_ENABLED') 
      ? {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.token',
            '*.secret',
            '*.creditCard',
            '*.ssn',
            '*.apiKey',
          ],
          censor: '[REDACTED]',
          remove: true,
        }
      : undefined,
    transport: logFormat === 'pretty' 
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  };
};
```

#### 1.4 Refactor LoggerAdapter
**File:** `src/infrastructure/logger/logger.adapter.ts`

Replace ConsoleLogger with Pino:
```typescript
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import { createPinoConfig } from './pino.config';
import { ILogger } from '@core/domain/logger.interface';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerAdapter implements ILogger, LoggerService {
  private readonly logger: pino.Logger;
  private readonly secondaryLogging: string;

  constructor(private readonly configService: ConfigService) {
    const pinoConfig = createPinoConfig(this.configService);
    this.logger = pino(pinoConfig);
    this.secondaryLogging = this.configService.get<string>('SECONDARY_LOGGING') || 'NONE';
  }

  debug(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.debug({ context, ...meta }, message);
  }

  log(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.info({ context, ...meta }, message);
    this.dispatchToSecondary('info', context, message, meta);
  }

  error(context: string, message: string, trace?: string, meta?: Record<string, unknown>): void {
    this.logger.error({ context, stack: trace, ...meta }, message);
    this.dispatchToSecondary('error', context, message, { ...meta, stack: trace });
  }

  warn(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.warn({ context, ...meta }, message);
    this.dispatchToSecondary('warn', context, message, meta);
  }

  // LoggerService interface methods
  verbose(message: any, context?: string): void {
    this.logger.trace({ context: context || 'App' }, message);
  }

  // ... existing secondary logging methods
}
```

#### 1.5 Update ILogger Interface
**File:** `src/core/domain/logger.interface.ts`

Add missing log levels:
```typescript
export abstract class ILogger {
  abstract fatal(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract error(context: string, message: string, trace?: string, meta?: Record<string, unknown>): void;
  abstract warn(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract log(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract info(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract debug(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract trace(context: string, message: string, meta?: Record<string, unknown>): void;
}
```

### Deliverables
- ✅ Pino logger integrated
- ✅ Environment configuration updated
- ✅ Backward compatible interface
- ✅ Pretty printing for development
- ✅ JSON logging for production

### Testing
- Verify logger outputs in development (pretty format)
- Verify logger outputs in production (JSON format)
- Test all log levels
- Verify data redaction works

---

## Phase 2: Child Logger Support

### Objective
Enable per-module child loggers for better context and filtering

### Tasks

#### 2.1 Add Child Logger Method to ILogger
**File:** `src/core/domain/logger.interface.ts`

```typescript
export abstract class ILogger {
  // ... existing methods
  abstract child(context: string, meta?: Record<string, unknown>): ILogger;
}
```

#### 2.2 Implement Child Logger in LoggerAdapter
**File:** `src/infrastructure/logger/logger.adapter.ts`

```typescript
child(context: string, meta?: Record<string, unknown>): ILogger {
  const childLogger = this.logger.child({ context, ...meta });
  
  // Create a new instance with the child logger
  const adapter = new LoggerAdapter(this.configService);
  adapter.logger = childLogger;
  
  return adapter;
}
```

#### 2.3 Update BaseService to Use Child Loggers
**File:** `src/core/application/services/base.service.ts`

```typescript
export abstract class BaseService<T, R extends IBaseRepository<T>> {
  protected readonly logger: ILogger;

  constructor(
    protected readonly repository: R,
    baseLogger: ILogger,
    protected readonly serviceName: string,
  ) {
    // Create child logger for this service
    this.logger = baseLogger.child(serviceName);
  }

  async findAll(): Promise<T[]> {
    this.logger.log(serviceName, `Fetching all records`);
    return this.repository.findAll();
  }
}
```

### Deliverables
- ✅ Child logger support
- ✅ Per-module context
- ✅ Better log filtering

### Testing
- Create child loggers in different services
- Verify context propagation
- Test log filtering by module

---

## Phase 3: Structured Logging Helpers

### Objective
Create specialized logging helpers for common operations

### Tasks

#### 3.1 Create Logging Helpers Interface
**File:** `src/core/domain/logging-helpers.interface.ts`

```typescript
export interface ILoggingHelpers {
  logRequest(req: any, res: any, responseTime: number): void;
  logQuery(query: string, duration: number, operation: string): void;
  logCache(operation: string, key: string, hit: boolean | null): void;
  logQueue(queue: string, operation: string, message: any): void;
  logExternalApi(service: string, method: string, url: string, statusCode: number, duration: number): void;
  logBusinessEvent(event: string, data: Record<string, unknown>): void;
  logSecurityEvent(event: string, data: Record<string, unknown>): void;
  logPerformance(metric: string, value: number, unit?: string): void;
  logError(error: Error, context?: Record<string, unknown>): void;
  auditLog(action: string, userId: string, resourceType: string, resourceId: string, changes?: Record<string, unknown>): void;
}
```

#### 3.2 Implement Logging Helpers
**File:** `src/infrastructure/logger/logging-helpers.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { ILoggingHelpers } from '@core/domain/logging-helpers.interface';

@Injectable()
export class LoggingHelpersService implements ILoggingHelpers {
  constructor(private readonly logger: ILogger) {}

  logRequest(req: any, res: any, responseTime: number): void {
    this.logger.info('API', 'API Request', {
      type: 'api_request',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.id,
      requestId: req.id,
    });
  }

  logQuery(query: string, duration: number, operation: string): void {
    this.logger.debug('Database', 'Database Query', {
      type: 'db_query',
      query: this.sanitizeQuery(query),
      duration,
      operation,
    });
  }

  logCache(operation: string, key: string, hit: boolean | null): void {
    this.logger.debug('Cache', 'Cache Operation', {
      type: 'cache_operation',
      operation,
      key,
      hit,
    });
  }

  logQueue(queue: string, operation: string, message: any): void {
    this.logger.debug('Queue', 'Queue Message', {
      type: 'queue_message',
      queue,
      operation,
      messageId: message.id,
      messageType: message.type,
    });
  }

  logExternalApi(service: string, method: string, url: string, statusCode: number, duration: number): void {
    this.logger.info('ExternalAPI', 'External API Call', {
      type: 'external_api',
      service,
      method,
      url,
      statusCode,
      duration,
    });
  }

  logBusinessEvent(event: string, data: Record<string, unknown>): void {
    this.logger.info('Business', `Business Event: ${event}`, {
      type: 'business_event',
      event,
      ...data,
    });
  }

  logSecurityEvent(event: string, data: Record<string, unknown>): void {
    this.logger.warn('Security', `Security Event: ${event}`, {
      type: 'security_event',
      event,
      ...data,
    });
  }

  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.logger.info('Performance', 'Performance Metric', {
      type: 'performance_metric',
      metric,
      value,
      unit,
    });
  }

  logError(error: Error, context: Record<string, unknown> = {}): void {
    const errorInfo = {
      type: 'application_error',
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        name: error.name,
      },
      ...context,
    };

    const statusCode = (error as any).statusCode;
    if (statusCode >= 500 || !statusCode) {
      this.logger.error('Error', 'Application Error', error.stack, errorInfo);
    } else {
      this.logger.warn('Error', 'Client Error', errorInfo);
    }
  }

  auditLog(action: string, userId: string, resourceType: string, resourceId: string, changes: Record<string, unknown> = {}): void {
    this.logger.info('Audit', `Audit: ${action} on ${resourceType}`, {
      type: 'audit_log',
      action,
      userId,
      resourceType,
      resourceId,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from queries
    return query.replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'");
  }
}
```

#### 3.3 Add Helpers to LoggerModule
**File:** `src/infrastructure/logger/logger.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { ILoggingHelpers } from '@core/domain/logging-helpers.interface';
import { LoggerAdapter } from './logger.adapter';
import { LoggingHelpersService } from './logging-helpers.service';

@Global()
@Module({
  providers: [
    {
      provide: ILogger,
      useClass: LoggerAdapter,
    },
    {
      provide: ILoggingHelpers,
      useClass: LoggingHelpersService,
    },
  ],
  exports: [ILogger, ILoggingHelpers],
})
export class LoggerModule {}
```

### Deliverables
- ✅ Structured logging helpers
- ✅ Specialized methods for common operations
- ✅ Consistent log format
- ✅ Query sanitization

### Testing
- Test each helper method
- Verify structured output
- Test query sanitization
- Verify error classification

---

## Phase 4: Request Lifecycle Logging

### Objective
Implement request lifecycle hooks with tracing and performance monitoring

### Tasks

#### 4.1 Create Request Context Interface
**File:** `src/core/domain/request-context.interface.ts`

```typescript
export interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export interface PerformanceSegments {
  auth: number;
  validation: number;
  business: number;
  database: number;
  total: number;
}
```

#### 4.2 Create Request Logging Middleware
**File:** `src/common/middleware/request-logging.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '@core/domain/logger.interface';
import { ILoggingHelpers } from '@core/domain/logging-helpers.interface';

declare global {
  namespace Express {
    interface Request {
      id: string;
      correlationId: string;
      context: RequestContext;
      performance: {
        start: (segment: keyof PerformanceSegments) => void;
        end: (segment: keyof PerformanceSegments) => void;
        getMetrics: () => PerformanceSegments;
      };
    }
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: ILogger,
    private readonly loggingHelpers: ILoggingHelpers,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate request ID
    req.id = req.headers['x-request-id'] as string || uuidv4();
    req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Set response headers
    res.setHeader('x-request-id', req.id);
    res.setHeader('x-correlation-id', req.correlationId);

    // Initialize request context
    req.context = {
      requestId: req.id,
      correlationId: req.correlationId,
      startTime: Date.now(),
      userAgent: req.headers['user-agent'] as string,
      ip: req.ip,
    };

    // Initialize performance tracking
    const segments: PerformanceSegments = {
      auth: 0,
      validation: 0,
      business: 0,
      database: 0,
      total: 0,
    };

    req.performance = {
      start: (segment: keyof PerformanceSegments) => {
        segments[segment] = Date.now();
      },
      end: (segment: keyof PerformanceSegments) => {
        if (segments[segment]) {
          const duration = Date.now() - segments[segment];
          this.logger.debug('Performance', `Segment: ${segment}`, {
            type: 'performance_segment',
            requestId: req.id,
            segment,
            duration,
          });
        }
      },
      getMetrics: () => segments,
    };

    // Log request start
    this.logger.info('Request', 'Request started', {
      type: 'request_start',
      requestId: req.id,
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      const response = res.send(data);

      // Log request completion
      const duration = Date.now() - req.context.startTime;
      res.setHeader('x-response-time', `${duration}ms`);

      req.loggingHelpers.logRequest(req, res, duration);

      // Slow request detection
      const threshold = process.env.LOG_SLOW_REQUEST_THRESHOLD ? parseInt(process.env.LOG_SLOW_REQUEST_THRESHOLD) : 1000;
      if (duration > threshold) {
        req.logger.warn('Performance', 'Slow request detected', {
          type: 'slow_request',
          requestId: req.id,
          method: req.method,
          url: req.url,
          duration,
          statusCode: res.statusCode,
        });
      }

      // Log performance metrics
      segments.total = duration;
      if (duration > 100) {
        req.logger.info('Performance', 'Request performance', {
          type: 'request_performance',
          requestId: req.id,
          metrics: segments,
        });
      }

      return response;
    };

    next();
  }
}
```

#### 4.3 Register Middleware
**File:** `src/app.module.ts`

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
```

#### 4.4 Update Exception Filter
**File:** `src/common/filters/http-exception.filter.ts`

Add request context to error logging:
```typescript
this.logger.error(
  'AllExceptionsFilter',
  `[${request.method}] ${request.url} - Status: ${status}`,
  exception instanceof Error ? exception.stack : undefined,
  {
    type: 'http_error',
    requestId: request.id,
    correlationId: request.correlationId,
    statusCode: status,
    method: request.method,
    url: request.url,
    error: errorBody,
  },
);
```

### Deliverables
- ✅ Request ID generation and propagation
- ✅ Correlation ID for distributed tracing
- ✅ Request context tracking
- ✅ Performance segment monitoring
- ✅ Slow request detection
- ✅ Request lifecycle logging

### Testing
- Verify request ID generation
- Test correlation ID propagation
- Verify performance segment tracking
- Test slow request detection
- Verify response headers

---

## Phase 5: Enhanced Error Logging

### Objective
Improve error logging with rich context and classification

### Tasks

#### 5.1 Create Error Classification Utility
**File:** `src/infrastructure/logger/error-classifier.util.ts`

```typescript
export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown',
}

export interface ClassifiedError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  shouldAlert: boolean;
}

export function classifyError(error: Error): ClassifiedError {
  const statusCode = (error as any).statusCode;
  const code = (error as any).code;

  // Database errors
  if (code?.startsWith('ER_') || error.message.includes('database') || error.message.includes('query')) {
    return {
      severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      category: ErrorCategory.DATABASE,
      shouldAlert: statusCode >= 500,
    };
  }

  // Network errors
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || error.message.includes('network')) {
    return {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
      shouldAlert: true,
    };
  }

  // Validation errors
  if (statusCode === 400 || error.name === 'ValidationError') {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.VALIDATION,
      shouldAlert: false,
    };
  }

  // Authentication errors
  if (statusCode === 401 || error.message.includes('unauthorized') || error.message.includes('authentication')) {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.AUTHENTICATION,
      shouldAlert: false,
    };
  }

  // Authorization errors
  if (statusCode === 403 || error.message.includes('forbidden') || error.message.includes('authorization')) {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.AUTHORIZATION,
      shouldAlert: false,
    };
  }

  // External service errors
  if (error.message.includes('external') || error.message.includes('api')) {
    return {
      severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      category: ErrorCategory.EXTERNAL_SERVICE,
      shouldAlert: statusCode >= 500,
    };
  }

  // Default
  return {
    severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
    category: ErrorCategory.UNKNOWN,
    shouldAlert: statusCode >= 500,
  };
}
```

#### 5.2 Update LoggingHelpersService
**File:** `src/infrastructure/logger/logging-helpers.service.ts`

Enhance error logging with classification:
```typescript
import { classifyError, ErrorSeverity } from './error-classifier.util';

logError(error: Error, context: Record<string, unknown> = {}): void {
  const classification = classifyError(error);
  
  const errorInfo = {
    type: 'application_error',
    severity: classification.severity,
    category: classification.category,
    shouldAlert: classification.shouldAlert,
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      name: error.name,
    },
    ...context,
  };

  switch (classification.severity) {
    case ErrorSeverity.FATAL:
      this.logger.fatal('Error', 'Fatal Error', error.stack, errorInfo);
      break;
    case ErrorSeverity.ERROR:
      this.logger.error('Error', 'Application Error', error.stack, errorInfo);
      break;
    case ErrorSeverity.WARN:
      this.logger.warn('Error', 'Client Error', errorInfo);
      break;
    default:
      this.logger.info('Error', 'Error Info', errorInfo);
  }

  // Trigger alert if needed
  if (classification.shouldAlert) {
    this.triggerAlert(errorInfo);
  }
}

private triggerAlert(errorInfo: Record<string, unknown>): void {
  // TODO: Integrate with alerting system (PagerDuty, Slack, etc.)
  this.logger.warn('Alert', 'Error alert triggered', errorInfo);
}
```

#### 5.3 Add Fatal Method to ILogger
**File:** `src/core/domain/logger.interface.ts`

```typescript
export abstract class ILogger {
  abstract fatal(context: string, message: string, meta?: Record<string, unknown>): void;
  // ... other methods
}
```

#### 5.4 Implement Fatal in LoggerAdapter
**File:** `src/infrastructure/logger/logger.adapter.ts`

```typescript
fatal(context: string, message: string, meta?: Record<string, unknown>): void {
  this.logger.fatal({ context, ...meta }, message);
}
```

### Deliverables
- ✅ Error classification system
- ✅ Automatic severity determination
- ✅ Error categorization
- ✅ Alert triggering mechanism
- ✅ Enhanced error context

### Testing
- Test error classification for various error types
- Verify severity assignment
- Test alert triggering
- Verify error context completeness

---

## Phase 6: Secondary Logging Integration

### Objective
Complete secondary logging implementation or remove if not needed

### Tasks

#### 6.1 Decision Point
**Option A:** Complete secondary logging implementation  
**Option B:** Remove incomplete secondary logging

#### 6.2A: Complete Mixpanel Integration
**File:** `src/infrastructure/logger/secondary-loggers/mixpanel.logger.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mixpanel from 'mixpanel';

@Injectable()
export class MixpanelLogger {
  private mixpanel: Mixpanel | null = null;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('MIXPANEL_TOKEN');
    if (token) {
      this.mixpanel = Mixpanel.init(token);
    }
  }

  log(level: string, context: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.mixpanel) return;

    const eventName = `${context}_${level}`;
    this.mixpanel.track(eventName, {
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### 6.2B: Complete Google Analytics Integration
**File:** `src/infrastructure/logger/secondary-loggers/google-analytics.logger.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAnalyticsLogger {
  private trackingId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.trackingId = this.configService.get<string>('GA_TRACKING_ID') || null;
  }

  log(level: string, context: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.trackingId) return;

    // TODO: Implement GA4 Measurement Protocol
    // This requires HTTP calls to GA4 API
    console.log(`[GA] ${context}: ${message}`, meta);
  }
}
```

#### 6.3 Update LoggerAdapter
**File:** `src/infrastructure/logger/logger.adapter.ts`

```typescript
import { MixpanelLogger } from './secondary-loggers/mixpanel.logger';
import { GoogleAnalyticsLogger } from './secondary-loggers/google-analytics.logger';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerAdapter implements ILogger, LoggerService {
  private readonly mixpanelLogger: MixpanelLogger;
  private readonly gaLogger: GoogleAnalyticsLogger;

  constructor(private readonly configService: ConfigService) {
    const pinoConfig = createPinoConfig(this.configService);
    this.logger = pino(pinoConfig);
    this.secondaryLogging = this.configService.get<string>('SECONDARY_LOGGING') || 'NONE';
    
    this.mixpanelLogger = new MixpanelLogger(this.configService);
    this.gaLogger = new GoogleAnalyticsLogger(this.configService);
  }

  private dispatchToSecondary(level: string, context: string, message: string, meta?: any): void {
    if (this.secondaryLogging === 'NONE') return;

    switch (this.secondaryLogging) {
      case 'MIXPANEL':
        this.mixpanelLogger.log(level, context, message, meta);
        break;
      case 'GA':
        this.gaLogger.log(level, context, message, meta);
        break;
      default:
        break;
    }
  }
}
```

#### 6.4B: Alternative - Remove Secondary Logging
If secondary logging is not needed, remove from:
- `src/config/env.validation.ts` (remove SECONDARY_LOGGING, MIXPANEL_TOKEN, GA_TRACKING_ID)
- `src/infrastructure/logger/logger.adapter.ts` (remove dispatchToSecondary and related methods)

### Deliverables
- ✅ Complete secondary logging OR
- ✅ Clean removal of unused code

### Testing
- Test Mixpanel integration
- Test Google Analytics integration
- Verify configuration validation

---

## Phase 7: Documentation and Examples

### Objective
Create comprehensive documentation and usage examples

### Tasks

#### 7.1 Create Logging Documentation
**File:** `docs/LOGGING_GUIDE.md`

```markdown
# Logging Guide

## Overview
This guide explains how to use the logging system in the NestJS boilerplate.

## Basic Usage

### Inject Logger
\`\`\`typescript
constructor(private readonly logger: ILogger) {}
\`\`\`

### Log Levels
\`\`\`typescript
this.logger.fatal('Service', 'Fatal error occurred');
this.logger.error('Service', 'Error occurred', error.stack, { userId });
this.logger.warn('Service', 'Warning message', { context });
this.logger.log('Service', 'Info message', { data });
this.logger.info('Service', 'Info message', { data });
this.logger.debug('Service', 'Debug message', { debugData });
this.logger.trace('Service', 'Trace message', { traceData });
\`\`\`

### Child Loggers
\`\`\`typescript
const moduleLogger = this.logger.child('UserService');
moduleLogger.log('UserService', 'User created', { userId });
\`\`\`

## Structured Logging Helpers

### Inject Helpers
\`\`\`typescript
constructor(private readonly loggingHelpers: ILoggingHelpers) {}
\`\`\`

### Available Helpers
\`\`\`typescript
// API requests
this.loggingHelpers.logRequest(req, res, 150);

// Database queries
this.loggingHelpers.logQuery('SELECT * FROM users', 25, 'read');

// Cache operations
this.loggingHelpers.logCache('get', 'user:123', true);

// Queue messages
this.loggingHelpers.logQueue('orders', 'consume', message);

// External API calls
this.loggingHelpers.logExternalApi('Stripe', 'POST', '/charges', 200, 350);

// Business events
this.loggingHelpers.logBusinessEvent('USER_CREATED', { userId, email });

// Security events
this.loggingHelpers.logSecurityEvent('LOGIN_FAILED', { email, ip });

// Performance metrics
this.loggingHelpers.logPerformance('db_query_time', 150, 'ms');

// Error logging
this.loggingHelpers.logError(error, { userId, action });

// Audit logging
this.loggingHelpers.auditLog('UPDATE', '123', 'User', '123', { email });
\`\`\`

## Performance Monitoring

### Manual Performance Tracking
\`\`\`typescript
// Start a segment
req.performance.start('database');

// ... database operation ...

// End the segment
req.performance.end('database');

// Get all metrics
const metrics = req.performance.getMetrics();
\`\`\`

## Configuration

### Environment Variables
\`\`\`
LOG_LEVEL=info
LOG_FORMAT=json
LOG_REDACT_ENABLED=true
LOG_REQUEST_ENABLED=true
LOG_SLOW_REQUEST_THRESHOLD=1000
\`\`\`

## Data Redaction

The logger automatically redacts sensitive fields:
- Authorization headers
- Cookie headers
- Password fields
- Token fields
- Secret fields
- Credit card numbers
- SSN numbers
- API keys
\`\`\`
```

#### 7.2 Update README
**File:** `README.md`

Add logging section:
```markdown
## Logging

The boilerplate includes production-grade logging powered by Pino with:
- Structured JSON logging
- Request lifecycle tracking
- Performance monitoring
- Data redaction for security
- Audit logging
- Error classification

See [docs/LOGGING_GUIDE.md](docs/LOGGING_GUIDE.md) for detailed usage.
```

#### 7.3 Create Example Usage Files
**File:** `src/examples/logging.example.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { ILoggingHelpers } from '@core/domain/logging-helpers.interface';

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: ILogger,
    private readonly loggingHelpers: ILoggingHelpers,
  ) {
    // Create child logger for this service
    this.logger = this.logger.child('ExampleService');
  }

  async exampleMethod() {
    this.logger.log('ExampleService', 'Starting operation', { operation: 'example' });

    try {
      // Log business event
      this.loggingHelpers.logBusinessEvent('OPERATION_STARTED', { id: '123' });

      // Log performance
      const start = Date.now();
      await this.performOperation();
      const duration = Date.now() - start;
      this.loggingHelpers.logPerformance('operation_time', duration);

      this.logger.log('ExampleService', 'Operation completed');
    } catch (error) {
      this.loggingHelpers.logError(error, { operation: 'example' });
      throw error;
    }
  }

  private async performOperation(): Promise<void> {
    // Implementation
  }
}
```

### Deliverables
- ✅ Comprehensive logging guide
- ✅ Updated README
- ✅ Example usage files
- ✅ Configuration documentation

---

## Phase 8: Testing

### Objective
Create comprehensive tests for logging system

### Tasks

#### 8.1 Unit Tests for LoggerAdapter
**File:** `test/infrastructure/logger/logger.adapter.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerAdapter } from '@src/infrastructure/logger/logger.adapter';
import { ILogger } from '@src/core/domain/logger.interface';

describe('LoggerAdapter', () => {
  let logger: ILogger;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ILogger,
          useClass: LoggerAdapter,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                NODE_ENV: 'test',
                LOG_LEVEL: 'debug',
                LOG_FORMAT: 'json',
                LOG_REDACT_ENABLED: 'true',
                SECONDARY_LOGGING: 'NONE',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    logger = module.get<ILogger>(ILogger);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should log debug messages', () => {
    const spy = jest.spyOn(logger, 'debug').mockImplementation(() => {});
    logger.debug('TestContext', 'Debug message', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('TestContext', 'Debug message', { key: 'value' });
  });

  it('should log error messages with stack trace', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const error = new Error('Test error');
    logger.error('TestContext', 'Error message', error.stack, { key: 'value' });
    expect(spy).toHaveBeenCalledWith('TestContext', 'Error message', error.stack, { key: 'value' });
  });

  // Add more tests...
});
```

#### 8.2 Unit Tests for LoggingHelpers
**File:** `test/infrastructure/logger/logging-helpers.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LoggingHelpersService } from '@src/infrastructure/logger/logging-helpers.service';
import { ILoggingHelpers } from '@src/core/domain/logging-helpers.interface';
import { ILogger } from '@src/core/domain/logger.interface';

describe('LoggingHelpersService', () => {
  let helpers: ILoggingHelpers;
  let logger: ILogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ILoggingHelpers,
          useClass: LoggingHelpersService,
        },
        {
          provide: ILogger,
          useValue: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
          },
        },
      ],
    }).compile();

    helpers = module.get<ILoggingHelpers>(ILoggingHelpers);
    logger = module.get<ILogger>(ILogger);
  });

  it('should log request', () => {
    const req = { method: 'GET', url: '/test', id: '123', user: { id: '456' } };
    const res = { statusCode: 200 };
    helpers.logRequest(req, res, 150);
    expect(logger.info).toHaveBeenCalled();
  });

  it('should classify errors correctly', () => {
    const error = new Error('Test error');
    (error as any).statusCode = 500;
    helpers.logError(error, { context: 'test' });
    expect(logger.error).toHaveBeenCalled();
  });

  // Add more tests...
});
```

#### 8.3 Integration Tests
**File:** `test/logging.integration.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@src/app.module';

describe('Logging Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should add request ID to response headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test')
      .expect(200);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-correlation-id']).toBeDefined();
  });

  it('should add response time to response headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test')
      .expect(200);

    expect(response.headers['x-response-time']).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
```

### Deliverables
- ✅ Unit tests for LoggerAdapter
- ✅ Unit tests for LoggingHelpers
- ✅ Integration tests for middleware
- ✅ Test coverage > 80%

---

## Phase 9: Migration and Rollout

### Objective
Migrate existing code to use new logging features

### Tasks

#### 9.1 Update Existing Services
Review and update all services to use child loggers:
```typescript
// Before
constructor(private readonly logger: ILogger) {}

// After
constructor(baseLogger: ILogger) {
  this.logger = baseLogger.child('ServiceName');
}
```

#### 9.2 Update Exception Filters
Enhance error logging in all exception filters to use logging helpers.

#### 9.3 Update Interceptors
Add performance tracking to interceptors.

#### 9.4 Update Repositories
Add query logging to repository operations.

#### 9.5 Gradual Rollout Plan
1. Deploy to development environment
2. Monitor logs for 1 week
3. Deploy to staging environment
4. Monitor logs for 1 week
5. Deploy to production with feature flag
6. Enable feature flag gradually
7. Full rollout

### Deliverables
- ✅ All services updated
- ✅ All filters updated
- ✅ All interceptors updated
- ✅ All repositories updated
- ✅ Successful rollout

---

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: Phase 1 (Foundation Setup)
- Day 3-4: Phase 2 (Child Logger Support)
- Day 5: Testing and review

### Week 2: Core Features
- Day 1-2: Phase 3 (Structured Logging Helpers)
- Day 3-4: Phase 4 (Request Lifecycle Logging)
- Day 5: Testing and review

### Week 3: Advanced Features
- Day 1-2: Phase 5 (Enhanced Error Logging)
- Day 3: Phase 6 (Secondary Logging)
- Day 4-5: Phase 7 (Documentation)

### Week 4: Testing and Rollout
- Day 1-2: Phase 8 (Testing)
- Day 3-4: Phase 9 (Migration)
- Day 5: Final review and deployment

---

## Success Criteria

### Functional Requirements
- ✅ All log levels working correctly
- ✅ Structured logging with JSON format
- ✅ Data redaction for sensitive fields
- ✅ Request lifecycle tracking
- ✅ Performance monitoring
- ✅ Error classification
- ✅ Audit logging
- ✅ Child logger support

### Non-Functional Requirements
- ✅ No performance degradation (< 5% overhead)
- ✅ Test coverage > 80%
- ✅ Backward compatibility maintained
- ✅ Zero breaking changes to existing code
- ✅ Documentation complete

### Production Readiness
- ✅ Works in development (pretty format)
- ✅ Works in production (JSON format)
- ✅ Compatible with log aggregators (ELK, Splunk, Datadog)
- ✅ Security features enabled
- ✅ Monitoring and alerting ready

---

## Risks and Mitigations

### Risk 1: Performance Impact
**Risk:** Logging overhead affects application performance  
**Mitigation:** 
- Use async logging
- Benchmark performance
- Set appropriate log levels
- Disable verbose logging in production

### Risk 2: Breaking Changes
**Risk:** Existing code breaks due to interface changes  
**Mitigation:**
- Maintain backward compatibility
- Use feature flags
- Gradual rollout
- Comprehensive testing

### Risk 3: Configuration Errors
**Risk:** Misconfiguration causes logging failures  
**Mitigation:**
- Schema validation for environment variables
- Default values for all config
- Configuration validation on startup
- Clear error messages

### Risk 4: Log Volume
**Risk:** Excessive log volume increases costs  
**Mitigation:**
- Configurable log levels
- Sampling for high-volume logs
- Log rotation policies
- Cost monitoring

---

## Rollback Plan

If issues arise during rollout:

1. **Immediate Rollback**
   - Revert to previous logger implementation
   - Restore old environment configuration
   - Restart services

2. **Feature Flag Rollback**
   - Disable new logging features via environment variable
   - Keep old logging active
   - No restart required

3. **Gradual Rollback**
   - Reduce log level to minimum
   - Disable structured logging
   - Disable performance monitoring

---

## Post-Implementation Tasks

### Monitoring
- Set up log aggregation dashboards
- Create alerts for error rates
- Monitor log volume and costs
- Track performance metrics

### Maintenance
- Regular log review
- Update documentation
- Refine error classification
- Optimize log queries

### Enhancement
- Add more log destinations (S3, CloudWatch)
- Implement log sampling
- Add machine learning for anomaly detection
- Integrate with APM tools

---

## Conclusion

This implementation plan provides a comprehensive roadmap to upgrade the NestJS boilerplate logging system to match the production-grade capabilities of the Fastify boilerplate. The phased approach ensures minimal disruption while delivering critical features incrementally.

**Expected Outcome:** A production-ready logging system with structured logging, security features, performance monitoring, and comprehensive request lifecycle tracking, matching or exceeding the Fastify boilerplate's capabilities while maintaining NestJS's superior architecture.
