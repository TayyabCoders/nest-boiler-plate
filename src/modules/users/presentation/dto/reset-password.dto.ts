import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-xyz', description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'newPassword123', description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
