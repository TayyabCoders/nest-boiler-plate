import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ILogger } from '@core/domain/logger.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse();
    }

    // Extracting details from the exception response
    const errorBody =
      typeof errorResponse === 'object'
        ? (errorResponse as any)
        : { message: errorResponse };

    const error = errorBody.error || errorBody.message || 'Error';
    const message = errorBody.message || error;

    this.logger.error(
      'AllExceptionsFilter',
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      {
        type: 'http_error',
        requestId: (request as any).id,
        correlationId: (request as any).correlationId,
        statusCode: status,
        method: request.method,
        url: request.url,
        error: errorBody,
      },
    );

    response.status(status).json({
      success: false,
      error: error,
      message: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}