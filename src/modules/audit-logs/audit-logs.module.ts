import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './domain/audit-log.entity';
import { AuditLogService } from './application/audit-log.service';
import { AuditLogController } from './presentation/audit-log.controller';
import { AuditLogRepository } from './infrastructure/audit-log.repository';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor';
import { LoggerModule } from '@infra/logger/logger.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), LoggerModule, UsersModule],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    {
      provide: 'IAuditLogRepository',
      useClass: AuditLogRepository,
    },
    AuditLoggingInterceptor,
  ],
  exports: [AuditLogService, AuditLoggingInterceptor],
})
export class AuditLogsModule {}
