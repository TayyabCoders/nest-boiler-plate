import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ILogger } from '@core/domain/logger.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ILogger,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject('UserService') private readonly usersService: any,
  ) {}

  // Public routes that should skip authentication (matching Fastify pattern)
  private readonly publicRoutes = [
    '/health',
    '/metrics',
    '/docs',
    '/api/v1/auth/verifyOtp',
    '/api/v1/auth/resendOtp',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
  ];

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if route is marked as public via decorator
    const isPublicDecorator = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if route is in public routes list (matching Fastify pattern)
    const isPublicRoute = this.publicRoutes.some(route =>
      request.url.startsWith(route)
    );

    if (isPublicDecorator || isPublicRoute) {
      return true;
    }

    const authHeader = request.headers.authorization;

    // Check for authorization header
    if (!authHeader) {
      this.logger.warn('Auth', 'Missing authorization header', {
        type: 'auth_failure',
        requestId: request.id,
        method: request.method,
        url: request.url,
        reason: 'missing_auth_header',
      });
      throw new UnauthorizedException('Missing authorization header');
    }

    // Extract token
    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      this.logger.warn('Auth', 'Invalid authorization format', {
        type: 'auth_failure',
        requestId: request.id,
        method: request.method,
        url: request.url,
        reason: 'invalid_auth_format',
      });
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      // Start auth performance segment if available
      if (request.performance) {
        request.performance.start('auth');
      }

      // Verify token
      const decoded = await this.verifyToken(token);

      // Check if user still exists and is active
      const user = await this.getUserById(decoded.id);

      if (!user || user.status !== 'active') {
        this.logger.warn('Auth', 'User not found or inactive', {
          type: 'auth_failure',
          requestId: request.id,
          method: request.method,
          url: request.url,
          userId: decoded.id,
          reason: 'user_inactive',
        });
        throw new UnauthorizedException('User not found or account inactive');
      }

      // Attach user to request
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      // Log successful authentication
      this.logger.debug('Auth', `User authenticated: ${user.email}`, {
        type: 'auth_success',
        requestId: request.id,
        userId: user.id,
        email: user.email,
      });

      // Track auth performance segment if available
      if (request.performance) {
        request.performance.end('auth');
      }

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error?.name === 'TokenExpiredError') {
        this.logger.warn('Auth', 'Token expired', {
          type: 'auth_failure',
          requestId: request.id,
          method: request.method,
          url: request.url,
          reason: 'token_expired',
        });
        throw new UnauthorizedException('Token has expired');
      }

      if (error?.name === 'JsonWebTokenError') {
        this.logger.warn('Auth', 'Invalid token', {
          type: 'auth_failure',
          requestId: request.id,
          method: request.method,
          url: request.url,
          reason: 'invalid_token',
        });
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.error('Auth', `Auth hook error: ${error?.message}`, error?.stack, {
        type: 'auth_error',
        requestId: request.id,
        method: request.method,
        url: request.url,
      });

      throw new UnauthorizedException('Authentication error');
    }
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
