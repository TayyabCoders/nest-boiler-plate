import { Injectable } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { ILoggingHelpers } from '@core/domain/logging-helpers.interface';
import { classifyError, ErrorSeverity } from './error-classifier.util';

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
        this.logger.fatal('Error', 'Fatal Error', { ...errorInfo, stack: error.stack });
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

  private triggerAlert(errorInfo: Record<string, unknown>): void {
    // TODO: Integrate with alerting system (PagerDuty, Slack, etc.)
    this.logger.warn('Alert', 'Error alert triggered', errorInfo);
  }
}
