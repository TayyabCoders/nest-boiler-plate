import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailConsumer } from './mail.consumer';
import { NodemailerAdapter } from './adapters/nodemailer.adapter';
import { AzureEmailAdapter } from './adapters/azure-email.adapter';

@Global()
@Module({
  providers: [
    MailService,
    MailConsumer,
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
