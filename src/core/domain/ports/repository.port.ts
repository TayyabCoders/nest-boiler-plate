import { DeepPartial } from 'typeorm';

export abstract class IBaseRepository<T> {
  abstract create(data: DeepPartial<T>): T;
  abstract save(entity: T): Promise<T>;
  abstract createAndSave(data: DeepPartial<T>): Promise<T>;
  abstract findAll(relations?: string[]): Promise<T[]>;
  abstract findById(id: string, relations?: string[]): Promise<T | null>;
  abstract update(id: string, data: DeepPartial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
  abstract softDelete(id: string): Promise<boolean>;
}