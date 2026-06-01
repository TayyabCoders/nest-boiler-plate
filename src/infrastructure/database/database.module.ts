import { Module, Global, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ILogger } from '@core/domain/logger.interface';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('DB_SYNC'),
        logging: config.get<string>('DB_LOGGING') === 'true',
        ssl: config.get<boolean>('DB_SSL'),
        extra: config.get<boolean>('DB_SSL') ? {
          ssl: {
            rejectUnauthorized: false, // For NeonDB/Cloud providers often needed
          },
        } : undefined,
      }),
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: ILogger,
  ) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log(
        'DatabaseModule',
        `Successfully connected to the database: ${this.dataSource.options.database}`,
      );
    } else {
      this.logger.error(
        'DatabaseModule',
        'Database connection failed to initialize',
      );
    }
  }
}