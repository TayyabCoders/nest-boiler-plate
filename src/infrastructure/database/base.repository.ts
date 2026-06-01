import { Repository, ObjectLiteral, FindOptionsWhere, DeepPartial } from 'typeorm';
import { IBaseRepository } from '@core/domain/ports/repository.port';

export abstract class TypeOrmBaseRepository<T extends ObjectLiteral> implements IBaseRepository<T> {
  constructor(protected readonly entityRepository: Repository<T>) {}

  create(data: DeepPartial<T>): T {
    return this.entityRepository.create(data);
  }

  async save(entity: T): Promise<T> {
    return await this.entityRepository.save(entity);
  }

  async createAndSave(data: DeepPartial<T>): Promise<T> {
    const entity = this.create(data);
    return await this.save(entity);
  }

  async findAll(relations?: string[]): Promise<T[]> {
    return await this.entityRepository.find({ relations });
  }

  async findById(id: any, relations?: string[]): Promise<T | null> {
    const options = { id } as unknown as FindOptionsWhere<T>;
    return await this.entityRepository.findOne({
      where: options,
      relations,
    });
  }

  async update(id: any, data: DeepPartial<T>): Promise<T> {
    await this.entityRepository.update(id, data as any);
    const updatedEntity = await this.findById(id);
    if (!updatedEntity) throw new Error('Entity not found after update');
    return updatedEntity;
  }

  async delete(id: any): Promise<boolean> {
    const result = await this.entityRepository.delete(id);
    return !!result.affected && result.affected > 0;
  }

  async softDelete(id: any): Promise<boolean> {
    const result = await this.entityRepository.softDelete(id);
    return !!result.affected && result.affected > 0;
  }
}