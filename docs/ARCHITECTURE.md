# Architecture & Module Guide

This boilerplate follows **Clean Architecture** (Hexagonal / Ports & Adapters) principles. This ensures that our business logic is isolated from external details like databases, APIs, or frameworks.

---

## 📂 Project Structure

### 1. `src/core` (The Heart)
Contains code that is universal to the entire application.

#### `core/domain/`
- **entities/**: Base entities (`BaseEntity` with `createdAt`, `updatedAt`, `deletedAt`)
- **ports/**: Abstract interfaces (Ports) for external dependencies:
  - `repository.port.ts` - Base repository interface
  - `cache.port.ts` - Cache provider interface
  - `mail.port.ts` - Mail provider interface
  - `push-notification.port.ts` - Push notification provider interface
- **logger.interface.ts** - Logger abstraction

#### `core/application/`
- **services/**: Base service classes (`BaseService<T, R>`)

### 2. `src/common`
Reusable utility classes, decorators, filters, guards, and interceptors:
- **decorators/**: Custom decorators (e.g., `@ResponseMessage`)
- **filters/**: Exception filters (e.g., `AllExceptionsFilter`)
- **interceptors/**: Response transformers (e.g., `TransformInterceptor`)
- **responses/**: Standardized response types

### 3. `src/infrastructure` (Adapters Layer)
Global adapters implementing the ports defined in `core/domain/ports/`:

- **database/**: 
  - `base.repository.ts` - TypeORM base repository implementation
  - `database.module.ts` - PostgreSQL connection via TypeORM

- **logger/**: 
  - Custom logging implementation with support for secondary logging (Mixpanel, GA)

- **cache/**: 
  - Redis-based caching via `cache-manager-redis-yet`
  - Implements `ICacheProvider` port

- **queue/**: 
  - BullMQ configuration for background job processing
  - Used by mail service for async email sending

- **mail/**: 
  - Adapters: `NodemailerAdapter`, `AzureEmailAdapter`
  - Implements `IMailProvider` port
  - Queue-based async email processing via BullMQ
  - Event listeners for domain events

- **notifications/**: 
  - Push notification adapters: `FirebasePushAdapter`, `SocketPushAdapter`
  - Implements `IPushNotificationProvider` port

- **gateways/**: 
  - WebSocket gateway for real-time notifications (`NotificationGateway`)

### 4. `src/modules` (Feature Modules)
Each feature (e.g., `users`, `luggage`) must follow this internal structure:

```text
modules/your-feature/
├── application/           # USE CASES / APPLICATION LOGIC
│   └── feature.service.ts # Orchestrates data flow (depends on ports)
├── domain/                # BUSINESS LOGIC / DOMAIN LAYER
│   ├── feature.entity.ts  # Data model (TypeORM decorators)
│   ├── repository.port.ts # Interface for the repository (extends IBaseRepository)
│   ├── events/            # Domain events (optional)
│   └── enums/             # Domain-specific enums
├── infrastructure/        # ADAPTERS / INFRASTRUCTURE LAYER
│   └── feature.repository.ts # Implementation of the repository port
├── presentation/          # ENTRY POINTS / PRESENTATION LAYER
│   ├── feature.controller.ts # REST/RPC endpoints
│   └── dto/               # Input/Output validation (Data Transfer Objects)
└── feature.module.ts      # Module wiring (NestJS module)
```

---

## 🗄️ Database Schema

### Core Entities

#### **Tenants** (Multi-tenancy)
- `id` (UUID, PK)
- `hotelName` (string)
- `supportEmail` (string)
- `address` (text, nullable)
- `metadata` (jsonb, nullable)
- `createdAt`, `updatedAt`, `deletedAt`

#### **Users**
- `id` (UUID, PK)
- `tenantId` (UUID, FK → tenants)
- `roleId` (int, FK → roles)
- `fullName` (string)
- `email` (string, unique per tenant)
- `phoneNumber` (string, nullable)
- `password` (string, hashed via bcrypt)
- `isOnline` (boolean)
- `isActive` (boolean)
- `metadata` (jsonb, nullable)
- **Relationships**:
  - Many-to-One: `Tenant`, `Role`
  - Many-to-Many: `Permission` (via `user_permissions` join table)

#### **Roles & Permissions (RBAC)**
- **Roles**: `id`, `name` (unique), Many-to-Many with `Permission`
- **Permissions**: `id`, `name` (unique), `description`
- **Join Tables**: `role_permissions`, `user_permissions`

#### **Rooms**
- `id` (UUID, PK)
- `tenantId` (UUID, FK → tenants)
- `roomNumber` (string, unique per tenant)
- `floorNumber` (int, nullable)
- `isActive` (boolean)
- `metadata` (jsonb, nullable)

#### **Luggage**
- `id` (UUID, PK)
- `tenantId` (UUID, FK → tenants)
- `guestId` (UUID, FK → users)
- `tagNumber` (string)
- `priority` (string, default: 'Normal')
- `status` (enum: `CHECK_IN`, `STORED`, `DELIVERED`, etc.)
- `damageCondition` (enum: `NONE`, `MINOR`, `MAJOR`, `SEVERE`)
- `createdById` (UUID, FK → users)
- `description` (text, nullable)
- `metadata` (jsonb, nullable)
- **Related Entities**:
  - `LuggagePhoto` (One-to-Many)
  - `LuggageEvent` (One-to-Many) - Status change history
  - `LuggageTypeMapping` (One-to-Many) - Type categories

#### **Notifications**
- `id` (UUID, PK)
- `userId` (UUID, FK → users)
- `type` (enum: `NEW_MESSAGE`, `ORDER_UPDATE`, `HOLD_CREATED`, etc.)
- `title` (string)
- `message` (text)
- `data` (jsonb, nullable)
- `isRead` (boolean)
- `readAt` (timestamp, nullable)

#### **OTPs** (One-Time Passwords)
- `id` (UUID, PK)
- `email` (string, indexed)
- `otpCode` (string, 6 chars)
- `purpose` (enum: `ADMIN_INVITATION`, `STAFF_INVITATION`, `PASSWORD_RESET`)
- `isVerified` (boolean)
- `expiresAt` (timestamp)
- `metadata` (jsonb, nullable) - Stores invitation context

#### **User Detail Tables**
- **GuestDetail**: `userId` (PK/FK), `roomId`, `bookingReference`, `dropOffLocation`, `totalBagsExpected`, `arrivalTime`
- **StaffDetail**: `userId` (PK/FK), `shift` (enum), `metadata`

### Entity Relationships Summary

```
Tenant (1) ──→ (N) User
Role (1) ──→ (N) User
User (N) ←──→ (N) Permission (via user_permissions)
Role (N) ←──→ (N) Permission (via role_permissions)

Tenant (1) ──→ (N) Room
Tenant (1) ──→ (N) Luggage
User (1) ──→ (N) Luggage (as guest)
User (1) ──→ (N) Luggage (as creator)
User (1) ──→ (N) Notification
User (1) ──→ (1) GuestDetail ──→ (N) Room
User (1) ──→ (1) StaffDetail

Luggage (1) ──→ (N) LuggagePhoto
Luggage (1) ──→ (N) LuggageEvent
Luggage (1) ──→ (N) LuggageTypeMapping
```

---

## 🔌 Infrastructure Patterns

### Port/Adapter Pattern

The infrastructure layer implements ports (interfaces) defined in `core/domain/ports/`:

#### **Mail Provider**
- **Port**: `IMailProvider` (`core/domain/ports/mail.port.ts`)
- **Adapters**: 
  - `NodemailerAdapter` (SMTP)
  - `AzureEmailAdapter` (Azure Communication Services)
- **Selection**: Based on `MAIL_TRANSPORT` env variable
- **Queue Integration**: Emails are queued via BullMQ for async processing

#### **Cache Provider**
- **Port**: `ICacheProvider` (`core/domain/ports/cache.port.ts`)
- **Adapter**: `RedisCacheService` (Redis via `cache-manager-redis-yet`)
- **TTL**: Configurable via `REDIS_CACHE_TTL` (default: 600 seconds)

#### **Push Notification Provider**
- **Port**: `IPushNotificationProvider` (`core/domain/ports/push-notification.port.ts`)
- **Adapters**:
  - `SocketPushAdapter` (WebSocket via Socket.IO)
  - `FirebasePushAdapter` (Firebase Cloud Messaging)

### Queue System (BullMQ)

- **Purpose**: Background job processing (primarily for emails)
- **Backend**: Redis
- **Queues**:
  - `mail` - Email sending jobs
- **Processors**: `MailProcessor` handles queued email jobs
- **Features**: Automatic retries, exponential backoff

### WebSocket Gateway

- **Gateway**: `NotificationGateway` (`infrastructure/gateways/notification.gateway.ts`)
- **Namespace**: `/notifications`
- **Authentication**: JWT-based via handshake
- **Rooms**: Users join `user_{userId}` room on connection
- **Events**:
  - `connection_success` - Sent on successful auth
  - `new_notification` - Real-time notification delivery
  - `notifications:get` - Fetch notifications
  - `notifications:mark-read` - Mark as read

### Event-Driven Architecture

- **Event Emitter**: NestJS `@nestjs/event-emitter`
- **Domain Events**: 
  - `UserCreatedEvent` - Triggers welcome email
- **Listeners**: 
  - `GenericMailListener` - Handles mail-related events
  - `UserCreatedListener` - Sends welcome email on user creation

---

## 🚀 Application Modes

The application supports three modes via `APP_MODE` environment variable:

1. **HTTP** (default): REST API only
2. **MICROSERVICE**: TCP microservice only
3. **HYBRID**: Both HTTP and microservice simultaneously

### HTTP Mode Features
- REST API at `/api/v1`
- Swagger documentation at `/docs`
- WebSocket support for real-time features

### Microservice Mode
- TCP transport on configurable host/port
- Message-based communication
- Useful for inter-service communication

---

## 🛠️ Step-by-Step: Creating a New Module

Let's say you want to create a `Products` module.

### Step 1: Define the Domain
1. Create `src/modules/products/domain/product.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '@core/domain/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // ... other fields
}
```

2. Create `src/modules/products/domain/product-repository.port.ts`:
```typescript
import { IBaseRepository } from '@core/domain/ports/repository.port';
import { Product } from './product.entity';

export interface IProductRepository extends IBaseRepository<Product> {
  findByName(name: string): Promise<Product | null>;
}
```

### Step 2: Implement the Infrastructure
Create `src/modules/products/infrastructure/product.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '@infra/database/base.repository';
import { Product } from '../domain/product.entity';
import { IProductRepository } from '../domain/product-repository.port';

@Injectable()
export class ProductRepository extends TypeOrmBaseRepository<Product> implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {
    super(productRepository);
  }

  async findByName(name: string): Promise<Product | null> {
    return await this.productRepository.findOneBy({ name } as any);
  }
}
```

### Step 3: Create the Application Layer
Create `src/modules/products/application/product.service.ts`:
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { BaseService } from '@core/application/services/base.service';
import { ILogger } from '@core/domain/logger.interface';
import { Product } from '../domain/product.entity';
import { IProductRepository } from '../domain/product-repository.port';

@Injectable()
export class ProductService extends BaseService<Product, IProductRepository> {
  constructor(
    @Inject('IProductRepository')
    repository: IProductRepository,
    logger: ILogger,
  ) {
    super(repository, logger, 'ProductService');
  }

  async findByName(name: string): Promise<Product | null> {
    return this.repository.findByName(name);
  }
}
```

### Step 4: Create Presentation Layer
1. Create DTOs in `src/modules/products/presentation/dto/create-product.dto.ts`:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

2. Create `src/modules/products/presentation/product.controller.ts`:
```typescript
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProductService } from '../application/product.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  async findAll() {
    return this.productService.findAll();
  }
}
```

### Step 5: Wire it up in the Module
Create `src/modules/products/products.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './domain/product.entity';
import { ProductService } from './application/product.service';
import { ProductController } from './presentation/product.controller';
import { ProductRepository } from './infrastructure/product.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'IProductRepository',
      useClass: ProductRepository,
    },
  ],
  exports: [ProductService],
})
export class ProductsModule {}
```

### Step 6: Register in AppModule
Add `ProductsModule` to `src/app.module.ts` imports array.

---

## 📏 Rules to Follow

1. **Dependency Direction**: 
   - Inner layers (domain) should NEVER depend on outer layers (infrastructure, presentation)
   - Dependencies flow inward: Presentation → Application → Domain ← Infrastructure

2. **Ports/Interfaces**: 
   - Services should only talk to interfaces, never concrete repository classes
   - Use string tokens for dependency injection (e.g., `'IProductRepository'`)

3. **Naming Conventions**: 
   - Interfaces start with `I` (e.g., `IUserRepository`)
   - Repository ports go in the `domain` folder
   - Implementations go in the `infrastructure` folder
   - Services go in the `application` folder
   - Controllers go in the `presentation` folder

4. **Validation**: 
   - Always use DTOs with `class-validator` for input validation
   - Use `class-transformer` for data transformation

5. **Entities**: 
   - All entities should extend `BaseEntity` (provides `createdAt`, `updatedAt`, `deletedAt`)
   - Use TypeORM decorators for database mapping
   - Use UUID for primary keys (except for roles/permissions which use integers)

6. **Multi-tenancy**: 
   - Always include `tenantId` in tenant-scoped entities
   - Use composite unique indexes for tenant-scoped uniqueness (e.g., `[tenantId, email]`)

7. **Repository Pattern**: 
   - Extend `TypeOrmBaseRepository<T>` for basic CRUD
   - Implement custom methods in repository class
   - Define custom methods in repository port interface

---

## 🔐 Security Features

- **JWT Authentication**: Token-based auth with configurable expiration
- **Password Hashing**: Automatic bcrypt hashing via `@BeforeInsert` hook
- **Role-Based Access Control (RBAC)**: Roles and permissions system
- **Multi-tenant Isolation**: Tenant-scoped data access
- **OTP Verification**: Time-limited OTP codes for invitations
- **Helmet**: Security headers middleware
- **CORS**: Configurable CORS support

---

## 📦 Key Dependencies

- **NestJS**: Core framework
- **TypeORM**: ORM for PostgreSQL
- **BullMQ**: Queue system (Redis-backed)
- **Socket.IO**: WebSocket support
- **Passport**: Authentication strategies (JWT, Microsoft)
- **Zod**: Environment variable validation
- **class-validator**: DTO validation
- **Swagger**: API documentation

---

## 🧪 Testing

- **Unit Tests**: Jest configuration in `package.json`
- **E2E Tests**: `test/` directory with `jest-e2e.json`
- **Test Coverage**: `npm run test:cov`

---

## 📝 Notes

- The architecture supports both HTTP REST API and TCP microservice modes
- All external services (mail, cache, notifications) use the Port/Adapter pattern for easy swapping
- Database synchronization is controlled via `DB_SYNC` (should be `false` in production)
- Super admin is auto-created on startup if configured in environment variables
- RBAC roles and permissions are seeded on application startup
