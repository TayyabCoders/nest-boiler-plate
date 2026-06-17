import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@core/domain/entities/base.entity';
import { Role } from '@modules/roles/domain/role.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'fullname', length: 255 })
  fullname!: string;

  @Column({ name: 'email', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password', length: 255 })
  password!: string;

  @Column({ name: 'phonenumber', length: 20, nullable: true })
  phonenumber!: string;

  @Column({ name: 'role_id', nullable: true })
  roleId!: string | null;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  @Column({ name: 'status', length: 50, default: 'active' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
}
