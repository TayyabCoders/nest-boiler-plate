import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { BaseService } from '@core/application/services/base.service';
import { ILogger } from '@core/domain/logger.interface';
import { Tenant } from '../domain/tenant.entity';
import type { ITenantRepository } from '../domain/tenant-repository.port';

@Injectable()
export class TenantService extends BaseService<Tenant, ITenantRepository> {
  constructor(
    @Inject('ITenantRepository')
    private readonly _tenantRepository: ITenantRepository,
    logger: ILogger,
  ) {
    super(_tenantRepository, logger, 'TenantService');
  }

  // Explicit return type added: Promise<Tenant>
  async create(data: Partial<Tenant>): Promise<Tenant> {
    if (data.companyName) {
      const existing = await this._tenantRepository.findByName(data.companyName);
      if (existing) {
        throw new ConflictException('Tenant with this name already exists');
      }
    }

    return this._tenantRepository.createAndSave(data);
  }

  // Explicit return type added: Promise<Tenant | null>
  async findByName(name: string): Promise<Tenant | null> {
    return this._tenantRepository.findByName(name);
  }
}