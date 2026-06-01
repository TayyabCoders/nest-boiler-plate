import { Module, Global } from '@nestjs/common';
import { FirebasePushAdapter } from './adapters/firebase-push.adapter';

@Global()
@Module({
  providers: [
    FirebasePushAdapter,
    {
      provide: 'IPushNotificationProvider',
      useClass: FirebasePushAdapter,
    },
  ],
  exports: ['IPushNotificationProvider'],
})
export class PushNotificationModule {}
