import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailProvider } from '@core/domain/ports/mail.port';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class NodemailerAdapter implements IMailProvider {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: ILogger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        subject,
        [isHtml ? 'html' : 'text']: body,
      });
      this.logger.log('NodemailerAdapter', `Email sent to ${to}`);
    } catch (error: any) {
      this.logger.error('NodemailerAdapter', `Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
