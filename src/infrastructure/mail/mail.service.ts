import { Injectable, Inject } from '@nestjs/common';
import type { IMailProvider } from '@core/domain/ports/mail.port';
import { QueueService, ROUTING_KEYS } from '../queue/queue.service';

@Injectable()
export class MailService {
  constructor(
    @Inject('IMailProvider')
    private readonly mailProvider: IMailProvider,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Sends an email. By default, it adds it to a background queue.
   * Set useQueue to false to send it immediately (blocking).
   */
  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false, useQueue: boolean = true) {
    if (useQueue) {
      await this.queueService.publish(
        ROUTING_KEYS.NOTIFICATION_SEND,
        { to, subject, body, isHtml }
      );
      return;
    }

    // Direct sending (used by the worker processor)
    return this.mailProvider.sendEmail(to, subject, body, isHtml);
  }
}
