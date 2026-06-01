import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { ILogger } from '@core/domain/logger.interface';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly mailService: MailService,
    private readonly logger: ILogger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log('MailProcessor', `Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'send-email': {
        const { to, subject, body, isHtml } = job.data;
        try {
          // Set useQueue to false to actually send the email via the provider
          await this.mailService.sendEmail(to, subject, body, isHtml, false);
          this.logger.log('MailProcessor', `Successfully sent email to ${to}`);
        } catch (error: any) {
          this.logger.error('MailProcessor', `Failed to send email to ${to}: ${error.message}`);
          throw error; // Retries happen automatically if configured
        }
        break;
      }
      default:
        this.logger.error('MailProcessor', `Unknown job name: ${job.name}`);
    }
  }
}
