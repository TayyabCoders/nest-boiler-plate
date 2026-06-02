import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ILogger } from '@core/domain/logger.interface';
import { LOGGING_HELPERS } from '@core/domain/logging-helpers.interface';
import { RequestContext, PerformanceSegments } from '@core/domain/request-context.interface';

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
    @Inject(LOGGING_HELPERS) private readonly loggingHelpers: any,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate request ID
    req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

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
    const self = this;
    res.send = function (data) {
      res.send = originalSend;
      const response = res.send(data);

      // Log request completion
      const duration = Date.now() - req.context.startTime;
      res.setHeader('x-response-time', `${duration}ms`);

      self.loggingHelpers.logRequest(req, res, duration);

      // Slow request detection
      const threshold = 1000;
      if (duration > threshold) {
        self.logger.warn('Performance', 'Slow request detected', {
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
        self.logger.info('Performance', 'Request performance', {
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
