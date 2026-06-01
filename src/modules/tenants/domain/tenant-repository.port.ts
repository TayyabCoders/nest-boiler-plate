import { IBaseRepository } from "@core/domain/ports/repository.port";
import { Tenant } from "./tenant.entity";


export interface ITenantRepository extends IBaseRepository<Tenant>{
    findByName(name:string): Promise<Tenant | null>;
}