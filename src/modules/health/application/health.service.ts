import { Injectable } from '@nestjs/common';
import { 
  HealthCheckService, 
  HttpHealthIndicator, 
  TypeOrmHealthIndicator, 
  MemoryHealthIndicator, 
  DiskHealthIndicator,
  MicroserviceHealthIndicator
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private configService: ConfigService,
  ) {}

  async check() {
    return this.health.check([
      // Database Check
      () => this.db.pingCheck('database'),
      
      // Redis Check (via Microservice Indicator)
      () => this.microservice.pingCheck('redis', {
        transport: Transport.REDIS,
        options: {
          host: this.configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
          password: this.configService.get('REDIS_PASSWORD'),
        },
      }),

      // Memory Usage Checks (Heap) - Max 300MB for Dev
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Memory Usage Checks (RSS) - Max 500MB for Dev
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk Storage Check - Commented out for platform compatibility
      // () => this.disk.checkStorage('storage', { thresholdPercent: 0.5, path: 'C:\\' }),

      // External API Check
      () => this.http.pingCheck('google', 'https://google.com'),
    ]);
  }
}
