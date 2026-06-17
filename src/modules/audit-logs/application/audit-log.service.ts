import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLog } from '../domain/audit-log.entity';
import type { IAuditLogRepository } from '../domain/audit-log.repository.port';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditLogEvent } from './events/audit-log.event';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject('IAuditLogRepository')
    private readonly repository: IAuditLogRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: ILogger,
  ) {}

  async logActivity(logData: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const log = await this.repository.create(logData);
      
      // Emit event for real-time notifications or additional processing
      this.eventEmitter.emit('audit.log.created', new AuditLogEvent(logData));
      
      return log;
    } catch (error) {
      this.logger.error('AuditLogService', `Failed to log audit: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getLogs(query: QueryAuditLogDto): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    const filters = {
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    };

    const { logs, total } = await this.repository.findAll(filters);
    
    return {
      logs: logs.map(AuditLogResponseDto.fromEntity),
      total,
    };
  }

  async getUserLogs(userId: string, limit: number = 50, offset: number = 0): Promise<AuditLogResponseDto[]> {
    const logs = await this.repository.findByUserId(userId, limit, offset);
    return logs.map(AuditLogResponseDto.fromEntity);
  }

  async getLogById(id: string): Promise<AuditLogResponseDto | null> {
    const log = await this.repository.findById(id);
    return log ? AuditLogResponseDto.fromEntity(log) : null;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    this.logger.log('AuditLogService', `Cleaning up logs older than ${daysToKeep} days`);
    return await this.repository.deleteOldLogs(daysToKeep);
  }
}
