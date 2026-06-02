import { ILogger } from '@core/domain/logger.interface'; 
import { IBaseRepository } from '@core/domain/ports/repository.port';

export abstract class BaseService<T, R extends IBaseRepository<T>> {
  protected readonly logger: ILogger;

  constructor(
    protected readonly repository: R,
    baseLogger: ILogger,
    protected readonly serviceName: string,
  ) {
    // Create child logger for this service
    this.logger = baseLogger.child(serviceName);
  }

  async findAll(): Promise<T[]> {
    this.logger.log(this.serviceName, `Fetching all records`);
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<T | null> {
    this.logger.log(this.serviceName, `Fetching record by ID`);
    return this.repository.findById(id);
  }
}