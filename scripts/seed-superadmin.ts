/**
 * Super Admin Seed Script
 *
 * This script creates a super admin user if one doesn't already exist.
 * Run with: npx ts-node scripts/seed-superadmin.ts
 *
 * Environment variables required:
 * - SUPER_ADMIN_EMAIL
 * - SUPER_ADMIN_PASSWORD
 * - SUPER_ADMIN_NAME
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/domain/user.entity';
import { Role } from '../src/modules/roles/domain/role.entity';
import * as bcrypt from 'bcrypt';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_SSL = process.env.DB_SSL === 'true';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@luxxage.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecurePassword123!';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

async function seedSuperAdmin() {
  console.log('🌱 Starting Super Admin Seed...\n');

  if (!DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    console.error('❌ Missing required database environment variables');
    console.error('Required: DB_USERNAME, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  console.log(`📋 Super Admin Configuration:`);
  console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Name: ${SUPER_ADMIN_NAME}`);
  console.log(`   Password: ${'*'.repeat(SUPER_ADMIN_PASSWORD.length)}`);
  console.log('');

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [User, Role],
    synchronize: false,
    ssl: DB_SSL ? {
      rejectUnauthorized: false,
    } : undefined,
  });

  try {
    console.log(`📍 Connecting to database at ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    await dataSource.initialize();
    console.log('✅ Connected to database successfully\n');

    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    // Find or create super-admin role
    console.log('🔍 Finding super-admin role...');
    let superAdminRole = await roleRepository.findOne({
      where: { name: 'super-admin' },
    });

    if (!superAdminRole) {
      console.log('⚠️  Super-admin role not found. Creating it...');
      superAdminRole = roleRepository.create({
        name: 'super-admin',
        description: 'Super administrator role with full system access',
      });
      await roleRepository.save(superAdminRole);
      console.log('✅ Super-admin role created successfully.\n');
    } else {
      console.log('✅ Super-admin role found.\n');
    }

    // Check if super admin already exists
    console.log('🔍 Checking if super admin already exists...');
    const existingAdmin = await userRepository.findOne({
      where: { email: SUPER_ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log(`⚠️  Super admin already exists with email: ${SUPER_ADMIN_EMAIL}`);
      console.log('   Skipping creation.\n');
      await dataSource.destroy();
      process.exit(0);
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    // Create super admin
    console.log('👤 Creating super admin user...');
    const superAdmin = userRepository.create({
      fullname: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      roleId: superAdminRole.id,
      status: 'active',
    });

    await userRepository.save(superAdmin);

    console.log('─'.repeat(50));
    console.log('✅ Super admin created successfully!');
    console.log('─'.repeat(50));
    console.log(`📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`👤 Name: ${SUPER_ADMIN_NAME}`);
    console.log(`🎭 Role: ${superAdminRole.name} (${superAdminRole.id})`);
    console.log('─'.repeat(50));
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the password after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the seed
seedSuperAdmin().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
