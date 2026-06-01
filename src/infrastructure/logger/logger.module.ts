import { Module, Global } from '@nestjs/common';
import { ILogger } from '@core/domain/logger.interface';
import { LoggerAdapter } from './logger.adapter';

@Global()
@Module({
  providers: [
    {
      provide: ILogger,
      useClass: LoggerAdapter,
    },
  ],
  exports: [ILogger],
})
export class LoggerModule {}
