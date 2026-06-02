import { Injectable, LoggerService, Scope, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import { createPinoConfig } from './pino.config';
import { ILogger } from '@core/domain/logger.interface';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerAdapter implements ILogger, LoggerService {
  private logger: pino.Logger;

  constructor(private readonly configService: ConfigService, @Optional() pinoLogger?: pino.Logger) {
    this.logger = pinoLogger || pino(createPinoConfig(this.configService));
  }

  debug(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.debug({ context, ...meta }, message);
  }

  log(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.info({ context, ...meta }, message);
  }

  error(context: string, message: string, trace?: string, meta?: Record<string, unknown>): void {
    this.logger.error({ context, stack: trace, ...meta }, message);
  }

  warn(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.warn({ context, ...meta }, message);
  }

  fatal(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.fatal({ context, ...meta }, message);
  }

  info(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.info({ context, ...meta }, message);
  }

  trace(context: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.trace({ context, ...meta }, message);
  }

  // LoggerService interface methods (for NestJS compatibility)
  verbose(message: any, context?: string): void {
    this.logger.trace({ context: context || 'App' }, message);
  }

  setLogLevels(levels: string[]): void {
    this.logger.level = levels[0] || 'info';
  }

  child(context: string, meta?: Record<string, unknown>): ILogger {
    const childLogger = this.logger.child({ context, ...meta });
    const adapter = new LoggerAdapter(this.configService);
    adapter.logger = childLogger;
    return adapter;
  }
}