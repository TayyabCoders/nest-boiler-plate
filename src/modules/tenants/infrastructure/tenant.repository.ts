import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { TypeOrmBaseRepository } from '@infra/database/base.repository';
import { Tenant } from '../domain/tenant.entity';
import { ITenantRepository } from '../domain/tenant-repository.port';

@Injectable()
export class TenantRepository extends TypeOrmBaseRepository<Tenant> implements ITenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {
    super(tenantRepository);
  }

  async findByName(name: string): Promise<Tenant | null> {
    const where: FindOptionsWhere<Tenant> = { companyName: name }; // <-- Explicit typing for TypeORM find
    return await this.tenantRepository.findOne({ where });
  }
}