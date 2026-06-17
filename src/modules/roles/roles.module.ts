import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './domain/role.entity';
import { RoleService } from './application/role.service';
import { RoleController } from './presentation/role.controller';
import { RoleRepository } from './infrastructure/role.repository';
import { LoggerModule } from '@infra/logger/logger.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    LoggerModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    {
      provide: 'RoleService',
      useExisting: RoleService,
    },
    {
      provide: 'IRoleRepository',
      useClass: RoleRepository,
    },
  ],
  exports: [RoleService, 'RoleService', 'IRoleRepository'],
})
export class RolesModule {}
