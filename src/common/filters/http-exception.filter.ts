import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ILogger } from '@core/domain/logger.interface';
import { ThrottlerException } from '@nestjs/throttler';
import { classifyError, ErrorSeverity } from '../../infrastructure/logger/error-classifier.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: string | object = 'Internal server error';

    // Handle specific error types (matching Fastify errorHook pattern)
    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      errorResponse = {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse();
    }

    // Handle validation errors (matching Fastify pattern)
    const exceptionObj = exception as any;
    if (exceptionObj.validation) {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        error: 'Validation Error',
        message: exceptionObj.message,
        details: exceptionObj.validation,
      };
    }

    // Handle Sequelize validation errors (matching Fastify pattern)
    if (exceptionObj.name === 'SequelizeValidationError') {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        error: 'Validation Error',
        message: 'Database validation failed',
        details: exceptionObj.errors?.map((e: any) => ({
          field: e.path,
          message: e.message,
        })),
      };
    }

    // Handle Sequelize unique constraint errors (matching Fastify pattern)
    if (exceptionObj.name === 'SequelizeUniqueConstraintError') {
      status = HttpStatus.CONFLICT;
      errorResponse = {
        error: 'Conflict',
        message: 'Duplicate entry found',
        details: exceptionObj.errors?.map((e: any) => ({
          field: e.path,
          message: e.message,
        })),
      };
    }

    // Handle Sequelize foreign key constraint errors (matching Fastify pattern)
    if (exceptionObj.name === 'SequelizeForeignKeyConstraintError') {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        error: 'Constraint Error',
        message: 'Foreign key constraint failed',
      };
    }

    // Handle custom errors with statusCode (matching Fastify pattern)
    if (exceptionObj.statusCode && !(exception instanceof HttpException)) {
      status = exceptionObj.statusCode;
      errorResponse = {
        error: exceptionObj.name || 'Error',
        message: exceptionObj.message,
        details: exceptionObj.details,
      };
    }

    // Extracting details from the exception response
    const errorBody =
      typeof errorResponse === 'object'
        ? (errorResponse as any)
        : { message: errorResponse };

    const error = errorBody.error || errorBody.message || 'Error';
    const message = errorBody.message || error;

    // Log the error with context (matching Fastify errorHook pattern)
    this.logger.error(
      'Error',
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      {
        type: 'http_error',
        requestId: (request as any).id,
        correlationId: (request as any).correlationId,
        statusCode: status,
        method: request.method,
        url: request.url,
        userId: (request.user as any)?.id,
        ip: request.ip,
        error: errorBody,
      },
    );

    // Classify error for proper logging
    const errorObj = exception instanceof Error ? exception : new Error(String(exception));
    const classification = classifyError(errorObj);

    // Log error with classification
    const errorInfo = {
      type: 'application_error',
      severity: classification.severity,
      category: classification.category,
      shouldAlert: classification.shouldAlert,
      requestId: (request as any).id,
      correlationId: (request as any).correlationId,
      statusCode: status,
      method: request.method,
      url: request.url,
      userId: (request.user as any)?.id,
      error: errorBody,
    };

    switch (classification.severity) {
      case ErrorSeverity.FATAL:
        this.logger.fatal('Error', 'Fatal Error', { ...errorInfo, stack: errorObj.stack });
        break;
      case ErrorSeverity.ERROR:
        this.logger.error('Error', 'Application Error', errorObj.stack, errorInfo);
        break;
      case ErrorSeverity.WARN:
        this.logger.warn('Error', 'Client Error', errorInfo);
        break;
      default:
        this.logger.info('Error', 'Error Info', errorInfo);
    }

    // Trigger alert if needed
    if (classification.shouldAlert) {
      this.logger.warn('Alert', 'Error alert triggered', errorInfo);
    }

    // Default to internal server error with development/production logic (matching Fastify pattern)
    const isDevelopment = process.env.NODE_ENV === 'development';

    response.status(status).json({
      success: false,
      error: error,
      message: isDevelopment ? message : 'An unexpected error occurred',
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).id,
      ...(isDevelopment && { stack: exception instanceof Error ? exception.stack : undefined }),
    });
  }
}