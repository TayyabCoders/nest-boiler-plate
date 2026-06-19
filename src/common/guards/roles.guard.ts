import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILogger } from '@core/domain/logger.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ILogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('Auth', 'Authentication required for role check', {
        type: 'auth_failure',
        requestId: request.id,
        method: request.method,
        url: request.url,
        requiredRoles,
        reason: 'no_user',
      });
      throw new ForbiddenException('Authentication required');
    }

    if (!requiredRoles.includes(user.role.name)) {
      this.logger.warn('Auth', 'Access denied - insufficient permissions', {
        type: 'access_denied',
        requestId: request.id,
        userId: user.id,
        userRole: user.role.name,
        requiredRoles,
        method: request.method,
        url: request.url,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
