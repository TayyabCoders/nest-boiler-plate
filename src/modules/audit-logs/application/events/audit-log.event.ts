import { CreateAuditLogDto } from '../dto/create-audit-log.dto';

export class AuditLogEvent {
  constructor(public readonly logData: CreateAuditLogDto) {}
}
