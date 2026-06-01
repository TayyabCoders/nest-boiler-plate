import { Injectable, LoggerService, ConsoleLogger, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILogger } from '@core/domain/logger.interface';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerAdapter extends ConsoleLogger implements ILogger, LoggerService {
  private readonly secondaryLogging: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.secondaryLogging = this.configService.get<string>('SECONDARY_LOGGING') || 'NONE';
  }

  log(message: any, context?: string): void {
    super.log(message, context || 'App');
    this.dispatchToSecondary('info', context || 'App', message);
  }

  error(message: any, stack?: string, context?: string): void {
    super.error(message, stack, context || 'App');
    this.dispatchToSecondary('error', context || 'App', message, { stack });
  }

  warn(message: any, context?: string): void {
    super.warn(message, context || 'App');
    this.dispatchToSecondary('warn', context || 'App', message);
  }

  debug(message: any, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      super.debug(message, context || 'App');
    }
  }

  verbose(message: any, context?: string): void {
    super.verbose(message, context || 'App');
  }

  private dispatchToSecondary(level: string, context: string, message: string, meta?: any): void {
    if (this.secondaryLogging === 'NONE') return;

    switch (this.secondaryLogging) {
      case 'MIXPANEL':
        this.logToMixpanel(level, context, message, meta);
        break;
      case 'GA':
        this.logToGoogleAnalytics(level, context, message, meta);
        break;
      default:
        break;
    }
  }

  private logToMixpanel(level: string, context: string, message: string, meta: any): void {
    const token = this.configService.get<string>('MIXPANEL_TOKEN');
    // TODO: Implement Mixpanel tracking logic
    // console.log(`[Mixpanel] ${context}: ${message}`, meta);
  }

  private logToGoogleAnalytics(level: string, context: string, message: string, meta: any): void {
    const id = this.configService.get<string>('GA_TRACKING_ID');
    // TODO: Implement Google Analytics tracking logic
    // console.log(`[GA] ${context}: ${message}`, meta);
  }
}