# Starter Guide - How to Run This Project

## Overview

This is a NestJS hybrid boilerplate project with multi-tenant authentication, OTP-based invitations, and microservice capabilities. It uses PostgreSQL for data persistence, Redis for caching, and includes Swagger API documentation.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **npm** or **yarn** package manager

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
# Application Configuration
APP_MODE=HTTP
PORT=3000

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=docker
DB_PASSWORD=docker
DB_NAME=luxxage_dev_db_local
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=Redis

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h

# Super Admin Auto-Registration
SUPER_ADMIN_EMAIL=superadmin@luxxage.com
SUPER_ADMIN_PASSWORD=SuperSecurePassword123!
SUPER_ADMIN_NAME=Super Administrator

# Frontend URL (for OTP email links)
FRONTEND_URL=http://localhost:3000

# Mail Configuration
MAIL_TRANSPORT=SMTP
# Add your SMTP or Azure email configuration here
```

### 3. Start Docker Services (PostgreSQL & Redis)

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Adminer** (DB management tool) on port `8080`

Verify services are running:
```bash
docker-compose ps
```

### 4. Run Database Migrations (if applicable)

If you have migration files, run them:

```bash
npm run migration:run
```

Or if using TypeORM synchronize (set in .env), the database will auto-sync on startup.

### 5. Start the Application

**Development mode (with hot reload):**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

**Debug mode:**
```bash
npm run start:debug
```

### 6. Verify the Application is Running

Once started, you should see:
```
HTTP Server running on: http://localhost:3000/api/v1
Swagger documentation at: http://localhost:3000/docs
```

## Swagger Documentation

**Yes, this project has Swagger documentation!**

Access the interactive API documentation at:
```
http://localhost:3000/docs
```

The Swagger UI includes:
- All API endpoints with descriptions
- Request/response schemas
- Authentication via Bearer token
- Ability to test endpoints directly from the browser

## Default Super Admin

On first startup, a Super Admin user is automatically created with credentials from your `.env` file:

- **Email:** `superadmin@luxxage.com`
- **Password:** `SuperSecurePassword123!`

Use this account to:
- Invite new admins (who create new tenants)
- Manage users across all tenants
- Access all system features

## Testing the Authentication Flow

### 1. Login as Super Admin

```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "superadmin@luxxage.com",
  "password": "SuperSecurePassword123!"
}
```

### 2. Invite a New Admin

```bash
POST http://localhost:3000/api/v1/auth/invite-admin
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "email": "admin@hotel.com"
}
```

### 3. Complete Registration (with OTP)

```bash
POST http://localhost:3000/api/v1/auth/complete-registration
Content-Type: application/json

{
  "email": "admin@hotel.com",
  "otpCode": "123456",
  "fullName": "John Doe",
  "password": "SecurePass123!",
  "hotelName": "Grand Hotel"
}
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start:dev` - Run in development mode with hot reload
- `npm run start:debug` - Run in debug mode
- `npm run start:prod` - Run in production mode
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage

## Database Management

You can manage the PostgreSQL database using **Adminer** at:
```
http://localhost:8080
```

Login credentials:
- **System:** PostgreSQL
- **Server:** postgres
- **Username:** docker
- **Password:** docker
- **Database:** luxxage_dev_db_local

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change the `PORT` in your `.env` file.

### Docker Services Not Starting

```bash
docker-compose down
docker-compose up -d
```

### Database Connection Issues

Ensure PostgreSQL is running:
```bash
docker-compose ps postgres
```

Check logs:
```bash
docker-compose logs postgres
```

### Redis Connection Issues

Ensure Redis is running:
```bash
docker-compose ps redis
```

## Project Architecture

This project follows a **Hybrid Service-Repository Architecture** with:
- Multi-tenant support
- Role-based access control (RBAC)
- OTP-based invitation system
- JWT authentication
- Microservice capabilities (TCP transport)

For more details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)

## Next Steps

1. ✅ Complete the setup above
2. ✅ Explore the Swagger documentation at `/docs`
3. ✅ Test the authentication flow
4. 🔄 Configure your email service for OTP delivery
5. 🔄 Customize the Super Admin credentials
6. 🔄 Add your business logic and features

## Support

For issues or questions, refer to the main [README.md](../README.md) or check the NestJS documentation at https://docs.nestjs.com
