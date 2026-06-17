import { Controller, Post, Body, Get, Put, Delete, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from '../application/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../domain/user.entity';
import { LogAudit } from '@modules/audit-logs/common/decorators/log-audit.decorator';
import { AuditAction } from '@modules/audit-logs/domain/audit-action.enum';

@ApiTags('Auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @LogAudit({
    action: AuditAction.USER_CREATE,
    entityType: 'User',
    description: 'New user registered',
  })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: User })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<User> {
    return this.userService.register(registerDto);
  }

  @Post('login')
  @LogAudit({
    action: AuditAction.LOGIN,
    entityType: 'Auth',
    description: 'User logged in',
  })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<{ user: User; token: string }> {
    return this.userService.login(loginDto.email, loginDto.password);
  }

  @Post('forgot-password')
  @LogAudit({
    action: AuditAction.PASSWORD_RESET_REQUEST,
    entityType: 'Auth',
    description: 'User requested password reset',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent if email exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.userService.forgotPassword(forgotPasswordDto.email);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Post('reset-password')
  @LogAudit({
    action: AuditAction.PASSWORD_CHANGE,
    entityType: 'Auth',
    description: 'User reset password',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.userService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    return { message: 'Password reset successful' };
  }
}

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @LogAudit({
    action: AuditAction.USER_LIST,
    entityType: 'User',
    description: 'Retrieved all users',
  })
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users', type: [User] })
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({ status: 200, description: 'Return the user', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.userService.findById(id);
  }

  @Put(':id')
  @LogAudit({
    action: AuditAction.USER_UPDATE,
    entityType: 'User',
    description: 'User updated',
  })
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User successfully updated', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @LogAudit({
    action: AuditAction.USER_DELETE,
    entityType: 'User',
    description: 'User deleted',
  })
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.userService.delete(id);
  }
}
