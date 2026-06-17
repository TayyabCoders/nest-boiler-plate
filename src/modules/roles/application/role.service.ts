import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseService } from '@core/application/services/base.service';
import { ILogger } from '@core/domain/logger.interface';
import { Role } from '../domain/role.entity';
import type { IRoleRepository } from '../domain/role-repository.port';

@Injectable()
export class RoleService extends BaseService<Role, IRoleRepository> {
  constructor(
    @Inject('IRoleRepository')
    private readonly _roleRepository: IRoleRepository,
    logger: ILogger,
  ) {
    super(_roleRepository, logger, 'RoleService');
  }

  async create(data: { name: string; description?: string }): Promise<Role> {
    // Check if role already exists with name
    const existingByName = await this._roleRepository.findByName(data.name);
    if (existingByName) {
      throw new ConflictException('Role with this name already exists');
    }

    // Create role
    const role = await this._roleRepository.createAndSave({
      name: data.name,
      description: data.description || null,
    });

    this.logger.log('RoleService', `Role created: ${role.name}`);

    return role;
  }

  async findById(id: string): Promise<Role | null> {
    return this._roleRepository.findById(id);
  }

  async findAll(): Promise<Role[]> {
    return this._roleRepository.findAll();
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const role = await this._roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if name is being updated and if it already exists
    if (data.name && data.name !== role.name) {
      const existingByName = await this._roleRepository.findByName(data.name);
      if (existingByName) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    return this._roleRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const role = await this._roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this._roleRepository.delete(id);
  }
}
