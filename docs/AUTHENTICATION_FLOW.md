# Authentication & Invitation Flow - Implementation Summary

## Overview
This implementation provides a complete multi-tenant authentication and invitation system with OTP verification.

## Flow Diagram

```
┌─────────────────┐
│  Super Admin    │ (Auto-created on startup from .env)
└────────┬────────┘
         │
         │ POST /api/v1/auth/invite-admin
         │ { email: "admin@hotel.com" }
         ▼
┌─────────────────┐
│  Admin Invite   │ → OTP Email Sent
└────────┬────────┘
         │
         │ POST /api/v1/auth/complete-registration
         │ { email, otpCode, fullName, password, hotelName }
         ▼
┌─────────────────┐
│  New Admin      │ → New Tenant Created
│  + Tenant       │
└────────┬────────┘
         │
         │ POST /api/v1/auth/invite-staff
         │ { email: "staff@hotel.com", roleName: "hotel_staff" }
         ▼
┌─────────────────┐
│  Staff Invite   │ → OTP Email Sent
└────────┬────────┘
         │
         │ POST /api/v1/auth/complete-registration
         │ { email, otpCode, fullName, password }
         ▼
┌─────────────────┐
│  New Staff      │ → Added to existing tenant
└─────────────────┘
```

## Database Tables Created

### 1. **otps** (New)
- Stores OTP codes for invitations
- Fields: email, otp_code, purpose, is_verified, expires_at, metadata
- Automatically expires after 15 minutes

### 2. **roles** (Seeded)
- super_admin
- admin
- manager
- hotel_staff
- travel_agent
- guest

### 3. **permissions** (Seeded)
- users.* (create, read, update, delete)
- tenants.* (create, read, update, delete)
- luggage.* (create, read, update, delete)
- rooms.* (create, read, update, delete)
- invitations.send

## API Endpoints

### 1. **POST /api/v1/auth/login**
Standard email/password login
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. **POST /api/v1/auth/invite-admin** 🔒 (Super Admin Only)
Invite a new admin who will create their own tenant
```json
{
  "email": "newadmin@hotel.com"
}
```

### 3. **POST /api/v1/auth/invite-staff** 🔒 (Admin/Manager Only)
Invite staff to your tenant
```json
{
  "email": "staff@hotel.com",
  "roleName": "hotel_staff" // or "manager", "travel_agent"
}
```

### 4. **POST /api/v1/auth/complete-registration** (Public)
Complete registration after receiving OTP
```json
{
  "email": "newadmin@hotel.com",
  "otpCode": "123456",
  "fullName": "John Doe",
  "password": "SecurePass123!",
  "hotelName": "Grand Hotel" // Required for admin, optional for staff
}
```

## Environment Variables Required

Add these to your `.env` file:

```env
# Super Admin Credentials (Auto-created on startup)
SUPER_ADMIN_EMAIL=superadmin@luxxage.com
SUPER_ADMIN_PASSWORD=SuperSecurePassword123!
SUPER_ADMIN_NAME=Super Administrator

# Frontend URL (for OTP email links)
FRONTEND_URL=http://localhost:3000

# Existing variables (already configured)
# JWT_SECRET=...
# JWT_EXPIRATION=...
# MAIL_TRANSPORT=...
```

## Role Permissions Matrix

| Role | Users | Tenants | Luggage | Rooms | Invitations |
|------|-------|---------|---------|-------|-------------|
| **super_admin** | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Send |
| **admin** | ✅ All | 📖 Read | ✅ All | ✅ All | ✅ Send |
| **manager** | 📖 Read | ❌ | ✅ All | ✅ All | ✅ Send |
| **hotel_staff** | ❌ | ❌ | ✅ All | 📖 Read | ❌ |
| **travel_agent** | ❌ | ❌ | ✅ Create/Read | ❌ | ❌ |
| **guest** | ❌ | ❌ | 📖 Read | ❌ | ❌ |

## Testing the Flow

### Step 1: Start the server
The Super Admin will be auto-created on startup if it doesn't exist.

### Step 2: Login as Super Admin
```bash
POST /api/v1/auth/login
{
  "email": "superadmin@luxxage.com",
  "password": "SuperSecurePassword123!"
}
```

### Step 3: Invite an Admin
```bash
POST /api/v1/auth/invite-admin
Authorization: Bearer <super_admin_token>
{
  "email": "admin@grandhotel.com"
}
```

### Step 4: Check Email
The admin receives an email with:
- 6-digit OTP code
- Link to complete registration

### Step 5: Complete Admin Registration
```bash
POST /api/v1/auth/complete-registration
{
  "email": "admin@grandhotel.com",
  "otpCode": "123456",
  "fullName": "Jane Smith",
  "password": "AdminPass123!",
  "hotelName": "Grand Hotel"
}
```
This creates:
- New tenant "Grand Hotel"
- New admin user linked to that tenant
- Auto-login (returns JWT token)

### Step 6: Admin Invites Staff
```bash
POST /api/v1/auth/invite-staff
Authorization: Bearer <admin_token>
{
  "email": "receptionist@grandhotel.com",
  "roleName": "hotel_staff"
}
```

### Step 7: Staff Completes Registration
```bash
POST /api/v1/auth/complete-registration
{
  "email": "receptionist@grandhotel.com",
  "otpCode": "654321",
  "fullName": "Bob Johnson",
  "password": "StaffPass123!"
  // No hotelName needed - joins existing tenant
}
```

## Security Features

1. **OTP Expiration**: All OTPs expire after 15 minutes
2. **One-Time Use**: OTPs are marked as verified after use
3. **Email Verification**: Ensures only the invited person can register
4. **Role-Based Access**: Endpoints protected by JWT + role checks
5. **Password Hashing**: Automatic bcrypt hashing via @BeforeInsert
6. **Tenant Isolation**: Staff can only be invited to their own tenant

## Files Created/Modified

### New Files:
- `src/modules/rbac/application/rbac-seed.service.ts`
- `src/modules/users/application/super-admin-bootstrap.service.ts`
- `src/modules/auth/domain/otp.entity.ts`
- `src/modules/auth/application/otp.service.ts`
- `src/modules/auth/application/invitation.service.ts`
- `src/modules/auth/presentation/dto/invite-admin.dto.ts`
- `src/modules/auth/presentation/dto/invite-staff.dto.ts`
- `src/modules/auth/presentation/dto/complete-registration.dto.ts`

### Modified Files:
- `src/modules/rbac/rbac.module.ts`
- `src/modules/users/users.module.ts`
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/presentation/auth.controller.ts`

## Next Steps

1. ✅ Add environment variables to `.env`
2. ✅ Restart the server (Super Admin will be created)
3. ✅ Test the invitation flow
4. 🔄 (Optional) Add frontend pages for OTP verification
5. 🔄 (Optional) Add email templates with your branding
6. 🔄 (Optional) Add rate limiting to prevent OTP spam
