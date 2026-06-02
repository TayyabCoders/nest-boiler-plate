export const LOGGING_HELPERS = 'LOGGING_HELPERS';

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
