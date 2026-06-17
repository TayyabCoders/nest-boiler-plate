import { NestFactory, Reflector } from '@nestjs/core';
import { LoggerService, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'; 
import { ZodValidationPipe } from 'nestjs-zod'; 
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

import { AppModule } from './app.module';
import { ILogger } from '@core/domain/logger.interface';
import { ConfigService } from '@nestjs/config';
import { HybridValidationPipe } from './common/pipes/hybrid-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const customLogger = app.get(ILogger);
  app.useLogger(customLogger as unknown as LoggerService);

  app.use(helmet());
  app.enableCors();

  // Handle root path before global prefix
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/' && req.method === 'GET') {
      return res.status(401).json({
        error: 'Unauthorized access',
        message: 'Missing authorization header'
      });
    }
    next();
  });

  app.useGlobalPipes(
    new HybridValidationPipe(),
    new ZodValidationPipe(),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const mode = configService.get<string>('APP_MODE') || 'HTTP';

  if (mode === 'HTTP' || mode === 'HYBRID') {
    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
      .setTitle('Nest Boilerplate Backend API Documentation')
      .setDescription('API documentation for the Hybrid Service-Repository Architecture')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = configService.get<number>('PORT') || 3000;
    await app.listen(port);
    customLogger.log('Bootstrap', `HTTP Server running on: http://localhost:${port}/api/v1`);
    customLogger.log('Bootstrap', `Swagger documentation at: http://localhost:${port}/docs`);
  }

  if (mode === 'MICROSERVICE' || mode === 'HYBRID') {
    const msHost = configService.get<string>('MS_HOST') || '0.0.0.0';
    const msPort = configService.get<number>('MS_PORT') || 3001;

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: msHost, port: msPort },
    });
    await app.startAllMicroservices();
    customLogger.log('Bootstrap', `Microservice is listening via TCP on ${msHost}:${msPort}`);
  }
}

void bootstrap();