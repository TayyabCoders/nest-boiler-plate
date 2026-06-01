import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { NodemailerAdapter } from './adapters/nodemailer.adapter';
import { AzureEmailAdapter } from './adapters/azure-email.adapter';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail',
    }),
  ],
  providers: [
    MailService,
    MailProcessor,
    NodemailerAdapter,
    AzureEmailAdapter,
    {
      provide: 'IMailProvider',
      inject: [ConfigService, NodemailerAdapter, AzureEmailAdapter],
      useFactory: (config: ConfigService, nodemailer: NodemailerAdapter, azure: AzureEmailAdapter) => {
        const transport = config.get('MAIL_TRANSPORT'); // 'SMTP' or 'AZURE'
        return transport === 'AZURE' ? azure : nodemailer;
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
