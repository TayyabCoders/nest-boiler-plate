import { IBaseRepository } from "@core/domain/ports/repository.port";
import { User } from "./user.entity";

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByPhonenumber(phonenumber: string): Promise<User | null>;
}
