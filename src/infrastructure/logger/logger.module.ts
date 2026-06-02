import { Module, Global } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { LOGGING_HELPERS } from '@core/domain/logging-helpers.interface';
import { LoggerAdapter } from './logger.adapter';
import { LoggingHelpersService } from './logging-helpers.service';

@Global()
@Module({
  providers: [
    {
      provide: ILogger,
      useClass: LoggerAdapter,
    },
    {
      provide: LOGGING_HELPERS,
      useClass: LoggingHelpersService,
    },
  ],
  exports: [ILogger, LOGGING_HELPERS],
})
export class LoggerModule {}
