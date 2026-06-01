import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Name of the company/tenant' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiPropertyOptional({ example: 'support@acme.com', description: 'Support email for the tenant' })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '123 Business Street', description: 'Address of the tenant' })
  @IsString()
  @IsOptional()
  address?: string;
}
