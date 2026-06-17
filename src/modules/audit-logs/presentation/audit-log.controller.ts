import { Controller, Get, Query, UseGuards, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AuditLogService } from '../application/audit-log.service';
import { QueryAuditLogDto } from '../application/dto/query-audit-log.dto';
import { ApiResponse } from '@common/responses/api.response';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getLogs(@Query() query: QueryAuditLogDto): Promise<ApiResponse<{ logs: any[]; total: number }>> {
    const result = await this.auditLogService.getLogs(query);
    return ApiResponse.success(result, 'Audit logs retrieved successfully');
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get logs for a specific user (Admin only)' })
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<ApiResponse<any[]>> {
    const logs = await this.auditLogService.getUserLogs(
      userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
    return ApiResponse.success(logs, 'User audit logs retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific audit log by ID (Admin only)' })
  async getLogById(@Param('id') id: string): Promise<ApiResponse<any>> {
    const log = await this.auditLogService.getLogById(id);
    if (!log) {
      return ApiResponse.error('Audit log not found');
    }
    return ApiResponse.success(log, 'Audit log retrieved successfully');
  }

  @Delete('cleanup')
  @ApiOperation({ summary: 'Clean up old logs (Admin only)' })
  async cleanupLogs(@Query('daysToKeep') daysToKeep?: number): Promise<ApiResponse<number>> {
    const deletedCount = await this.auditLogService.cleanupOldLogs(
      daysToKeep ? Number(daysToKeep) : 90,
    );
    return ApiResponse.success(deletedCount, `${deletedCount} old logs deleted successfully`);
  }
}
