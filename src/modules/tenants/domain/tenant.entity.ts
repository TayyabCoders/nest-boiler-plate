import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '@core/domain/entities/base.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_name', length: 255 })
  companyName!: string;

  @Column({ name: 'support_email', length: 255, nullable: true })
  supportEmail!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null; // <-- Changed 'any' to specific object type
}