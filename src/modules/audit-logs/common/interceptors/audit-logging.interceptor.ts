import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../application/audit-log.service';
import { CreateAuditLogDto } from '../../application/dto/create-audit-log.dto';
import { LOG_AUDIT_KEY, LogAuditMetadata } from '../decorators/log-audit.decorator';
import { AuditAction } from '../../domain/audit-action.enum';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<LogAuditMetadata>(
      LOG_AUDIT_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (response) => {
          const responseTime = Date.now() - startTime;
          
          // Extract user from request or response (for login/register endpoints)
          const userFromRequest = user;
          const userFromResponse = response?.user;
          // For register endpoint, response is the user object directly
          const userAsResponse = response?.id ? response : null;
          const effectiveUser = userFromRequest || userFromResponse || userAsResponse;
          
          if (effectiveUser) {
            const logData: CreateAuditLogDto = {
              userId: effectiveUser.id,
              action: metadata.action,
              entityType: metadata.entityType,
              description: metadata.description,
              ipAddress: this.extractIp(request),
              userAgent: request.headers['user-agent'],
              endpoint: request.url,
              method: request.method,
              statusCode: response?.statusCode || 200,
              responseTimeMs: responseTime,
              metadata: {
                params: request.params,
                query: request.query,
              },
            };

            await this.auditLogService.logActivity(logData);
          }
        },
        error: async (error) => {
          const responseTime = Date.now() - startTime;
          
          if (user) {
            const logData: CreateAuditLogDto = {
              userId: user.id,
              action: AuditAction.LOGIN_FAILED,
              entityType: metadata.entityType,
              description: `Failed: ${error instanceof Error ? error.message : String(error)}`,
              ipAddress: this.extractIp(request),
              userAgent: request.headers['user-agent'],
              endpoint: request.url,
              method: request.method,
              statusCode: error.status || 500,
              responseTimeMs: responseTime,
              metadata: {
                error: error instanceof Error ? error.message : String(error),
                params: request.params,
                query: request.query,
              },
            };

            await this.auditLogService.logActivity(logData);
          }
        },
      }),
    );
  }

  private extractIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
