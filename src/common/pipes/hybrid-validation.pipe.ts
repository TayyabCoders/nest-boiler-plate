
import { Injectable, ValidationPipe, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class HybridValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // Check if the metatype is a Zod DTO (nestjs-zod DTOs have a 'schema' property)
    if (metadata.metatype && (metadata.metatype as any).schema) {
      return value;
    }
    return super.transform(value, metadata);
  }
}
