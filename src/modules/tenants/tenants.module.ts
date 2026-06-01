import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './domain/tenant.entity';
import { TenantService } from './application/tenant.service';
import { TenantController } from './presentation/tenant.controller';
import { TenantRepository } from './infrastructure/tenant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantController],
  providers: [
    TenantService,
    {
      provide: 'ITenantRepository',
      useClass: TenantRepository,
    },
  ],
  exports: [TenantService, 'ITenantRepository'],
})
export class TenantsModule {}
