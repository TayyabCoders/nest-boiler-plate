import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { MailService } from './mail.service';

@Injectable()
export class MailConsumer implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    // Explicitly register the handler on startup
    await this.queueService.consume('notification.events', async (message) => {
      await this.handleEmailMessage(message);
    });
  }

  private async handleEmailMessage(message: any) {
    const { to, subject, body, isHtml } = message;
    await this.mailService.sendEmail(to, subject, body, isHtml, false);
  }
}
