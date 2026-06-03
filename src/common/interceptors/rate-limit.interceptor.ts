import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();

        // Add rate limit headers if available
        if (response.rateLimit) {
          response.setHeader('X-RateLimit-Limit', response.rateLimit.limit);
          response.setHeader('X-RateLimit-Remaining', response.rateLimit.remaining);
          response.setHeader('X-RateLimit-Reset', response.rateLimit.reset);
        }

        return data;
      }),
    );
  }
}
