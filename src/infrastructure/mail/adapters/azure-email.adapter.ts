import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailClient } from '@azure/communication-email';
import { IMailProvider } from '@core/domain/ports/mail.port';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class AzureEmailAdapter implements IMailProvider {
  private client: EmailClient;
  private senderAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: ILogger,
  ) {
    const connectionString = this.configService.get<string>('AZURE_EMAIL_CONNECTION_STRING')?.trim().replace(/^"+|"+$/g, '');
    const sender = this.configService.get<string>('AZURE_EMAIL_SENDER')?.trim().replace(/^"+|"+$/g, '');

    if (!connectionString) throw new Error('AZURE_EMAIL_CONNECTION_STRING not set');
    if (!sender) throw new Error('AZURE_EMAIL_SENDER not set');

    this.client = new EmailClient(connectionString);
    this.senderAddress = sender;
  }

  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false): Promise<void> {
    const content: any = { subject };
    
    if (isHtml) {
      content.html = body;
      content.plainText = body.replace(/<[^>]*>?/gm, ''); 
    } else {
      content.plainText = body;
    }

    const emailMessage = {
      senderAddress: this.senderAddress,
      content,
      recipients: { to: [{ address: to }] },
    };

    try {
      const poller = await this.client.beginSend(emailMessage);
      await poller.pollUntilDone();
      this.logger.log('AzureEmailAdapter', `Email sent via Azure to ${to}`);
    } catch (error: any) {
      this.logger.error('AzureEmailAdapter', `Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
