import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { TypeOrmBaseRepository } from '@infra/database/base.repository';
import { User } from '../domain/user.entity';
import { IUserRepository } from '../domain/user-repository.port';

@Injectable()
export class UserRepository extends TypeOrmBaseRepository<User> implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    const where: FindOptionsWhere<User> = { email };
    return await this.userRepository.findOne({ where, relations: ['role'] });
  }

  async findByPhonenumber(phonenumber: string): Promise<User | null> {
    const where: FindOptionsWhere<User> = { phonenumber };
    return await this.userRepository.findOne({ where, relations: ['role'] });
  }

  async findAll(relations?: string[]): Promise<User[]> {
    return await this.userRepository.find({ relations: relations || ['role'] });
  }

  async findById(id: string, relations?: string[]): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id } as FindOptionsWhere<User>,
      relations: relations || ['role'],
    });
  }
}
