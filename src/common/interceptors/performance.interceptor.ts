import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly logger: ILogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Start performance tracking if available
    if (request.performance) {
      request.performance.start('business');
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          // End performance segment if available
          if (request.performance) {
            request.performance.end('business');
          }

          // Log performance metrics for requests taking longer than 100ms
          if (duration > 100) {
            this.logger.info('Performance', 'Handler execution time', {
              type: 'handler_performance',
              requestId: request.id,
              method: request.method,
              url: request.url,
              duration,
            });
          }

          // Log slow requests (>1000ms)
          if (duration > 1000) {
            this.logger.warn('Performance', 'Slow handler execution', {
              type: 'slow_handler',
              requestId: request.id,
              method: request.method,
              url: request.url,
              duration,
            });
          }
        },
        error: (error: any) => {
          const duration = Date.now() - startTime;

          // End performance segment even on error
          if (request.performance) {
            request.performance.end('business');
          }

          this.logger.error('Performance', 'Handler execution failed', error.stack, {
            type: 'handler_error',
            requestId: request.id,
            method: request.method,
            url: request.url,
            duration,
          });
        },
      }),
    );
  }
}
