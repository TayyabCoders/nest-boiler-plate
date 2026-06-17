import { AuditLog } from '../../domain/audit-log.entity';

export class AuditLogResponseDto {
  id!: string;
  userId!: string;
  fullName!: string | null;
  action!: string;
  entityType!: string | null;
  description!: string | null;
  ipAddress!: string | null;
  userAgent!: string | null;
  endpoint!: string | null;
  method!: string | null;
  metadata!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      fullName: log.user?.fullname || null,
      action: log.action,
      entityType: log.entityType,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      endpoint: log.endpoint,
      method: log.method,
      metadata: log.metadata,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }
}
