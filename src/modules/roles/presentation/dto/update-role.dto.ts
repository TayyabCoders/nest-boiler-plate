import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'admin', description: 'Role name' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'Administrator role with full access', description: 'Role description' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
