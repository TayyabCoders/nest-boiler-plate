# NestJS Boilerplate Project Structure

```
nest-boiler/

├── .git/

├── .env

├── .env.example.addition

├── .gitignore

├── .prettierrc

├── docker-compose.yml

├── nest-cli.json

├── package.json

├── package-lock.json

├── README.md

├── PROJECT_ANALYSIS_REPORT.md

├── PROJECT_COMPARISON_REPORT.md

├── tsconfig.json

├── tsconfig.build.json

├── doc/

│   ├── ARCHITECTURE.md

│   ├── AUTHENTICATION_FLOW.md

│   ├── UUID_MIGRATION.md

│   └── starter-project-time.md

├── public/

│   └── tester.html

├── src/

│   ├── app.module.ts

│   ├── main.ts

│   ├── common/

│   │   ├── decorators/

│   │   │   └── response-message.decorator.ts

│   │   ├── filters/

│   │   │   └── http-exception.filter.ts

│   │   ├── interceptors/

│   │   │   └── transform.interceptor.ts

│   │   ├── pipes/

│   │   │   └── hybrid-validation.pipe.ts

│   │   └── responses/

│   │       └── api.response.ts

│   ├── config/

│   │   ├── app.config.ts

│   │   └── env.validation.ts

│   ├── core/

│   │   ├── application/

│   │   │   └── services/

│   │   │       └── base.service.ts

│   │   └── domain/

│   │       ├── entities/

│   │       │   └── base.entity.ts

│   │       ├── logger.interface.ts

│   │       └── ports/

│   │           ├── cache.port.ts

│   │           ├── mail.port.ts

│   │           ├── push-notification.port.ts

│   │           └── repository.port.ts

│   ├── infrastructure/

│   │   ├── cache/

│   │   │   ├── cache.module.ts

│   │   │   └── cache.service.ts

│   │   ├── database/

│   │   │   ├── base.repository.ts

│   │   │   └── database.module.ts

│   │   ├── logger/

│   │   │   ├── logger.adapter.ts

│   │   │   └── logger.module.ts

│   │   ├── mail/

│   │   │   ├── adapters/

│   │   │   │   ├── azure-email.adapter.ts

│   │   │   │   └── nodemailer.adapter.ts

│   │   │   ├── mail.module.ts

│   │   │   ├── mail.processor.ts

│   │   │   └── mail.service.ts

│   │   ├── notifications/

│   │   │   ├── adapters/

│   │   │   │   └── firebase-push.adapter.ts

│   │   │   └── push-notification.module.ts

│   │   └── queue/

│   │       └── queue.module.ts

│   └── modules/

│       ├── health/

│       │   ├── application/

│       │   │   └── health.service.ts

│       │   ├── health.module.ts

│       │   └── presentation/

│       │       └── health.controller.ts

│       └── tenants/

│           ├── application/

│           │   └── tenant.service.ts

│           ├── domain/

│           │   ├── tenant.entity.ts

│           │   └── tenant-repository.port.ts

│           ├── infrastructure/

│           │   └── tenant.repository.ts

│           ├── presentation/

│           │   ├── dto/

│           │   │   └── create-tenant.dto.ts

│           │   └── tenant.controller.ts

│           └── tenants.module.ts

├── test/

│   ├── app.e2e-spec.ts

│   └── jest-e2e.json

└── dist/

    └── [compiled output]
```

## Structure Overview

### Root Configuration Files
- `.env` - Environment variables
- `.env.example.addition` - Additional environment variable examples
- `.gitignore` - Git ignore rules
- `.prettierrc` - Prettier configuration
- `docker-compose.yml` - Docker services configuration
- `nest-cli.json` - NestJS CLI configuration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tsconfig.build.json` - TypeScript build configuration

### Documentation (`doc/`)
- `ARCHITECTURE.md` - Architecture and module guide
- `AUTHENTICATION_FLOW.md` - Authentication and invitation flow documentation
- `UUID_MIGRATION.md` - UUID migration guide
- `starter-project-time.md` - Project timeline documentation

### Source Code (`src/`)

#### Core (`src/core/`)
- **Domain Layer** - Business logic, entities, and ports/interfaces
- **Application Layer** - Base services and use cases

#### Common (`src/common/`)
- **Decorators** - Custom decorators (e.g., @ResponseMessage)
- **Filters** - Exception filters (e.g., AllExceptionsFilter)
- **Interceptors** - Response transformers (e.g., TransformInterceptor)
- **Pipes** - Validation pipes (e.g., HybridValidationPipe)
- **Responses** - Standardized response types

#### Infrastructure (`src/infrastructure/`)
- **Cache** - Redis caching implementation
- **Database** - PostgreSQL connection and base repository
- **Logger** - Custom logging implementation
- **Mail** - Email adapters (SMTP, Azure) with queue processing
- **Notifications** - Push notification adapters (Firebase)
- **Queue** - BullMQ configuration for background jobs

#### Modules (`src/modules/`)
- **Health** - Health check module
- **Tenants** - Tenant management module (example feature module)

### Configuration (`src/config/`)
- `app.config.ts` - Application configuration
- `env.validation.ts` - Environment variable validation schema (Zod)

### Entry Points
- `main.ts` - Application bootstrap
- `app.module.ts` - Root module

### Public Assets (`public/`)
- Static files served by the application

### Tests (`test/`)
- E2E tests configuration and specifications

### Build Output (`dist/`)
- Compiled JavaScript output (generated)
