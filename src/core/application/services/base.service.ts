import { ILogger } from '@core/domain/logger.interface'; 
import { IBaseRepository } from '@core/domain/ports/repository.port';

export abstract class BaseService<T, R extends IBaseRepository<T>> {
  constructor(
    protected readonly repository: R,
    protected readonly logger: ILogger,
    protected readonly serviceName: string,
  ) {}

  async findAll(): Promise<T[]> {
    this.logger.log(this.serviceName, `Fetching all records`);
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<T | null> {
    this.logger.log(this.serviceName, `Fetching record by ID`);
    return this.repository.findById(id);
  }
}