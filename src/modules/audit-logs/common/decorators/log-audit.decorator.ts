import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../domain/audit-action.enum';

export const LOG_AUDIT_KEY = 'logAudit';

export interface LogAuditMetadata {
  action: AuditAction;
  entityType?: string;
  description?: string;
}

export const LogAudit = (metadata: LogAuditMetadata) => 
  SetMetadata(LOG_AUDIT_KEY, metadata);
