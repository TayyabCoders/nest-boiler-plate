import { AuditLog } from './audit-log.entity';

export interface IAuditLogRepository {
  create(log: Partial<AuditLog>): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
  findByAction(action: string, limit?: number, offset?: number): Promise<AuditLog[]>;
  findAll(filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }>;
  deleteOldLogs(daysToKeep: number): Promise<number>;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
