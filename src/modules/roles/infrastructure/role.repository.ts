import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { TypeOrmBaseRepository } from '@infra/database/base.repository';
import { Role } from '../domain/role.entity';
import { IRoleRepository } from '../domain/role-repository.port';

@Injectable()
export class RoleRepository extends TypeOrmBaseRepository<Role> implements IRoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super(roleRepository);
  }

  async findByName(name: string): Promise<Role | null> {
    const where: FindOptionsWhere<Role> = { name };
    return await this.roleRepository.findOne({ where });
  }
}
