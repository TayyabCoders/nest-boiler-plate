import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { UserService } from './application/user.service';
import { UserController, UsersController } from './presentation/user.controller';
import { UserRepository } from './infrastructure/user.repository';
import { AuthGuard } from '@common/guards/auth.guard';
import { LoggerModule } from '@infra/logger/logger.module';
import { RolesModule } from '@modules/roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LoggerModule,
    forwardRef(() => RolesModule),
  ],
  controllers: [UserController, UsersController],
  providers: [
    UserService,
    {
      provide: 'UserService',
      useExisting: UserService,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
  ],
  exports: [UserService, 'UserService', 'IUserRepository'],
})
export class UsersModule {}
