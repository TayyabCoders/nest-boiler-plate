import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AuditLog } from '../domain/audit-log.entity';
import { IAuditLogRepository, AuditLogFilters } from '../domain/audit-log.repository.port';
import { User } from '@modules/users/domain/user.entity';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async create(log: Partial<AuditLog>): Promise<AuditLog> {
    const newLog = this.repository.create(log);
    return await this.repository.save(newLog);
  }

  async findById(id: string): Promise<AuditLog | null> {
    return await this.repository.findOne({ 
      where: { id },
      relations: ['user']
    });
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findByAction(
    action: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    return await this.repository.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findAll(filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      where.createdAt = MoreThanOrEqual(filters.startDate);
    } else if (filters.endDate) {
      where.createdAt = LessThanOrEqual(filters.endDate);
    }

    const [logs, total] = await this.repository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    return { logs, total };
  }

  async deleteOldLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
