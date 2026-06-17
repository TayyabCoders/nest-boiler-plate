/**
 * Roles Seed Script
 *
 * This script creates default roles if they don't already exist.
 * Run with: npx ts-node scripts/seed-roles.ts
 *
 * Default roles:
 * - user: Standard user role
 * - admin: Administrator role
 * - super-admin: Super administrator role
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/domain/role.entity';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_SSL = process.env.DB_SSL === 'true';

const DEFAULT_ROLES = [
  {
    name: 'user',
    description: 'Standard user role with basic permissions',
  },
  {
    name: 'admin',
    description: 'Administrator role with elevated permissions',
  },
  {
    name: 'super-admin',
    description: 'Super administrator role with full system access',
  },
];

async function seedRoles() {
  console.log('🌱 Starting Roles Seed...\n');

  if (!DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    console.error('❌ Missing required database environment variables');
    console.error('Required: DB_USERNAME, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [Role],
    synchronize: false,
    ssl: DB_SSL ? {
      rejectUnauthorized: false,
    } : undefined,
  });

  try {
    console.log(`📍 Connecting to database at ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    await dataSource.initialize();
    console.log('✅ Connected to database successfully\n');

    const roleRepository = dataSource.getRepository(Role);

    for (const roleData of DEFAULT_ROLES) {
      console.log(`🔍 Checking if role "${roleData.name}" exists...`);
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (existingRole) {
        console.log(`⚠️  Role "${roleData.name}" already exists. Skipping.\n`);
      } else {
        console.log(`👤 Creating role "${roleData.name}"...`);
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`✅ Role "${roleData.name}" created successfully.\n`);
      }
    }

    console.log('─'.repeat(50));
    console.log('✅ Roles seed completed successfully!');
    console.log('─'.repeat(50));
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
seedRoles().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
