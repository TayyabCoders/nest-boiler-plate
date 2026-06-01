import { Injectable } from '@nestjs/common';
import { IPushNotificationProvider } from '@core/domain/ports/push-notification.port';

@Injectable()
export class FirebasePushAdapter implements IPushNotificationProvider {
  async send(userId: string, payload: any): Promise<void> {
    // Placeholder for FCM logic
    console.log(`FCM Notification for ${userId}:`, payload);
  }
}
