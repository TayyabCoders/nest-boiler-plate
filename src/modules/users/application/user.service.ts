import { Injectable, Inject, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { BaseService } from '@core/application/services/base.service';
import { ILogger } from '@core/domain/logger.interface';
import { User } from '../domain/user.entity';
import type { IUserRepository } from '../domain/user-repository.port';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@infra/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { RoleService } from '@modules/roles/application/role.service';

@Injectable()
export class UserService extends BaseService<User, IUserRepository> {
  constructor(
    @Inject('IUserRepository')
    private readonly _userRepository: IUserRepository,
    logger: ILogger,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly roleService: RoleService,
  ) {
    super(_userRepository, logger, 'UserService');
  }

  async register(data: {
    fullname: string;
    email: string;
    password: string;
    phonenumber?: string;
    roleId?: string;
  }): Promise<User> {
    // Check if user already exists with email
    const existingByEmail = await this._userRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user already exists with phonenumber
    if (data.phonenumber) {
      const existingByPhone = await this._userRepository.findByPhonenumber(data.phonenumber);
      if (existingByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Get role ID - if not provided, use default "user" role
    let roleId = data.roleId;
    if (!roleId) {
      const defaultRole = await this.roleService.findAll();
      const userRole = defaultRole.find(r => r.name === 'user');
      if (userRole) {
        roleId = userRole.id;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Create user
    const user = await this._userRepository.createAndSave({
      fullname: data.fullname,
      email: data.email,
      password: hashedPassword,
      phonenumber: data.phonenumber,
      roleId: roleId || null,
      status: 'active',
    });

    this.logger.log('UserService', `User registered: ${user.email}`);

    return user;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = await this._userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      roleId: user.roleId,
    });

    this.logger.log('UserService', `User logged in: ${user.email}`);

    return { user, token };
  }

  async findById(id: string): Promise<User | null> {
    return this._userRepository.findById(id);
  }

  async findAll(): Promise<User[]> {
    return this._userRepository.findAll();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this._userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is being updated and if it already exists
    if (data.email && data.email !== user.email) {
      const existingByEmail = await this._userRepository.findByEmail(data.email);
      if (existingByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Check if phonenumber is being updated and if it already exists
    if (data.phonenumber && data.phonenumber !== user.phonenumber) {
      const existingByPhone = await this._userRepository.findByPhonenumber(data.phonenumber);
      if (existingByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash password if it's being updated
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this._userRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const user = await this._userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this._userRepository.delete(id);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this._userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      this.logger.log('UserService', `Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate password reset token (expires in 1 hour)
    const token = this.jwtService.sign(
      { id: user.id, email: user.email, type: 'password_reset' },
      { expiresIn: '1h' },
    );

    // Create reset link
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Send email with reset link
    const emailBody = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.fullname},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.mailService.sendEmail(
      user.email,
      'Password Reset Request',
      emailBody,
      true, // isHtml
    );

    this.logger.log('UserService', `Password reset email sent to: ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify token
      const payload = this.jwtService.verify(token);

      // Check if token is for password reset
      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid token type');
      }

      // Find user
      const user = await this._userRepository.findById(payload.id);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this._userRepository.update(user.id, { password: hashedPassword });

      this.logger.log('UserService', `Password reset successful for: ${user.email}`);
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired token');
      }
      throw error;
    }
  }
}
