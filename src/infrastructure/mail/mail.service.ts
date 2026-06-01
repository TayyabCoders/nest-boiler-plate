import { Injectable, Inject } from '@nestjs/common';
import type { IMailProvider } from '@core/domain/ports/mail.port';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  constructor(
    @Inject('IMailProvider')
    private readonly mailProvider: IMailProvider,
    @InjectQueue('mail') 
    private readonly mailQueue: Queue,
  ) {}

  /**
   * Sends an email. By default, it adds it to a background queue.
   * Set useQueue to false to send it immediately (blocking).
   */
  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false, useQueue: boolean = true) {
    if (useQueue) {
      await this.mailQueue.add('send-email', {
        to,
        subject,
        body,
        isHtml,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      return;
    }

    // Direct sending (used by the worker processor)
    return this.mailProvider.sendEmail(to, subject, body, isHtml);
  }
}
