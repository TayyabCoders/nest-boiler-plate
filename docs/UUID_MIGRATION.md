# UUID Migration Summary

## Changes Made

All primary keys in the system have been migrated from integers to UUIDs for consistency and better scalability.

### Entities Updated

#### 1. **Permission Entity**
- **File**: `src/modules/rbac/domain/permission.entity.ts`
- **Change**: `id` changed from `number` to `string` (UUID)
- **Before**: `@PrimaryGeneratedColumn()` with `id!: number`
- **After**: `@PrimaryGeneratedColumn('uuid')` with `id!: string`

#### 2. **Role Entity**
- **File**: `src/modules/rbac/domain/role.entity.ts`
- **Change**: `id` changed from `number` to `string` (UUID)
- **Before**: `@PrimaryGeneratedColumn()` with `id!: number`
- **After**: `@PrimaryGeneratedColumn('uuid')` with `id!: string`

#### 3. **User Entity**
- **File**: `src/modules/users/domain/user.entity.ts`
- **Change**: `roleId` foreign key changed from `int` to `uuid`
- **Before**: `@Column({ name: 'role_id', type: 'int' })` with `roleId!: number`
- **After**: `@Column({ name: 'role_id', type: 'uuid' })` with `roleId!: string`

### Services Updated

#### 4. **InvitationService**
- **File**: `src/modules/auth/application/invitation.service.ts`
- **Change**: `inviteStaff` method parameter type updated
- **Before**: `roleId: number`
- **After**: `roleId: string`

### DTOs Updated

#### 5. **InviteStaffDto**
- **File**: `src/modules/auth/presentation/dto/invite-staff.dto.ts`
- **Changes**:
  - Validator changed from `@IsInt()` to `@IsUUID()`
  - Removed `@Min(1)` validator (not applicable to UUIDs)
  - Type changed from `number` to `string`
  - Example updated to show UUID format

## Database Migration Required

⚠️ **IMPORTANT**: You will need to run a database migration to apply these changes.

### Migration Steps:

1. **Drop existing data** (if in development):
   ```bash
   # In your database
   TRUNCATE TABLE users CASCADE;
   TRUNCATE TABLE roles CASCADE;
   TRUNCATE TABLE permissions CASCADE;
   TRUNCATE TABLE role_permissions CASCADE;
   TRUNCATE TABLE user_permissions CASCADE;
   ```

2. **Let TypeORM recreate tables** (if `DB_SYNC=true`):
   - Just restart the server
   - Tables will be recreated with UUID columns

3. **Or create a migration** (recommended for production):
   ```bash
   npm run typeorm migration:generate -- -n UuidMigration
   npm run typeorm migration:run
   ```

### Expected Database Schema Changes:

```sql
-- roles table
ALTER TABLE roles ALTER COLUMN id TYPE uuid USING gen_random_uuid();

-- permissions table  
ALTER TABLE permissions ALTER COLUMN id TYPE uuid USING gen_random_uuid();

-- users table
ALTER TABLE users ALTER COLUMN role_id TYPE uuid;

-- role_permissions junction table
ALTER TABLE role_permissions ALTER COLUMN role_id TYPE uuid;
ALTER TABLE role_permissions ALTER COLUMN permission_id TYPE uuid;

-- user_permissions junction table
ALTER TABLE user_permissions ALTER COLUMN permission_id TYPE uuid;
```

## Benefits of UUID Migration

1. **Consistency**: All IDs across the system now use the same format
2. **Scalability**: UUIDs are globally unique, enabling distributed systems
3. **Security**: UUIDs are harder to enumerate/guess than sequential integers
4. **Flexibility**: Easier to merge data from multiple sources
5. **Future-proof**: Better for microservices architecture

## Testing Checklist

After migration, verify:

- [ ] Super Admin bootstrap still works
- [ ] Role seeding creates UUIDs correctly
- [ ] Admin invitation flow works
- [ ] Staff invitation flow works
- [ ] User login works
- [ ] Role-based permissions work correctly
- [ ] All foreign key relationships are intact

## API Impact

### Before (Integer IDs):
```json
{
  "roleId": 3
}
```

### After (UUID):
```json
{
  "roleId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Frontend applications will need to update their API calls to use UUID strings instead of integers for `roleId`.
