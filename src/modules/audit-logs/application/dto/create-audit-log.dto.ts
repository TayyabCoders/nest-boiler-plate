import { IsString, IsUUID, IsOptional, IsObject, IsEnum, IsInt } from 'class-validator';
import { AuditAction } from '../../domain/audit-action.enum';

export class CreateAuditLogDto {
  @IsUUID()
  userId!: string;

  @IsEnum(AuditAction)
  action!: AuditAction;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsInt()
  @IsOptional()
  statusCode?: number;

  @IsInt()
  @IsOptional()
  responseTimeMs?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
