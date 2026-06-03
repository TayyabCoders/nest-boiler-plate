import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILogger } from '@core/domain/logger.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ILogger,
    @Optional() private jwtService?: any,
    @Optional() private usersService?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // If no auth header, allow request to proceed without user
    if (!authHeader) {
      return true;
    }

    const [bearer, token] = authHeader.split(' ');

    // Only process if it's a Bearer token
    if (bearer === 'Bearer' && token) {
      try {
        // Verify token
        const decoded = await this.verifyToken(token);

        // Check if user still exists and is active
        const user = await this.getUserById(decoded.id);

        if (user && user.status === 'active') {
          // Attach user to request
          request.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
          };

          this.logger.debug('Auth', 'Optional auth: User attached', {
            type: 'optional_auth_success',
            requestId: request.id,
            userId: user.id,
            email: user.email,
          });
        }
      } catch (error: any) {
        // Ignore token errors for optional auth (matching Fastify pattern)
        this.logger.debug('Auth', `Optional auth token error: ${error?.message}`, {
          type: 'optional_auth_error',
          requestId: request.id,
          error: error?.message,
        });
      }
    }

    return true;
  }

  private async verifyToken(token: string): Promise<any> {
    if (this.jwtService) {
      return this.jwtService.verify(token);
    }
    throw new Error('JWT service not implemented');
  }

  private async getUserById(userId: string): Promise<any> {
    if (this.usersService) {
      return this.usersService.findById(userId);
    }
    throw new Error('User service not implemented');
  }
}
