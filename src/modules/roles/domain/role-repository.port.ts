import { IBaseRepository } from "@core/domain/ports/repository.port";
import { Role } from "./role.entity";

export interface IRoleRepository extends IBaseRepository<Role> {
  findByName(name: string): Promise<Role | null>;
}
